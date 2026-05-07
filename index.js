import express from 'express';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fs from 'fs';
import { execFile } from 'child_process';
import { JSDOM } from 'jsdom';
import { URL,fileURLToPath } from 'url';
import unkey from './utils/unkey.js'
import { dirname } from 'path';
import path from 'path'
import crypto from 'crypto';
import qs from 'querystring'; // 用于将参数编码为 x-www-form-urlencoded 格式
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
import commonUtils from './utils/commonUtils.js';
import thirdPartyUsed from "./utils/thirdPartyUsed.js";
import navigationRoutes from './routes/navigationRoutes.js';

// 全局 axios 拦截器：捕获 429 请求并打印详细信息
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 429) {
      const config = error.config || {};
      console.error('[429 Rate Limit]', {
        url: config.url,
        method: (config.method || 'GET').toUpperCase(),
        baseURL: config.baseURL,
        fullURL: config.baseURL ? `${config.baseURL}${config.url}` : config.url,
        headers: config.headers,
        params: config.params,
        responseBody: error.response.data,
      });
    }
    return Promise.reject(error);
  }
);

const app = express();
const port = 3000;
const environment = process.env.NODE_ENV || 'development';

app.use(express.json())
app.use(express.text())
app.use(navigationRoutes)

// 设置模板引擎配置 (必须在路由之前)
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

const proxyUrl = `http://${Webshare_PROXY_USER}:${Webshare_PROXY_PASS}@p.webshare.io:80`;
const agent = new HttpsProxyAgent(proxyUrl);

import redis from './utils/redisClient.js';
import search1api from './utils/search1api.js';
import zyte from './utils/zyte.js';
import aitoken from './utils/ThirdParrtyApi/aitoken.js';
import { th_bilibili, th_youtube, th_xiaohongshu,th_wechat_media,th_wechat_channels,th_douyin,th_tiktok,th_douyin_billboard } from './utils/tikhub.io.js';
import { ve_seedream_5_0_lite } from './utils/volcengine.io.js';
import {qweather_tool}  from './utils/qwether.js';
import { tv_search } from './utils/tavily.js';

// 从维基百科搜索条目
app.post('/zh_wikipedia/search_item', async (req, res) => {
    const { item } = req.body;

    if (!item) {
        return res.status(400).send('Invalid input: "item" is required');
    }

    const searchUrl = `https://zh.wikipedia.org/w/api.php?action=query&list=search&srsearch=${item}&format=json`;

    try {
        // 通过代理访问 Wikipedia
        const response = await axios.get(searchUrl, { httpsAgent: agent });
        res.send(response.data);
    } catch (error) {
        console.error(`Error searching Wikipedia: ${error.message}`);
        res.status(500).send(`Error searching Wikipedia: ${error.message}`);
    }
})

// 从维基百科获取词条内容
app.post('/zh_wikipedia/get_item_content', async (req, res) => {
    const { item } = req.body;

    if (!item) {
        return res.status(400).send('Invalid input: "item" is required');
    }

    const wikipediaUrl = `https://zh.wikipedia.org/w/api.php?action=query&prop=extracts&titles=${item}&explaintext&format=json&redirects`;

    try {
        let response = await axios.get(wikipediaUrl,{ httpsAgent: agent });
        response.data.query.pages = Object.values(response.data.query.pages);
        res.send(response.data);
    } catch (error) {
        console.error(`Error searching Wikipedia: ${error.message}`);
        res.status(500).send(`Error searching Wikipedia: ${error.message}`);
    }
})

// 从[英文]维基百科搜索条目
app.post('/en_wikipedia/search_item', async (req, res) => {
    const { item } = req.body;

    if (!item) {
        return res.status(400).send('Invalid input: "item" is required');
    }

    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${item}&format=json`;

    try {
        const response = await axios.get(searchUrl,{ httpsAgent: agent });
        res.send(response.data);
    } catch (error) {
        console.error(`Error searching Wikipedia: ${error.message}`);
        res.status(500).send(`Error searching Wikipedia: ${error.message}`);
    }
})

// 从[英文]维基百科获取词条内容
app.post('/en_wikipedia/get_item_content', async (req, res) => {
    const { item } = req.body;

    if (!item) {
        return res.status(400).send('Invalid input: "item" is required');
    }

    const wikipediaUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&titles=${item}&explaintext&format=json`;

    try {
        let response = await axios.get(wikipediaUrl,{ httpsAgent: agent });
        response.data.query.pages = Object.values(response.data.query.pages);
        res.send(response.data);
    } catch (error) {
        console.error(`Error searching Wikipedia: ${error.message}`);
        res.status(500).send(`Error searching Wikipedia: ${error.message}`);
    }
})

// 判断是否可使用 Google 搜索
async function canSearchGoogle(key) {
    const value = await redis.get(key);
    if (value === null) {
        // 不存在，创建 key 并设置初始值；限制为每天一次（次日零点重置）
        const now = new Date();
        const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const secondsUntilMidnight = Math.floor((nextMidnight - now) / 1000);
        console.log("创建key:", key, "初始值为0，过期时间为", secondsUntilMidnight);
        await redis.set(key, 0, 'EX', secondsUntilMidnight);
        return true
    }else{
        return false;
    }
}

// 判断是否可使用 HTML解析 功能
async function canUseHtmlParse(key) {
    if(environment === "online"){
        const usage = await tool.getUsage(key);
        if (usage >= 3) {
            return false
        }
    }
    return true;
}
async function dailyUse(key) {
    const value = await redis.get(key);
    if (value === null) {
        await redis.set(key, 0, 'EX', 60 * 60);
        return true
    }else{
        return false;
    }
}

const unkeyApiId = "api_413Kmmitqy3qaDo4";

async function verifyApiAccess({ apiKey, freeKey, freeCheck, freeDeniedResponse }) {
    if (apiKey) {
        const { valid, remaining } = await unkey.verifyKey(unkeyApiId, apiKey, 0);
        if (!valid) {
            return {
                ok: false,
                response: {
                    code: -1,
                    msg: commonUtils.MESSAGE.TOKEN_EXPIRED
                }
            };
        }
        if (remaining === 0) {
            return {
                ok: false,
                response: {
                    code: -1,
                    msg: commonUtils.MESSAGE.TOKEN_NO_TIMES
                }
            };
        }
        return { ok: true, paid: true };
    }

    const canUse = await freeCheck(freeKey);
    if (!canUse) {
        return { ok: false, response: freeDeniedResponse };
    }

    return { ok: true, paid: false };
}

async function consumeApiCredits({ apiKey, cost = 1, metadata }) {
    if (!apiKey) return null;
    const { remaining } = await unkey.verifyKey(unkeyApiId, apiKey, cost, metadata);
    return remaining;
}

app.post('/gpt-image-2/generate', async (req, res) => {
    const { prompt, images, api_key } = req.body || {};
    const cost = 3;

    if (!prompt || !prompt.trim()) {
        return res.status(400).json({ success: false, error: 'prompt 不能为空' });
    }
    if (!Array.isArray(images)) {
        return res.status(400).json({ success: false, error: 'images 必须是数组' });
    }
    if (!api_key || !api_key.toString().trim()) {
        return res.status(400).json({ success: false, error: commonUtils.MESSAGE.TOKEN_EMPTY });
    }

    for (const [index, imageUrl] of images.entries()) {
        try {
            new URL(imageUrl);
        } catch {
            return res.status(400).json({ success: false, error: `第 ${index + 1} 个 images 不是合法 URL` });
        }
    }

    const access = await verifyApiAccess({
        apiKey: api_key,
        freeKey: null,
        freeCheck: async () => false,
        freeDeniedResponse: {
            code: -1,
            msg: commonUtils.MESSAGE.TOKEN_EXPIRED
        }
    });
    if (!access.ok) {
        return res.status(403).json({ success: false, error: access.response?.msg || commonUtils.MESSAGE.TOKEN_EXPIRED });
    }

    const tempFiles = [];
    try {
        let rawResult;
        if (images.length > 0) {
            const downloaded = await Promise.all(
                images.map((imageUrl, index) => tool.downloadImageUrlToTempFile(imageUrl, index))
            );
            tempFiles.push(...downloaded);

            const imageStreams = downloaded.map((file) => fs.createReadStream(file));
            rawResult = await aitoken.gpt_image_2_edit(imageStreams, null, prompt.trim());
        } else {
            rawResult = await aitoken.gpt_image_2(prompt.trim());
        }

        console.log('原始接口返回结果:', rawResult);

        const item = rawResult?.data?.[0] || {};
        const remainingPoints = await consumeApiCredits({
            apiKey: api_key,
            cost,
            metadata: { action: 'gpt_image_2_generate' }
        });

        return res.json({
            code: 0,
            msg: "Success",
            data: item.url || null
        });
    } catch (error) {
        console.error('Error in /gpt-image-2/generate:', error);
        const apiMsg = error?.response?.data?.error?.message || error?.response?.data?.message || error.message;
        return res.status(500).json({ success: false, error: `生成失败: ${apiMsg}` });
    } finally {
        await Promise.all(tempFiles.map((file) => fs.promises.unlink(file).catch(() => null)));
    }
});

