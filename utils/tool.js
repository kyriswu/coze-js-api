import axios from 'axios';
import fs from 'fs';
import { URL,fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path'
import http from 'http';
import https from 'https';
import { execFile } from 'child_process';
import { exec } from 'child_process';
import util from 'util';
import { response } from 'express';
import redis from './redisClient.js';
import crypto from 'crypto';
import whisperapi from './whisperapi.js';
import { JSDOM } from 'jsdom';
import { Throttle } from 'stream-throttle';
import { th_youtube } from './tikhub.io.js';
import browserless from './ThirdParrtyApi/browserless.js';
import filetool from './ThirdParrtyApi/filetool.js';
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Convert exec to Promise-based function
const execPromise = util.promisify(exec);

const parseEnvInt = (value, fallback) => {
    const num = Number.parseInt(value, 10);
    return Number.isFinite(num) && num >= 0 ? num : fallback;
};

const DOWNLOAD_TIMEOUT = parseEnvInt(process.env.DOWNLOAD_TIMEOUT, 600000);
const DOWNLOAD_RATE_LIMIT = parseEnvInt(process.env.DOWNLOAD_RATE_LIMIT, 0);
const DOWNLOAD_STREAM_HWM = parseEnvInt(process.env.DOWNLOAD_STREAM_HWM, 1024 * 1024);
const DOWNLOAD_MAX_RETRIES = parseEnvInt(process.env.DOWNLOAD_MAX_RETRIES, 3);
const DOWNLOAD_RETRY_BASE_DELAY = parseEnvInt(process.env.DOWNLOAD_RETRY_BASE_DELAY, 800);
const DOWNLOAD_PARALLEL_CONCURRENCY = parseEnvInt(process.env.DOWNLOAD_PARALLEL_CONCURRENCY, 4);
const DOWNLOAD_PARALLEL_MIN_SIZE = parseEnvInt(process.env.DOWNLOAD_PARALLEL_MIN_SIZE, 20 * 1024 * 1024);
const DOWNLOAD_PARALLEL_CHUNK_SIZE = parseEnvInt(process.env.DOWNLOAD_PARALLEL_CHUNK_SIZE, 8 * 1024 * 1024);

const downloadHttpAgent = new http.Agent({
    keepAlive: true,
    maxSockets: 64,
    maxFreeSockets: 16,
    timeout: DOWNLOAD_TIMEOUT,
});

const downloadHttpsAgent = new https.Agent({
    keepAlive: true,
    maxSockets: 64,
    maxFreeSockets: 16,
    timeout: DOWNLOAD_TIMEOUT,
});

const downloadAxios = axios.create({
    timeout: DOWNLOAD_TIMEOUT,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    httpAgent: downloadHttpAgent,
    httpsAgent: downloadHttpsAgent,
});

const tool = {
    createDownloadWriter: function (filepath) {
        return fs.createWriteStream(filepath, { highWaterMark: DOWNLOAD_STREAM_HWM });
    },
    pipeDownloadStream: function (source, writer) {
        if (DOWNLOAD_RATE_LIMIT > 0) {
            const throttle = new Throttle({ rate: DOWNLOAD_RATE_LIMIT });
            source.pipe(throttle).pipe(writer);
            return;
        }
        source.pipe(writer);
    },
    sleep: async function (ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    getFileSizeSafe: function (filepath) {
        try {
            if (!fs.existsSync(filepath)) {
                return 0;
            }
            return fs.statSync(filepath).size;
        } catch (error) {
            return 0;
        }
    },
    bytesToMBNumber: function (bytes) {
        return Number(bytes || 0) / (1024 * 1024);
    },
    calculateThroughputMBps: function (bytes, elapsedMs) {
        if (!Number.isFinite(bytes) || !Number.isFinite(elapsedMs) || elapsedMs <= 0) {
            return 0;
        }
        return this.bytesToMBNumber(bytes) / (elapsedMs / 1000);
    },
    logDownloadMetrics: function ({
        label,
        mode,
        chunkCount,
        elapsedMs,
        bytes,
        retried,
    }) {
        const safeChunkCount = Number.isFinite(chunkCount) && chunkCount > 0 ? chunkCount : 1;
        const safeElapsedMs = Number.isFinite(elapsedMs) && elapsedMs >= 0 ? elapsedMs : 0;
        const safeBytes = Number.isFinite(bytes) && bytes >= 0 ? bytes : 0;
        const avgThroughput = this.calculateThroughputMBps(safeBytes, safeElapsedMs);
        const elapsedSec = (safeElapsedMs / 1000).toFixed(2);
        const sizeMB = this.bytesToMBNumber(safeBytes).toFixed(2);

        console.log(
            `[download-metrics] label=${label || 'unknown'} mode=${mode || 'unknown'} chunks=${safeChunkCount} retries=${retried || 0} elapsed_s=${elapsedSec} size_mb=${sizeMB} avg_mb_s=${avgThroughput.toFixed(2)}`
        );
    },
    parseContentRangeTotal: function (contentRangeHeader) {
        if (!contentRangeHeader) {
            return null;
        }

        const match = String(contentRangeHeader).match(/\/(\d+)$/);
        if (!match) {
            return null;
        }

        const total = Number.parseInt(match[1], 10);
        return Number.isFinite(total) ? total : null;
    },
    isByteRangeSupported: function (acceptRangesHeader) {
        return String(acceptRangesHeader || '').toLowerCase().includes('bytes');
    },
    getRangeProbeMeta: async function (url, headers = {}) {
        try {
            const headRes = await downloadAxios({
                method: 'head',
                url,
                headers,
            });

            const totalSize = Number.parseInt(headRes.headers['content-length'], 10);
            return {
                supported: this.isByteRangeSupported(headRes.headers['accept-ranges']),
                totalSize: Number.isFinite(totalSize) ? totalSize : null,
                headers: headRes.headers,
            };
        } catch (error) {
            try {
                const probeRes = await downloadAxios({
                    method: 'get',
                    url,
                    responseType: 'stream',
                    headers: {
                        ...headers,
                        Range: 'bytes=0-0',
                    },
                });

                if (probeRes.data && typeof probeRes.data.destroy === 'function') {
                    probeRes.data.destroy();
                }

                const totalSize = this.parseContentRangeTotal(probeRes.headers['content-range'])
                    || Number.parseInt(probeRes.headers['content-length'], 10);
                return {
                    supported: probeRes.status === 206,
                    totalSize: Number.isFinite(totalSize) ? totalSize : null,
                    headers: probeRes.headers,
                };
            } catch (probeError) {
                return {
                    supported: false,
                    totalSize: null,
                    headers: null,
                };
            }
        }
    },
    shouldUseParallelDownload: function (meta, headers = {}) {
        if (!meta || !meta.supported) {
            return false;
        }
        if (!Number.isFinite(meta.totalSize) || meta.totalSize <= 0) {
            return false;
        }
        if (meta.totalSize < DOWNLOAD_PARALLEL_MIN_SIZE) {
            return false;
        }
        if (DOWNLOAD_PARALLEL_CONCURRENCY <= 1) {
            return false;
        }
        if (headers.Range) {
            return false;
        }
        return true;
    },
    downloadRangePartOnce: async function (url, start, end, outputPath, headers = {}) {
        const response = await downloadAxios({
            method: 'get',
            url,
            responseType: 'stream',
            headers: {
                ...headers,
                Range: `bytes=${start}-${end}`,
            },
        });

        const writer = fs.createWriteStream(outputPath, { highWaterMark: DOWNLOAD_STREAM_HWM });
        this.pipeDownloadStream(response.data, writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
            response.data.on('error', reject);
        });

        const expectedSize = end - start + 1;
        const actualSize = this.getFileSizeSafe(outputPath);
        if (actualSize !== expectedSize) {
            throw new Error(`分片大小不一致，期望 ${expectedSize} 实际 ${actualSize}`);
        }

        return response.headers;
    },
    downloadRangePartWithRetry: async function (url, start, end, outputPath, headers = {}) {
        let lastError = null;
        const maxAttempts = DOWNLOAD_MAX_RETRIES + 1;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await this.downloadRangePartOnce(url, start, end, outputPath, headers);
            } catch (error) {
                lastError = error;
                if (attempt >= maxAttempts) {
                    break;
                }

                const delay = DOWNLOAD_RETRY_BASE_DELAY * (2 ** (attempt - 1));
                console.error(`分片下载失败，准备重试（${attempt}/${maxAttempts - 1}），${delay}ms 后继续：`, error.message);
                await this.sleep(delay);
            }
        }

        throw lastError || new Error('分片下载失败');
    },
    mergePartFiles: async function (partFilePaths, outputPath) {
        const writer = fs.createWriteStream(outputPath, {
            flags: 'w',
            highWaterMark: DOWNLOAD_STREAM_HWM,
        });

        for (const partPath of partFilePaths) {
            await new Promise((resolve, reject) => {
                const reader = fs.createReadStream(partPath, { highWaterMark: DOWNLOAD_STREAM_HWM });
                reader.on('error', reject);
                writer.on('error', reject);
                reader.on('end', resolve);
                reader.pipe(writer, { end: false });
            });
        }

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
            writer.end();
        });
    },
    downloadParallelChunks: async function (url, filepath, headers = {}, meta) {
        const totalSize = meta.totalSize;
        const chunkSize = Math.max(DOWNLOAD_PARALLEL_CHUNK_SIZE, Math.ceil(totalSize / DOWNLOAD_PARALLEL_CONCURRENCY));
        const partDir = `${filepath}.parts`;
        const mergedPartFilepath = `${filepath}.part`;

        if (!fs.existsSync(partDir)) {
            fs.mkdirSync(partDir, { recursive: true });
        }

        const ranges = [];
        for (let start = 0, index = 0; start < totalSize; start += chunkSize, index++) {
            const end = Math.min(start + chunkSize - 1, totalSize - 1);
            ranges.push({
                index,
                start,
                end,
                partPath: path.join(partDir, `part_${index}.bin`),
            });
        }

        const concurrency = Math.min(DOWNLOAD_PARALLEL_CONCURRENCY, ranges.length);
        let responseHeaders = meta.headers || {};
        let cursor = 0;
        const runWorker = async () => {
            while (true) {
                const current = cursor;
                cursor += 1;
                if (current >= ranges.length) {
                    return;
                }

                const range = ranges[current];
                const headersFromPart = await this.downloadRangePartWithRetry(
                    url,
                    range.start,
                    range.end,
                    range.partPath,
                    headers
                );
                if (!responseHeaders || Object.keys(responseHeaders).length === 0) {
                    responseHeaders = headersFromPart;
                }
            }
        };

        try {
            await Promise.all(Array.from({ length: concurrency }, () => runWorker()));
            await this.mergePartFiles(ranges.map(item => item.partPath), mergedPartFilepath);

            if (this.getFileSizeSafe(mergedPartFilepath) !== totalSize) {
                throw new Error('合并后的文件大小校验失败');
            }

            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
            }
            fs.renameSync(mergedPartFilepath, filepath);
            return {
                status: 206,
                mode: 'parallel-chunked',
                chunkCount: ranges.length,
                retries: 0,
                headers: responseHeaders,
                totalSize,
                fileSize: totalSize,
                filepath,
            };
        } finally {
            if (fs.existsSync(mergedPartFilepath)) {
                fs.unlinkSync(mergedPartFilepath);
            }
            if (fs.existsSync(partDir)) {
                for (const file of fs.readdirSync(partDir)) {
                    const partPath = path.join(partDir, file);
                    if (fs.existsSync(partPath)) {
                        fs.unlinkSync(partPath);
                    }
                }
                fs.rmdirSync(partDir);
            }
        }
    },
    downloadToPartOnce: async function (url, filepath, headers) {
        const partFilepath = `${filepath}.part`;
        let existingBytes = this.getFileSizeSafe(partFilepath);

        const requestHeaders = {
            ...headers,
        };
        if (existingBytes > 0) {
            requestHeaders.Range = `bytes=${existingBytes}-`;
        }

        let response;
        try {
            response = await downloadAxios({
                method: 'get',
                url,
                responseType: 'stream',
                headers: requestHeaders,
            });
        } catch (error) {
            if (error?.response?.status === 416) {
                if (fs.existsSync(partFilepath)) {
                    fs.unlinkSync(partFilepath);
                }
            }
            throw error;
        }

        const supportsResume = response.status === 206;
        if (existingBytes > 0 && !supportsResume) {
            if (fs.existsSync(partFilepath)) {
                fs.unlinkSync(partFilepath);
            }
            existingBytes = 0;
        }

        const writer = fs.createWriteStream(partFilepath, {
            flags: existingBytes > 0 && supportsResume ? 'a' : 'w',
            highWaterMark: DOWNLOAD_STREAM_HWM,
        });
        this.pipeDownloadStream(response.data, writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
            response.data.on('error', reject);
        });

        const contentLength = Number.parseInt(response.headers['content-length'], 10);
        const totalByRange = this.parseContentRangeTotal(response.headers['content-range']);
        const totalSize = Number.isFinite(totalByRange)
            ? totalByRange
            : (Number.isFinite(contentLength)
                ? ((existingBytes > 0 && supportsResume) ? existingBytes + contentLength : contentLength)
                : null);

        const finalSize = this.getFileSizeSafe(partFilepath);
        if (Number.isFinite(totalSize) && totalSize > 0 && finalSize < totalSize) {
            throw new Error(`下载未完成，已下载 ${finalSize}/${totalSize} 字节`);
        }

        return {
            status: response.status,
            mode: supportsResume ? 'single-stream-resume' : 'single-stream-full',
            chunkCount: 1,
            resumedBytes: existingBytes,
            headers: response.headers,
            totalSize,
            finalSize,
            partFilepath,
        };
    },
    downloadWithResume: async function (url, filepath, headers = {}, options = {}) {
        const { allowParallel = true, label = 'download' } = options;
        const startMs = Date.now();
        const hasExistingPart = this.getFileSizeSafe(`${filepath}.part`) > 0;
        if (allowParallel && !hasExistingPart && !headers.Range) {
            const meta = await this.getRangeProbeMeta(url, headers);
            if (this.shouldUseParallelDownload(meta, headers)) {
                try {
                    console.log(`检测到支持分片下载，启用并发分片，文件大小：${this.bytesToMB(meta.totalSize)}MB`);
                    const parallelResult = await this.downloadParallelChunks(url, filepath, headers, meta);
                    const elapsedMs = Date.now() - startMs;
                    this.logDownloadMetrics({
                        label,
                        mode: parallelResult.mode,
                        chunkCount: parallelResult.chunkCount,
                        elapsedMs,
                        bytes: parallelResult.fileSize,
                        retried: parallelResult.retries || 0,
                    });
                    return parallelResult;
                } catch (parallelError) {
                    console.error('并发分片下载失败，回退到单流断点续传：', parallelError.message);
                }
            }
        }

        let lastError = null;
        const maxAttempts = DOWNLOAD_MAX_RETRIES + 1;
        let attemptUsed = 0;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            attemptUsed = attempt;
            try {
                const result = await this.downloadToPartOnce(url, filepath, headers);
                if (fs.existsSync(filepath)) {
                    fs.unlinkSync(filepath);
                }
                fs.renameSync(result.partFilepath, filepath);
                const elapsedMs = Date.now() - startMs;
                const finalSize = this.getFileSizeSafe(filepath);
                this.logDownloadMetrics({
                    label,
                    mode: result.mode,
                    chunkCount: result.chunkCount,
                    elapsedMs,
                    bytes: finalSize,
                    retried: Math.max(attemptUsed - 1, 0),
                });
                return {
                    status: result.status,
                    mode: result.mode,
                    chunkCount: result.chunkCount,
                    retries: Math.max(attemptUsed - 1, 0),
                    headers: result.headers,
                    totalSize: result.totalSize,
                    fileSize: finalSize,
                    filepath,
                };
            } catch (error) {
                lastError = error;
                const isLastAttempt = attempt >= maxAttempts;
                if (isLastAttempt) {
                    break;
                }

                const delay = DOWNLOAD_RETRY_BASE_DELAY * (2 ** (attempt - 1));
                console.error(`下载失败，准备重试（${attempt}/${maxAttempts - 1}），${delay}ms 后继续：`, error.message);
                await this.sleep(delay);
            }
        }

        throw lastError || new Error('下载失败');
    },
    request_chromium: async function (url, cookie, xpath, selector, waitUntil) {

        if(!this.isValidUrl(url)){
            throw new Error("url链接不正确，请使用正确的链接")
        }
        // 增加特殊域名列表，命中则走国内代理逻辑
        const chinaDomainList = [
            'tophub.today','qunar.com','zjedu.org','org.cn','news.cn','douyin.com','gz-cmc.com','10jqka.com.cn','sina.com.cn','gov.cn','chinamobile.com','huorong.cn','yixue99.com','xaprtc.com','com.cn','offcn.com','newrank.cn','szfcweb.com','eastmoney.com',
            'thepaper.cn','qbitai.com','cnfin.com','agri.cn'
            // 可继续添加更多域名
        ];
        const urlObj = new URL(url);
        const isChinaDomain = chinaDomainList.some(domain => urlObj.hostname.endsWith(domain));
        console.log("当前访问的域名：", urlObj.hostname, "是否为国内域名：", isChinaDomain);
        if (!isChinaDomain) {
             try {
                let response = await browserless.chromium_content(url, {cookie:cookie, element_type: xpath ? 'xpath' : 'selector', element: xpath || selector, waitUntil:waitUntil || 'domcontentloaded'});
                return response.data;
             }catch(err){
                console.error("Browserless 请求失败：", err);
                return null;
             }
             
        }

        const options = {
            method: 'POST',
            url: 'http://1.15.114.179:3000/cn_explorer',
            headers: { 'content-type': 'application/json' },
            data: {
                url: url,
                xpath: xpath ? xpath : null,
                selector: selector ? selector : null,
                cookie: cookie ? cookie : null
            }
        };

        try {
            const { data } = await axios.request(options);
            return data.data
        } catch (error) {
            console.error(error);
            return null
        }
    },
    whoisinfo: function (domain) {
        const python = 'python';
        const script = path.join(__dirname, '../whoisinfo.py');

        execFile(python, [script, domain], (error, stdout, stderr) => {
            if (error) {
                // console.error(error);
            }

            const output = stdout.trim().split('\n');

            console.log('Whois Information:', output);
            return output[0]
        });
    },
    mix_videos: async function (videos) {
        try {
            const downloadDir = path.join(__dirname, '..', 'downloads');
            const timestamp = new Date().getTime();
            const txt_filename = `${timestamp}_filelist.txt`
            const txt_filepath = path.join(downloadDir, txt_filename);
            
            let fileListContent = '';

            for (let i = 0; i < videos.length; i++) {
                let video_name = path.basename(videos[i]);
                let video_path = path.join(downloadDir, video_name);
                if (!fs.existsSync(video_path)) {
                    // 文件不在本地，先下载
                    console.log(`文件不存在，开始下载: ${videos[i]}`);
                    const downloaded = await this.download_video(videos[i]);
                    video_path = downloaded.filepath;
                }

                // 注意：ffmpeg concat 格式中的路径要使用绝对路径并包裹在单引号中
                fileListContent += `file '${video_path}'\n`;
            }

            // 写入 txt 文件，设定编码为 utf8
            fs.writeFileSync(txt_filepath, fileListContent, { encoding: 'utf8' });

            console.log('生成的视频列表文件路径：', txt_filename);
            const out_video_name = `video_${timestamp}.mp4`
            const out_video_path = path.join(downloadDir, out_video_name);
            const command = `ffmpeg -f concat -safe 0 -i ${txt_filepath} -c copy -y ${out_video_path}`;
            const { stdout, stderr } = await execPromise(command)
            return out_video_name
        }catch(err){
            console.error(err)
            throw err
        }
        
    },
    mix_video_and_audio: async function (video_url, audio_url) {
        try {
            const downloadDir = path.join(__dirname, '..', 'downloads');
            const video = await this.download_video(video_url)
            const audio = await this.download_audio(audio_url)
            const timestamp = new Date().getTime();
            const output_video = `video_${timestamp}.mp4`;
            const output_path = path.join(downloadDir, output_video);
            // Construct ffmpeg command
            const command = `ffmpeg -i ${video.filepath} -i ${audio.filepath} -filter_complex "[1:a]apad=pad_dur=100000[aud]" -map 0:v:0 -map "[aud]" -c:v copy -c:a aac -shortest ${output_path}`

            // Execute ffmpeg command
            const { stdout, stderr } = await execPromise(command);

            return output_video
        } catch (err) {
            console.error('Error mixing video and audio:', err);
            return err.message;
        }
    },
    gen_cookie: async function (cookieStr, domain, path) {
        // 目标网站的域名和路径（需替换为实际值）
        // const domain = 'example.com'; // 请替换为目标网站的实际域名
        // const path = '/';

        // 解析 Cookie 字符串为 Puppeteer 可用的对象数组
        const cookies = cookieStr.split('; ').map(pair => {
            const [name, ...valueParts] = pair.split('=');
            const value = valueParts.join('='); // 处理值中包含等号的情况
            return { name, value, domain, path };
        });

        return cookies
    },
    /**
 * 判断输入是 CSS Selector 还是 XPath，或者都不是
 * @param {string} sel - 选择器字符串
 * @returns {'css'|'xpath'}
 * @throws {Error} - 输入无效时抛错
 */
 identifySelector: function (sel) {
     const s = sel.trim();
  const xpathStart = s.startsWith('//') || s.startsWith('(/') || s.startsWith('/html') || s.startsWith('/');
  const xpathSyntax = s.includes('@') || s.includes('::') || s.includes('[');
  if (xpathStart || xpathSyntax) return 'xpath';
  return 'css';
},
    // 计算距离今晚24点还有多少秒
    getSecondsToMidnight: function() {
        // 获取当前 UTC 时间，加 8 小时得到北京时间
        const now = new Date();
        const beijingNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);

        // 构造北京时间的明天零点
        const midnight = new Date(beijingNow);
        midnight.setHours(24, 0, 0, 0);

        // 计算北京时间剩余秒数
        const diffMs = midnight - beijingNow;
        return Math.floor(diffMs / 1000);
    },
    isValidUrl: function (url) {
        try {
            new URL(url);
            return true;
        } catch (e) {
            return false;
        }
    },
    getClientIp: function (req) {
        const xForwardedFor = req.headers['x-forwarded-for'];
        const firstIp = typeof xForwardedFor === 'string' ? xForwardedFor.split(',')[0].trim() : '';
        const fallbackIp = req.ip || req.socket?.remoteAddress || 'unknown';
        return (firstIp || fallbackIp).replace('::ffff:', '');
    },
    getBaseUrl: function (req) {
        const host = req.get('host');
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        return `${protocol}://${host}`;
    },
    getUsage: async function (key) {
        let value = await redis.get(key);
        if (value === null) {
            const now = new Date();
            const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const secondsSinceMidnight = Math.floor((now - midnight) / 1000);
            await redis.set(key, 0, 'EX', secondsSinceMidnight);
            value = 0;
            console.log(`键 ${key} 不存在，已创建并初始化为 0`);
        } else {
            console.log(`键 ${key} 已存在，当前值为 ${value}`);
        }
        return value;
    },
    sanitizeUsageMetadata: function ({ url, selector, xpath }) {
        const regex = /[^a-zA-Z0-9_=/.:-]/g;
        return {
            url: url?.replace(regex, ''),
            selector: selector?.replace(regex, ''),
            xpath: xpath?.replace(regex, '')
        };
    },
    canUseSitemapFreeOnce: async function (key) {
        const value = await redis.get(key);
        if (value === null) {
            const now = new Date();
            const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const secondsSinceMidnight = Math.floor((now - midnight) / 1000);
            await redis.set(key, 0, 'EX', secondsSinceMidnight);
            return true;
        }
        return false;
    },
    canUseFreeVideoDownload: async function (key) {
        const value = await redis.get(key);
        const left = Number(value);
        return Number.isFinite(left) ? left > 0 : true;
    },
    canUseRedisPoints: async function (key, cost = 3) {
        const value = await redis.get(key);
        if (value === null) return false;
        const points = Number(value);
        return Number.isFinite(points) && points >= cost;
    },
    extFromContentType: function (contentType) {
        const type = (contentType || 'image/png').split(';')[0].trim().toLowerCase();
        if (type === 'image/jpeg') return 'jpg';
        if (type === 'image/webp') return 'webp';
        if (type === 'image/gif') return 'gif';
        if (type === 'image/bmp') return 'bmp';
        return 'png';
    },
    saveBase64ImageToDownloads: async function (base64Image, prefix = 'image') {
        if (!base64Image || typeof base64Image !== 'string') {
            throw new Error('base64 图片数据不能为空');
        }

        let ext = 'png';
        let pureBase64 = base64Image.trim();

        const dataUrlMatch = pureBase64.match(/^data:([^;]+);base64,(.+)$/);
        if (dataUrlMatch) {
            const mime = dataUrlMatch[1] || 'image/png';
            pureBase64 = dataUrlMatch[2] || '';
            ext = this.extFromContentType(mime);
        }

        const downloadDir = path.join(__dirname, '..', 'downloads');
        if (!fs.existsSync(downloadDir)) {
            fs.mkdirSync(downloadDir, { recursive: true });
        }

        const fileName = `${prefix}-${Date.now()}-${process.pid}.${ext}`;
        const filePath = path.join(downloadDir, fileName);
        await fs.promises.writeFile(filePath, Buffer.from(pureBase64, 'base64'));

        return {
            fileName,
            filePath
        };
    },
    downloadImageUrlToTempFile: async function (imageUrl, index = 0) {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 20000 });
        const contentType = response.headers?.['content-type'] || 'image/png';
        if (!String(contentType).startsWith('image/')) {
            throw new Error(`第 ${index + 1} 张参考图不是有效图片资源`);
        }

        console.log(`正在下载第 ${index + 1} 张图片，URL: ${imageUrl}, Content-Type: ${contentType}`);

        const ext = this.extFromContentType(contentType);
        const downloadDir = path.join(__dirname, '..', 'downloads');
        if (!fs.existsSync(downloadDir)) {
            fs.mkdirSync(downloadDir, { recursive: true });
        }
        const tempFile = path.join(downloadDir, `gpt-image-2-${Date.now()}-${process.pid}-${index}.${ext}`);
        await fs.promises.writeFile(tempFile, Buffer.from(response.data));
        return tempFile;
    },
    download_image: async function (url) {
        try {
            // Create downloads directory if it doesn't exist
            const downloadDir = path.join(__dirname, '..', 'downloads');
            if (!fs.existsSync(downloadDir)) {
                fs.mkdirSync(downloadDir);
            }

            // Generate filename with timestamp
            const timestamp = new Date().getTime();
            const tempFile = path.join(downloadDir, `image_${timestamp}.tmp`);
            const finalFile = path.join(downloadDir, `image_${timestamp}.jpg`);

            // Download image 
            const response = await axios({
                method: 'get',
                url: url,
                responseType: 'stream',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            // Save to temp file
            const writer = fs.createWriteStream(tempFile);
            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', async () => {
                    try {
                        // Convert to jpg using ffmpeg
                        await execPromise(`ffmpeg -i ${tempFile} ${finalFile}`);
                        // Delete temp file
                        fs.unlinkSync(tempFile);
                        const stats = fs.statSync(finalFile);
                        resolve({
                            success: true,
                            filepath: finalFile,
                            filename: path.basename(finalFile),
                            size: stats.size
                        });
                    } catch (err) {
                        reject(err);
                    }
                });
                writer.on('error', reject);
            });

        } catch (error) {
            console.error('Error downloading image:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    yt_dlp_audio: async function (url) {    
        try {
            let audio_url = await browserless.extract_youtube_audio_url("https://tuberipper.com/",url)
            let audio = await tool.download_audio(audio_url)
            return {
                success: true,
                filepath: audio.filepath,
                filename: audio.filename,
                is_audio: true,
            };
        } catch (error) {
            return {
                success: false, 
                error: error.message
            };
        }
    },
    getExtensionFromCodec: function(codec) {
        const codecToExt = {
            // 音频编码
            'mp3': 'mp3',
            'aac': 'm4a',
            'wav': 'wav',
            'vorbis': 'ogg',
            'opus': 'opus',
            'flac': 'flac',
            'pcm_s16le': 'wav',    // PCM 编解码器
            'alaw': 'wav',         // A-law 编解码器
            'mulaw': 'wav',        // μ-law 编解码器
            'speex': 'spx',        // Speex 编解码器
            'ac3': 'ac3',          // AC3 编解码器
            'eac3': 'eac3',        // EAC3 编解码器
            'dts': 'dts',          // DTS 编解码器
            'truehd': 'truehd',    // TrueHD 编解码器
            'midi': 'midi',        // MIDI 编解码器

            // 视频编码
            'h264': 'mp4',         // H.264 编解码器
            'hevc': 'mp4',         // HEVC (H.265) 编解码器
            'vp8': 'webm',         // VP8 编解码器
            'vp9': 'webm',         // VP9 编解码器
            'av1': 'mp4',          // AV1 编解码器
            'mpeg4': 'mp4',        // MPEG4 编解码器
            'theora': 'ogg',       // Theora 编解码器
            'divx': 'avi',         // DivX 编解码器
            'xvid': 'avi',         // Xvid 编解码器
            'prores': 'mov',       // Apple ProRes 编解码器
            'dnxhd': 'mov',        // Avid DNxHD 编解码器
            'jpeg2000': 'mov',     // JPEG 2000 编解码器
            'flv': 'flv',          // FLV 编解码器
            'wmv1': 'wmv',         // Windows Media Video 1
            'wmv2': 'wmv',         // Windows Media Video 2
            'vp6': 'flv',          // VP6 编解码器
            'vp7': 'flv',          // VP7 编解码器
            'mjpeg': 'avi',        // Motion JPEG 编解码器

            // 容器格式
            'matroska': 'mkv',     // Matroska 容器
            'mov': 'mov',          // QuickTime 容器
            'avi': 'avi',          // AVI 容器
            'flv': 'flv',          // FLV 容器
            'webm': 'webm',        // WebM 容器
            'mp4': 'mp4',          // MP4 容器
            'ogg': 'ogg',          // Ogg 容器
            'm3u8': 'm3u8',        // HLS 流媒体容器
            'ts': 'ts',            // MPEG-TS 容器
            '3gp': '3gp',          // 3GP 容器
            '3g2': '3g2',          // 3G2 容器
            'avi': 'avi'           // AVI 容器
        };

        return codecToExt[codec] || 'mp4';
    },
    getExtensionFromContentType: function(contentType) {
        if (!contentType) {
            return null;
        }

        const mimeToExtension = {
            'video/mp4': 'mp4',
            'video/mpeg': 'mpeg',
            'video/quicktime': 'mov',
            'video/webm': 'webm',
            'audio/mpeg': 'mp3',
            'audio/mp4': 'm4a',
            'audio/wav': 'wav',
            'audio/x-wav': 'wav',
            'audio/ogg': 'ogg',
            'audio/aac': 'aac',
            'audio/flac': 'flac',
            'audio/webm': 'webm',
        };

        const normalized = String(contentType).toLowerCase();
        const matchedType = Object.keys(mimeToExtension).find(type => normalized.includes(type));
        return matchedType ? mimeToExtension[matchedType] : null;
    },
    getMediaInfoFromExtension: function(extension) {
        const normalized = String(extension || '').replace(/^\./, '').toLowerCase();
        const videoExtensions = new Set(['mp4', 'mpeg', 'mov', 'mkv', 'avi', 'flv', '3gp', '3g2']);
        const audioExtensions = new Set(['mp3', 'm4a', 'aac', 'wav', 'flac']);

        if (videoExtensions.has(normalized)) {
            return {
                extension: normalized,
                is_video: true,
                is_audio: false,
                confident: true
            };
        }

        if (audioExtensions.has(normalized)) {
            return {
                extension: normalized,
                is_video: false,
                is_audio: true,
                confident: true
            };
        }

        return {
            extension: normalized || null,
            is_video: false,
            is_audio: false,
            confident: false
        };
    },
    getMediaInfoFromContentType: function(contentType) {
        if (!contentType) {
            return {
                extension: null,
                is_video: false,
                is_audio: false,
                confident: false
            };
        }

        const normalized = String(contentType).toLowerCase();
        const extension = this.getExtensionFromContentType(normalized);

        if (normalized.includes('video/')) {
            return {
                extension: extension,
                is_video: true,
                is_audio: false,
                confident: true
            };
        }

        if (normalized.includes('audio/')) {
            return {
                extension: extension,
                is_video: false,
                is_audio: true,
                confident: true
            };
        }

        return {
            extension: extension,
            is_video: false,
            is_audio: false,
            confident: false
        };
    },
    renameFileWithExtension: function(filepath, extension) {
        if (!extension) {
            return filepath;
        }

        const normalized = String(extension).replace(/^\./, '').toLowerCase();
        const currentExtension = path.extname(filepath).replace(/^\./, '').toLowerCase();
        if (currentExtension === normalized) {
            return filepath;
        }

        const newPath = currentExtension
            ? filepath.replace(/\.[^.]+$/, `.${normalized}`)
            : `${filepath}.${normalized}`;

        fs.renameSync(filepath, newPath);
        return newPath;
    },
    getExtensionFromFormat: function(formatName, hasVideo) {
        if (!formatName) {
            return hasVideo ? 'mp4' : 'mp3';
        }

        const formats = String(formatName).split(',');
        if (hasVideo) {
            if (formats.includes('mp4') || formats.includes('mov') || formats.includes('3gp') || formats.includes('3g2') || formats.includes('mj2')) {
                return 'mp4';
            }
            if (formats.includes('matroska')) {
                return 'mkv';
            }
            if (formats.includes('webm')) {
                return 'webm';
            }
            if (formats.includes('avi')) {
                return 'avi';
            }
            if (formats.includes('flv')) {
                return 'flv';
            }
            if (formats.includes('ogg')) {
                return 'ogg';
            }
        } else {
            if (formats.includes('mp3')) {
                return 'mp3';
            }
            if (formats.includes('wav')) {
                return 'wav';
            }
            if (formats.includes('ogg')) {
                return 'ogg';
            }
            if (formats.includes('flac')) {
                return 'flac';
            }
            if (formats.includes('aac')) {
                return 'aac';
            }
            if (formats.includes('mp4') || formats.includes('mov') || formats.includes('3gp') || formats.includes('3g2') || formats.includes('mj2') || formats.includes('ipod')) {
                return 'm4a';
            }
        }

        return null;
    },
    get_media_info: async function (file) {
        var command = ""
        if (process.env.NODE_ENV === 'online'){
             command = `ffprobe -v quiet -print_format json -show_format -show_streams "${file}"`;
        }else{
             command = `ffmpeg.ffprobe -v quiet -print_format json -show_format -show_streams "${file}"`;
        }

        try {
            // Execute ffmpeg command
            const { stdout, stderr } = await execPromise(command);

            const info = JSON.parse(stdout);
            const streams = info.streams || [];
            const format = info.format;
            const videoStream = streams.find(stream => stream.codec_type === 'video');
            const audioStream = streams.find(stream => stream.codec_type === 'audio');
            const hasVideo = Boolean(videoStream);
            const hasAudio = Boolean(audioStream);
            const primaryStream = videoStream || audioStream || streams[0] || {};
            const extension = this.getExtensionFromFormat(format?.format_name, hasVideo) || this.getExtensionFromCodec(primaryStream.codec_name);

            return {
                success: true,
                type: hasVideo ? 'video' : (hasAudio ? 'audio' : primaryStream.codec_type),
                codec: primaryStream.codec_name,
                format: format.format_name,
                extension: extension,
                hasVideo: hasVideo,
                hasAudio: hasAudio
            };
        } catch (error) {
            console.log(error)
            return {success:false, error: error.message};
        }
    },
    format_SRT_timestamp: function(seconds){
        const date = new Date(seconds * 1000);
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        const secs = String(date.getUTCSeconds()).padStart(2, '0');
        const millis = String(date.getUTCMilliseconds()).padStart(3, '0');
        return `${hours}:${minutes}:${secs},${millis}`;
    },
      /**
     * 用于将字符串转换为数字位索引
     * @param {string} str - 需要转换的秒数
     * @returns {string} 格式化后的时间字符串
     */
    hashCode: function(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const chr = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0; // 转为32位整数
        }
        return Math.abs(hash);
    },
    /**
     * 将秒数转换为时分秒格式
     * @param {number} seconds - 需要转换的秒数
     * @returns {string} 格式化后的时间字符串
     */
    formatDuration: function(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        let result = '';
        
        if (hours > 0) {
            result += `${hours}时`;
        }
        if (minutes > 0) {
            result += `${minutes}分`;
        }
        if (secs > 0 || result === '') {
            result += `${secs}秒`;
        }
        
        return result;
    },
    getMediaDuration: async function(file){
        var command = ""
        if (process.env.NODE_ENV === 'online'){
             command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${file}`;
        }else{
             command = `ffmpeg.ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${file}`;
        }
        
        try {
            // Execute ffmpeg command
            const { stdout, stderr } = await execPromise(command);
            console.log("stdout",stdout)
            console.log("stderr",stderr)
            return {success:true,duration:parseFloat(stdout.trim())};
        } catch (error) {
            return {success:false, error: error.message};
        }
    },
    /**
     * @param {string} text - 需要计算 MD5 的文本
     */
    md5: function(text) {
        return crypto.createHash('md5').update(text).digest('hex');
    },
    // Add helper function to convert bytes to MB
    bytesToMB: function(bytes) {
        return (bytes / (1024 * 1024)).toFixed(2);
    },
    download_video: async function (url,sourceUrl) {
        console.log(`Video Direct Link：${url} `)
        console.log(`Video Source Url：${sourceUrl} `)
        const downloadDir = path.join(__dirname, '..', 'downloads');
        if (!fs.existsSync(downloadDir)) {
            fs.mkdirSync(downloadDir);
        }

        // Generate filename with timestamp and extension
        const timestamp = new Date().getTime();
        const extension = 'mp4';
        var filename = `video_${timestamp}.${extension}`;
        var filepath = path.join(downloadDir, filename);
        
        try {
            let response
            if (sourceUrl && (sourceUrl.includes('youtube.com') || sourceUrl.includes('youtu.be'))) {
                let xxx = await tool.yt_dlp_audio(sourceUrl)
                console.log("yt-dlp 返回：", xxx)
                if (!xxx.success) {
                    console.error("yt-dlp 错误：", xxx.error, "下载youtube失败，重试 第1次 。。。")
                    xxx = await tool.yt_dlp_audio(sourceUrl)
                    if (!xxx.success) {
                        console.error("yt-dlp 错误：", xxx.error, "下载youtube失败，重试 第2次 。。。")
                        xxx = await tool.yt_dlp_audio(sourceUrl)
                        if (!xxx.success) {
                            console.error("yt-dlp 错误：", xxx.error, "下载youtube失败，重试 第3次 。。。")
                            xxx = await tool.yt_dlp_audio(sourceUrl)
                            if (!xxx.success) {
                                throw new Error(xxx.error);
                            }
                        }
                    }
                }
                
                return xxx
            } else {
                const downloadResult = await this.downloadWithResume(url, filepath, {
                    'Accept': '*/*',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Edg/136.0.0.0'
                }, {
                    label: 'video'
                });
                response = { headers: downloadResult.headers };
                filepath = downloadResult.filepath;
            }
            const contentType = response.headers['content-type'];
            console.log("下载格式", contentType);

            let mediaInfo = this.getMediaInfoFromContentType(contentType);
            // 部分 CDN 会返回 application/octet-stream，这里回退到 ffprobe 检测实际媒体类型。
            if (!mediaInfo.confident || !mediaInfo.is_video) {
                const probedInfo = await this.get_media_info(filepath);
                if (!probedInfo.success || probedInfo.type !== 'video') {
                    throw new Error('视频链接无效！请查看视频教程：【https://www.bilibili.com/video/BV169TizqE58】');
                }

                mediaInfo = {
                    extension: probedInfo.extension || 'mp4',
                    is_video: true,
                    is_audio: false,
                    confident: true
                };
            }
            
            const totalSize = this.getFileSizeSafe(filepath);
            console.log(`视频下载成功，视频大小：${this.bytesToMB(totalSize)}MB`)
            filepath = this.renameFileWithExtension(filepath, mediaInfo.extension || 'mp4');
            filename = path.basename(filepath);
            console.log(`视频保存成功，新的文件名：${filename}`);

            return {
                success: true,
                filepath: filepath,
                filename: filename,
                size: this.bytesToMB(totalSize),
                is_video: true,
                is_audio: false
            };

        } catch (error) {
            console.error('Error downloading video:', error, " video url:", url);
            return {
                success: false,
                error: error.message
            };
        }
    },
    isLocalFile: async function (url) {
        const downloadDir = path.join(__dirname, '..', 'downloads');
        if (!fs.existsSync(downloadDir)) {
            fs.mkdirSync(downloadDir);
        }

        if (url.includes('devtool.uk')){
            let filename = path.basename(url);
            // 获取文件名后缀
            let ext = path.extname(filename);
            let filepath = path.join(downloadDir, filename);
            if (fs.existsSync(filepath)) {

                return {
                    isLocalFile: true,
                    filepath: filepath,
                    filename: filename,
                    is_video: ext === '.mp4' || ext === '.webm' || ext === '.mov' || ext === '.avi',
                    is_audio: ext === '.mp3' || ext === '.wav' || ext === '.aac' || ext === '.ogg',
                }
            }
        }

        return {
            isLocalFile: false,
        }
    },
    //通用下载文件
    download_file: async function (url) {
        const downloadDir = path.join(__dirname, '..', 'downloads');
        if (!fs.existsSync(downloadDir)) {
            fs.mkdirSync(downloadDir);
        }
        
        const isf = await this.isLocalFile(url)
        if (isf.isLocalFile) return {
            success: true,
            ...isf
        }

        // Check if URL is from devtool.uk downloads directory
        if (url.includes('devtool.uk') && url.includes('/downloads/')) {
            let filename = path.basename(url);
            let filepath = path.join(downloadDir, filename);
            if (fs.existsSync(filepath)) {
                const ext = path.extname(filename);
                return {
                    success: true,
                    isLocalFile: true,
                    filepath: filepath,
                    filename: filename,
                    is_video: ext === '.mp4' || ext === '.webm' || ext === '.mov' || ext === '.avi',
                    is_audio: ext === '.mp3' || ext === '.wav' || ext === '.aac' || ext === '.ogg' || ext === '.m4a',
                };
            }
        }


        // Generate filename with timestamp and extension
        const timestamp = new Date().getTime();
        var filename = `file_${timestamp}`;
        var filepath = path.join(downloadDir, filename);
        
        try {
            const downloadResult = await this.downloadWithResume(url, filepath, {
                'Accept': '*/*',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Edg/136.0.0.0'
            }, {
                label: 'file'
            });
            let response = { headers: downloadResult.headers };
            filepath = downloadResult.filepath;
            const contentTypeMediaInfo = this.getMediaInfoFromContentType(response.headers['content-type']);
            const urlExtensionMediaInfo = this.getMediaInfoFromExtension(path.extname(new URL(url).pathname));
            
            const totalSize = this.getFileSizeSafe(filepath);
            console.log(`文件下载成功，文件大小：${this.bytesToMB(totalSize)}MB`)
            const inferredMediaInfo = contentTypeMediaInfo.confident ? contentTypeMediaInfo : urlExtensionMediaInfo;

            if (inferredMediaInfo.confident) {
                filepath = this.renameFileWithExtension(filepath, inferredMediaInfo.extension);
                filename = path.basename(filepath);
                console.log(`文件保存成功，新的文件名：${filename}`);

                return {
                    success: true,
                    filepath: filepath,
                    filename: filename,
                    size: this.bytesToMB(totalSize),
                    is_video: inferredMediaInfo.is_video,
                    is_audio: inferredMediaInfo.is_audio,
                };
            }

            const info = await this.get_media_info(filepath)
            if (!info.success) {
                throw new Error(info.error);
            }
            filepath = this.renameFileWithExtension(filepath, info.extension);
            filename = path.basename(filepath);
            console.log(`文件保存成功，新的文件名：${filename}`);

            return {
                success: true,
                filepath: filepath,
                filename: filename,
                size: this.bytesToMB(totalSize),
                is_video: info.type === 'video',
                is_audio: info.type === 'audio',
            };

        } catch (error) {
            console.error('Error downloading file:', error, " file url:", url);
            return {
                success: false,
                error: error.message
            };
        }
    },
    download_audio: async function (audio_url) {

        const downloadDir = path.join(__dirname, '..', 'downloads');
        if (!fs.existsSync(downloadDir)) {
            fs.mkdirSync(downloadDir);
        }

        // Generate filename with timestamp and extension
        const timestamp = new Date().getTime();
        const extension = 'mp3'
        var filename = `audio_${timestamp}.${extension}`;
        var filepath = path.join(downloadDir, filename);

        try {
            const downloadResult = await this.downloadWithResume(audio_url, filepath, {
                'Accept': '*/*',
                'sec-ch-ua': '"Chromium";v="137", "Not/A)Brand";v="24", "Google Chrome";v="137"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'sec-fetch-dest': 'document',
                'sec-fetch-mode': 'navigate', 
                'sec-fetch-site': 'none',
                'sec-fetch-user': '?1',
                'upgrade-insecure-requests': '1',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
            }, {
                label: 'audio'
            });
            const response = { headers: downloadResult.headers, status: downloadResult.status };
            filepath = downloadResult.filepath;

            console.log(`开始下载音频：${audio_url}`)
            console.log(`状态码：${response.status}`)

            if (!filetool.is_audio(response.headers['content-type'])) {
                throw new Error('音频链接无效！');
            }
            const mediaInfo = this.getMediaInfoFromContentType(response.headers['content-type']);

            const totalSize = this.getFileSizeSafe(filepath);
            filepath = this.renameFileWithExtension(filepath, mediaInfo.extension || 'mp3');
            filename = path.basename(filepath);
            console.log(`音频保存成功，新的文件名：${filename}`);

            return {
                success: true,
                filepath: filepath,
                filename: filename,
                size: this.bytesToMB(totalSize)
            };

        } catch (error) {
            console.error('Error downloading audio:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    video_to_audio: async function (video) {
        try {
            // Get the directory and original filen ame
            const dir = path.dirname(video);
            const originalFilename = path.basename(video);
            const extension = path.extname(video);
            
            // Replace 'video' with 'audio' in filename and change extension to .wav
            const outputFile = path.join(dir, originalFilename.replace('video', 'audio').replace(extension, '.mp3'));

            // Construct ffmpeg command
            const command = `ffmpeg -i ${video} -vn -ac 1 -ar 16000 -q:a 2 -y ${outputFile}`
            
            // Execute ffmpeg command
            const { stdout, stderr } = await execPromise(command);
            
            if (stderr && !fs.existsSync(outputFile)) {
                throw new Error('Audio conversion failed: ' + stderr);
            }
            // 成功后删除视频文件
            fs.unlink(video, (err) => {
                if (err) console.error('Error deleting video file:', err);
            });

            return {
                success: true,
                inputFile: video,
                outputFile: outputFile,
                stdout: stdout,
                stderr: stderr
            };

        } catch (error) {
            console.error('Error converting video to audio:', error.message, "\n 视频URL：", video);
            // 如果转换失败，删除视频文件
            fs.unlink(video, (err) => {
                if (err) console.error('Error deleting video file:', err);
            });
            return {
                success: false,
                error: error.message
            };
        }
    },
    remove_query_param: function (url) {
        const urlObj = new URL(url);
        return urlObj.origin + urlObj.pathname;
    },
    extract_url: function (text) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const matches = text.match(urlRegex);
        return matches ? matches[0] : null;
    },
    url_preprocess: async function (url) {
        try {
            const urlObj = new URL(url);
            // 检查域名是否为 bilibili.com
            if (!urlObj.hostname.endsWith('bilibili.com')) {
                return url;
            }

            // 检查是否匹配 /video/av{数字} 格式
            const avPattern = /^\/video\/av\d+\/?$/;
            if(avPattern.test(urlObj.pathname)){
                const response = await axios.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Edg/136.0.0.0'
                    },
                    // proxy: {
                    //     host: 'p.webshare.io',
                    //     port: 80,
                    //     auth: {
                    //         username: 'umwhniat-rotate',
                    //         password: 'eudczfs5mkzt'
                    //     },
                    //     protocol: 'http'
                    // }
                });
                if (response.status !== 200) {
                    throw new Error(`查询BV链接失败，HTTP error! status: ${response.status}`);
                }
                const htmlContent = response.data;
                const dom = new JSDOM(htmlContent);
                const { document, window } = dom.window;
                // Find meta tag with property="og:url"
                const metaTag = document.querySelector('meta[property="og:url"]');
                if (metaTag) {
                    const realUrl = metaTag.getAttribute('content');
                    console.log("真实BV链接：", realUrl)
                    return realUrl;
                }else{
                    console.log("没有找到meta标签：", htmlContent)
                    return url;
                }
            }

            // 如果不是 av 号或处理失败，直接返回原始 URL
            return url;

        } catch (error) {
            console.error('Error in url_preprocess:', error);
            // URL 解析失败
            return url;
        }       
    },
    get_video_url: async function (input_text) {
        try{
            var data = ""
            const key = this.md5(input_text)
            const value = await redis.get(key)

            if (value === null){

                if (input_text.includes('youtube.com') || input_text.includes('youtu.be')) {
                    let audio_url = await browserless.extract_youtube_audio_url("https://tuberipper.com/",input_text)

                    data = {
                        // title: response.title,
                        audio_url: audio_url,
                        video_url: audio_url
                    };
                        
                    // await redis.set(key, JSON.stringify(data), 'NX', 'EX', 3600 * 1);
                   
                }else{
                    
                    // 如果是其他视频链接，使用下载工具 API 获取视频信息
                    const response = await axios.post(
                        'https://api.xiazaitool.com/api/parseVideoUrl',
                        {
                            url:input_text,
                            token:'ca30558557e04da5ad5157f67bf1e10d'
                        }
                    );
                    console.log("下载狗查询：", JSON.stringify(response.data))
                    if(response.data.success){
                        data = {
                            title: response.data.data.title,
                            video_url: response.data.data.videoUrls,
                        };
                        await redis.set(key, JSON.stringify(data), 'NX', 'EX', 3600 * 1);
                    }else{
                        return {
                            success:false,
                            data: response.data.message
                        }
                    }
                }

            }else{
                data = JSON.parse(value)
                // console.log("缓存：", data)
            }

            return {
                success:true,
                data: data
            }
        }catch(error){
            console.log("出现错误：", error)
            return {
                success:false,
                data: error.message
            }
        }
    },
    /**
     * 更新语音转录的使用限制
     * @param string api_key 付费用户密钥
     * @param string free_key 免费用户密钥
     * @param number left_time 剩余解析时长
     */
    update_asr_key: async function (api_key, free_key, left_time) {
        if (free_key) {
            await redis.set(free_key, left_time);
        }
    },
    /**
     * 
     * @param {string} input_file 源文件
     * @param {string} output_type 目标类型
     * @returns 
     */
    audio_format_convert: async function (input_file, output_type) {
        // Strip existing extension and append the target format
        const extname = path.extname(input_file);
        const basename = extname ? input_file.slice(0, -extname.length) : input_file;
        const output_file = `${basename}.${output_type}`;

        // If input and output are the same file (same path after normalisation), skip conversion
        if (path.resolve(input_file) === path.resolve(output_file)) {
            return {success: true, filepath: input_file};
        }

        // Use -y to overwrite, and increase analyzeduration/probesize for files with missing headers
        const command = `ffmpeg -y -analyzeduration 10000000 -probesize 10000000 -i ${input_file} ${output_file}`;

        try {
            // Execute ffmpeg command
            const { stdout, stderr } = await execPromise(command);
            fs.unlink(input_file,(err) => {
                if (err) throw err
            });
            return {success:true,filepath:output_file};
        } catch (error) {
             fs.unlink(input_file,(err) => {
                if (err) throw err
            });
             fs.unlink(output_file,(err) => {
                // ignore if output file doesn't exist
            });
            return {success:false, error: error.message};
        }
    }
    
};

export default tool;