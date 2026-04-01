import express from 'express';
import crypto from 'crypto';
import redis from '../utils/redisClient.js';
import tool from '../utils/tool.js';

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

export default router;
