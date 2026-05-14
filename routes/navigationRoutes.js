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

router.get('/zong', (req, res) => {
    res.redirect(302, 'https://my.feishu.cn/wiki/T2oMwq00EinbpRkv7GGcMV3jnTb?from=from_copylink');
});

router.get('/xyzw', (req, res) => {
    res.redirect(302, 'https://my.feishu.cn/wiki/IL1lwsD5riia4ukVocScRSy7nNd?from=from_copylink');
});

router.get('/xyjc', (req, res) => {
    res.redirect(302, 'https://my.feishu.cn/wiki/CZUZwffpzid15Gk1VcqcW5MrnKa?from=from_copylink');
});

router.get('/ljsj', (req, res) => {
    res.redirect(302, 'https://my.feishu.cn/wiki/G0tJwxdSkiENLtkFB3YccVzLnHd?from=from_copylink');
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
    <url>
        <loc>${baseUrl}/gpt-image-2</loc>
        <lastmod>${today}</lastmod>
        <changefreq>daily</changefreq>
        <priority>0.8</priority>
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
            title: '视频文案提取 - 一键提取 YouTube / 抖音 / B站 / 小红书视频文字',
            description: '在线提取视频文案，支持 YouTube、抖音、Bilibili、小红书等主流平台。粘贴链接即可自动转写，结果可直接复制用于内容创作、二次剪辑与文案整理。',
            keywords: '视频文案提取,视频转文字,字幕提取,语音转文字,YouTube字幕,抖音文案,B站文案,小红书文案,在线转写',
            url: pageUrl
        }
    });
});

