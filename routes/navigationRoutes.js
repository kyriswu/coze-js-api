import express from 'express';
import crypto from 'crypto';
import redis from '../utils/redisClient.js';
import tool from '../utils/tool.js';
import unkey from '../utils/unkey.js';

const router = express.Router();

const serviceCategories = [
    { id: 'all', name: '全部', accent: '#2f5bff' },
    { id: 'ai', name: 'AI 创作', accent: '#7c3aed' },
    { id: 'search', name: '搜索解析', accent: '#0f7cff' },
    { id: 'media', name: '视频音频', accent: '#f97316' },
    { id: 'platform', name: '平台数据', accent: '#10b981' },
    { id: 'file', name: '文件处理', accent: '#2563eb' },
    { id: 'knowledge', name: '知识查询', accent: '#dc2626' },
    { id: 'tool', name: '工具服务', accent: '#0891b2' }
];

const serviceCards = [
    {
        title: 'GPT Image 2 生图',
        category: 'ai',
        icon: 'GI',
        description: '文本生图与多图参考编辑，生成结果自动转为本地下载链接。',
        endpoint: 'POST /gpt-image-2/generate',
        badge: 'AI 图片',
        price: '3 点/次'
    },
    {
        title: 'Seedream 图片生成',
        category: 'ai',
        icon: 'SD',
        description: '火山引擎 Seedream 5.0 Lite 图片生成接口。',
        endpoint: 'POST /volcengine/seedream/5.0-lite/generate-image',
        badge: 'AI 图片',
        price: '按量'
    },
    {
        title: 'Coze 工作流运行',
        category: 'ai',
        icon: 'WF',
        description: '通过 API 调用 Coze 工作流，适合自动化业务编排。',
        endpoint: 'POST /workflow/run',
        badge: '自动化',
        price: '按量'
    },
    {
        title: 'AI 在线答案',
        category: 'search',
        icon: 'QA',
        description: '搜索并生成结构化回答，同时返回引用来源。',
        endpoint: 'POST /ai_online_answer',
        badge: '问答',
        price: '按量'
    },
    {
        title: 'Google 网页搜索',
        category: 'search',
        icon: 'GS',
        description: '聚合网页搜索结果，支持免费限额与 API Key 额度。',
        endpoint: 'POST /google/search/web',
        badge: '搜索',
        price: '1 点/次'
    },
    {
        title: 'Tavily 智能搜索',
        category: 'search',
        icon: 'TV',
        description: '面向 AI 场景的联网搜索，返回结果与摘要。',
        endpoint: 'POST /tavily/search',
        badge: '搜索',
        price: '按量'
    },
    {
        title: '火山网页搜索',
        category: 'search',
        icon: 'VS',
        description: 'Volcengine Web Search 能力封装。',
        endpoint: 'POST /volcengine/web-search',
        badge: '搜索',
        price: '按量'
    },
    {
        title: '链接正文读取',
        category: 'search',
        icon: 'LR',
        description: '输入网页或 PDF 链接，提取主要正文内容。',
        endpoint: 'POST /jina_reader',
        badge: '解析',
        price: '按量'
    },
    {
        title: 'HTML 元素提取',
        category: 'search',
        icon: 'HX',
        description: '使用 CSS Selector 或 XPath 抽取网页结构化内容。',
        endpoint: 'POST /parse_html',
        badge: '解析',
        price: '1 点/次'
    },
    {
        title: '虚拟浏览器解析',
        category: 'search',
        icon: 'EX',
        description: '支持 Cookie、Selector、XPath 的 Chromium 网页解析。',
        endpoint: 'POST /explorer',
        badge: '浏览器',
        price: '1 点/次'
    },
    {
        title: 'Firecrawl 抓取',
        category: 'search',
        icon: 'FC',
        description: '单页或批量网页抓取，适合内容采集与知识库入库。',
        endpoint: 'POST /firecrawl/scrape',
        badge: '抓取',
        price: '按量'
    },
    {
        title: '视频文案提取',
        category: 'media',
        icon: 'ST',
        description: '支持 YouTube、抖音、B站、小红书等视频语音转文字。',
        endpoint: 'POST /whisper/speech-to-text',
        badge: '转写',
        price: '按分钟'
    },
    {
        title: 'Cloudflare Whisper',
        category: 'media',
        icon: 'AS',
        description: '音频链接语音识别，返回文字结果。',
        endpoint: 'POST /cloudflare/run_whisper',
        badge: '语音',
        price: '按量'
    },
    {
        title: '全网视频下载',
        category: 'media',
        icon: 'VD',
        description: '解析多平台视频直链，支持抖音、B站、YouTube 等。',
        endpoint: 'POST /download_video',
        badge: '下载',
        price: '1 点/次'
    },
    {
        title: 'YouTube 音频下载',
        category: 'media',
        icon: 'YT',
        description: '提取 YouTube 视频音频并返回本地下载地址。',
        endpoint: 'POST /youtube/download_audio',
        badge: '音频',
        price: '按量'
    },
    {
        title: '音频格式转换',
        category: 'media',
        icon: 'AC',
        description: '支持 mp3、m4a、wav、ogg、aac、flac 等格式转换。',
        endpoint: 'POST /audio-format-convert',
        badge: '转换',
        price: '按量'
    },
    {
        title: '视频转音频',
        category: 'media',
        icon: 'VA',
        description: '将视频链接提取并转换为 MP3 音频文件。',
        endpoint: 'POST /video2audio',
        badge: '转换',
        price: '按量'
    },
    {
        title: '视频音频合成',
        category: 'media',
        icon: 'MX',
        description: '把视频与音频合成为新视频，返回下载链接。',
        endpoint: 'POST /mix_video_and_audio',
        badge: '剪辑',
        price: '按量'
    },
    {
        title: 'Bilibili 数据',
        category: 'platform',
        icon: 'BI',
        description: '获取 B站字幕、用户投稿视频与视频评论。',
        endpoint: 'POST /bilibili/subtitle',
        badge: 'B站',
        price: '按量'
    },
    {
        title: '小红书数据',
        category: 'platform',
        icon: 'RH',
        description: '首页笔记、搜索笔记、笔记详情等小红书数据接口。',
        endpoint: 'POST /xiaohongshu/search_notes_v2',
        badge: '小红书',
        price: '按量'
    },
    {
        title: '小红书搜索文档',
        category: 'tool',
        icon: 'DC',
        description: '查看 /xiaohongshu/search_notes_v2 的调用示例与返回参数说明。',
        endpoint: 'GET /docs/xiaohongshu/search_notes_v2',
        badge: '文档',
        price: '工具'
    },
    {
        title: '微信公众号数据',
        category: 'platform',
        icon: 'WX',
        description: '公众号文章列表、文章搜索与详情抓取。',
        endpoint: 'POST /wx_gzh/fetch_search_article',
        badge: '微信',
        price: '1 点/次'
    },
    {
        title: '抖音数据',
        category: 'platform',
        icon: 'DY',
        description: '用户作品、综合搜索、视频搜索与评论数据。',
        endpoint: 'POST /douyin/fetch_general_search_v1',
        badge: '抖音',
        price: '按量'
    },
    {
        title: '抖音热点榜',
        category: 'platform',
        icon: 'HB',
        description: '上升热点榜和同城热点榜数据。',
        endpoint: 'POST /douyin/billboard/fetch_hot_rise_list',
        badge: '热榜',
        price: '按量'
    },
    {
        title: 'Twitter/X 数据',
        category: 'platform',
        icon: 'TX',
        description: '推文详情与搜索时间线数据获取。',
        endpoint: 'POST /twitter/fetch_search_timeline',
        badge: '社媒',
        price: '按量'
    },
    {
        title: 'PDF 转图片',
        category: 'file',
        icon: 'PI',
        description: '下载远程 PDF，并将每页转换为图片链接。',
        endpoint: 'POST /pdf2img',
        badge: 'PDF',
        price: '按量'
    },
    {
        title: 'PDF 下载',
        category: 'file',
        icon: 'PD',
        description: '校验并下载远程 PDF，返回本地访问链接。',
        endpoint: 'POST /download_pdf',
        badge: 'PDF',
        price: '按量'
    },
    {
        title: '图片下载',
        category: 'file',
        icon: 'IM',
        description: '下载远程图片到本地 downloads 目录。',
        endpoint: 'POST /download_image',
        badge: '图片',
        price: '按量'
    },
    {
        title: '文件中转站',
        category: 'file',
        icon: 'FS',
        description: '查看、搜索和上传 downloads 目录文件，并获取可访问 URL。',
        endpoint: 'GET /file-transfer',
        badge: '中转',
        price: '工具'
    },
    {
        title: '网络日志看板',
        category: 'tool',
        icon: 'NL',
        description: '分析 network.log 日志，查看状态分布、慢请求与趋势图。',
        endpoint: 'GET /network-dashboard',
        badge: '监控',
        price: '工具'
    },
    {
        title: '百度网盘工具',
        category: 'file',
        icon: 'XP',
        description: '网盘搜索、文件信息、直链和下载辅助接口。',
        endpoint: 'POST /xpan/search',
        badge: '网盘',
        price: '按量'
    },
    {
        title: '中英文 Wikipedia',
        category: 'knowledge',
        icon: 'WK',
        description: '搜索中英文维基百科词条并获取正文内容。',
        endpoint: 'POST /zh_wikipedia/search_item',
        badge: '百科',
        price: '免费'
    },
    {
        title: '法律法规查询',
        category: 'knowledge',
        icon: 'LW',
        description: '从国家法律法规库查询法规并返回文档链接。',
        endpoint: 'POST /flfg',
        badge: '法规',
        price: '按量'
    },
    {
        title: '专利查询',
        category: 'knowledge',
        icon: 'ZL',
        description: '按关键词查询专利标题、申请人、发明人和日期。',
        endpoint: 'POST /zlcx',
        badge: '专利',
        price: '1 点/次'
    },
    {
        title: '天气查询',
        category: 'knowledge',
        icon: 'QW',
        description: '城市天气代码和历史天气查询。',
        endpoint: 'POST /qweather/history_weather',
        badge: '天气',
        price: '按量'
    },
    {
        title: '八字紫微工具',
        category: 'tool',
        icon: 'BZ',
        description: '八字、紫微斗数和积分计算工具。',
        endpoint: 'POST /bazi/calc_ba_zi',
        badge: '计算',
        price: '按量'
    },
    {
        title: '网页截图',
        category: 'tool',
        icon: 'SS',
        description: '生成网页或指定元素截图，返回图片地址。',
        endpoint: 'POST /screenshot',
        badge: '截图',
        price: '按量'
    },
    {
        title: 'Sitemap 获取',
        category: 'tool',
        icon: 'SM',
        description: '获取网站 sitemap，辅助站点分析和内容发现。',
        endpoint: 'POST /get_sitemap',
        badge: '站点',
        price: '1 点/次'
    },
    {
        title: 'API Key 额度查询',
        category: 'tool',
        icon: 'AK',
        description: '查询 API Key 状态和剩余额度，方便接入前确认。',
        endpoint: 'GET /apikey',
        badge: '账号',
        price: '工具'
    }
];

