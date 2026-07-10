import fs from 'fs';
import path from 'path';
import redis from './redisClient.js';

const LOG_MODE = (process.env.NETWORK_LOG_MODE || 'file').toLowerCase();
const LOG_FILE = process.env.NETWORK_LOG_FILE || path.resolve(process.cwd(), 'downloads/network.log');

const ENABLE_HTTP_LOG = String(process.env.NETWORK_LOG_HTTP || 'true').toLowerCase() !== 'false';
const ENABLE_AXIOS_LOG = String(process.env.NETWORK_LOG_AXIOS || 'true').toLowerCase() !== 'false';
const ENABLE_REDIS_LOG = String(process.env.NETWORK_LOG_REDIS || 'true').toLowerCase() !== 'false';

const REDIS_EVENTS_KEY = process.env.NETWORK_LOG_REDIS_EVENTS_KEY || 'network_log:events';
const REDIS_EVENTS_MAX = Math.min(
    Math.max(Number.parseInt(process.env.NETWORK_LOG_REDIS_MAX_EVENTS || '20000', 10) || 20000, 1000),
    200000,
);

let fileLoggerReady = false;

const ensureFileLogger = async () => {
    if (fileLoggerReady || (LOG_MODE !== 'file' && LOG_MODE !== 'both')) {
        return;
    }

    const logDir = path.dirname(LOG_FILE);
    await fs.promises.mkdir(logDir, { recursive: true });
    fileLoggerReady = true;
};

const writeToFile = async (line) => {
    try {
        await ensureFileLogger();
        if (!fileLoggerReady) {
            return;
        }
        await fs.promises.appendFile(LOG_FILE, `${line}\n`, 'utf8');
    } catch (error) {
        console.error('[Network Logger Error]', error.message);
    }
};

const writeToRedis = async (line) => {
    if (!ENABLE_REDIS_LOG) {
        return;
    }

    try {
        await redis.multi()
            .lpush(REDIS_EVENTS_KEY, line)
            .ltrim(REDIS_EVENTS_KEY, 0, REDIS_EVENTS_MAX - 1)
            .exec();
    } catch (error) {
        console.error('[Network Logger Redis Error]', error.message);
    }
};

const emit = async (level, tag, payload) => {
    if (LOG_MODE === 'off') {
        return;
    }

    const line = JSON.stringify({
        ts: new Date().toISOString(),
        level,
        tag,
        payload,
    });

    if (LOG_MODE === 'console' || LOG_MODE === 'both') {
        if (level === 'error') {
            console.error(`[${tag}]`, payload);
        } else {
            console.log(`[${tag}]`, payload);
        }
    }

    const tasks = [];

    if (LOG_MODE === 'file' || LOG_MODE === 'both') {
        tasks.push(writeToFile(line));
    }

    if (ENABLE_REDIS_LOG) {
        tasks.push(writeToRedis(line));
    }

    if (tasks.length > 0) {
        await Promise.allSettled(tasks);
    }
};

export const logHttpRequest = async (payload) => {
    if (!ENABLE_HTTP_LOG) {
        return;
    }
    await emit('info', 'HTTP Request', payload);
};

export const logAxiosRequest = async (payload) => {
    if (!ENABLE_AXIOS_LOG) {
        return;
    }
    await emit('info', 'Axios Request', payload);
};

export const logAxiosError = async (payload) => {
    if (!ENABLE_AXIOS_LOG) {
        return;
    }
    await emit('error', 'Axios Error', payload);
};

export const logRateLimit = async (payload) => {
    if (!ENABLE_AXIOS_LOG) {
        return;
    }
    await emit('error', '429 Rate Limit', payload);
};