router.get('/gpt-image-2', async (req, res) => {
    const pageUrl = `${tool.getBaseUrl(req)}${req.originalUrl}`;
    const counterKey = 'gpt-image-2:landing:visitors';
    let visitorCount = Number(await redis.get(counterKey)) || 0;

    try {
        const clientIp = tool.getClientIp(req);
        const ipHash = crypto.createHash('sha256').update(clientIp).digest('hex').slice(0, 32);
        const dedupeKey = `gpt-image-2:landing:uv:${ipHash}`;
        const shouldCount = await redis.set(dedupeKey, '1', 'EX', 600, 'NX');

        if (shouldCount === 'OK') {
            visitorCount = await redis.incr(counterKey);
        } else {
            visitorCount = Number(await redis.get(counterKey)) || visitorCount;
        }
    } catch (error) {
        console.error('Failed to update gpt-image-2 visitor count:', error.message);
    }

    const pageData = {
        stats: {
            totalPrompts: 81,
            totalCategories: 12,
            latestXPrompts: 35,
            model: 'gpt-image-2'
        },
        categories: [
            { id: 'all', name: '全部', count: 81 },
            { id: 'ecommerce', name: '电商与产品', count: 10 },
            { id: 'brand', name: '品牌海报设计', count: 6 },
            { id: 'type', name: '创意字体', count: 3 },
            { id: 'infographic', name: '知识科普与信息图', count: 11 },
            { id: 'ui', name: 'UI 界面复刻', count: 8 },
            { id: 'photo', name: '真实摄影', count: 7 },
            { id: 'consistency', name: '角色与一致性', count: 5 },
            { id: 'editing', name: '图片编辑与参考', count: 8 },
            { id: 'art', name: '艺术创作', count: 8 },
            { id: 'fun', name: '趣味玩法', count: 10 },
            { id: 'case', name: '补充案例提示词', count: 3 },
            { id: 'marketing', name: '品牌与营销', count: 2 }
        ],
        items: [
            {
                id: '1.1',
                title: '香水电商详情页',
                categoryId: 'ecommerce',
                categoryName: '电商与产品',
                image: 'https://upload.maynor1024.live/file/1776831281195_wx_003_09ee24278e.png',
                prompt: '（有香水垫图）给这个香水产品生成电商中文详情页，9:16，4k',
                tags: ['电商详情', '中文排版', '9:16', '4K']
            },
            {
                id: '1.2',
                title: '产品精修白底图',
                categoryId: 'ecommerce',
                categoryName: '电商与产品',
                image: 'https://upload.maynor1024.live/file/1776831496827_wx_057_b9f505e33e.jpg',
                prompt: '帮我生成一张图片，将该产品进行精修，可重新打光，精修优化，白色的背景。',
                tags: ['电商主图', '白底图', '产品精修']
            },
            {
                id: '1.5',
                title: '高保真电商 App 首页',
                categoryId: 'ecommerce',
                categoryName: '电商与产品',
                image: 'https://upload.maynor1024.live/file/1776480347969_img_025.png',
                prompt: '生成一张高保真移动端电商 App 首页界面截图，整体风格参考 2026 年主流中文电商 App，强调真实 UI 逻辑与商业设计感。',
                tags: ['App UI', '高保真', '移动端', '电商']
            },
            {
                id: '1.7',
                title: '茶饮新品上市海报',
                categoryId: 'ecommerce',
                categoryName: '电商与产品',
                image: 'https://upload.maynor1024.live/file/1776480372187_img_027.png',
                prompt: '请设计一张 3:4 竖版国潮茶饮新品上市海报，品牌名为山川茶事，风格新中式轻奢克制，兼具商业感与审美感。',
                tags: ['国潮', '品牌海报', '3:4']
            },
            {
                id: '2.1',
                title: '品牌入驻宣传海报',
                categoryId: 'brand',
                categoryName: '品牌海报设计',
                image: 'https://upload.maynor1024.live/file/1776831281454_wx_005_d0df16a605.jpg',
                prompt: '生成【茶颜悦色】2026.5.1 入驻深圳万象天地的宣传海报，3:4，4k。',
                tags: ['品牌活动', '商场推广', '4K']
            },
            {
                id: '2.5',
                title: 'K-POP 概念海报',
                categoryId: 'brand',
                categoryName: '品牌海报设计',
                image: 'https://upload.maynor1024.live/file/1776831522030_wx_065_a4d181f295.jpg',
                prompt: '生成一张 K-POP 女团第三张迷你专辑概念海报，专辑名 ECLIPSE，冷灰蓝基调，侧逆光与柔焦。',
                tags: ['K-POP', '人物海报', '冷色调']
            },
            {
                id: '3.1',
                title: '城市创意字体 - 杭州',
                categoryId: 'type',
                categoryName: '创意字体',
                image: 'https://upload.maynor1024.live/file/1776831318135_wx_017_c335b14da9.jpg',
                prompt: '字体设计，创意字体插画，将文字“杭州”作为主体画面，以文字为画布进行深度重构。',
                tags: ['创意字体', '文化符号', '插画']
            },
            {
                id: '4.1',
                title: '科普百科图 - 萨摩耶',
                categoryId: 'infographic',
                categoryName: '知识科普与信息图',
                image: 'https://upload.maynor1024.live/file/1776831306943_wx_012_0a46c0f1cc.png',
                prompt: '请根据【萨摩耶】生成一张高质量竖版科普百科图，强调图鉴感、百科感、信息结构感和收藏感。',
                tags: ['信息图', '百科', '模块化']
            },
            {
                id: '4.3',
                title: '咖啡科普信息长图',
                categoryId: 'infographic',
                categoryName: '知识科普与信息图',
                image: 'https://upload.maynor1024.live/file/1776480487938_img_040.png',
                prompt: '中文信息图海报，主题为一杯咖啡如何来到你手里，信息密度高但排版清晰，风格为高级信息设计。',
                tags: ['长信息图', '咖啡', '路径流程']
            },
            {
                id: '5.1',
                title: 'TikTok 视频截图',
                categoryId: 'ui',
                categoryName: 'UI 界面复刻',
                image: 'https://upload.maynor1024.live/file/1776831565116_wx_073_1bf5c77bf8.jpg',
                prompt: '生成一张 TikTok 的妆教视频截图。',
                tags: ['界面复刻', '社交媒体', '截图']
            },
            {
                id: '5.3',
                title: '音乐 App 播放页',
                categoryId: 'ui',
                categoryName: 'UI 界面复刻',
                image: 'https://upload.maynor1024.live/file/1776480546859_img_045.png',
                prompt: '生成一张高保真中文音乐 App 播放页界面截图，深色模式，歌词区域与控件层级真实。',
                tags: ['播放器', '深色UI', '高保真']
            },
            {
                id: '6.1',
                title: '商场纪实抓拍',
                categoryId: 'photo',
                categoryName: '真实摄影',
                image: 'https://upload.maynor1024.live/file/1776480142529_img_008.jpg',
                prompt: '生成一张极其真实的商场纪实摄影照片，周末傍晚扶梯口自然抓拍，强调混合光与生活痕迹。',
                tags: ['纪实摄影', '商场', '自然抓拍']
            },
            {
                id: '6.4',
                title: '胶片质感抓拍',
                categoryId: 'photo',
                categoryName: '真实摄影',
                image: 'https://upload.maynor1024.live/file/1776831365390_wx_027_704e3946d9.jpg',
                prompt: '一张写实风格的旅行抓拍：阴天清晨，海边路旁，35mm 胶片质感，低饱和，纪录片氛围。',
                tags: ['35mm', '胶片感', '旅行']
            },
            {
                id: '7.1',
                title: '八套穿搭一致性',
                categoryId: 'consistency',
                categoryName: '角色与一致性',
                image: 'https://upload.maynor1024.live/file/1776831377557_wx_030_f3ed0f1175.png',
                prompt: '（上传一张人物照片）请根据这张照片，生成八套夏日穿搭方案。',
                tags: ['角色一致性', '穿搭', '多视角']
            },
            {
                id: '7.2',
                title: '十六宫格动漫表情包',
                categoryId: 'consistency',
                categoryName: '角色与一致性',
                image: 'https://upload.maynor1024.live/file/1776480562503_img_047.png',
                prompt: '生成银色长发蓝眼动漫少女十六宫格表情图，人物外观在所有格子中保持高度一致。',
                tags: ['表情包', '一致性', '动漫']
            },
            {
                id: '8.1',
                title: '宠物联名海报',
                categoryId: 'editing',
                categoryName: '图片编辑与参考',
                image: 'https://upload.maynor1024.live/file/1776480357820_img_026.png',
                prompt: '以「77（猫的名字）X 肯德基」联名企划为主题，围绕同一只宠物生成联名海报并保持宠物一致。',
                tags: ['联名设计', '宠物IP', '品牌视觉']
            },
            {
                id: '8.4',
                title: '电影截图换人',
                categoryId: 'editing',
                categoryName: '图片编辑与参考',
                image: 'https://upload.maynor1024.live/file/1776831508063_wx_060_abc2ec5dcb.png',
                prompt: '（上传《闪灵》经典画面 + 参考图）将门缝人物替换为指定角色并保持场景一致。',
                tags: ['换脸换角', '图像编辑', '参考图']
            },
            {
                id: '9.1',
                title: '海贼王 3D 纸雕',
                categoryId: 'art',
                categoryName: '艺术创作',
                image: 'https://upload.maynor1024.live/file/1776831295947_wx_009_83a98eb04d.jpg',
                prompt: '平视视角，正面直视高饱和 3D 多层纸雕场景，强调实体纸张分层结构与切边细节。',
                tags: ['纸雕', '3D', '艺术创作']
            },
            {
                id: '9.2',
                title: '花卉 Knolling 解构',
                categoryId: 'art',
                categoryName: '艺术创作',
                image: 'https://upload.maynor1024.live/file/1776831307340_wx_013_c3c9376556.jpg',
                prompt: 'Knolling 风格摄影，将蓝花楹完全解构并顶视平铺，保留秩序感与微随机。',
                tags: ['Knolling', '微距', '植物解构']
            },
            {
                id: '10.2',
                title: '360 度全景图',
                categoryId: 'fun',
                categoryName: '趣味玩法',
                image: 'https://upload.maynor1024.live/file/1776831763812_wx_113_bf646f5279.gif',
                prompt: '生成一张人类登月的 360 度全景图。',
                tags: ['全景图', '趣味实验', '空间感']
            },
            {
                id: '10.7',
                title: 'Sam Altman 微信朋友圈',
                categoryId: 'fun',
                categoryName: '趣味玩法',
                image: 'https://upload.maynor1024.live/file/1776927657894_22.png',
                prompt: '生成 OpenAI CEO Sam Altman 微信朋友圈中文宣传图，并带互动评论，比例 16:9。',
                tags: ['社媒整活', '朋友圈', '16:9']
            },
            {
                id: '11.1',
                title: 'AI新榜案例归档',
                categoryId: 'case',
                categoryName: '补充案例提示词',
                image: 'https://upload.maynor1024.live/file/1776925334708_15.png',
                prompt: '请生成一张高质量竖版科普百科图，介绍 GPT image 2，强调模块化科普信息结构。',
                tags: ['案例归档', 'AI新榜', '科普信息图']
            },
            {
                id: '11.2',
                title: 'APPSO 桌面 UI 案例',
                categoryId: 'case',
                categoryName: '补充案例提示词',
                image: 'https://upload.maynor1024.live/file/1776927572727_05.other',
                prompt: '生成一张 macOS 桌面截图，前景是 ChatGPT 对话窗口，后台有多个随机窗口和终端。',
                tags: ['APPSO', '桌面UI', '真实痕迹']
            },
            {
                id: '11.3',
                title: '甲木未来派品牌系统',
                categoryId: 'marketing',
                categoryName: '品牌与营销',
                image: 'https://upload.maynor1024.live/file/1776936225028_23.jpg',
                prompt: '为「山海咖啡」打造完整品牌视觉体系，覆盖物料板、字体板、场景照和应用展示。',
                tags: ['品牌系统', '营销场景', '视觉提案']
            }
        ],
        latestXPrompts: [
            {
                id: 'x-1',
                date: '2026-04-29',
                author: '@ZaraIrahh',
                title: 'Reusable Pixar-style 3D character portrait prompt',
                likes: 35,
                reposts: 0,
                image: 'https://pbs.twimg.com/media/HG17h2kboAAm0Ck.jpg',
                prompt: 'A stylized Pixar-style 3D portrait of a young person with expressive blue eyes, transparent glasses, modern hairstyle, soft studio lighting, and vibrant orange-pink gradient background.'
            },
            {
                id: 'x-2',
                date: '2026-04-29',
                author: '@im_shahid7',
                title: 'Reusable cute animal selfie prompt',
                likes: 33,
                reposts: 1,
                image: 'https://pbs.twimg.com/media/HG1-l98bQAAD2Of.jpg',
                prompt: 'A cute orange and white cat taking a selfie inside a dramatically lit dark room, wide-angle shot, sharp focus, high-definition photograph.'
            },
            {
                id: 'x-3',
                date: '2026-04-29',
                author: '@saniaspeaks_',
                title: 'Reusable fashion editorial portrait prompt',
                likes: 19,
                reposts: 1,
                image: 'https://pbs.twimg.com/media/HG19f15bwAAf-hh.jpg',
                prompt: 'Portrait of a young woman in blue turtleneck with transparent safety goggles, cold ambient lighting, double-exposure blur, and futuristic retro mood.'
            },
            {
                id: 'x-4',
                date: '2026-04-28',
                author: '@Noor_ul_ain43',
                title: 'Sticker sheet prompt with consistent character',
                likes: 0,
                reposts: 0,
                image: 'https://pbs.twimg.com/media/HHAfCPcaQAEbF9b.jpg',
                prompt: 'A high-quality sticker sheet featuring a cute semi-realistic cartoon girl with consistent design across multiple expressions and poses.'
            },
            {
                id: 'x-5',
                date: '2026-04-27',
                author: '@dotey',
                title: 'Premium conceptual typography poster prompt',
                likes: 11,
                reposts: 0,
                image: 'https://pbs.twimg.com/media/HG7GNntakAANybD.jpg',
                prompt: 'Create one finished premium conceptual typography poster for [INPUT_TEXT] with strict composition and a coherent color system.'
            },
            {
                id: 'x-6',
                date: '2026-04-22',
                author: '@craftian_keskin',
                title: 'Nighttime candid portrait with realistic flash',
                likes: 258,
                reposts: 11,
                image: 'https://pbs.twimg.com/media/HGeaUO_WkAAgGAV.jpg',
                prompt: 'A candid nighttime street portrait with flash aesthetic, natural styling, calm expression, and raw documentary mood.'
            }
        ],
        links: {
            official: 'https://chatgpt.com/',
            api: 'https://apipro.maynor1024.live/',
            sourceSite: 'https://awesome.gptimage2.asia/',
            github: 'https://github.com/xianyu110/awesome-gptimage2'
        },
        pagination: {
            pageSize: 12
        }
    };

    res.render('gpt-image-2', {
        visitorCount,
        pageData,
        seo: {
            title: 'GPT-Image-2 画廊 - 科技风提示词案例库',
            description: 'GPT-Image-2 科技风画廊页，收录多场景提示词、分类筛选、搜索、标签、弹窗预览和复制功能。',
            keywords: 'GPT-Image-2,提示词,画廊,AI绘图,案例库,科技风,图像生成',
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

// ── GPT-Image-2 图像生成 API ──────────────────────────────────────────────────
import aitoken from '../utils/ThirdParrtyApi/aitoken.js';

router.post('/api/gpt-image-2/generate', async (req, res) => {
    const { prompt, imageBase64, api_key } = req.body || {};
    const userIdentity = req.headers['user-identity'] || req.ip || 'anonymous';
    try {
        const result = await aitoken.generate({ prompt, imageBase64, api_key, userIdentity });
        return res.json({ success: true, ...result });
    } catch (err) {
        console.error('[gpt-image-2 generate]', err.message);
        const status = err.statusCode || 500;
        return res.status(status).json({ success: false, error: err.message || '生成失败，请稍后重试' });
    }
});

export default router;