const serviceStats = [
    { label: '插件服务', value: `${serviceCards.length}+`, note: '持续更新中' },
    { label: '服务分类', value: `${serviceCategories.length - 1}`, note: '覆盖常用场景' },
    { label: '接入方式', value: 'HTTP API', note: '标准 JSON 请求' },
    { label: '返回资源', value: '本地链接', note: '图片/音频/文件可访问' }
];

const xmlEscape = (value = '') => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const parseEndpoint = (endpoint = '') => {
    const [method = '', ...rest] = endpoint.trim().split(/\s+/);
    return {
        method: method.toUpperCase(),
        path: rest.join(' ') || endpoint,
    };
};

const sitemapPageItems = [
    { path: '/', changefreq: 'daily', priority: '1.0' },
    { path: '/gpt-image-2', changefreq: 'daily', priority: '0.9' },
    { path: '/video-transcript', changefreq: 'daily', priority: '0.9' },
    { path: '/file-transfer', changefreq: 'hourly', priority: '0.9' },
    { path: '/network-dashboard', changefreq: 'hourly', priority: '0.9' },
    { path: '/apikey', changefreq: 'daily', priority: '0.8' },
    { path: '/w7k2', changefreq: 'weekly', priority: '0.7' },
    { path: '/plugin', changefreq: 'weekly', priority: '0.6' },
    { path: '/wiki', changefreq: 'weekly', priority: '0.6' },
    { path: '/vip', changefreq: 'weekly', priority: '0.5' },
    { path: '/vip-zl', changefreq: 'weekly', priority: '0.5' },
    { path: '/zong', changefreq: 'weekly', priority: '0.5' },
    { path: '/xyzw', changefreq: 'weekly', priority: '0.5' },
    { path: '/xyjc', changefreq: 'weekly', priority: '0.5' },
    { path: '/ljsj', changefreq: 'weekly', priority: '0.5' },
];

