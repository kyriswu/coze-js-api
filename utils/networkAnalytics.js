import redis from './redisClient.js';
import fs from 'fs';
import path from 'path';

const REDIS_EVENTS_KEY = process.env.NETWORK_LOG_REDIS_EVENTS_KEY || 'network_log:events';
const LOG_FILE = process.env.NETWORK_LOG_FILE || path.resolve(process.cwd(), 'downloads/network.log');
const REDIS_BACKFILL_CHUNK = 500;
const DEFAULT_SCAN_LIMIT = Math.min(
    Math.max(Number.parseInt(process.env.NETWORK_LOG_ANALYTICS_SCAN_LIMIT || '5000', 10) || 5000, 500),
    50000,
);

const toFiniteNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
};

const safeString = (value) => {
    if (value === null || value === undefined) {
        return '';
    }
    return String(value);
};

const normalizeMethod = (value) => safeString(value).trim().toUpperCase();

const statusClass = (status) => {
    if (!Number.isFinite(status)) return 'unknown';
    if (status >= 100 && status < 200) return '1xx';
    if (status >= 200 && status < 300) return '2xx';
    if (status >= 300 && status < 400) return '3xx';
    if (status >= 400 && status < 500) return '4xx';
    if (status >= 500 && status < 600) return '5xx';
    return 'other';
};

const minuteStart = (tsMs) => tsMs - (tsMs % 60000);

const incMap = (map, key, delta = 1) => {
    if (!key) return;
    map.set(key, (map.get(key) || 0) + delta);
};

const topEntries = (map, limit) => {
    return [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([key, value]) => ({ key, value }));
};

const parseRedisEventLine = (line) => {
    if (!line || !line.trim()) {
        return null;
    }
    try {
        const row = JSON.parse(line);
        return {
            ts: row?.ts || null,
            level: safeString(row?.level),
            tag: safeString(row?.tag),
            method: normalizeMethod(row?.payload?.method),
            path: safeString(row?.payload?.path || row?.payload?.url),
            status: toFiniteNumber(row?.payload?.status),
            durationMs: toFiniteNumber(row?.payload?.durationMs),
            payload: row?.payload || {},
        };
    } catch (_) {
        return null;
    }
};

const collectLastLines = async (filePath, maxLines) => {
    if (!fs.existsSync(filePath)) {
        return [];
    }

    const content = await fs.promises.readFile(filePath, 'utf8');
    const lines = content.split(/\r?\n/).filter((line) => line && line.trim());
    if (lines.length <= maxLines) {
        return lines;
    }
    return lines.slice(lines.length - maxLines);
};

const seedRedisFromFileIfEmpty = async (maxLines) => {
    const existing = Number(await redis.llen(REDIS_EVENTS_KEY));
    if (existing > 0) {
        return;
    }

    const lines = await collectLastLines(LOG_FILE, maxLines);
    if (lines.length === 0) {
        return;
    }

    for (let i = 0; i < lines.length; i += REDIS_BACKFILL_CHUNK) {
        const chunk = lines.slice(i, i + REDIS_BACKFILL_CHUNK);
        const pipeline = redis.pipeline();
        chunk.forEach((line) => {
            pipeline.lpush(REDIS_EVENTS_KEY, line);
        });
        await pipeline.exec();
    }
};

const buildTimeline = (timelineMap, fromMs, toMs, maxPoints) => {
    const spanMinutes = Math.max(1, Math.ceil((toMs - fromMs) / 60000));
    const step = Math.max(1, Math.ceil(spanMinutes / Math.max(1, maxPoints)));
    const buckets = [];

    let cursor = minuteStart(fromMs);
    while (cursor <= toMs) {
        const rangeEnd = cursor + step * 60000;
        let count = 0;

        for (let probe = cursor; probe < rangeEnd; probe += 60000) {
            count += timelineMap.get(probe) || 0;
        }

        buckets.push({
            minute: new Date(cursor).toISOString(),
            count,
        });

        cursor = rangeEnd;
    }

    return buckets;
};