app.post('/jina_reader', async (req, res) => {

    let { url } = req.body;

    if (!url) {
        return res.status(400).send('Invalid input: "url" is required');
    }
    if(!tool.isValidUrl(url)){
        return res.status(400).send("链接无效，请输入正确的链接");
    }

    try {
        const response = await cozecom.linkReader(url)
        const content = JSON.parse(response.content)

        var data = ""
        if (content.output !== null) {
            data = content.output.content
        } else if (content.pdf_content) {
            data = content.pdf_content
        }
        return res.send({
            code: 0,
            msg: 'Success',
            data: data
        });
    } catch (error) {
        console.error(`Error calling CozeCom API: ${error.message}`);
        res.status(500).send(`链接读取失败: ${error.message}`);
    }

})


function htmlToQuerySelector(htmlString) {
    // 为了保证解析正确，我们将传入的 html 包裹在 <body> 中
    const dom = new JSDOM(`<body>${htmlString}</body>`);
    const body = dom.window.document.body;
  
    let selectorParts = [];
    let element = body.firstElementChild;
    
    // 遍历嵌套的每一级标签
    while (element) {
      let part = element.tagName.toLowerCase();
      
      // 如果存在 class，则添加到选择器中
      if (element.className) {
        // 多个 class 按空白字符拆分
        const classes = element.className.trim().split(/\s+/);
        classes.forEach(cls => {
          part += `.${cls}`;
        });
      }
      
      // 对除了 class 的其他属性，添加 [attr="value"] 形式
      Array.from(element.attributes).forEach(attr => {
        if (attr.name === 'class') return; // 已处理
        part += `[${attr.name}="${attr.value}"]`;
      });
      
      selectorParts.push(part);
      // 假设输入为嵌套结构，取第一个子元素继续
      element = element.firstElementChild;
    }
    
    // 拼接成一个选择器，空格表示后代选择器
    return selectorParts.join(' ');
}

function extract_html_conent(HtmlContent,xpath,selector){

    const dom = new JSDOM(HtmlContent);
    const { document, window } = dom.window;

    let result_list = [];

    if (xpath) {
        const result = document.evaluate(
            xpath, 
            document, 
            null, 
            window.XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, // 使用 window.XPathResult
            null
        );
        // Iterate over the results
        for (let i = 0; i < result.snapshotLength; i++) {
            const element = result.snapshotItem(i);
            result_list.push({ htmlContent: element.outerHTML });
        }
    } else if (selector) {
        const domSelector = selector;
        const parserSelector = htmlToQuerySelector(domSelector);
        console.log(parserSelector)
        result_list = Array.from(document.querySelectorAll(parserSelector)).map(element => {
            return { htmlContent: element.outerHTML };
        }); 
    }

    console.log(`提取到的内容数量: ${result_list.length}`);
    
    return result_list
}

//标准版：根据selector和xpath选择元素
function extract_html_conent_standard(HtmlContent,xpath,selector){

    const dom = new JSDOM(HtmlContent);
    const { document, window } = dom.window;

    let result_list = [];

    if (xpath) {
        const result = document.evaluate(
            xpath, 
            document, 
            null, 
            window.XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, // 使用 window.XPathResult
            null
        );
        // Iterate over the results
        for (let i = 0; i < result.snapshotLength; i++) {
            const element = result.snapshotItem(i);
            result_list.push({ htmlContent: element.outerHTML });
        }
    } else if (selector) {
        // 直接用 selector 作为 CSS 选择器，无需转换
        result_list = Array.from(document.querySelectorAll(selector)).map(element => {
            return { htmlContent: element.outerHTML };
        });
    }else{
        result_list.push({ htmlContent: HtmlContent });
    }

    console.log(`提取到的内容数量: ${result_list.length}`);
    
    return result_list
}

app.post('/parse_html', async (req, res) => {
    let { url, selector, xpath, api_key, actions } = req.body;
    if (!url) {
        return res.status(400).send('url is required');
    }
    if (!selector && !xpath) {
        return res.status(400).send('selector or xpath 二选一，只需要填一个');
    }
    if (selector && xpath) {
        return res.status(400).send('selector or xpath 不要两个都填，只需要填一个');
    }
    //判断是否是合法的url   
    try {
        new URL(url); // Validate URL format
    } catch (error) {
        return res.send({
            code: -1,
            msg: 'url格式不正确，请检查后重试！'
        });
    }

    if (actions) {
        return await zyteExtract(req, res);
    }
    //免费版的key
    const free_key = "html_parser_" + req.headers['user-identity']
    const access = await verifyApiAccess({
        apiKey: api_key,
        freeKey: free_key,
        freeCheck: canUseHtmlParse,
        freeDeniedResponse: {
            code: -1,
            msg: commonUtils.MESSAGE.FREE_KEY_EXPIRED_3
        }
    });
    if (!access.ok) {
        return res.send(access.response);
    }

    try {

        const sanitizedUrl = url.trim(); // Remove any whitespace including newlines

        const htmldata = await tool.request_chromium(sanitizedUrl, null, null, null, null)

        let result_list = extract_html_conent(htmldata,xpath,selector)


        let msg = "";
        if (api_key) {
            const remaining = await consumeApiCredits({
                apiKey: api_key,
                cost: 1,
                metadata: tool.sanitizeUsageMetadata({ url, selector, xpath })
            });
            msg = `API Key 剩余积分：${remaining}`;
        }else{
            await redis.incr(free_key);//每次调用增加一次
            msg = `今日免费剩余积分：${3 - await tool.getUsage(free_key)}`;
        }

        return res.send({
            code: 0,
            msg: msg,
            data: result_list
        });
    } catch (error) {
        console.error(`Error: ${error}`);
        return res.send({
            code: -1,
            msg: error.message,
            data: []
        })
    }
})

app.post('/wyy/hot_comment', async (req, res) => {

    try {
        const url = "https://keai.icu/apiwyy/apitext"
        const response = await axios.get(url);
        res.send({
            code: 0,
            msg: 'Success',
            data: response.data
        })
    } catch (error) {
        console.error(`Error searching Netease Music: ${error.message}`);
        res.status(500).send(`Error searching Netease Music: ${error.message}`);
    }
    
})


app.post('/google/search/web', async (req, res) => {
    const { q, api_key} = req.body;
    // var api_id = "api_41vHKzNmXf5xx23f"; //原有的 api_id 
    var api_id = ""; 
    let final_remaining = null;
    if (!q) {
        return res.status(400).send('Invalid input: "q" is required');
    }
    res.setTimeout(140000, () => {
        if (!res.headersSent) {
            res.status(504).send({ code: -1, msg: 'Request Timeout' });
        }
    });
    try {
        // --- 逻辑分流：付费 Key 验证 vs 免费限流 ---
        if (api_key) {
            const NEW_KEY_ID = "api_413Kmmitqy3qaDo4";
            const OLD_KEY_ID = "api_41vHKzNmXf5xx23f";

            // 尝试新 Key
            let check = await unkey.verifyKey(NEW_KEY_ID, api_key, 0);
            api_id = NEW_KEY_ID;
            // 如果新 Key 无效，尝试旧 Key
            if (!check.valid) {
                check = await unkey.verifyKey(OLD_KEY_ID, api_key, 0);
                api_id = OLD_KEY_ID;
            }
            // 最终校验结果处理
            if (!check.valid) {
                return res.send({ code: -1, msg: commonUtils.MESSAGE.TOKEN_EXPIRED });
            }
            if (check.remaining <= 0) {
                return res.send({ code: -1, msg: commonUtils.MESSAGE.TOKEN_NO_TIMES });
            }
            final_remaining = check.remaining;
        }else{
            // 免费版逻辑
            const userIdent = req.headers['user-identity'] ? `${req.ip}_${req.headers['user-identity']}` : req.ip;
            const free_key = 'google_' + userIdent;
            const canSearch = await canSearchGoogle(free_key);
            if (!canSearch) {
                if (req.headers['user-identity'] !== 'c4ca4238a0b923820dcc509a6f75849b') {
                    console.log(`用户 ${req.headers['user-identity']} 的免费版 Google 搜索次数已用完`);
                }
                return res.send({
                    code: 0,
                    msg: "为了保证付费用户的使用体验，免费用户有使用频率限制。详情：https://devtool.uk/plugin",
                    data: [{
                        'title': commonUtils.MESSAGE.FREE_API_HOUR_USE_LIMIT,
                        'link': commonUtils.MESSAGE.HELP_LINK,
                        'snippet': commonUtils.MESSAGE.FREE_API_HOUR_USE_LIMIT
                    }]
                }); 
            }
        }

        const searchData = await search1api.search(q);
        const result_list = Array.isArray(searchData?.results) ? searchData.results : [];

        let msg = '';
        if (api_key) {
            //付费版
            const { remaining } = await unkey.verifyKey(api_id, api_key, 1);
            msg = `API Key 剩余积分：${remaining}`;
        }
        if (!res.headersSent) {
            await redis.incr('google_search_requests');
            return res.send({
                code: 0,
                msg: msg,
                data: result_list
            });
        }
    } catch (err) {
        console.error(`Error searching Google: ${err.message}`);
        if(!res.headersSent){
        return res.send({
            code: -1,
            msg: 'failure',
            data: [{
                'title': "搜索失败",
                'snippet': "搜索失败",
                'link': ''
            }]
        });
    }
    }
})

