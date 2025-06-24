import express from 'express';
import axios from 'axios';
import fs from 'fs';
import { execFile } from 'child_process';
import { JSDOM } from 'jsdom';
import TurndownService from '@joplin/turndown';
import turndownPluginGfm from '@joplin/turndown-plugin-gfm';
import { Readability, isProbablyReaderable } from '@mozilla/readability';
import { URL,fileURLToPath } from 'url';
import unkey from './utils/unkey.js'
import { dirname } from 'path';
import path from 'path'
import crypto from 'crypto';
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express();
const port = 3000;
const environment = process.env.NODE_ENV || 'development';

app.use(express.json())
app.use(express.text())

// 设置模板引擎配置 (必须在路由之前)
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

app.get('/', (req, res) => {
    res.send('Hello World!')
})
app.get('/video', (req, res) => {

    // Then in the /video route handler:
    res.render('video', {
        title: 'Video Page',
        message: 'This is a simple video page template.',
        videoUrl: "https://upos-sz-mirrorcos.bilivideo.com/upgcxcode/28/77/29896147728/29896147728-1-192.mp4?e=ig8euxZM2rNcNbRVhwdVhwdlhWdVhwdVhoNvNC8BqJIzNbfq9rVEuxTEnE8L5F6VnEsSTx0vkX8fqJeYTj_lta53NCM=&uipk=5&nbs=1&deadline=1748882820&gen=playurlv2&os=bcache&oi=837301814&trid=00004de5809b13c34b18bd93489356989e66T&mid=3546662372903895&platform=html5&og=hw&upsig=769f8dff014015645d736c5862c512b3&uparams=e,uipk,nbs,deadline,gen,os,oi,trid,mid,platform,og&cdnid=88601&bvc=vod&nettype=0&bw=55668&orderid=0,1&buvid=&build=0&mobi_app=&f=T_0_0&logo=80000000"
    })
})

// 假设你有成千上万个 URL 和相应的处理函数
const urlHandlers = {
    'www.xiaohongshu.com': (dom) => {
        const { document } = dom.window;
        const { body, head } = document;
        // 检查 <head> 中是否存在 <meta name="og:type" content="article"> 标签
        const metaTag = head.querySelector('meta[name="og:type"][content="article"]');
        if (metaTag) {
            const descriptionMetaTag = head.querySelector('meta[name="description"]');
            if (descriptionMetaTag) {
                const descriptionContent = descriptionMetaTag.getAttribute('content');
                if (descriptionContent) {
                    return descriptionContent
                }  
            }
        }
        // 跳去默认处理函数
        urlHandlers['default'](dom);
    },
    'default': (dom) => {
      //默认处理函数
        const filteredDom = filterHtmlContent(dom);
        const article = _readability(filteredDom);
        console.log(article.htmlContent)
        const turndownService = new TurndownService().use(turndownPluginGfm.gfm);
        let markdown = turndownService.turndown(article);
        content = filterMarkdown(markdown);
        return content
    },
    // 其它 URL 处理函数……
};

import redis from './utils/redisClient.js';
import search1api from './utils/search1api.js';
import zyte from './utils/zyte.js';
import { th_bilibili, th_youtube } from './utils/tikhub.io.js';
// 从 Redis 中获取用户使用量
async function getUsage(key) {
    let value = await redis.get(key);
    if (value === null) {
        // 不存在，创建 key 并设置初始值
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
}

/**
 * 过滤 Markdown 文档中的图片、换行符和超链接（只保留文本）。
 *
 * @param {string} markdown - 原始 Markdown 文本
 * @returns {string} 过滤后的 Markdown 文本
 */
function filterMarkdown(markdown) {
    // 1. 删除嵌入链接的图片
    // markdown = markdown.replace(/\[!\[.*?\]\(.*?\)\]\(.*?\)/g, '');
    // 2. 删除独立图片语法
    // markdown = markdown.replace(/!\[.*?\]\(.*?\)/g, '');
    // 3. 替换超链接，仅保留链接文本
    markdown = markdown.replace(/\[([^\]]+)\]\(.*?\)/g, '$1');
    // 4. 删除所有换行符
    markdown = markdown.replace(/\n/g, '');
    
    return markdown;
}