const sitemapCategoryItems = serviceCategories
    .filter((item) => item.id !== 'all')
    .map((item) => ({
        path: `/?category=${encodeURIComponent(item.id)}`,
        changefreq: 'daily',
        priority: '0.7',
    }));

router.get('/', (req, res) => {
    res.render('home', {
        categories: serviceCategories,
        services: serviceCards,
        stats: serviceStats,
        seo: {
            title: 'DevTool 插件服务 - AI、搜索、视频、平台数据 API 工具箱',
            description: 'DevTool 插件服务中心，集中展示 AI 创作、网页搜索解析、视频音频处理、平台数据、文件处理、知识查询等插件 API 服务。',
            keywords: 'DevTool,插件服务,API,AI图片生成,视频转文字,网页解析,抖音数据,小红书数据,B站数据',
            url: `${tool.getBaseUrl(req)}${req.originalUrl}`
        }
    });
});

router.get('/docs/xiaohongshu/search_notes_v2', (req, res) => {
    const pageUrl = `${tool.getBaseUrl(req)}${req.originalUrl}`;
    const docBaseUrl = 'https://coze-js-api.devtool.uk';

    const doc = {
        title: '小红书搜索笔记 API 文档',
        name: '/xiaohongshu/search_notes_v2',
        summary: '小红书关键词搜索接口，返回规整后的帖子信息与分页信息，适合直接接入业务端渲染列表。',
        method: 'POST',
        path: '/xiaohongshu/search_notes_v2',
        upstream: '/api/v1/xiaohongshu/app_v2/search_notes',
        cost: '2 点/次（传 api_key 时）',
        description: '本接口对上游返回做了规整，重点保留帖子核心字段与翻页参数。支持历史参数与新参数混传，便于平滑升级。',
        requestParams: [
            { name: 'keyword', type: 'string', required: true, desc: '搜索关键词', example: '美食推荐' },
            { name: 'page', type: 'number', required: false, desc: '页码，默认 1', example: '1' },
            { name: 'sort / sort_type', type: 'string', required: false, desc: '排序。可传中文或英文枚举', example: '综合排序 或 general' },
            { name: 'type / note_type', type: 'string', required: false, desc: '笔记类型。兼容 _0/_1/_2/_3 与中文', example: '综合笔记 或 不限' },
            { name: 'publish_time / time_filter', type: 'string', required: false, desc: '发布时间筛选。兼容 0/1/7/180 与中文', example: '不限 或 7' },
            { name: 'search_id', type: 'string', required: false, desc: '翻页搜索标识，下一页可透传', example: 'a296ca55360c4681' },
            { name: 'search_session_id', type: 'string', required: false, desc: '翻页会话标识，下一页可透传', example: 'db2184ed4fbf48aa95a5b787a2f8fafe' },
            { name: 'source', type: 'string', required: false, desc: '来源，默认 explore_feed', example: 'explore_feed' },
            { name: 'ai_mode', type: 'number', required: false, desc: 'AI 模式，默认 0', example: '0' },
            { name: 'api_key', type: 'string', required: false, desc: '可选，传入后按 2 点扣费并返回剩余积分文案', example: 'uk_live_xxx' },
        ],
        examples: [
            {
                title: '基础搜索',
                                code: `curl -X POST "${docBaseUrl}/xiaohongshu/search_notes_v2" \\
  -H "Content-Type: application/json" \\
  -d '{
    "keyword": "美食推荐",
    "page": 1
  }'`,
            },
            {
                title: '带筛选与翻页参数',
                                code: `curl -X POST "${docBaseUrl}/xiaohongshu/search_notes_v2" \\
  -H "Content-Type: application/json" \\
  -d '{
    "keyword": "美食推荐",
    "page": 2,
    "sort_type": "general",
    "note_type": "不限",
    "time_filter": "不限",
    "search_id": "a296ca55360c4681",
    "search_session_id": "db2184ed4fbf48aa95a5b787a2f8fafe",
    "api_key": "uk_live_xxx"
  }'`,
            },
        ],
        responseFields: [
            { path: 'code', type: 'number', desc: '业务状态码，200 表示成功' },
            { path: 'msg', type: 'string', desc: '返回消息，传 api_key 时包含剩余积分提示' },
            { path: 'data.posts[]', type: 'array', desc: '帖子列表（核心业务字段）' },
            { path: 'data.posts[].note_id', type: 'string', desc: '帖子 ID' },
            { path: 'data.posts[].title', type: 'string', desc: '帖子标题' },
            { path: 'data.posts[].desc', type: 'string', desc: '帖子正文摘要' },
            { path: 'data.posts[].type', type: 'string', desc: '帖子类型' },
            { path: 'data.posts[].xsec_token', type: 'string', desc: '帖子访问 token' },
            { path: 'data.posts[].user', type: 'object', desc: '作者信息（user_id / nickname / avatar）' },
            { path: 'data.posts[].interact', type: 'object', desc: '互动信息（点赞/收藏/评论/分享）' },
            { path: 'data.posts[].cover', type: 'string', desc: '封面图 URL' },
            { path: 'data.posts[].images[]', type: 'array', desc: '图片 URL 数组，已补齐 url/url_size_large 等字段映射' },
            { path: 'data.pagination', type: 'object', desc: '分页信息' },
            { path: 'data.pagination.search_id', type: 'string', desc: '下一页搜索标识' },
            { path: 'data.pagination.search_session_id', type: 'string', desc: '下一页会话标识' },
            { path: 'data.pagination.page', type: 'number', desc: '当前页码' },
            { path: 'data.pagination.next_page', type: 'number', desc: '下一页页码（上游返回）' },
            { path: 'data.pagination.has_more', type: 'boolean', desc: '是否还有下一页' },
            { path: 'data.pagination.item_count', type: 'number', desc: '当前返回帖子数量' },
        ],
        responseSample: JSON.stringify({
            code: 200,
            msg: 'success',
            data: {
                posts: [
                    {
                        note_id: '6a2ff39b0000000021009dc2',
                        title: '哥斯达黎加圣何塞美食全攻略',
                        desc: '美食路线和酒店建议整理',
                        type: 'normal',
                        xsec_token: 'xsec-xxxx',
                        timestamp: 1783769000,
                        update_time: 1783769050,
                        user: {
                            user_id: '5fxxxx',
                            nickname: '旅行吃货',
                            avatar: 'https://xxx/avatar.jpg'
                        },
                        interact: {
                            liked_count: 123,
                            collected_count: 45,
                            comments_count: 18,
                            shared_count: 9
                        },
                        cover: 'https://xxx/cover.jpg',
                        images: ['https://xxx/1.jpg', 'https://xxx/2.jpg']
                    }
                ],
                pagination: {
                    search_id: 'a296ca55360c4681',
                    search_session_id: 'db2184ed4fbf48aa95a5b787a2f8fafe',
                    page: 1,
                    next_page: 2,
                    has_more: true,
                    item_count: 20
                }
            }
        }, null, 2),
        paginationHints: {
            search_id: '用于下一页请求透传',
            search_session_id: '用于下一页请求透传',
            next_page: '下一页页码（若为 0 代表没有下一页）',
            has_more: 'true 表示可继续请求下一页',
        }
    };

    res.render('api-doc-xiaohongshu-search-notes-v2', {
        doc,
        seo: {
            title: '小红书搜索笔记接口文档 /xiaohongshu/search_notes_v2',
            description: '小红书搜索笔记接口调用示例与返回参数说明，包含 posts 与 pagination 字段解释。',
            keywords: 'xiaohongshu,search_notes_v2,API文档,curl,分页参数',
            url: pageUrl,
        }
    });
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
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${baseUrl}/sitemap-pages.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-services.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>`;
    res.type('application/xml');
    res.send(xml);
});

router.get('/sitemap-pages.xml', (req, res) => {
    const baseUrl = tool.getBaseUrl(req);
    const today = new Date().toISOString().slice(0, 10);
    const items = [...sitemapPageItems, ...sitemapCategoryItems]
        .map((item) => `  <url>\n    <loc>${xmlEscape(baseUrl + item.path)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${item.changefreq}</changefreq>\n    <priority>${item.priority}</priority>\n  </url>`)
        .join('\n');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}
</urlset>`;

    res.type('application/xml');
    res.send(xml);
});

router.get('/sitemap-services.xml', (req, res) => {
    const baseUrl = tool.getBaseUrl(req);
    const today = new Date().toISOString().slice(0, 10);
    const serviceCatalogUrls = [
        { path: '/services/catalog.json', changefreq: 'hourly', priority: '1.0' },
        { path: '/services/catalog.txt', changefreq: 'daily', priority: '0.8' },
        ...serviceCategories
            .filter((item) => item.id !== 'all')
            .map((item) => ({
                path: `/services/catalog.json?category=${encodeURIComponent(item.id)}`,
                changefreq: 'daily',
                priority: '0.7',
            })),
    ];

    const items = serviceCatalogUrls
        .map((item) => `  <url>\n    <loc>${xmlEscape(baseUrl + item.path)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${item.changefreq}</changefreq>\n    <priority>${item.priority}</priority>\n  </url>`)
        .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}
</urlset>`;

    res.type('application/xml');
    res.send(xml);
});

router.get('/services/catalog.json', (req, res) => {
    const baseUrl = tool.getBaseUrl(req);
    const { category } = req.query;
    const normalizedCategory = typeof category === 'string' ? category.trim() : '';

    const services = serviceCards
        .filter((item) => !normalizedCategory || item.category === normalizedCategory)
        .map((item) => {
            const endpoint = parseEndpoint(item.endpoint);
            return {
                title: item.title,
                category: item.category,
                description: item.description,
                endpoint: item.endpoint,
                method: endpoint.method,
                path: endpoint.path,
                badge: item.badge,
                price: item.price,
            };
        });

    res.json({
        updatedAt: new Date().toISOString(),
        site: baseUrl,
        total: services.length,
        categories: serviceCategories,
        filters: {
            category: normalizedCategory || null,
        },
        services,
    });
});

router.get('/services/catalog.txt', (req, res) => {
    const lines = [
        '# DevTool service catalog',
        '# title\tcategory\tendpoint\tdescription',
        ...serviceCards.map((item) => `${item.title}\t${item.category}\t${item.endpoint}\t${item.description}`),
    ];

    res.type('text/plain; charset=utf-8');
    res.send(lines.join('\n'));
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

router.get('/file-transfer', async (req, res) => {
    const pageUrl = `${tool.getBaseUrl(req)}${req.originalUrl}`;
    res.render('file-transfer', {
        seo: {
            title: '文件中转站 - uploads/downloads 临时文件管理',
            description: '基于 downloads 目录的轻量文件中转页，支持文件查看、搜索、上传与 URL 获取。',
            keywords: '文件中转站,图床,文件上传,文件搜索,downloads',
            url: pageUrl
        }
    });
});

router.get('/network-dashboard', async (req, res) => {
    const pageUrl = `${tool.getBaseUrl(req)}${req.originalUrl}`;
    res.render('network-dashboard', {
        seo: {
            title: '网络日志分析看板 - network.log 可视化监控',
            description: '实时分析 network.log 的请求状态、接口热点、慢请求与时序趋势。',
            keywords: 'network.log,日志分析,可视化看板,请求状态,慢请求,接口监控',
            url: pageUrl,
        },
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