// Tavily 智能搜索 API
app.post('/tavily/search', tv_search.search.bind(tv_search));

// zyte解析网页内容
async function zyteExtract(req, res) {
    let { url, selector, xpath, api_key, action, screenshot } = req.body;
    if (!url) {
        return res.status(400).send('url is required');
    }
    if (!selector && !xpath) {
        return res.status(400).send('parser or xpath is required');
    }
    if (screenshot !== true) {
        screenshot = false;
    }

    //免费版的redis_key，用于限制用户的使用次数
    const free_key = "html_parser_" + req.headers['user-identity']
    const access = await verifyApiAccess({
        apiKey: api_key,
        freeKey: free_key,
        freeCheck: canUseHtmlParse,
        freeDeniedResponse: {
            code: -1,
            msg: commonUtils.MESSAGE.FREE_KEY_EXPIRED_3,
            data: [{ htmlContent: commonUtils.MESSAGE.FREE_KEY_EXPIRED_3 }]
        }
    });
    if (!access.ok) {
        return res.send(access.response);
    }

    try {


        //处理action
        let actions = [];//完整的动作列表
        if (action){
            action = JSON.parse(action);//本次动作
            action.forEach((item) => {
                if (item.action === "click") {
                    actions.push(zyte.gen_waitForSelector_code(item.selector.type, item.selector.value));
                    actions.push(item)
                }else{
                    actions.push(item)
                }
            })
        }


        let msg = "";
        let result_list = [];
        let {error, HtmlContent} = await zyte.extract(url, actions, screenshot);
        
        console.log(error);

        const dom = new JSDOM(HtmlContent);
        const { document, window } = dom.window;

        if (xpath) {
            const result = document.evaluate(
                xpath, 
                document, 
                null, 
                window.XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, // 使用 window.XPathResult
                null
            );
            // Iterate over the results
            for (let i = 0; i < result.snapshotLength; i++) {
                const element = result.snapshotItem(i);
                result_list.push({ htmlContent: element.outerHTML });
            }
        } else if (selector) {
            const domSelector = selector;
            const parserSelector = htmlToQuerySelector(domSelector);
            result_list = Array.from(document.querySelectorAll(parserSelector)).map(element => {
                return { htmlContent: element.outerHTML };
            }); 
        }

        if (api_key) {
            const remaining = await consumeApiCredits({
                apiKey: api_key,
                cost: 1,
                metadata: tool.sanitizeUsageMetadata({ url, selector, xpath })
            });
            msg += ` API Key 剩余积分：${remaining}`;
        }else{
            await redis.incr(free_key);//每次调用增加一次
            msg = `今日免费剩余积分：${3 - await tool.getUsage(free_key)}`;
        }
        
        return res.send({
            code: 0,
            msg: msg,
            data: result_list
        });
    } catch (error) {
        console.error(`Error: ${error}`);
        res.status(500).send(`Error: ${error.message}`);
    }
}

//全网视频下载(B站/抖音/头条/油管)
app.post('/download_video', async (req, res) => {
    let {url,api_key} = req.body
    if (!url) {
         return res.status(400).send('Invalid input: "url" is required');
    }
    try {
        var videoLink = tool.extract_url(url)
        if (!videoLink) throw new Error("无法解析此链接，本插件支持快手/抖音/小红书/B站/Youtube/tiktok，有问题联系作者【vx：xiaowu_azt】")
        if (!(videoLink.includes('www.youtube.com') || videoLink.includes('youtu.be') || videoLink.includes('xiaohongshu.com'))) {
            videoLink = tool.remove_query_param(videoLink)
        }

        const free_key = "FreeVideoDownload_" + req.headers['user-identity']
        var left_time = 0

        const access = await verifyApiAccess({
            apiKey: api_key,
            freeKey: free_key,
            freeCheck: tool.canUseFreeVideoDownload,
            freeDeniedResponse: {
                code: -1,
                msg: commonUtils.MESSAGE.FREE_KEY_EXPIRED_1
            }
        });
        if (!access.ok) {
            return res.send(access.response);
        }

        if (!api_key) {
            left_time = await redis.get(free_key)
            if (!left_time || isNaN(left_time)) left_time = 1
        }

        //查询直链
        console.log("下载视频链接：" + videoLink)
        //链接预处理（av转bv）
        videoLink = await tool.url_preprocess(videoLink)
        let retries = 3;
        let XiaZaiTool;
        while (retries > 0) {
            XiaZaiTool = await tool.get_video_url(videoLink);
            if (XiaZaiTool.success) break;
            retries--;
            if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 1 second
            }
        }
        if (!XiaZaiTool.success) throw new Error(XiaZaiTool.data);
        const downloadUrl = XiaZaiTool.data.video_url
        
        var msg = ""
        if (api_key) {
            const remaining = await consumeApiCredits({
                apiKey: api_key,
                cost: 1,
                metadata: { action: 'download_video' }
            });
            msg = `解析成功，API Key 剩余积分：${remaining}`;
        }else{
            await redis.set(free_key, Number(left_time)-1, 'EX', tool.getSecondsToMidnight()); // 每次调用减少一次
            msg = `解析成功`;
        }
        
        return res.send({
            "code": 0,
            "msg": msg,
            "data": downloadUrl
        })

    } catch (error) {
        console.error(error)
        return res.send({
            "code":-1,
            "msg":error.message
        })
    }
})

app.post('/get_sitemap', async (req, res) => {
    const { url, api_key } = req.body;
    if (!url) {
        return res.status(400).send('Invalid input: "url" is required');
    }

    const redis_key = req.headers['user-identity'] ? 'get_sitemap_'+req.headers['user-identity'] : 'get_sitemap';
    const access = await verifyApiAccess({
        apiKey: api_key,
        freeKey: redis_key,
        freeCheck: tool.canUseSitemapFreeOnce,
        freeDeniedResponse: {
            code: -1,
            msg: commonUtils.MESSAGE.FREE_KEY_EXPIRED_1
        }
    });
    if (!access.ok) {
        return res.send({ msg: access.response?.msg || commonUtils.MESSAGE.FREE_KEY_EXPIRED_1 });
    }
    
    const sitemap = await search1api.sitemap(url);
    var msg = null
    if (api_key) {
        const remaining = await consumeApiCredits({
            apiKey: api_key,
            cost: 1,
            metadata: { action: 'get_sitemap' }
        });
        msg = `API Key 剩余积分：${remaining}`;
    }
    return res.send({
        code: 0,
        msg: msg,
        data: sitemap
    });
})

app.post('/crawl', th_wechat_media.fetch_mp_article_detail_html.bind(th_wechat_media));

//生成zyte点击元素的代码
app.post('/web/click', async (req, res) => {
    const { type, value} = req.body;
    if (!type || !value) {
        return res.status(400).send('Invalid input: "type" and "value" are required');
    }
    return res.send({
        code: 0,
        msg: 'Success',
        data: zyte.gen_click_code(type, value)
    });
})

//生成zyte等待元素出现的代码
app.post('/web/waitForSelector', async (req, res) => {
    const { type, value} = req.body;
    if (!type || !value) {
        return res.status(400).send('Invalid input: "type" and "value" are required');
    }
    return res.send({
        code: 0,
        msg: 'Success',
        data: zyte.gen_waitForSelector_code(type, value)
    });
})

//zyte等待
app.post('/web/waitForTimeout', async (req, res) => {
const { timeout } = req.body;
    if (!timeout) {
        return res.status(400).send('Invalid input: "timeout" are required');
    }
    return res.send({
        code: 0,
        msg: 'Success',
        data: zyte.gen_waitForTimeout_code(timeout)
    });
})