function _readability(dom) {
    const { document } = dom.window;
    // 新版，这个直接返回，不判断isProbablyReaderable了
    // return new Readability(document).parse().content;
    // 旧版
    if (isProbablyReaderable(document)) {
        console.log("自动识别正文区域");
        return new Readability(document).parse().content;
    }
    return document.body.innerHTML;
}

function filterHtmlContent(dom) {
    const { document } = dom.window;
    const { body } = document;
    const filters = ['script', 'style', 'link', 'footer'];
    const meaningfulTags = ['pre', 'code', 'iframe', 'template', 'object', 'svg', 'form', 'canvas'];

    Array.from(body.querySelectorAll(filters.join(', ')))
        .forEach(element => {
            if (!element.closest(meaningfulTags.join(','))) {
                element.remove();
            }
        });

    body.innerHTML = body.innerHTML.replace(/<img [^>]*src=["']data:image\/[^"']*["'][^>]*>/gi, '');
    return dom;
}

// app.post('/parseUrlContent', async (req, res) => {
//     const urls = req.body.urls

//     if (!Array.isArray(urls) || urls.length === 0) {
//         return res.status(400).send('Invalid input: "urls" should be a non-empty array')
//     }

//     const x_api_key = "f528f374df3f44c1b62d005f81f63fab"

//     try {
//         // The following requests are executed concurrently
//         const results = await Promise.all(urls.map(async (url) => {
//             try {
//                 let content = "" //最终返回的内容
//                 // --时间点1--
//                 const time1 = new Date();
//                 console.log('时间点1:', time1.toLocaleString('zh-CN', { hour12: false }));

//                 const encodedUrl = encodeURIComponent(url);
//                 const scrapingAntUrl = `https://api.scrapingant.com/v2/general?url=${encodedUrl}&x-api-key=${x_api_key}`;
//                 const response = await axios.get(scrapingAntUrl);
//                 let HtmlContent = response.data;
//                 const dom = new JSDOM(HtmlContent);

//                 // --时间点2--
//                 const time2 = new Date();
//                 // console.log('时间点2:', time2.toLocaleString('zh-CN', { hour12: false }));

//                 const timeDiff = (time2 - time1) / 1000;
//                 console.log(`时间点1和时间点2的时差: ${timeDiff}秒`);

//                 const myURL = new URL(url);
//                 const hostname = myURL.hostname;
//                 if (urlHandlers[hostname]) {
//                     content = urlHandlers[hostname](dom);
//                 } else {
//                     content = urlHandlers['default'](dom);
//                 }

//                 // --时间点3--
//                 return { url, content }
//             } catch (error) {
//                 console.error(`Error scraping URL ${url}: ${error.message}`);
//                 throw error;
//             }
//         }))
//         res.send(results)
//     } catch (error) {
//         res.status(500).send(`Error scraping web pages: ${error.message}`)
//     }
// })

app.post('/parseUrlContent', async (req, res) => {
    const url = req.body.url

    if (!url) {
        return res.status(400).send('Invalid input: "url" should be a non-empty array')
    }

    const x_api_key = "f528f374df3f44c1b62d005f81f63fab"

    try {
        let content = "" //最终返回的内容
        // --时间点1--
        const time1 = new Date();
        console.log('时间点1:', time1.toLocaleString('zh-CN', { hour12: false }));

        const encodedUrl = encodeURIComponent(url);
        const scrapingAntUrl = `https://api.scrapingant.com/v2/general?url=${encodedUrl}&x-api-key=${x_api_key}`;
        const response = await axios.get(scrapingAntUrl);
        let HtmlContent = response.data;
        const dom = new JSDOM(HtmlContent);

        // --时间点2--
        const time2 = new Date();
        // console.log('时间点2:', time2.toLocaleString('zh-CN', { hour12: false }));

        const timeDiff = (time2 - time1) / 1000;
        console.log(`时间点1和时间点2的时差: ${timeDiff}秒`);

        const myURL = new URL(url);
        const hostname = myURL.hostname;
        if (urlHandlers[hostname]) {
            content = urlHandlers[hostname](dom);
        } else {
            content = urlHandlers['default'](dom);
        }
        res.send(content)
    } catch (error) {
        res.status(500).send(`Error scraping web pages: ${error.message}`)
    }
})