const matchFilters = (item, filters) => {
    if (filters.tag && item.tag !== filters.tag) {
        return false;
    }

    if (filters.level && item.level !== filters.level) {
        return false;
    }

    if (filters.method && item.method !== filters.method) {
        return false;
    }

    if (filters.pathContains && !item.path.includes(filters.pathContains)) {
        return false;
    }

    if (filters.fromTsMs && item.ts) {
        const tsMs = new Date(item.ts).getTime();
        if (Number.isFinite(tsMs) && tsMs < filters.fromTsMs) {
            return false;
        }
    }

    return true;
};

export const getNetworkDashboardMetrics = async ({
    windowMinutes = 24 * 60,
    topN = 8,
    slowN = 10,
    scanLimit = DEFAULT_SCAN_LIMIT,
    tag = '',
    level = '',
    method = '',
    pathContains = '',
} = {}) => {
    const normalizedWindowMinutes = Math.min(Math.max(Number(windowMinutes) || 24 * 60, 1), 7 * 24 * 60);
    const normalizedTopN = Math.min(Math.max(Number(topN) || 8, 1), 30);
    const normalizedSlowN = Math.min(Math.max(Number(slowN) || 10, 1), 50);
    const normalizedScanLimit = Math.min(Math.max(Number(scanLimit) || DEFAULT_SCAN_LIMIT, 100), 50000);

    await seedRedisFromFileIfEmpty(normalizedScanLimit);

    const rawLines = await redis.lrange(REDIS_EVENTS_KEY, 0, normalizedScanLimit - 1);

    const nowMs = Date.now();
    const fromTsMs = nowMs - normalizedWindowMinutes * 60000;

    const filters = {
        fromTsMs,
        tag: safeString(tag).trim(),
        level: safeString(level).trim(),
        method: normalizeMethod(method),
        pathContains: safeString(pathContains),
    };

    const byStatusClass = new Map();
    const byPath = new Map();
    const byTag = new Map();
    const byMethod = new Map();
    const timelineByMinute = new Map();
    const slowCandidates = [];

    let parsedLines = 0;
    let parseErrors = 0;
    let firstTs = null;
    let lastTs = null;

    rawLines.forEach((line) => {
        const item = parseRedisEventLine(line);
        if (!item) {
            parseErrors += 1;
            return;
        }

        if (!matchFilters(item, filters)) {
            return;
        }

        parsedLines += 1;

        const tsMs = item.ts ? new Date(item.ts).getTime() : null;
        if (Number.isFinite(tsMs)) {
            if (!firstTs || tsMs < firstTs) {
                firstTs = tsMs;
            }
            if (!lastTs || tsMs > lastTs) {
                lastTs = tsMs;
            }
            const minuteMs = minuteStart(tsMs);
            timelineByMinute.set(minuteMs, (timelineByMinute.get(minuteMs) || 0) + 1);
        }

        if (item.tag) {
            incMap(byTag, item.tag);
        }

        if (item.method) {
            incMap(byMethod, item.method);
        }

        if (item.path) {
            incMap(byPath, item.path);
        }

        incMap(byStatusClass, statusClass(item.status));

        if (Number.isFinite(item.durationMs)) {
            slowCandidates.push({
                ts: item.ts,
                path: item.path,
                tag: item.tag,
                method: item.method,
                status: item.status,
                durationMs: item.durationMs,
            });
        }
    });

    const slowRequests = slowCandidates
        .sort((a, b) => b.durationMs - a.durationMs)
        .slice(0, normalizedSlowN);

    const timeline = buildTimeline(timelineByMinute, fromTsMs, nowMs, 120);

    return {
        summary: {
            totalRawLines: rawLines.length,
            parsedLines,
            parseErrors,
            windowMinutes: normalizedWindowMinutes,
            timeRange: {
                start: new Date(fromTsMs).toISOString(),
                end: new Date(nowMs).toISOString(),
                firstSeen: firstTs ? new Date(firstTs).toISOString() : null,
                lastSeen: lastTs ? new Date(lastTs).toISOString() : null,
            },
            filters: {
                tag: filters.tag || null,
                level: filters.level || null,
                method: filters.method || null,
                pathContains: filters.pathContains || null,
            },
        },
        stats: {
            statusClasses: topEntries(byStatusClass, 10),
            topPaths: topEntries(byPath, normalizedTopN),
            topTags: topEntries(byTag, 10),
            methods: topEntries(byMethod, 10),
            slowRequests,
            timeline,
        },
    };
};
