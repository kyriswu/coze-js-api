const express = require('express')
const axios = require('axios')
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

app.use(express.json())

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

app.post('/google_search', async (req, res) => {
    let { q, cx } = req.body;
    console.log(req.body);
    if (!q) {
        return res.status(400).send('Invalid input: "q" and "cx" are required');
    }

    if (!cx) {
        cx = "93d449f1c4ff047bc"    // 默认使用我的自定义搜索引擎
    }

    const key = environment === 'online' ? req.headers['user-identity'] : 'test';
    const canSearch = await canSearchGoogle(key);
    if (!canSearch) {
        return res.send({
            code: 0,
            msg: '维护成本大，为避免滥用，每天只能使用5次，谢谢理解'
        }); 
    }

    const apiKey = 'AIzaSyAw5rOQ8yF5Hkd8oTzd0-jQSTMMTGgC51E';
    const searchUrl = `https://customsearch.googleapis.com/customsearch/v1?q=${encodeURIComponent(q)}&cx=${cx}&key=${apiKey}&safe=active`;

    try {
        const response = await axios.get(searchUrl);
        const items = response.data.items;
        const result_list = items.map(item => ({
            title: item.title,
            snippet: item.snippet,
            link: item.link
        }));
        await redis.incr(key);//每次调用增加一次
        return res.send({
            code: 0,
            msg: 'Success',
            data: result_list
        });
    } catch (error) {
        console.error(`Error performing Google search: ${error.message}`);
        return res.send({
            code: -1,
            msg: `Error: ${error.message}`,
            data: []
        });
    }
})

