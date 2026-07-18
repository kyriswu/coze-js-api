import fs from 'fs';
import path from 'path';
import readline from 'readline';

const DEFAULT_FILE = path.resolve(process.cwd(), 'downloads/network.log');

function parseArgs(argv) {
    const args = {
        file: DEFAULT_FILE,
        limit: 10,
        tag: null,
        level: null,
        pathContains: null,
        json: false,
    };

    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (token === '--file') args.file = path.resolve(process.cwd(), argv[++i]);
        else if (token === '--limit') args.limit = Math.max(1, Number(argv[++i]) || 10);
        else if (token === '--tag') args.tag = argv[++i] || null;
        else if (token === '--level') args.level = argv[++i] || null;
        else if (token === '--path') args.pathContains = argv[++i] || null;
        else if (token === '--json') args.json = true;
        else if (token === '--help' || token === '-h') {
            printHelp();
            process.exit(0);
        }
    }

    return args;
}

function printHelp() {
    console.log(`Usage:
  node scripts/network-log-analyze.mjs [options]

Options:
  --file <path>      Log file path (default: downloads/network.log)
  --limit <number>   Top N rows for ranking sections (default: 10)
  --tag <name>       Filter by tag (e.g. "HTTP Request")
  --level <name>     Filter by level (info/error)
  --path <keyword>   Filter payload.path includes keyword
  --json             Output JSON summary
  --help, -h         Show this help
`);
}

function inc(map, key, delta = 1) {
    if (!key) return;
    map.set(key, (map.get(key) || 0) + delta);
}

function topEntries(map, limit) {
    return [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([key, value]) => ({ key, value }));
}

function topSlowRequests(items, limit) {
    return items
        .sort((a, b) => b.durationMs - a.durationMs)
        .slice(0, limit);
}

function statusClass(status) {
    if (!Number.isFinite(status)) return 'unknown';
    if (status >= 100 && status < 200) return '1xx';
    if (status >= 200 && status < 300) return '2xx';
    if (status >= 300 && status < 400) return '3xx';
    if (status >= 400 && status < 500) return '4xx';
    if (status >= 500 && status < 600) return '5xx';
    return 'other';
}

async function analyze(filePath, options) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`log file not found: ${filePath}`);
    }

    const byTag = new Map();
    const byLevel = new Map();
    const byPath = new Map();
    const byStatus = new Map();
    const byStatusClass = new Map();

    const slowCandidates = [];

    let totalLines = 0;
    let parsedLines = 0;
    let filteredOut = 0;
    let parseErrors = 0;
    let firstTs = null;
    let lastTs = null;

    const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    for await (const line of rl) {
        totalLines += 1;
        if (!line || !line.trim()) continue;

        let row;
        try {
            row = JSON.parse(line);
        } catch (_) {
            parseErrors += 1;
            continue;
        }

        const tag = row?.tag || '';
        const level = row?.level || '';
        const payloadPath = row?.payload?.path || row?.payload?.url || '';

        if (options.tag && tag !== options.tag) {
            filteredOut += 1;
            continue;
        }
        if (options.level && level !== options.level) {
            filteredOut += 1;
            continue;
        }
        if (options.pathContains && !String(payloadPath).includes(options.pathContains)) {
            filteredOut += 1;
            continue;
        }

        parsedLines += 1;

        const ts = row?.ts ? new Date(row.ts).toISOString() : null;
        if (ts && !firstTs) firstTs = ts;
        if (ts) lastTs = ts;

        inc(byTag, tag);
        inc(byLevel, level);

        if (payloadPath) {
            inc(byPath, payloadPath);
        }

        const statusRaw = row?.payload?.status;
        const status = Number.isFinite(Number(statusRaw)) ? Number(statusRaw) : null;
        if (status !== null) {
            inc(byStatus, String(status));
            inc(byStatusClass, statusClass(status));
        } else {
            inc(byStatusClass, 'unknown');
        }

        const durationMs = Number(row?.payload?.durationMs);
        if (Number.isFinite(durationMs) && payloadPath) {
            slowCandidates.push({
                ts: row?.ts || null,
                tag,
                path: payloadPath,
                status,
                durationMs,
                level,
            });
        }
    }

    const summary = {
        file: filePath,
        totalLines,
        parsedLines,
        parseErrors,
        filteredOut,
        firstTs,
        lastTs,
        topTags: topEntries(byTag, options.limit),
        topLevels: topEntries(byLevel, options.limit),
        statusCodes: topEntries(byStatus, options.limit),
        statusClasses: topEntries(byStatusClass, options.limit),
        topPaths: topEntries(byPath, options.limit),
        slowRequests: topSlowRequests(slowCandidates, options.limit),
    };

    return summary;
}

function printHuman(summary, limit) {
    console.log('=== Network Log Summary ===');
    console.log(`file: ${summary.file}`);
    console.log(`totalLines: ${summary.totalLines}`);
    console.log(`parsedLines: ${summary.parsedLines}`);
    console.log(`parseErrors: ${summary.parseErrors}`);
    console.log(`filteredOut: ${summary.filteredOut}`);
    console.log(`timeRange: ${summary.firstTs || '-'}  ->  ${summary.lastTs || '-'}`);

    const printSection = (title, rows, formatter = (r) => `${r.key}: ${r.value}`) => {
        console.log(`\n${title}`);
        if (!rows.length) {
            console.log('  (empty)');
            return;
        }
        rows.forEach((row, i) => {
            console.log(`  ${i + 1}. ${formatter(row)}`);
        });
    };

    printSection(`Top Tags (top ${limit})`, summary.topTags);
    printSection(`Top Levels (top ${limit})`, summary.topLevels);
    printSection(`Status Codes (top ${limit})`, summary.statusCodes);
    printSection(`Status Classes (top ${limit})`, summary.statusClasses);
    printSection(`Top Paths (top ${limit})`, summary.topPaths);
    printSection(`Slow Requests (top ${limit})`, summary.slowRequests, (r) => {
        return `${r.durationMs}ms | ${r.status ?? '-'} | ${r.tag} | ${r.path}`;
    });
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    const summary = await analyze(options.file, options);

    if (options.json) {
        console.log(JSON.stringify(summary, null, 2));
        return;
    }

    printHuman(summary, options.limit);
}

main().catch((error) => {
    console.error('[network-log-analyze] failed:', error.message);
    process.exit(1);
});
