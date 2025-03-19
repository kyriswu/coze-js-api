const express = require('express')
const axios = require('axios')
const { JSDOM } = require('jsdom');
const TurndownService = require('@joplin/turndown');
const turndownPluginGfm = require('@joplin/turndown-plugin-gfm');
const { Readability, isProbablyReaderable } = require('@mozilla/readability');
const { URL } = require('url');
const app = express()
const port = 3000

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
        const turndownService = new TurndownService().use(turndownPluginGfm.gfm);
        let markdown = turndownService.turndown(article);
        content = filterMarkdown(markdown);
        return content
    },
    // 其它 URL 处理函数……
};

/**
 * 过滤 Markdown 文档中的图片、换行符和超链接（只保留文本）。
 *
 * @param {string} markdown - 原始 Markdown 文本
 * @returns {string} 过滤后的 Markdown 文本
 */
function filterMarkdown(markdown) {
    // 1. 删除嵌入链接的图片
    markdown = markdown.replace(/\[!\[.*?\]\(.*?\)\]\(.*?\)/g, '');
    // 2. 删除独立图片语法
    markdown = markdown.replace(/!\[.*?\]\(.*?\)/g, '');
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

app.post('/parseUrlContent', async (req, res) => {
    const urls = req.body.urls

    if (!Array.isArray(urls) || urls.length === 0) {
        return res.status(400).send('Invalid input: "urls" should be a non-empty array')
    }

    const x_api_key = "f528f374df3f44c1b62d005f81f63fab"

    try {
        // The following requests are executed concurrently
        const results = await Promise.all(urls.map(async (url) => {
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

                // --时间点3--
                return { url, content }
            } catch (error) {
                console.error(`Error scraping URL ${url}: ${error.message}`);
                throw error;
            }
        }))
        res.send(results)
    } catch (error) {
        res.status(500).send(`Error scraping web pages: ${error.message}`)
    }
})

app.post('/google_search', async (req, res) => {
    let { q, cx } = req.body;

    if (!q) {
        return res.status(400).send('Invalid input: "q" and "cx" are required');
    }

    if (!cx) {
        cx = "93d449f1c4ff047bc"    // 默认使用我的自定义搜索引擎
    }

    const apiKey = 'AIzaSyDURdhjtCaZo8oJyjmeNz8Hr5YVEx6TRLI';
    const searchUrl = `https://customsearch.googleapis.com/customsearch/v1?q=${encodeURIComponent(q)}&cx=${cx}&key=${apiKey}&safe=active`;

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

    const wikipediaUrl = `https://zh.wikipedia.org/w/api.php?action=query&prop=extracts&titles=${item}&explaintext&format=json`;

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

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})