//zyte在元素中输入文本。
app.post('/web/inputText', async (req, res) => {
    const { type, value, text } = req.body;
    if (!type || !value || !text) {
        return res.status(400).send('Invalid input: "type" and "value" and "text" are required');
    }
    return res.send({
        code: 0,
        msg: 'Success',
        data: zyte.gen_inputText_code(type, value, text)
    });
});

app.post('/bilibili/subtitle', th_bilibili.fetch_one_video_v2);
app.post('/bilibili/fetch_user_post_videos', th_bilibili.fetch_user_post_videos);
app.post('/bilibili/fetch_video_comments', th_bilibili.fetch_video_comments);
app.post('/volcengine/seedream/5.0-lite/generate-image', ve_seedream_5_0_lite.generate_image);
app.post('/youtube/get_channel_videos_v2', th_youtube.get_channel_videos_v2);
app.post('/xiaohongshu/home_notes', th_xiaohongshu.fetch_home_notes);
app.post('/xiaohongshu/search_notes_v2', th_xiaohongshu.search_notes_v2);
app.post('/xiaohongshu/get_note_info_v1', th_xiaohongshu.get_note_info_v1);
// 通过公众号用户id获取文章
app.post('/wx_gzh/get_user_articles', th_wechat_media.get_wechat_mp_article_list);

//抖音获取用户主页作品数据
app.post('/douyin/fetch_user_post_videos', th_douyin.fetch_user_post_videos);

//抖音获取用户主页作品数据（V3原始结果）
app.post('/douyin/fetch_user_post_videos_v3', th_douyin.fetch_user_post_videos_v3);

//抖音综合搜索
app.post('/douyin/fetch_general_search_v1', th_douyin.fetch_general_search_v1);

//抖音视频搜索
app.post('/douyin/fetch_video_search_v2', th_douyin.fetch_video_search_v2);

//抖音综合搜索
app.post('/douyin/comments', th_douyin.fetch_video_comments);

//抖音上升热点榜
app.post('/douyin/billboard/fetch_hot_rise_list', th_douyin_billboard.fetch_hot_rise_list);

//抖音同城热点榜
app.post('/douyin/billboard/fetch_hot_city_list', th_douyin_billboard.fetch_hot_city_list);

//TikTok 通过作品ID获取评论
app.post('/tiktok/fetch_post_comment', th_tiktok.fetch_post_comment);


// // 获取公众号文章详情JSON
// app.post('/wx_gzh/fetch_mp_article_detail_json', th_wechat_media.fetch_mp_article_detail_json);
//
// // 获取公众号文章详情html
// app.post('/wx_gzh/fetch_mp_article_detail_html', th_wechat_media.fetch_mp_article_detail_html);
//
// // 获取公众号文章阅读量
// app.post('/wx_gzh/fetch_mp_article_read_count', th_wechat_media.fetch_mp_article_read_count);
//
// // 获取微信公众号文章评论列表
// app.post('/wx_gzh/fetch_mp_article_comment_list', th_wechat_media.fetch_mp_article_comment_list);
//
// // 获取微信公众号长链接转短链接
// app.post('/wx_gzh/mp_url_long2short', th_wechat_media.mp_url_long2short);
//
// // 微信视频号搜索
// app.post('/wx_sph/search_videos_by_keyword', th_wechat_channels.search_videos_by_keyword);
//
// //微信视频号视频详情
// app.post('/wx_sph/fetch_video_detail', th_wechat_channels.fetch_video_detail);
//
// //微信视频号主页
// app.post('/wx_sph/fetch_home_page', th_wechat_channels.fetch_home_page);
//
// //微信视频号热门话题
// app.post('/wx_sph/fetch_hot_words', th_wechat_channels.fetch_hot_words);


app.post("/qweather/history_weather",qweather_tool.get_history_weather)

app.post("/qweather/city_weather_code",qweather_tool.get_city_weather_code)

import { calc_ba_zi , calc_zi_wei, points} from './utils/bazi.js';
// 计算八字
app.post('/bazi/calc_ba_zi', calc_ba_zi.calc_ba_zi)

// 计算紫薇
app.post('/bazi/calc_astro', calc_zi_wei.calc_zi_wei)

// 计算积分
app.post('/bazi/points', points.calc_points)
/**
 * api调用coze工作流
 */
app.post("/workflow/run",coze.workflow_run)

async function scanKeysByPattern(pattern) {
    let cursor = '0';
    const keys = [];

    do {
        const [nextCursor, batch] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 500);
        cursor = nextCursor;
        if (batch && batch.length > 0) {
            keys.push(...batch);
        }
    } while (cursor !== '0');

    return keys;
}

app.post('/redis/get_string', async (req, res) => {
    const { key } = req.body;
    if (!key) {
        return res.status(400).send('Invalid input: "key" is required');
    }
    const value = await redis.get(key);
    return res.send({
        code: 0,
        msg: 'Success',
        data: value
    });
})
app.post('/redis/set_string', async (req, res) => {
    const { key, value } = req.body;
    if (!key || !value) {
        return res.status(400).send('Invalid input: "key" and "value" is required');
    }
    await redis.set(key, value, 'EX', 60*60*24);
    return res.send({
        code: 0,
        msg: 'Success',
        data: value
    });
})
app.post('/redis/keys', async (req, res) => {
    const { pattern } = req.body;
    if (!pattern) {
        return res.status(400).send('Invalid input: "pattern" is required');
    }
    const keys = await scanKeysByPattern(pattern);
    return res.send({
        code: 0,
        msg: 'Success',
        data: keys
    });
})

app.post('/redis/del_keys', async (req, res) => {
    const { pattern } = req.body;
    if (!pattern) {
        return res.status(400).send('Invalid input: "pattern" is required');
    }
    const keys = await scanKeysByPattern(pattern);
    if (keys.length > 0) {
        const pipeline = redis.pipeline();
        keys.forEach(key => pipeline.del(key));
        await pipeline.exec();
    }

    return res.send({
        code: 0,
        msg: 'Success',
        data: keys
    });
})


app.post('/redis/del', async (req, res) => {
    const { key } = req.body;
    await redis.del(key)
    return res.send({
        code: 0,
        msg: 'Success'
    });
})

function extract_pdf_url(url) {
    try {
            const urlObj = new URL(url);
            // 从 file 参数中获取真实的 PDF URL
            const pdfUrl = urlObj.searchParams.get('file');
            if (!pdfUrl) {
                throw new Error('No PDF URL found in parameters');
            }
            // 解码URL
            return decodeURIComponent(pdfUrl);
        } catch (error) {
            console.error('Error extracting PDF URL:', error);
            return null;
        }
}

async function validateUrl(url) {
    // 1. 基础格式校验
    let parsed;
    try {
        parsed = new URL(url);
    } catch {
        throw new Error(`URL 格式无效: ${url}`);
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error(`URL 协议不支持，仅允许 http/https: ${url}`);
    }
    // 2. 可访问性校验（HEAD 请求，超时 10s）
    try {
        await axios.head(url, { timeout: 10000, maxRedirects: 5 });
    } catch (err) {
        const status = err.response?.status;
        if (status) {
            throw new Error(`URL 不可访问，HTTP 状态码: ${status}`);
        }
        throw new Error(`URL 不可访问: ${err.message}`);
    }
}

async function downloadPdf(url, path) {
    if (!url || typeof url !== 'string') {
        throw new Error(`Invalid PDF URL: ${JSON.stringify(url)}`);
    }
    // 基础校验 + 可访问性检测
    await validateUrl(url);
    // 检查是否是viewer URL
    if (url.includes('viewer.html')) {
        const pdfUrl = extract_pdf_url(url);
        if (!pdfUrl) {
            throw new Error('无法从viewer URL中提取PDF地址');
        }
        url = pdfUrl; // 使用提取出的真实PDF URL
    }

  const res = await axios({ url, responseType: 'stream' });

  const contentType = res.headers['content-type'];
  if (!contentType || !contentType.includes('application/pdf')) {
    throw new Error(`❌ 不是 PDF 文件，Content-Type 是: ${contentType}`);
  }

  // 确认是 PDF，再保存
  const writer = fs.createWriteStream(path);
  res.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve('✅ 下载成功: ' + path));
    writer.on('error', reject);
  });
}

