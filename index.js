const express = require('express')
const axios = require('axios')
const fs = require('fs');
const { execFile } = require('child_process');
const cheerio = require('cheerio')
const { JSDOM } = require('jsdom');
const TurndownService = require('@joplin/turndown');
const turndownPluginGfm = require('@joplin/turndown-plugin-gfm');
const { Readability, isProbablyReaderable } = require('@mozilla/readability');
const { URL } = require('url');
const unkey = require('./utils/unkey');
const app = express()
const port = 3000
const environment = process.env.NODE_ENV || 'development';
const crypto = require('crypto');

app.use(express.json())
app.use(express.text())

app.get('/', (req, res) => {
    res.send('Hello World!')
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

const redis = require('./utils/redisClient');
const { parse } = require('path');
const search1api = require('./utils/search1api');
const zyte = require('./utils/zyte');
const { th_bilibili, th_youtube } = require('./utils/tikhub.io');
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
        if (usage > 3) {
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
    const https = require('https');
    const { HttpsProxyAgent } = require('https-proxy-agent');

    // 设置您的代理服务器地址
    const proxyUrl = 'http://umwhniat-rotate:eudczfs5mkzt@p.webshare.io:80';
    const agent = new HttpsProxyAgent(proxyUrl);


    const options = {
        hostname: 'r.jina.ai',
        path: '/' + url,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer jina_244ca6436ced4fbba4fc6761a933abc77H_rA5y7mcR6jlg1d9Dv07Qvv1rY',
            'X-Engine': 'browser',
            'X-Timeout': '60',
            // 'X-Proxy-Url': 'http://umwhniat-rotate:eudczfs5mkzt@p.webshare.io:80'
        },
        agent: agent
    };

    const _req = https.request(options, _res => {
        let data = '';
        _res.on('data', chunk => {
            data += chunk;
        });

        _res.on('end', () => {
            return res.send({
                code: 0,
                msg: 'Success',
                data: data
            });
        });
    });

    _req.on('error', (e) => {
        console.error(`Problem with request: ${e.message}`);
        return res.send({
            code: -1,
            msg: `Error: ${e.message}`
        })
    });

    _req.end();

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

function toBase64(str) {
    return Buffer.from(str, 'utf-8').toString('base64');
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

    console.log(req.headers);
    //免费版的key
    const free_key = environment === 'online' ? "html_parser_" + req.headers['user-identity'] : 'test';
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

        const x_api_key = "f528f374df3f44c1b62d005f81f63fab"
        const encodedUrl = encodeURIComponent(url);
        let scrapingAntUrl = `https://api.scrapingant.com/v2/general?url=${encodedUrl}&x-api-key=${x_api_key}`;
        const response = await axios.get(scrapingAntUrl);
        HtmlContent = response.data;

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
    const free_key = environment === 'online' ? 'google_'+req.headers['user-identity'] : 'test';
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
    const free_key = environment === 'online' ? "html_parser_" + req.headers['user-identity'] : 'test';
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
                msg: '免费版每天限量3次，付费可以解锁更多次数，请联系作者！【B站:小吴爱折腾】'
            }); 
        }
    }

    //处理action
    let actions = [];//完整的动作列表
    action = JSON.parse(action);//本次动作
    action.forEach((item) => {
        if (item.action === "click") {
            actions.push(zyte.gen_waitForSelector_code(item.selector.type, item.selector.value));
            actions.push(item)
        }else{
            actions.push(item)
        }
    })

    try {
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
            // const domSelector = selector;
            // const parserSelector = htmlToQuerySelector(domSelector);
            result_list = Array.from(document.querySelectorAll(selector)).map(element => {
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
app.post('/web/extract', async (req, res) => {
    await zyteExtract(req, res);
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


app.post('/redis/del', async (req, res) => {
    const { key } = req.body;
    await redis.del(key)
    return res.send({
        code: 0,
        msg: 'Success'
    });
})


async function downloadPdf(url, path) {
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

const path = require('path');
const netdiskapi = require('./utils/netdiskapi');
const faceplusplus = require('./utils/kuangshi');
const tool = require('./utils/tool');
const aimlapi = require('./utils/ThirdParrtyApi/aimlapi');
const lemonfoxai = require('./utils/ThirdParrtyApi/lemonfoxai');

// 静态资源服务，访问 images 目录下的文件
app.use('/images', express.static(path.join(__dirname, 'images')));

app.post('/xpan/search', netdiskapi.search)
app.post('/xpan/get_dlink', netdiskapi.get_dlink)
app.post('/xpan/get_access_token', netdiskapi.get_access_token)
app.post('/xpan/refresh_token', netdiskapi.refresh_token)
app.post('/xpan/filemetainfo', netdiskapi.filemetainfo)
app.get('/xpan/download', netdiskapi.download)

app.post('/faceplusplus/face_detect', faceplusplus.face_detect)

app.post('/extract-video-subtitle/task-info', async (req, res) => {
    const { task_id } = req.body;
    if (!task_id) {
        return res.status(400).send('Invalid input: "task_id" is required');
    }
    try{
        const task_info = await redis.get("task_"+task_id)
        return res.send({
            code:0,
            data: JSON.parse(task_info)
        })
    }catch(error){
        return res.send({
            code:-1,
            msg: error.message
        })
    }
})

app.post('/extract-video-subtitle', async (req, res) => {
    const { link,language,api_key,is_sync } = req.body;
    if (!link) {
        return res.status(400).send('Invalid input: "link" is required');
    }

    try{

        const free_key = "asr_" + req.headers['user-identity']
        var left_time = await redis.get(free_key)
        if (left_time === null) left_time = 600
        if (left_time <= 0) throw new Error("免费体验结束~您累计解析视频时长超过10分钟，请联系作者购买包月套餐（15元180分钟，30元450分钟，50元1000分钟）【vx：xiaowu_azt】")

        const task_id = tool.md5(new Date().getTime().toString() + crypto.randomBytes(4).toString('hex'))

        var videoLink = tool.extract_url(link)
        if (!videoLink) throw new Error("无法解析无效链接")
        videoLink = tool.remove_query_param(videoLink)

        //查询直链
        const XiaZaiTool = await tool.get_video_url(videoLink)
        if (!XiaZaiTool.success) throw new Error(XiaZaiTool.message);
        const downloadUrl = XiaZaiTool.data.data.videoUrls

        if (is_sync){
            //同步处理
            const subtitle = await  tool.video_to_subtitle(videoLink, downloadUrl, task_id, left_time, api_key, free_key, language)
            if (!subtitle.success) throw new Error(subtitle.error);

            return res.send({
                code: 0,
                msg: 'Success',
                data: subtitle.transcription
            });
        }else{
            //异步处理
            tool.video_to_subtitle(videoLink, downloadUrl, task_id, left_time, api_key, free_key, language)
            await redis.set("task_"+task_id, JSON.stringify({success:false,msg:"任务正在处理中...",data:link}), 'EX', 3600 * 72);
            
            return res.send({
                code: 0,
                msg: '请求发送成功，正在后台处理...稍后通过task_id查询任务状态，请妥善保存',
                data: {
                    task_id: task_id,
                    link: link
                }
            });
        }
        
    }catch(error){
        console.error(error)
        return res.send({
            code: -1,
            msg: error.message
        })
    }
})

app.post('/whisper/speech-to-text', async (req, res) => {
    let {url,language} = req.body
    if (!url) {
         return res.status(400).send('Invalid input: "url" is required');
    }
    if (!language){
        language="chinese"
    }

    var videoLink = tool.extract_url(url)
    if (!videoLink) throw new Error("无法解析无效链接")
    videoLink = tool.remove_query_param(videoLink)
    
    var whisper_data = await redis.get("whisper_callback_"+videoLink)
    if (whisper_data){
        console.log("存在")
        
    }else{

        console.log(req.protocol + '://' + req.get('host') + '/whisper/speech-to-text/callback')

        await lemonfoxai.speech_to_text({
            "file_url":url,
            "response_format":"verbose_json",
            "speaker_labels": true,
            "language":language,
            "callback_url":"https://coze-js-api.devtool.uk/whisper/speech-to-text/callback?mediaFile="+videoLink
        })

        // Poll redis key every second for 10 minutes
        const endTime = Date.now() + 600000; // 10 minutes in milliseconds
        const interval = setInterval(async () => {
            if (Date.now() > endTime) {
                clearInterval(interval);
                throw new Error("Timeout waiting for result")
            }

            const result = await redis.get("whisper_callback_" + videoLink);
            if (result) {
                clearInterval(interval);
                whisper_data = result
            }
        }, 1000);

        
    }

    whisper_data = JSON.parse(whisper_data)

    return res.send(whisper_data)
})

app.post('/whisper/speech-to-text/result', async (req, res) => {
    const {generation_id} = req.body
    if (!generation_id) {
         return res.status(400).send('Invalid input: "generation_id" is required');
    }
    return res.send(await aimlapi.speech_to_text_result(generation_id))
})

app.post('/whisper/speech-to-text/callback', async (req, res) => {
    const mediaFile = req.query.mediaFile;//资源文件链接（标识唯一性）
    const response_data = req.body
    await redis.set("whisper_callback_"+mediaFile, JSON.stringify(response_data), "EX", 3600*24*30)
    return res.send({
        "code": 1,
        "message":"thank you"
    })
})



app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})