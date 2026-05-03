import express from 'express';
import crypto from 'crypto';
import redis from '../utils/redisClient.js';
import tool from '../utils/tool.js';
import unkey from '../utils/unkey.js';

const router = express.Router();

router.get('/', (req, res) => {
    res.send('Hello World!');
});

router.get('/wiki', (req, res) => {
    res.redirect(302, 'https://ccn8h804ayou.feishu.cn/wiki/RoHKwF0AbiXqxAkDJR2czoGUnMd');
});

router.get('/ydx', (req, res) => {
    res.redirect(302, 'https://ccn8h804ayou.feishu.cn/wiki/YDX6wj9RGiGH8YkFrA5c73jHnbf?fromScene=spaceOverview');
});

router.get('/vip', (req, res) => {
    res.redirect(302, 'https://ccn8h804ayou.feishu.cn/wiki/NJutwV9z6igh6zkbxpJc6YGqnob');
});

router.get('/plugin', (req, res) => {
    res.redirect(302, 'https://ccn8h804ayou.feishu.cn/wiki/CI7hw3L9YimAKTkyhFGcIrcWnid');
});

router.get('/vip-zl', (req, res) => {
    res.redirect(302, 'https://ccn8h804ayou.feishu.cn/wiki/LSN4w0H6giK7kbkalwYcW783nth');
});

router.get('/limit', (req, res) => {
    res.send('达到用量限制，获取更多积分，请联系作者购买API Key，微信：xiaowu_azt');
});

router.get('/robots.txt', (req, res) => {
    const baseUrl = tool.getBaseUrl(req);
    res.type('text/plain');
    res.send(`User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml\n`);
});

router.get('/sitemap.xml', (req, res) => {
    const baseUrl = tool.getBaseUrl(req);
    const today = new Date().toISOString().slice(0, 10);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/w7k2</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>`;
    res.type('application/xml');
    res.send(xml);
});

router.get('/w7k2', async (req, res) => {
    const counterKey = 'workbuddy:landing:visitors';
    let visitorCount = Number(await redis.get(counterKey)) || 0;

    try {
        const clientIp = tool.getClientIp(req);
        const ipHash = crypto.createHash('sha256').update(clientIp).digest('hex').slice(0, 32);
        const dedupeKey = `workbuddy:landing:uv:${ipHash}`;
        const shouldCount = await redis.set(dedupeKey, '1', 'EX', 600, 'NX');

        // Same IP counts at most once in 10 minutes, closer to UV than PV.
        if (shouldCount === 'OK') {
            visitorCount = await redis.incr(counterKey);
        } else {
            visitorCount = Number(await redis.get(counterKey)) || visitorCount;
        }
    } catch (error) {
        console.error('Failed to update workbuddy visitor count:', error.message);
    }

    const pageUrl = `${tool.getBaseUrl(req)}${req.originalUrl}`;

    res.render('workbuddy', {
        visitorCount,
        seo: {
            title: 'WorkBuddy 新手教程 - 3 步安装与 3 个可直接运行的实战场景',
            description: 'WorkBuddy 新手落地页：快速完成注册、下载、开始使用，并获取桌面文件整理、PPT 生成、舆情监控三大场景可复制提示词。',
            keywords: 'WorkBuddy,腾讯云,AI办公,桌面文件整理,PPT生成,舆情监控,提示词,新手教程',
            url: pageUrl
        }
    });
});

router.get('/apikey', async (req, res) => {
    const counterKey = 'apikey:landing:visitors';
    let visitorCount = Number(await redis.get(counterKey)) || 0;

    try {
        const clientIp = tool.getClientIp(req);
        const ipHash = crypto.createHash('sha256').update(clientIp).digest('hex').slice(0, 32);
        const dedupeKey = `apikey:landing:uv:${ipHash}`;
        const shouldCount = await redis.set(dedupeKey, '1', 'EX', 600, 'NX');

        if (shouldCount === 'OK') {
            visitorCount = await redis.incr(counterKey);
        } else {
            visitorCount = Number(await redis.get(counterKey)) || visitorCount;
        }
    } catch (error) {
        console.error('Failed to update apikey visitor count:', error.message);
    }

    res.render('apikey', { visitorCount });
});

router.get('/video-transcript', async (req, res) => {
    const pageUrl = `${tool.getBaseUrl(req)}${req.originalUrl}`;
    const counterKey = 'video-transcript:landing:visitors';
    let visitorCount = Number(await redis.get(counterKey)) || 0;
    const clientIp = tool.getClientIp(req);
    const ipHash = crypto.createHash('sha256').update(clientIp).digest('hex').slice(0, 32);
    const dedupeKey = `video-transcript:landing:uv:${ipHash}`;
    const shouldCount = await redis.set(dedupeKey, '1', 'EX', 600, 'NX');
    if (shouldCount === 'OK') { visitorCount = await redis.incr(counterKey); }
    res.render('video-transcript', {
        visitorCount,
        seo: {
            title: '视频文案提取 - 主流平台一键解析',
            description: '输入视频链接，快速提取文本字幕。支持主流视频平台，页面直连 whisper/speech-to-text 接口。',
            keywords: '视频文案提取,字幕提取,语音转文字,Whisper,YouTube,抖音,B站,小红书',
            url: pageUrl
        }
    });
});

router.post('/apikey/query', async (req, res) => {
    const { key } = req.body;
    if (!key || typeof key !== 'string' || key.trim().length === 0) {
        return res.status(400).json({ error: '缺少 key 参数' });
    }
    try {
        const result = await unkey.verifyKey(null, key.trim(), 0, null);
        if (!result) {
            return res.status(400).json({ error: '查询失败，Key 可能无效' });
        }
        res.json({ data: result });
    } catch (err) {
        console.error('apikey query error:', err);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

export default router;