app.post('/pdf2img', async (req, res) => {
    const { url } = req.body;
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
        return res.status(400).send('Invalid input: "url" must be a valid HTTP URL string');
    }
    const randomString = [...Array(16)].map(() => Math.random().toString(36)[2]).join('');
    await downloadPdf(url, `./downloads/${randomString}.pdf`).then(() => {
        console.log('PDF downloaded successfully');

        const python = 'python';
        const script = path.join(__dirname, 'pdf2images.py');

        execFile(python, [script, `./downloads/${randomString}.pdf`, randomString], (error, stdout, stderr) => {
            if (error) {
                console.error(stderr);
                return res.send({
                    code: -1,
                    msg: 'PDF文件转换失败'+stderr,
                })
            }

            const outputFiles = stdout.trim().split('\n');

            return res.send({
                code: 0,
                data: outputFiles.map(path => req.protocol + '://' + req.get('host') + '/' + path)
            });
        });

    }).catch((error) => {   
        console.error('Error downloading PDF:', error);
        return res.send({
            code: -1,
            msg: 'PDF文件转换失败，请检查url是否正确！',
        });
    })
})

app.post('/download_pdf', async (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).send('Invalid input: "url" is required');
    }

    const randomString = [...Array(16)].map(() => Math.random().toString(36)[2]).join('');
    await downloadPdf(url, `./downloads/${randomString}.pdf`).then(() => {
        console.log('PDF downloaded successfully');
        return res.send({
            code: 0,
            data: req.protocol + '://' + req.get('host') + `/downloads/${randomString}.pdf`,
        });

    }).catch((error) => {   
        console.error('Error downloading PDF:', error);
        return res.send({
            code: -1,
            msg: 'PDF文件下载失败，请检查url是否正确！',
        });
    })

})

import netdiskapi from './utils/netdiskapi.js';
import  tool from './utils/tool.js';
import * as aimlapi from './utils/ThirdParrtyApi/aimlapi.js';
import * as lemonfoxai from './utils/ThirdParrtyApi/lemonfoxai.js';
import coze from './utils/ThirdParrtyApi/coze.js';
import cozecom from './utils/ThirdParrtyApi/cozecom.js';
import browserless, { getQingGuoProxy, Webshare_PROXY_PASS, Webshare_PROXY_USER } from './utils/ThirdParrtyApi/browserless.js';
import CloudFlareApi from './utils/ThirdParrtyApi/cloudflare.js';
import feishu from './utils/ThirdParrtyApi/feishu.js';
import tencentapi from './utils/ThirdParrtyApi/tencentapi.js';
import firecrawlTool from './utils/ThirdParrtyApi/firecrawl.js';

// 静态资源服务
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/audio', express.static(path.join(__dirname, 'downloads')));
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

app.post('/xpan/search', netdiskapi.search)
app.post('/xpan/get_dlink', netdiskapi.get_dlink)
app.post('/xpan/get_access_token', netdiskapi.get_access_token)
app.post('/xpan/refresh_token', netdiskapi.refresh_token)
app.post('/xpan/filemetainfo', netdiskapi.filemetainfo)
app.get('/xpan/download', netdiskapi.download)