app.post('/google_search_image', async (req, res) => {
    let { q, cx } = req.body;

    if (!q) {
        return res.status(400).send('Invalid input: "q" and "cx" are required');
    }

    if (!cx) {
        cx = "93d449f1c4ff047bc"    // 默认使用我的自定义搜索引擎
    }

    const apiKey = 'AIzaSyAw5rOQ8yF5Hkd8oTzd0-jQSTMMTGgC51E';
    const searchUrl = `https://customsearch.googleapis.com/customsearch/v1?q=${encodeURIComponent(q)}&cx=${cx}&key=${apiKey}&safe=active&searchType=image`;

    try {
        const response = await axios.get(searchUrl);
        res.send(response.data);
    } catch (error) {
        console.error(`Error performing Google search: ${error.message}`);
        res.status(500).send(`Error performing Google search: ${error.message}`);
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
    if(environment === "online"){
        const usage = await getUsage(key);
        if (usage > 5) {
            return false
        }
    }
    return true;
}

// 判断是否可使用 HTML解析 功能
async function canUseHtmlParse(key) {
    if(environment === "online"){
        const usage = await getUsage(key);
        if (usage > 5) {
            return false
        }
    }
    return true;
}

// app.post('/google/search/web', async (req, res) => {
//     console.log(req.headers);
//     let { q, api_key} = req.body;
//     const api_id = "api_41vHKzNmXf5xx23f";

//     if (!q) {
//         return res.status(400).send('Invalid input: "q" is required');
//     }

//     //免费版的key
//     const free_key = environment === 'online' ? req.headers['user-identity'] : 'test';
//     if (api_key) {
//         const { keyId, valid, remaining, code } = await unkey.verifyKey(api_id, api_key, 0);
//         if (!valid) {
//             return res.send({
//                 code: -1,
//                 msg: 'API Key 无效或已过期，请检查后重试！'
//             }); 
//         }
//         if (remaining == 0) {
//             return res.send({
//                 code: -1,
//                 msg: 'API Key 使用次数已用完，请联系作者续费！'
//             }); 
//         }
//     }else{
//         const canSearch = await canSearchGoogle(free_key);
//         if (!canSearch) {
//             return res.send({
//                 code: 0,
//                 msg: '维护成本大，为避免滥用，每天只能使用5次，请联系作者！【B站:小吴爱折腾】'
//             }); 
//         }
//     }
    

//     const searchUrl = `https://cse.google.com/cse?cx=93d449f1c4ff047bc#gsc.tab=0&gsc.q=${encodeURIComponent(q)}&gsc.sort=`;

//     try {
//         const x_api_key = "f528f374df3f44c1b62d005f81f63fab"
//         const encodedUrl = encodeURIComponent(searchUrl);
//         const scrapingAntUrl = `https://api.scrapingant.com/v2/general?url=${encodedUrl}&x-api-key=${x_api_key}`;
//         const response = await axios.get(scrapingAntUrl);
//         let HtmlContent = response.data;
//         const dom = new JSDOM(HtmlContent);
//         const { document } = dom.window;
//         const result_list = Array.from(document.querySelectorAll('div.gsc-webResult.gsc-result')).map(div => {
//             const _title = div.querySelector('a.gs-title');
//             const title = _title ? _title.textContent.trim() : '';
//             const _image = div.querySelector('img.gs-image');
//             const image = _image ? _image.src : '';
//             const _snippet = div.querySelector('div.gs-snippet');
//             const snippet = _snippet ? _snippet.textContent.trim() : '';
//             const _url = div.querySelector('a.gs-title');
//             const url = _url ? _url.href : '';
//             return { title, image, snippet, url };
//         }).filter(item => item.title); // 过滤掉 title 为空的;

//         let msg = "";
//         if (api_key) {
//             //付费版
//             const { remaining } = await unkey.verifyKey(api_id, api_key, 1);
//             msg = `API Key 剩余调用次数：${remaining}`;
//         }else{
//             await redis.incr(free_key);//每次调用增加一次
//             msg = `今日免费使用次数：${5 - await getUsage(free_key)}`;
//         }

//         return res.send({
//             code: 0,
//             msg: msg,
//             data: result_list
//         });
//     } catch (error) {
//         console.error(`Error performing Google search: ${error.message}`);
//         res.status(500).send(`Error performing Google search: ${error.message}`);
//     }
// })

// app.post('/google/search/image', async (req, res) => {
//     let { q } = req.body;

//     if (!q) {
//         return res.status(400).send('Invalid input: "q" is required');
//     }

//     const searchUrl = `https://cse.google.com/cse?cx=93d449f1c4ff047bc#gsc.tab=1&gsc.q=${q}&gsc.sort=`;
//     //在页面中执行js代码，获取图片搜索结果（base64encode）
//     const js_snippet = `ZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnZGl2LmdzYy1pbWFnZVJlc3VsdC5nc2MtaW1hZ2VSZXN1bHQtcG9wdXAuZ3NjLXJlc3VsdCcpLmZvckVhY2goZWwgPT4gewogICAgY29uc3QgdGFyZ2V0ID0gZWwucXVlcnlTZWxlY3RvcignYSwgaW1nLCBidXR0b24nKSB8fCBlbDsKICAgIGNvbnN0IGV2ZW50ID0gbmV3IE1vdXNlRXZlbnQoJ2NsaWNrJywgeyBidWJibGVzOiB0cnVlLCBjYW5jZWxhYmxlOiB0cnVlIH0pOwogICAgdGFyZ2V0LmRpc3BhdGNoRXZlbnQoZXZlbnQpOwp9KTsK`

//     try {
//         const x_api_key = "f528f374df3f44c1b62d005f81f63fab"
//         const encodedUrl = encodeURIComponent(searchUrl);
//         const scrapingAntUrl = `https://api.scrapingant.com/v2/general?url=${encodedUrl}&x-api-key=${x_api_key}&js_snippet=${js_snippet}`;
//         const response = await axios.get(scrapingAntUrl);
//         let HtmlContent = response.data;
//         const dom = new JSDOM(HtmlContent);
//         const { document } = dom.window;
//         const result_list = Array.from(document.querySelectorAll('div.gsc-imageResult.gsc-imageResult-popup.gsc-result')).map(div => {
//             const _title = div.querySelector('div.gs-image-box a.gs-image img');
//             const title = _title ? _title.title : '';
//             const _image = div.querySelector('a.gs-previewLink img');
//             const image_url = _image ? _image.src : '';
//             const width = _image.width;
//             const height = _image.height;
//             const size = `${width}x${height}`;
//             const _source = div.querySelector('div.gs-visibleUrl');
//             const source = _source ? _source.textContent.trim() : '';
//             return { title, image_url, size, source };
//         }).filter(item => item.image_url); // 过滤掉 title 为空的;
//         res.send({
//             code: 0,
//             msg: 'Success',
//             data: result_list
//         });
//     } catch (error) {
//         console.error(`Error performing Google search: ${error.message}`);
//         res.status(500).send(`Error performing Google search: ${error.message}`);
//     }
// })

app.post('/jina_reader', async (req, res) => {
    
    let { url } = req.body;

    if (!url) {
        return res.status(400).send('Invalid input: "url" is required');
    }
    try {
        const response = await axios.get(`https://r.jina.ai/${url}`, {
            headers: {
            'Authorization': 'Bearer jina_4631fe20e0fc408aafba69e4c1ddbb5fNzIjfDfnxo1y6sOgO8d3mbXKGo3l',
            'X-Proxy-Url': 'http://umwhniat-rotate:eudczfs5mkzt@p.webshare.io:80',
            'X-Timeout': '30',
            'X-Base': 'final'
            },
            // proxy: {
            //     protocol: 'http',
            //     host: 'p.webshare.io',
            //     port: 80,
            //     auth: {
            //         username: 'umwhniat-rotate',
            //         password: 'eudczfs5mkzt'
            //     }
            // }
        });
        res.send({
            code: 0,
            msg: 'Success',
            data: response.data
        });
    } catch (error) {
        console.error(`Error: ${error.message}`);
        res.status(500).send(`Error: ${error.message}`);
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

function toBase64(str) {
    return Buffer.from(str, 'utf-8').toString('base64');
}

app.post('/parse_html', async (req, res) => {
    let { url, selector, xpath, api_key, action } = req.body;
    if (action) {
        return await zyteExtract(req, res);
    }
    const api_id = "api_413Kmmitqy3qaDo4";
    if (!url) {
        return res.status(400).send('url is required');
    }
    if (!selector && !xpath) {
        return res.status(400).send('parser or xpath is required');
    }

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
        if (req.headers['user-identity'] !== '9ae1b679c3c2c89fe4998ab523533d33'){//过滤掉我自己
            if (!canParse) {
                return res.send({
                    code: -1,
                    msg: '免费版每天限量5次，付费可以解锁更多次数，请联系作者！【B站:小吴爱折腾】'
                }); 
            }
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
            result_list = Array.from(document.querySelectorAll(selector)).map(element => {
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
            msg = `今日免费使用次数：${5 - await getUsage(free_key)}`;
        }

        return res.send({
            code: 0,
            msg: msg,
            data: result_list
        });
    } catch (error) {
        console.error(`Error: ${error}`);
        console.error(`Stack trace: ${error.stack}`);
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
    const free_key = environment === 'online' ? req.headers['user-identity'] : 'test';
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
                msg: '维护成本大，为避免滥用，每天只能使用5次，请联系作者！【B站:小吴爱折腾】'
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
            await redis.incr(free_key);//每次调用增加一次
            msg = `今日免费使用次数：${5 - await getUsage(free_key)}`;
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
                msg: '免费版每天限量5次，付费可以解锁更多次数，请联系作者！【B站:小吴爱折腾】'
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
            msg = `今日免费使用次数：${5 - await getUsage(free_key)}`;
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

app.post('/bilibili/subtitle', th_bilibili.fetch_one_video_v2);

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})