// 从维基百科搜索条目
app.post('/zh_wikipedia/search_item', async (req, res) => {
    const { item } = req.body;

    if (!item) {
        return res.status(400).send('Invalid input: "item" is required');
    }

    const searchUrl = `https://zh.wikipedia.org/w/api.php?action=query&list=search&srsearch=${item}&format=json`;

    try {
        const response = await axios.get(searchUrl);
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
        let response = await axios.get(wikipediaUrl);
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
        const response = await axios.get(searchUrl);
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
        let response = await axios.get(wikipediaUrl);
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
        // 不存在，创建 key 并设置初始值
        const now = new Date();
        const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const secondsSinceMidnight = Math.floor((now - midnight) / 1000);
        console.log("创建key:", key, "初始值为0，过期时间为", secondsSinceMidnight);
        await redis.set(key, 0, 'EX', secondsSinceMidnight);
        return true
    }else{
        return false;
    }
}

// 判断是否可使用 HTML解析 功能
async function canUseHtmlParse(key) {
    if(environment === "online"){
        const usage = await getUsage(key);
        if (usage >= 3) {
            return false
        }
    }
    return true;
}

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
    let { url, selector, xpath, api_key, action } = req.body;
    if (!url) {
        return res.status(400).send('url is required');
    }
    if (!selector && !xpath) {
        return res.status(400).send('parser or xpath is required');
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

    if (action) {
        return await zyteExtract(req, res);
    }
    const api_id = "api_413Kmmitqy3qaDo4";

    //免费版的key
    const free_key = "html_parser_" + req.headers['user-identity']
    if(api_key){
        //付费版
        const { keyId, valid, remaining, code } = await unkey.verifyKey(api_id, api_key, 0);
        if (!valid) {
            return res.send({
                code: -1,
                msg: 'API Key 无效或已过期，请检查后重试！'
            }); 
        }
        if (remaining == 0) {
            return res.send({
                code: -1,
                msg: 'API Key 使用次数已用完，请联系作者续费！'
            }); 
        }
    }else{
        //免费版
        const canParse = await canUseHtmlParse(free_key);
        if (!canParse) {
            return res.send({
                code: -1,
                msg: '免费版每天限量3次，付费可以解锁更多次数，请联系作者！【B站:小吴爱折腾】'
            }); 
        }
    }

    try {

        let HtmlContent = "";
        const sanitizedUrl = url.trim(); // Remove any whitespace including newlines
        let response = await browserless.chromium_content(sanitizedUrl)
        if (!response){
            console.log("webshare代理请求失败，使用青果代理访问目标地址");
            response = await browserless.chromium_content(sanitizedUrl, {proxy:'china'})
            if (!response){
                console.log("青果代理请求失败，使用zyte解析网页内容");
                return await zyteExtract(req, res);
            }
        }

        HtmlContent = response.data;

        let result_list = extract_html_conent(HtmlContent,xpath,selector)
        if(result_list.length === 0) {
            console.log("未找到匹配的元素，请检查选择器或XPath是否正确，或者网页反爬虫机制导致无法获取内容。");
            response = await browserless.chromium_content(sanitizedUrl, {proxy:'china'})
            if (!response){
                console.log("切换成青果代理也请求失败，换成zyte");
                return await zyteExtract(req, res);
            }
            HtmlContent = response.data
            result_list = extract_html_conent(HtmlContent,xpath,selector)
        }

        let msg = "";
        if (api_key) {
            //付费版
            const { remaining } = await unkey.verifyKey(api_id, api_key, 1);
            msg = `API Key 剩余调用次数：${remaining}`;
        }else{
            await redis.incr(free_key);//每次调用增加一次
            msg = `今日免费使用次数：${3 - await getUsage(free_key)}`;
        }

        return res.send({
            code: 0,
            msg: msg,
            data: result_list
        });
    } catch (error) {
        console.error(`Error: ${error}`);
        console.error(`Stack trace: ${error.stack}`);
        if (error.response) {
            console.error(`Response status: ${error.response.status}`);
            console.error(`Response data: ${JSON.stringify(error.response.data)}`);
            return res.send({
                code: -1,
                msg: "请求失败，请检查url和参数是否正确！",
            })
        }
        res.status(500).send(`Error: ${error.message}`);
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

app.post('/openai-hub/chat/completions', async (req, res) => {
    const { model, system_prompt, user_prompt, temperature, api_key} = req.body;

    if (!model) {
        return res.status(400).send('Invalid input: "model" is required');
    }

    if (!system_prompt && !user_prompt) {
        return res.status(400).send('Invalid input: "system_prompt" or "user_prompt" is required');
    }

    if (!api_key) {
        return res.status(400).send('Invalid input: "api_key" is required');
    }

    const messages = [{
        role: 'system',
        content: system_prompt || 'You are a helpful assistant.'
    }, {
        role: 'user',
        content: user_prompt || 'Hello, how can you help me?'   
    }];

    try {
        const response = await axios.post(
            'https://api.openai-hub.com/v1/chat/completions',
            {
                model,
                messages,
                temperature: temperature || 0.8 // 默认值为 0.8
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${api_key}` // 替换为您的 API 密钥
                }
            }
        );

        res.send({
            code: 0,
            msg: 'Success',
            data: response.data
        });
    } catch (error) {
        console.error(`Error calling OpenAI API: ${error.message}`);
        res.status(500).send(`Error calling OpenAI API: ${error.message}`);
    }
});


app.post('/google/search/web', async (req, res) => {
    const { q, api_key} = req.body;
    const api_id = "api_41vHKzNmXf5xx23f";

    if (!q) {
        return res.status(400).send('Invalid input: "q" is required');
    }

    //免费版的key
    const free_key = 'google_'+req.headers['user-identity']
    if (api_key) {
        const { keyId, valid, remaining, code } = await unkey.verifyKey(api_id, api_key, 0);
        if (!valid) {
            return res.send({
                code: -1,
                msg: 'API Key 无效或已过期，请检查后重试！'
            }); 
        }
        if (remaining == 0) {
            return res.send({
                code: -1,
                msg: 'API Key 使用次数已用完，请联系作者续费！'
            }); 
        }
    }else{
        const canSearch = await canSearchGoogle(free_key);
        if (!canSearch) {
            return res.send({
                code: 0,
                msg: '维护成本大，每天免费使用1次，付费购买API KEY可解锁更多次数，请联系作者！【B站:小吴爱折腾】'
            }); 
        }
    }

    search1api.search(q).then(async (data) => {
        let msg = "";
        if (api_key) {
            //付费版
            const { remaining } = await unkey.verifyKey(api_id, api_key, 1);
            msg = `API Key 剩余调用次数：${remaining}`;
        }else{
            msg = `今日免费使用次数用完，付费购买API KEY可解锁更多次数，请联系作者！【B站:小吴爱折腾】`;
        }
        return res.send({
            code: 0,
            msg: msg,
            data: data.results
        });
    })
})

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

    //unkey的api_id
    const unkey_api_id = "api_413Kmmitqy3qaDo4";
    //免费版的redis_key，用于限制用户的使用次数
    const free_key = "html_parser_" + req.headers['user-identity']
    if(api_key){
        //付费版
        const { keyId, valid, remaining, code } = await unkey.verifyKey(unkey_api_id, api_key, 0);
        if (!valid) {
            return res.send({
                code: -1,
                msg: 'API Key 无效或已过期，请检查后重试！'
            }); 
        }
        if (remaining == 0) {
            return res.send({
                code: -1,
                msg: 'API Key 使用次数已用完，请联系作者续费！'
            }); 
        }
    }else{
        //免费版
        const canParse = await canUseHtmlParse(free_key);
        if (!canParse) {
            return res.send({
                code: -1,
                msg: '免费版每天限量3次，付费可以解锁更多次数，请联系作者！【B站:小吴爱折腾】',
                data: [{ htmlContent: "免费版每天限量3次，付费可以解锁更多次数，请联系作者！【B站:小吴爱折腾】" }]
            }); 
        }
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
            //付费版
            const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1);
            msg += ` API Key 剩余调用次数：${remaining}`;
        }else{
            await redis.incr(free_key);//每次调用增加一次
            msg = `今日免费使用次数：${3 - await getUsage(free_key)}`;
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

        const unkey_api_id = "api_413Kmmitqy3qaDo4";
        if (api_key) {
            const { keyId, valid, remaining, code } = await unkey.verifyKey(unkey_api_id, api_key, 0);
            if (!valid) {
                return res.send({
                    msg: 'API Key 无效或已过期，请检查后重试！'
                }); 
            }
            if (remaining == 0) {
                return res.send({
                    msg: 'API Key 使用次数已用完，请联系作者续费！'
                }); 
            }
        }else{
            left_time = await redis.get(free_key)
            if (!left_time || isNaN(left_time)) left_time = 1
            if (left_time <= 0) throw new QuotaExceededError("每天免费使用1次，如果您想继续使用，联系作者付费购买更多次数【vx：xiaowu_azt】【B站：小吴爱折腾】")
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
            //付费版
            const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1);
            msg = `解析成功，API Key 剩余调用次数：${remaining}`;
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
    const unkey_api_id = "api_413Kmmitqy3qaDo4";
    if (!url) {
        return res.status(400).send('Invalid input: "url" is required');
    }

    //==验证==
    const redis_key = req.headers['user-identity'] ? 'get_sitemap_'+req.headers['user-identity'] : 'get_sitemap';
    const value = await redis.get(redis_key);
    if (value === null) {
        const now = new Date();
        const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const secondsSinceMidnight = Math.floor((now - midnight) / 1000);
        await redis.set(redis_key, 0, 'EX', secondsSinceMidnight);
    }else{
        if(!api_key){
            return res.send({msg: "维护成本大，每天免费使用1次，购买api_key解锁更多次数，需要请请联系作者【B站：小吴爱折腾】"})
        }else{
            const { keyId, valid, remaining, code } = await unkey.verifyKey(unkey_api_id, api_key, 0);
            if (!valid) {
                return res.send({
                    msg: 'API Key 无效或已过期，请检查后重试！'
                }); 
            }
            if (remaining == 0) {
                return res.send({
                    msg: 'API Key 使用次数已用完，请联系作者续费！'
                }); 
            }
        }
    }
    
    const sitemap = await search1api.sitemap(url);
    var msg = null
    if (api_key) {
        const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1);
        msg = `API Key 剩余调用次数：${remaining}`;
    }
    return res.send({
        code: 0,
        msg: msg,
        data: sitemap
    });
})

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
    const keys = await redis.keys(pattern);
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
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
        await Promise.all(keys.map(key => redis.del(key)));
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

async function downloadPdf(url, path) {
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
    if (!url) {
        return res.status(400).send('Invalid input: "url" is required');
    }
    const randomString = [...Array(16)].map(() => Math.random().toString(36)[2]).join('');
    await downloadPdf(url, `./images/${randomString}.pdf`).then(() => {
        console.log('PDF downloaded successfully');

        const python = 'python';
        const script = path.join(__dirname, 'pdf2images.py');

        execFile(python, [script, `./images/${randomString}.pdf`, randomString], (error, stdout, stderr) => {
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
import { QuotaExceededError } from './utils/CustomError.js';
import coze from './utils/ThirdParrtyApi/coze.js';
import cozecom from './utils/ThirdParrtyApi/cozecom.js';
import browserless from './utils/ThirdParrtyApi/browserless.js';

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
        const download = await tool.download_video(videoUrl)
        if (!download.success) throw new Error(download.error);
        const convert = await tool.video_to_audio(download.filepath)
        if (!convert.success) throw new Error(convert.error);

        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        return res.send({
            "code": 0,
            "msg": "success",
            "data": `https://coze-js-api-noproxy.devtool.uk/audio/${path.basename(convert.outputFile)}`
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
    if (!url) {
         return res.status(400).send('Invalid input: "url" is required');
    }
    if (!language){
        language="chinese"
    }
    if (cache===null){
        cache = true; // 默认读取缓存
    }

    const free_key = "FreeASR_" + req.headers['user-identity']//免费版的key
    const lock_key = "asr:lock:" + req.headers['user-identity']//并发锁
    var left_time = await redis.get(free_key)//免费版剩余次数
    if (!left_time || isNaN(left_time)) left_time = 1

    try{

        var videoLink = tool.extract_url(url)
        if (!videoLink) throw new Error("无法解析此链接，本插件支持快手/抖音/小红书/B站/Youtube/tiktok，有问题联系作者【vx：xiaowu_azt】")
        if (!(videoLink.includes('www.youtube.com') || videoLink.includes('youtu.be') || videoLink.includes('xiaohongshu.com'))) {
            videoLink = tool.remove_query_param(videoLink)
        }
        
        if (!api_key) {
            if (left_time <= 0) throw new QuotaExceededError("每天免费使用1次，如果您想继续使用，联系作者购买api_key【vx：xiaowu_azt】更多扣子教程，可以关注【B站：小吴爱折腾】")
            const lock_ttl = await redis.ttl(lock_key)
            if(lock_ttl > 0) {
                throw new Error(`上一个任务还在处理中，剩余${lock_ttl}秒`)
            }
        }else{
            const { keyId, valid, remaining, code } = await unkey.verifyKey("api_413Kmmitqy3qaDo4", api_key, 0);
            if (!valid) {
                return res.send({
                    code: -1,
                    msg: 'API Key 无效或已过期，请检查后重试！'
                }); 
            }
            if (remaining == 0) {
                return res.send({
                    code: -1,
                    msg: 'API Key 使用次数已用完，请联系作者续费！'
                }); 
            }
        }
        

        var transcription = await redis.get("transcription_"+videoLink)
        if (transcription && cache){
            
            transcription = JSON.parse(transcription)
        }else{
            
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
            //设置并发锁
            await redis.set(lock_key, 1, "NX", "EX", 60 * 5) //设置5分钟的锁

            var downloadUrl = XiaZaiTool.data.video_url
            //下载mp4文件
            const download = await tool.download_video(downloadUrl,url)
            if (!download.success) throw new Error(download.error);
            let convert;
            if (!download.is_audio){
                //mp4转mp3
                convert = await tool.video_to_audio(download.filepath)
                if (!convert.success) throw new Error(convert.error);
            }else{
                convert = {
                    outputFile: download.filepath
                }
            }

            const protocol = req.headers['x-forwarded-proto'] || req.protocol;
            // var audio_url = `${protocol}://coze-js-api-noproxy.devtool.uk/audio/${path.basename(convert.outputFile)}`
            var audio_url = `${protocol}://${req.get('host')}/audio/${path.basename(convert.outputFile)}`
            // audio_url = "https://coze-js-api.devtool.uk/audio/audio_1749559334235.mp3"
            //语音转文字
            console.log("开始生成字幕")
            let result = await coze.generate_video_caption(audio_url)
            transcription = JSON.parse(result.content).output
            
            // Check if content_chunks exists, if not retry once
            if (!transcription) {
                console.log("No content_chunks found, retrying...第一次重试")
                result = await coze.generate_video_caption(audio_url)
                transcription = JSON.parse(result.content).output
                if(!transcription) {
                    console.log("No content_chunks found, retrying...第二次重试")
                    result = await coze.generate_video_caption(audio_url)
                    transcription = JSON.parse(result.content).output
                    if(!transcription) {
                        throw new Error("字幕生成失败，可能是视频时长太长，或者服务器压力太大，请稍后再试！")
                    }
                }
            }
    
            await redis.set("transcription_"+videoLink, JSON.stringify(transcription), "EX", 3600 * 24 * 60)
            await redis.del(lock_key)//关闭并发锁
            console.log("字幕生成结束")
        }

        // 生成SRT内容
        const srt = transcription.content_chunks.map((item, index) => {
            const start = tool.format_SRT_timestamp(item.start_time);
            const end = tool.format_SRT_timestamp(item.start_time);
            return `${index + 1}\n${start} --> ${end}\n${item.text}\n`;
        }).join('\n');
        const data = {
            text:transcription.content,
            srt:srt
        }
        
        var msg = ""
        if (api_key) {
            //付费版
            const { remaining } = await unkey.verifyKey("api_413Kmmitqy3qaDo4", api_key, 1);
            msg = `API Key 剩余调用次数：${remaining}`;
        }else{
            //免费版
            left_time = left_time - 1
            await redis.set(free_key, left_time, 'EX', tool.getSecondsToMidnight()); // 每次调用减少一次
            msg = `今日免费使用次数：${left_time}`;
        }

        return res.send({
            'code': 0,
            'msg': msg,
            'data': data
        })
    }catch(error){
        console.error(error)
        await redis.del(lock_key)
        if (error instanceof QuotaExceededError) {
            return res.send({
                'code': 0,
                'msg': '抱歉，达到用量限制',
                'data': {
                    "text": error.message,
                    "srt": "1\n00:00:00,000 --> 00:00:03,480\n" + error.message
                }
            });
        } else {
            return res.send({
                'code': -1,
                'msg': error.message
            });
        }
    }
})

app.get('/coze-auth-callback', coze.callback)
app.get('/cozecom-auth-callback', cozecom.callback)

//虚拟浏览器
app.post('/explorer', async (req, res) => {

    let { url, selector, xpath, api_key, action } = req.body;
    if (!url) {
        return res.status(400).send('url is required');
    }

    const api_id = "api_413Kmmitqy3qaDo4";

    //免费版的key
    const free_key = "html_parser_" + req.headers['user-identity']
    if(api_key){
        //付费版
        const { keyId, valid, remaining, code } = await unkey.verifyKey(api_id, api_key, 0);
        if (!valid) {
            return res.send({
                code: -1,
                msg: 'API Key 无效或已过期，请检查后重试！'
            }); 
        }
        if (remaining == 0) {
            return res.send({
                code: -1,
                msg: 'API Key 使用次数已用完，请联系作者续费！'
            }); 
        }
    }else{
        //免费版
        // const canParse = await canUseHtmlParse(free_key);
        // if (!canParse) {
        //     return res.send({
        //         code: -1,
        //         msg: '免费版每天限量3次，付费可以解锁更多次数，请联系作者！【B站:小吴爱折腾】'
        //     }); 
        // }
    }

    try {

        const sanitizedUrl = url.trim(); // Remove any whitespace including newlines
        let response = await browserless.chromium_content(sanitizedUrl)
        if (!response){
            console.log("虚拟浏览器：webshare代理请求失败，使用青果代理访问目标地址");
            response = await browserless.chromium_content(sanitizedUrl, {proxy:'china'})
            if (!response){
                console.log("虚拟浏览器：青果代理请求失败");
                throw new Error("出了点问题，再重试一遍或者联系作者反馈【B站：小吴爱折腾】")
            }
        }

        let HtmlContent = response.data;

        let result_list = extract_html_conent_standard(HtmlContent,xpath,selector)
        if(result_list.length === 0) {
            console.log("虚拟浏览器：未找到匹配的元素，请检查选择器或XPath是否正确，或者网页反爬虫机制导致无法获取内容。");
            response = await browserless.chromium_content(sanitizedUrl, {proxy:'china'})
            if (!response){
                console.log("虚拟浏览器：切换成青果代理也请求失败");
                throw new Error("出了点问题，再重试一遍或者联系作者反馈【B站：小吴爱折腾】")
            }
            HtmlContent = response.data
            result_list = extract_html_conent_standard(HtmlContent,xpath,selector)
        }

        let msg = "";
        if (api_key) {
            //付费版
            const { remaining } = await unkey.verifyKey(api_id, api_key, 1);
            msg = `API Key 剩余调用次数：${remaining}`;
        }else{
            await redis.incr(free_key);//每次调用增加一次
            msg = `今日免费使用次数：${3 - await getUsage(free_key)}`;
        }

        return res.send({
            code: 0,
            msg: msg,
            data: result_list
        });
    } catch (error) {
        console.error(`Error: ${error}`);
        console.error(`Stack trace: ${error.stack}`);
        if (error.response) {
            console.error(`Response status: ${error.response.status}`);
            console.error(`Response data: ${JSON.stringify(error.response.data)}`);
            return res.send({
                code: -1,
                msg: "请求失败，请检查url和参数是否正确！",
            })
        }
        res.status(500).send(`Error: ${error.message}`);
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

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})