//生成重定向链接
app.post('/tts_to_mp3', async (req, res) => {
    let { url } = req.body;
    if (!url) {
        return res.status(400).send('Invalid input: "url" is required');
    }
    const key = "mp3_" + tool.md5(Date.now().toString() + crypto.randomBytes(8).toString('hex'))
    await redis.set(key, url, "EX", 3600*24*30)
    return res.send({
        "code": 0,
        "msg": "success", 
        "data": 'https://' + req.get('host') + '/mp3/' + key + '.mp3'
    })
})
//执行重定向
app.get('/mp3/:id', async (req, res) => {
    // 获取动态参数值
    const id = req.params.id;
    
    // 去掉 .mp3 后缀（如果需要）
    const fileId = id.replace('.mp3', '');
    
    try {
        // 从 Redis 获取真实 URL
        const realUrl = await redis.get(fileId);
        if (!realUrl) {
            return res.status(404).send('File not found');
        }
        
        // 重定向到实际 URL
        res.redirect(302, realUrl);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.post('/audio-format-convert', async (req, res) => {
    let { url, format} = req.body;
    if (!url || !format) {
        return res.status(400).send('Invalid input: "url" or "format" is required');
    }
    const supported_format = ['mp3', 'm4a', 'wav', 'ogg', 'aac', 'flac'];
    if (!supported_format.includes(format)) {
        return res.send({
            "code": -1,
            "msg":"format参数仅支持mp3/m4a/wav/ogg/aac/flac"
        })
    }
    
    try {
        const download = await tool.download_audio(url)
        if(!download.success) throw new Error(download.error)
        const convert = await tool.audio_format_convert(download.filepath, format)
        if(!convert.success) throw new Error(convert.error)
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        return res.send({
            "code": 0,
            "msg":"格式转换成功，请尽快使用，本站将定期清除",
            "data": `${protocol}://${req.get('host')}/audio/${path.basename(convert.filepath)}`
        })
    }catch(error){
        console.error(error)
        return res.send({
            "code": -1,
            "msg":"格式转换失败："+error.message
        })
    }
})

app.post('/video2audio', async (req, res) => {
    const {videoUrl} = req.body
    if (!videoUrl){
        return res.status(400).send('Invalid input: "videoUrl" is required');
    }

    try {
        const download = await tool.download_file(videoUrl)
        if (!download.success) throw new Error(download.error);
        if (download.is_audio) {
            const convert = await tool.audio_format_convert(download.filepath, 'mp3')
            if(!convert.success) throw new Error(convert.error)
            return res.send({
                "code": 0,
                "msg": "success",
                "data": `https://coze-js-api.devtool.uk/audio/${path.basename(convert.filepath)}`
            })
        }
        const convert = await tool.video_to_audio(download.filepath)
        if (!convert.success) throw new Error(convert.error);

        return res.send({
            "code": 0,
            "msg": "success",
            "data": `https://coze-js-api.devtool.uk/audio/${path.basename(convert.outputFile)}`
        })
    }catch(error){
        console.error(error)
        return res.send({
            "code": -1,
            "msg": error.message
        })
    }
})

app.post('/cozecom/linkreader', async (req, res) => {
    const { url, api_key } = req.body;
    if (!url) {
        return res.status(400).send('Invalid input: "url" is required');
    }

    if(!tool.isValidUrl(url)){
        return res.status(400).send("链接无效，请输入正确的url链接");
    }

    try {
        const response = await cozecom.linkReader(url)
        const content = JSON.parse(response.content)
        
        const data = {
            "content": content.output.content,
        }
        return res.send({
            code: 0,
            msg: 'Success',
            data: data
        });
    } catch (error) {
        console.error(`Error calling CozeCom API: ${error.message}`);
        res.status(500).send(`链接读取失败: ${error.message}`);
    }
})

app.post('/whisper/speech-to-text', async (req, res) => {
    let {url,language,api_key,cache} = req.body
    const webVersionHint = '可访问网页版使用字幕解析功能：https://devtool.uk/video-transcript';
    if (!url) {
         return res.status(400).send('Invalid input: "url" is required');
    }
    // if (!language){
    //     language="zh"
    // }
    if (cache === null || cache === undefined){
        cache = true; // 默认读取缓存
    }

    if (!api_key) {
        return res.send({
            code: -1,
            msg: `${commonUtils.MESSAGE.TOKEN_EMPTY}，${webVersionHint}`
        });
    }

    const lock_key = "asr:lock:" + req.headers['user-identity']//并发锁
    const calcCreditsBySeconds = (seconds) => {
        const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
        return Math.max(1, Math.ceil(safeSeconds / 60));
    };
    const calcCreditsFromVtt = (vtt) => {
        if (!vtt || typeof vtt !== 'string') return 1;
        const reg = /(\d{2}):(\d{2}):(\d{2})\.(\d{3})/g;
        let maxSeconds = 0;
        let match;
        while ((match = reg.exec(vtt)) !== null) {
            const seconds = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000;
            if (seconds > maxSeconds) maxSeconds = seconds;
        }
        return calcCreditsBySeconds(maxSeconds);
    };

    let videoPath = null;
    let audioPath = null;

    try{

        var videoLink = tool.extract_url(url)
        if (!videoLink) throw new Error(commonUtils.MESSAGE.VIDEO_PARSE_ERROR)
        if (!(videoLink.includes('www.youtube.com') || videoLink.includes('youtu.be') || videoLink.includes('xiaohongshu.com'))) {
            videoLink = tool.remove_query_param(videoLink)
        }
        // 统一缓存key使用预处理后的链接，避免读取与写入不一致导致缓存失效
        videoLink = await tool.url_preprocess(videoLink)
        const transcriptionCacheKey = "transcription_v2_" + videoLink;
        
        const { keyId, valid, remaining, code } = await unkey.verifyKey("api_413Kmmitqy3qaDo4", api_key, 0);
        if (!valid) {
            return res.send({
                code: -1,
                msg: `${commonUtils.MESSAGE.TOKEN_EXPIRED}，${webVersionHint}`
            }); 
        }
        if (remaining == 0) {
            return res.send({
                code: -1,
                msg: `${commonUtils.MESSAGE.TOKEN_NO_TIMES}，${webVersionHint}`
            }); 
        }

        let creditsToConsume = 1;
        let usedCache = false;
        var transcription = await redis.get(transcriptionCacheKey)
        if (transcription && cache){
            usedCache = true;
            
            transcription = JSON.parse(transcription)
        }else{
            
            let retries = 3;
            let XiaZaiTool;
            while (retries > 0) {
                XiaZaiTool = await tool.get_video_url(videoLink);
                if (XiaZaiTool.success) break;
                retries--;
                if (retries > 0) {
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 1 second
                }
            }
            if (!XiaZaiTool.success) throw new Error(XiaZaiTool.data);
            //设置并发锁
            await redis.set(lock_key, 1, "NX", "EX", 60 * 5) //设置5分钟的锁

            var downloadUrl = XiaZaiTool.data.video_url
            //下载mp4文件
            const download = await tool.download_video(downloadUrl,url)
            if (!download.success) throw new Error(download.error);
            videoPath = download.filepath;

            const durationResult = await tool.getMediaDuration(download.filepath);
            if (!durationResult.success || !Number.isFinite(durationResult.duration)) {
                throw new Error("无法获取视频时长，请稍后重试");
            }
            creditsToConsume = calcCreditsBySeconds(durationResult.duration);
            if (remaining < creditsToConsume) {
                throw new Error(`余额不足：当前视频预计消耗 ${creditsToConsume} 点，剩余 ${remaining} 点`);
            }

            let convert;
            if (!download.is_audio){
                //mp4转mp3
                convert = await tool.video_to_audio(download.filepath)
                if (!convert.success) throw new Error(convert.error);
                audioPath = convert.outputFile;
            }else{
                convert = {
                    outputFile: download.filepath
                }
                audioPath = download.filepath;
            }

            //语音转文字
            console.log("开始生成字幕")
            const whisperResult = await CloudFlareApi.run_whisper(convert.outputFile, language)
            transcription = whisperResult.result
            if (!transcription || !transcription.text) {
                throw new Error("字幕生成失败，可能是视频时长太长，或者服务器压力太大，请稍后再试！")
            }
    
            await redis.set(transcriptionCacheKey, JSON.stringify(transcription), "EX", 3600 * 24 * 60)
            await redis.del(lock_key)//关闭并发锁
            console.log("字幕生成结束")
        }

        const data = {
            text: transcription.text,
            srt: ''
        }
        
        var msg = ""
        if (!usedCache) {
            const { valid: consumeValid, remaining: finalRemaining } = await unkey.verifyKey("api_413Kmmitqy3qaDo4", api_key, creditsToConsume);
            if (!consumeValid) {
                throw new Error(commonUtils.MESSAGE.TOKEN_EXPIRED);
            }
            msg = `API Key 剩余积分：${finalRemaining}`;
        } else {
            msg = `API Key 剩余积分：${remaining}`;
        }

        return res.send({
            'code': 0,
            'msg': msg,
            'data': data
        })
    }catch(error){
        console.error(error)
        await redis.del(lock_key)
        return res.send({
            'code': -1,
            'msg': `${error.message}，${webVersionHint}`
        });
    } finally {
        // 清理临时文件
        const filesToClean = videoPath === audioPath
            ? [videoPath]
            : [videoPath, audioPath];
        for (const filePath of filesToClean) {
            if (filePath && fs.existsSync(filePath)) {
                fs.unlink(filePath, (err) => {
                    if (err) console.error('Error deleting temporary file:', err.message);
                });
            }
        }
    }
})

app.post('/cloudflare/run_whisper', async (req, res) => {
    const { url, language } = req.body;

    if (!url) {
        return res.status(400).send('Invalid input: "url" is required');
    }

    let audioPath = null;
    let shouldCleanup = false;

    try {
        const download = await tool.download_file(url);
        if (!download.success) {
            throw new Error(download.error);
        }
        if (!download.is_audio) {
            throw new Error('仅支持音频链接');
        }

        audioPath = download.filepath;
        shouldCleanup = !download.isLocalFile;

        const data = await CloudFlareApi.run_whisper(audioPath, language);

        return res.send({
            code: 0,
            msg: 'Success',
            data: data
        });
    } catch (error) {
        console.error(`Error calling Cloudflare Whisper: ${error.message}`);
        return res.send({
            code: -1,
            msg: error.message,
            data: null
        });
    } finally {
        if (shouldCleanup && audioPath && fs.existsSync(audioPath)) {
            fs.unlink(audioPath, (unlinkError) => {
                if (unlinkError) {
                    console.error('Error deleting temporary audio file:', unlinkError.message);
                }
            });
        }
    }
})

app.post('/transcribe-douyin', async (req, res) => {
    let { url, language, api_key } = req.body;
    if (!url) {
        return res.status(400).send('Invalid input: "url" is required');
    }
    if (!language) {
        language = 'zh';
    }

    if (!api_key) {
        return res.send({
            code: -1,
            msg: commonUtils.MESSAGE.TOKEN_EMPTY,
            data: null
        });
    }

    const access = await verifyApiAccess({
        apiKey: api_key,
        freeKey: null,
        freeCheck: async () => false,
        freeDeniedResponse: {
            code: -1,
            msg: commonUtils.MESSAGE.TOKEN_EXPIRED,
            data: null
        }
    });
    if (!access.ok) {
        return res.send({
            ...access.response,
            data: null
        });
    }

    let videoPath = null;
    let audioPath = null;

    try {
        // 1. 提取并清理抖音链接
        let videoLink = tool.extract_url(url);
        if (!videoLink) throw new Error("无法解析此链接，请输入有效的抖音分享链接");
        videoLink = tool.remove_query_param(videoLink);

        // 2. 获取视频直链
        videoLink = await tool.url_preprocess(videoLink);
        let retries = 3;
        let XiaZaiTool;
        while (retries > 0) {
            XiaZaiTool = await tool.get_video_url(videoLink);
            if (XiaZaiTool.success) break;
            retries--;
            if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        if (!XiaZaiTool.success) throw new Error(XiaZaiTool.data);
        const downloadUrl = XiaZaiTool.data.video_url;

        // 3. 下载视频
        const download = await tool.download_video(downloadUrl, url);
        if (!download.success) throw new Error(download.error);
        videoPath = download.filepath;

        // 4. 视频转音频
        if (download.is_audio) {
            const convertResult = await tool.audio_format_convert(videoPath, 'mp3');
            if (!convertResult.success) throw new Error(convertResult.error);
            audioPath = convertResult.filepath;
        } else {
            const convertResult = await tool.video_to_audio(videoPath);
            if (!convertResult.success) throw new Error(convertResult.error);
            audioPath = convertResult.outputFile;
        }

        // 5. 语音转字幕
        const data = await CloudFlareApi.run_whisper(audioPath, language);
        const remaining = await consumeApiCredits({
            apiKey: api_key,
            cost: 1,
            metadata: { action: 'transcribe_douyin' }
        });

        return res.send({
            code: 0,
            msg: `success, API Key 剩余积分：${remaining}`,
            data: data
        });
    } catch (error) {
        console.error(`Error in /transcribe-douyin: ${error.message}`);
        return res.send({
            code: -1,
            msg: error.message,
            data: null
        });
    } finally {
        // 清理临时文件
        for (const filePath of [videoPath, audioPath]) {
            if (filePath && fs.existsSync(filePath)) {
                fs.unlink(filePath, (err) => {
                    if (err) console.error('Error deleting temp file:', err.message);
                });
            }
        }
    }
})

app.get('/coze-auth-callback', coze.callback)
app.get('/cozecom-auth-callback', cozecom.callback)

//虚拟浏览器
app.post('/explorer', async (req, res) => {
    
    let { url, selector, xpath, api_key, actions, cookie } = req.body;
    if (selector && xpath){
        return res.status(400).send('selector or xpath，这两个参数二选一，不要都填');
    }
    if (!url) {
        return res.status(400).send('url is required');
    }
    if (!tool.isValidUrl(url)) {
        return res.status(400).send('url is invalid');
    }
    if (cookie) {
        const parsedUrl = new URL(url);

        // 提取 domain 和 path
        const domain = parsedUrl.hostname; // 'kns.cnki.net'
        const path = '/'; // 推荐使用根路径

        cookie = await tool.gen_cookie(cookie,domain,path)
    }
    
    //免费版的key
    const free_key = "html_parser_" + req.headers['user-identity']
    const access = await verifyApiAccess({
        apiKey: api_key,
        freeKey: free_key,
        freeCheck: canUseHtmlParse,
        freeDeniedResponse: {
            code: -1,
            msg: commonUtils.MESSAGE.FREE_KEY_EXPIRED_3
        }
    });
    if (!access.ok) {
        return res.send(access.response);
    }

    try {

        const sanitizedUrl = url.trim(); // Remove any whitespace including newlines

        const htmldata = await tool.request_chromium(sanitizedUrl, cookie, xpath, selector, null);

        let result_list = extract_html_conent_standard(htmldata,xpath,selector)

        let msg = "";
        if (api_key) {
            const remaining = await consumeApiCredits({
                apiKey: api_key,
                cost: 1,
                metadata: tool.sanitizeUsageMetadata({ url, selector, xpath })
            });
            msg = `API Key 剩余积分：${remaining}`;
        }else{
            await redis.incr(free_key);//每次调用增加一次
            msg = `今日免费剩余积分：${3 - await tool.getUsage(free_key)}`;
        }

        return res.send({
            code: 0,
            msg: msg,
            data: result_list
        });
    } catch (error) {
        console.error(`Error: ${error}`);
        console.error(`Stack trace: ${error.stack}`);
        return res.send({
            code: -1,
            msg: error.message,
            data: []
        })
    }

})

app.post('/download_image', async (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).send('Invalid input: "url" is required');
    }
    try {
        const download = await tool.download_image(url)
        if (!download.success) throw new Error(download.error);
        return res.send({
            code: 0,
            data: req.protocol + '://' + req.get('host') + '/downloads/' + path.basename(download.filepath),
            size: download.size
        })
    } catch (error) {
        console.error(error);
        return res.send({
            code: -1,
            msg: error.message
        });
    }
})

async function get_doc_direct_link(id) {
    const data = {
        id: id  // 替换成你实际需要的 id
    };
    const headers = {
        'Content-Length': Buffer.byteLength(qs.stringify(data)), // Content-Length 要根据请求体的长度来设置
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Host': 'flk.npc.gov.cn',
        'Origin': 'https://flk.npc.gov.cn',
        'Referer': 'https://flk.npc.gov.cn/detail2.html?' + id,
    };

    // 发送 POST 请求
    const response = await axios.post('https://flk.npc.gov.cn/api/detail', qs.stringify(data), { headers })
    const result = response.data.result.body
    // console.log(result[0])
    return "https://wb.flk.npc.gov.cn" + result[0].path
}

app.post("/flfg", async (req, res) => {
    let { title, page } = req.body;
    if (!title) {
        return res.status(400).send('参数title不能为空');
    }
    if (!Number.isInteger(page) || isNaN(page) || page <= 0) {
        page = 1
    }


    // 参数解构
    let type = '',
        fgbt = title,
        searchType = 'title;accurate',
        sortTr = 'f_bbrq_s;desc',
        gbrqStart = '',
        gbrqEnd = '',
        sxrqStart = '',
        sxrqEnd = '',
        size = 10,
        _ = Date.now()


    // 构建 URLSearchParams
    const params = new URLSearchParams({
        page,
        type,
        fgbt,
        searchType,
        sortTr,
        gbrqStart,
        gbrqEnd,
        sxrqStart,
        sxrqEnd,
        size,
        _: _
    });

    try {
        // const { proxy_user, proxy_pass, proxy_server } = await getQingGuoProxy();
        // const qgproxy = `http://${proxy_user}:${proxy_pass}@${proxy_server}`;
        // const qgagent = new HttpsProxyAgent(qgproxy);
        // 发起 GET 请求
        const apiUrl = `https://flk.npc.gov.cn/api/?${params.toString()}`;
        const response = await axios.get(apiUrl, {
            headers: {
                'referer': 'https://flk.npc.gov.cn/index.html',
                'host': 'flk.npc.gov.cn'
            }
        });
        const data = response.data;
        // 为每个对象的 url 字段加上域名前缀
        let law_list = []
        let doc_urls = [] //需要解析的文件url
        if (Array.isArray(data.result.data)) {
            law_list = await Promise.all(data.result.data.map(async (item) => {
                if (item.url) {
                    const doc_url = 'https://flk.npc.gov.cn/' + item.url.replace(/^(\.\/|\/)+/, '');
                    item.url = await get_doc_direct_link(item.id) // await redis.get(doc_url);
                }
                return item;
            }));
        }

        return res.send({
            code: 0,
            msg: commonUtils.MESSAGE.PLUGIN_NEED_PAY,
            data: {
            'list': law_list,
            'totalSizes': data.result.totalSizes,
            'page': data.result.page,
            'size': data.result.size
            }
        })
    } catch (error) {
        console.error(error);
        return res.send({
            code: -1,
            msg: error.message
        });
    }
})

app.post("/screenshot", async (req, res) => {
    let {url,element,cookie} = req.body
    if (!tool.isValidUrl(url)) {
        return res.send({
            'code':-1,
            'msg':'failure',
            'data': '链接不正确，请输入https或者http开头的链接'
        })
    }
    if (cookie) {
        const parsedUrl = new URL(url);

        // 提取 domain 和 path
        const domain = parsedUrl.hostname; // 'kns.cnki.net'
        const path = '/'; // 推荐使用根路径

        cookie = await tool.gen_cookie(cookie,domain,path)
    }
    try {
        let screenshot = await browserless.screenshot(url,{element:element,cookie:cookie})
        if (!screenshot) screenshot = await browserless.screenshot(url,{proxy:'china',element:element,cookie:cookie})
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        return res.send({
            'code':0,
            'msg':'success',
            'data': `${protocol}://${req.get('host')}/downloads/${screenshot}`
        })
    }catch(err){
        return res.send({
            'code':-1,
            'msg':err.message,
        })
    }
})

app.post("/mix_video_and_audio", async (req, res) => {
    let {video_url,audio_url} = req.body

    if (!video_url.trim() || !audio_url.trim()) {
        return res.send({
            code: -1,
            msg: 'video_url 和 audio_url 参数不能为空'
        })
    }

    let new_video_url = await tool.mix_video_and_audio(video_url, audio_url)
    
    return res.send({
        code: 0,
        msg: 'success',
        data: req.protocol + '://' + req.get('host') + '/downloads/' + new_video_url
    })
})

app.post("/mix_videos", async (req, res) => {
    let {videos} = req.body

    // 判断 videos 是否为合法的 JSON 数组且每项为字符串且为 http(s) 链接
    if (typeof videos === 'string') {
        try {
            videos = JSON.parse(videos)
        } catch (e) {
            return res.send({
                code: -1,
                msg: 'videos 参数必须是 JSON 数组字符串'
            })
        }
    }
    if (
        !Array.isArray(videos) ||
        videos.length === 0 ||
        !videos.every(v => typeof v === 'string' && /^https?:\/\/.+\.mp4$/i.test(v))
    ) {
        return res.send({
            code: -1,
            msg: 'videos 必须是形如 ["https://...mp4", "..."] 的非空数组'
        })
    }

    let new_video_url = await tool.mix_videos(videos)
    
    return res.send({
        code: 0,
        msg: 'success',
        data: req.protocol + '://' + req.get('host') + '/downloads/' + new_video_url
    })
})

app.post("/test", async (req, res) => {
    let {video_url,audio_url} = req.body
    // let access_token = await feishu.getAccessToken('cli_a8d7f566f1ba100b','iSf4dqsDevTRyyysgl7Llti8V1VIMBCS')
    // let doc = await feishu.readDoc(access_token, 'X2etdSFX7oJ7YNxXEuUc6pdOnoe')
    // return res.send({
    //     doc: doc
    // })
    let new_video_url = await tool.mix_video_and_audio(video_url, audio_url)
    
    return res.send({
        data: req.protocol + '://' + req.get('host') + '/downloads/' + new_video_url
    })
})
app.post("/page", async (req, res) => {
    let {url,browserId} = req.body
    try {
        let data = await browserless.page(url,{"browserId":browserId})

        return res.send({
            'code':0,
            'msg':'success',
            'data': data
        })
        }catch(err){
            return res.send({
            'code':0,
            'msg':'failure',
            'data': err.message
        })
    }
})

app.post('/browser/close', async (req, res) => {
    const { browserId } = req.body;
    if (!browserId) {
        return res.status(400).send('Invalid input: "browserId" is required');
    }

    try {
        const closed = await browserless.close_browser(browserId);
        return res.send({
            code: closed ? 0 : -1,
            msg: closed ? 'success' : 'browserId not found',
        });
    } catch (err) {
        return res.send({
            code: -1,
            msg: err.message,
        });
    }
});

app.post('/browser/close_all', async (req, res) => {
    try {
        const closed = await browserless.close_all_browsers();
        return res.send({
            code: 0,
            msg: 'success',
            data: { closed },
        });
    } catch (err) {
        return res.send({
            code: -1,
            msg: err.message,
        });
    }
});

app.get('/browser/sessions', (req, res) => {
    try {
        return res.send({
            code: 0,
            msg: 'success',
            data: browserless.browser_stats(),
        });
    } catch (err) {
        return res.send({
            code: -1,
            msg: err.message,
        });
    }
});

//专利查询
app.post("/zlcx", async (req, res) => {
    let {keyword, api_key} = req.body
    if (!keyword) {
        return res.status(400).send('Invalid input: keyword不能为空');
    }
    // if (!Number.isInteger(page) || isNaN(page) || page <= 0) {
    //     page = 1
    // }

    //免费版的key
    const free_key = "zlcx_" + req.headers['user-identity']
    const access = await verifyApiAccess({
        apiKey: api_key,
        freeKey: free_key,
        freeCheck: dailyUse,
        freeDeniedResponse: {
            code: -1,
            msg: commonUtils.MESSAGE.FREE_API_USE_LIMIT,
            data: [{
                "title": "API_KEY可以通用于本人开发的所有插件",
                "link": commonUtils.MESSAGE.HELP_LINK
            }]
        }
    });
    if (!access.ok) {
        return res.send(access.response);
    }

    try {
        let html = await browserless.zlcx(keyword)

        const dom = new JSDOM(html);
    const { document, window } = dom.window;
    const selector = "table.result-table-list tbody tr"
    const result_list = Array.from(document.querySelectorAll(selector)).map(element => {
        const a = element.querySelector('td.name a');
        const applicant = element.querySelector('td.applicant');
        const inventor = element.querySelector('td.inventor')
        const tds = element.querySelectorAll('td');
        const apply_time = tds.length >= 6 ? tds[5].textContent.trim() : null;
        const publish_time = tds.length >= 6 ? tds[6].textContent.trim() : null;
        return {
            inventor: inventor ? inventor.textContent.trim() : null,
            applicant: applicant ? applicant.textContent.trim() : null,
            link: a ? a.href : null,
            title: a ? a.textContent.trim() : null,
            apply_time: apply_time,
            publish_time: publish_time
        };
    }).filter(item => item.link !== null); // 过滤掉不符合要求的项

        return res.send({
            'code':0,
            'msg':'success',
            'data': result_list
        })
        }catch(err){
            return res.send({
            'code':0,
            'msg':'failure',
            'data': err.message
        })
    }
})

app.post("/youtube/download_audio", async (req, res) => {
    let {url} = req.body
    if (!url) {
        return res.status(400).send('Invalid input: "url" is required');
    }
    if ( !url.includes('youtube.com') && !url.includes('youtu.be')) {
        return res.status(400).send('Invalid input: "url" must be a valid YouTube link');
    }
    try {

        let audio_url = await redis.get(url)
        if (!audio_url) {
            audio_url = await browserless.extract_youtube_audio_url("https://tuberipper.com/",url)
            await redis.set(url, audio_url, 'EX', 60 * 60 * 24) // 缓存1天
        }
        let audio = await tool.download_audio(audio_url)
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        return res.send({
            "code": 0,
            "msg":"success",
            "data": `${protocol}://${req.get('host')}/downloads/${audio.filename}`
        })
    }catch(err){
        console.error(err)
        return res.send({
            "code": 0,
            "msg":"failure",
            "data": `资源提取失败，请重试`
        })
    }
})

app.post("/cn_explorer", async (req, res) => {

    let { url, selector, xpath, action, cookie } = req.body;

    try {

        let response = await browserless.cn_chromium_content(url, {cookie:cookie,element_type: xpath ? 'xpath' : 'selector', element: xpath || selector})

        return res.send({
            code: 0,
            msg: 'Success',
            data: response.data
        })
    } catch (error) {
        console.error(`Error: ${error}`);

        return res.send({
            code: -1,
            msg: 'failure',
            data: null
        })
    }
    
})

app.post("/ai_online_answer", async (req, res) => {

    let { q } = req.body;

    try {

        const data = await tencentapi.ai_online_answer(req.headers['user-identity'], q)

        return res.send({
            code: 0,
            msg: 'Success',
            data: data
        })
    } catch (error) {
        console.error(`Error: ${error}`);

        return res.send({
            code: -1,
            msg: 'failure',
            data: null
        })
    }
    
})

app.post("/firecrawl/batch_scrape", async (req, res) => {
    let { urls, api_key } = req.body;
    
    if(!urls){
        return res.status(400).send('Invalid input: "urls" is required');
    }
    urls = JSON.parse(urls); // 确保 urls 是一个数组

    if (!Array.isArray(urls) || urls.length === 0) {
        return res.status(400).send('Invalid input: "urls" must be a non-empty array');
    }

    try {
        let data = await firecrawlTool.batch_scrape(urls)
        return res.send({
            code: 0,
            msg: 'Success',
            data: data
        })
    }catch (error) {
        console.error(`Error: ${error}`);
        return res.send({
            code: -1,
            msg: error.message,
            data: null
        })
    }


})

app.post("/firecrawl/scrape", async (req, res) => {
    let { url, api_key } = req.body;
    
    if(!url){
        return res.status(400).send('Invalid input: "url" is required');
    }

    try {
        let data = await firecrawlTool.scrape(url)
        return res.send({
            code: 0,
            msg: 'Success',
            data: data
        })
    }catch (error) {
        console.error(`Error: ${error}`);
        return res.send({
            code: -1,
            msg: error.message,
            data: null
        })
    }


})


app.get('/fetch_html', async (req, res) => {
    let { url } = req.query;
    const htmldata = await tool.request_chromium(url,null,null,null,'networkidle2')
    return res.send(htmldata)
})

//公众号 文章搜索(中国服务器真正执行请求)
app.post("/cn_gzh_search", async (req, res) => {
    let {keyword, api_key} = req.body
    if (!keyword) {
        return res.status(400).send('Invalid input: keyword不能为空');
    }
    // if (!Number.isInteger(page) || isNaN(page) || page <= 0) {
    //     page = 1
    // }
    try {
        let data = await browserless.weixin_search(keyword)
        return res.send({
            code: 0,
            msg: 'success',
            data: data
        })
    }catch (error) {
        console.error(`Error: ${error}`);
        return res.send({
            code: -1,
            msg: error.message,
            data: null
        })
    }   
})
//国外服务器接口，发起请求，调用中国服务器api
app.post("/gzh_search", async (req, res) => {
    let {keyword, api_key} = req.body
    if (!keyword) {
        return res.status(400).send('Invalid input: keyword不能为空');
    }
    // if (!Number.isInteger(page) || isNaN(page) || page <= 0) {
    //     page = 1
    // }

    //免费版的key
    const free_key = "gzh_search_" + req.headers['user-identity']
    const access = await verifyApiAccess({
        apiKey: api_key,
        freeKey: free_key,
        freeCheck: dailyUse,
        freeDeniedResponse: {
            code: -1,
            msg: commonUtils.MESSAGE.FREE_API_USE_LIMIT,
            data: [{
                "title": "为了保证付费用户的使用体验，本插件对免费用户进行了访问频率限制",
                "href": commonUtils.MESSAGE.HELP_LINK
            }]
        }
    });
    if (!access.ok) {
        return res.send(access.response);
    }

    try {
        const options = {
            method: 'POST',
            url: 'http://1.15.114.179:3000/cn_gzh_search',
            headers: { 'content-type': 'application/json' },
            data: {
                keyword: keyword
            }
        };

        const { data } = await axios.request(options);

        let msg = commonUtils.MESSAGE.FREE_API_USE_LIMIT;
        if (api_key) {
            const remaining = await consumeApiCredits({
                apiKey: api_key,
                cost: 1
            });
            msg = `API Key 剩余积分：${remaining}`;
        }

        return res.send({
            code: 0,
            msg: msg,
            data: data.data
        })
    }catch (error) {
        console.error(`Error: ${error}`);
        return res.send({
            code: -1,
            msg: error.message,
            data: null
        })
    }   
})


app.post('/extract-element-from-html', async (req, res) => {
     let { htmlContent, xpath, selector } = req.body;
    if (selector && xpath){
        return res.status(400).send('selector or xpath，这两个参数二选一，不要都填');
    }

    try {

        let result_list = extract_html_conent_standard(htmlContent,xpath,selector)

        return res.send({
            code: 0,
            msg: "success",
            data: result_list
        });
    } catch (error) {
        console.error(`Error: ${error}`);
        console.error(`Stack trace: ${error.stack}`);
        return res.send({
            code: -1,
            msg: error.message,
            data: []
        })
    }
})

// 三方接口请求api_key验证和减扣次数
app.post('/thirdParty/verifyKey',thirdPartyUsed.key_used)


app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
