import fs from 'fs';
import path from 'path';

const LOG_MODE = (process.env.NETWORK_LOG_MODE || 'file').toLowerCase();
const LOG_FILE = process.env.NETWORK_LOG_FILE || path.resolve(process.cwd(), 'downloads/network.log');

const ENABLE_HTTP_LOG = String(process.env.NETWORK_LOG_HTTP || 'true').toLowerCase() !== 'false';
const ENABLE_AXIOS_LOG = String(process.env.NETWORK_LOG_AXIOS || 'true').toLowerCase() !== 'false';

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

    if (LOG_MODE === 'file' || LOG_MODE === 'both') {
        await writeToFile(line);
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
