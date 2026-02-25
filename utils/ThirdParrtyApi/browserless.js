import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import pLimit from 'p-limit';
const limit = pLimit(3); // 最多并发 5 个

puppeteer.use(StealthPlugin());
import os from 'os';
import { URL, fileURLToPath } from 'url';
import tool from '../tool.js';
import redis from '../redisClient.js';
import filetool from './filetool.js';
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const TIMEOUT = 600 * 1000

const Webshare_PROXY_USER = "umwhniat-rotate"
const Webshare_PROXY_PASS = "eudczfs5mkzt"
const Webshare_PROXY_HOST = "p.webshare.io"
const Webshare_PROXY_PORT = "80"

// http://liyylnev-rotate:n8yufdsr2u5q@p.webshare.io:80

const qingguo_api_url = "https://share.proxy.qg.net/get?key=FC283878"
const qingguo_proxy_user = "FC283878"
const qingguo_proxy_pass = "6BDF595312DA"

//临时代理
var TEMP_PROXY = {
    api_url: "https://share.proxy.qg.net/get?key=KY5JZ4X2",
    proxy_user: "KY5JZ4X2",
    proxy_pass: "5C2D184F943D",
}


var PUBLIC_SESSION //长会话浏览器
var publicSessionLock = null // 并发锁
var GOOGLE_SESSION //谷歌搜索长会话浏览器
var googleSessionLock = null // 并发锁
let activeRequestCount = 0; // 新增：追踪当前正在进行的请求数

var browser_map = {} //浏览器map

async function puppeteer_connect(chromium_endpoint, timeout, proxy){
    try {
        let b = await puppeteer.connect({
            browserWSEndpoint: `ws://${chromium_endpoint}/chromium?timeout=${timeout}&--proxy-server=${proxy}&--no-sandbox&--proxy-bypass-list=<-loopback>;localhost;127.0.0.1;172.17.0.1&--ignore-certificate-errors&--disable-web-security`,  // 替换为你的本地端口
            headless: false,  // 设置为 false 以便调试
            defaultViewport: { width: 1280, height: 800 },
            args: [
                `--proxy-server=${proxy}`,
                '--no-sandbox',
                '--proxy-bypass-list=<-loopback>;localhost;127.0.0.1;172.17.0.1',  // 移除 localhost 的跳过规则
                '--ignore-certificate-errors',
                '--disable-web-security'
            ],
        });
        return b
    }catch(err){
        console.log("连接browserless服务器失败，",err)
        throw err
    }
}

function generateConnectionId() {
    // 生成符合 UUID v4 标准的字符串
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

async function getQingGuoProxy(){
    let attempts = 0;
    let success = false;
    while (attempts < 2 && !success) {
        try {
            const res = await axios.get(qingguo_api_url);
            console.log("使用青果代理：", res.data)
            if (res.data && res.data.code === 'SUCCESS' && res.data.data && res.data.data.length > 0) {
                success = true;
                return {
                    proxy:'http://' + res.data.data[0].server,
                    proxy_user:qingguo_proxy_user,
                    proxy_pass:qingguo_proxy_pass,
                    proxy_server:res.data.data[0].server
                }
            }
        } catch (err) {
            console.log("获取代理IP失效，重新获取", err.message)
            // 可选：打印错误日志
        }
        attempts++;
    }

    attempts = 0;
    while (attempts < 2 && !success) {
        try {
            const res = await axios.get(TEMP_PROXY.api_url);
            console.log("使用青果备用代理：", res.data)
            if (res.data && res.data.code === 'SUCCESS' && res.data.data && res.data.data.length > 0) {
                success = true;
                return {
                    proxy:'http://' + res.data.data[0].server,
                    proxy_user:TEMP_PROXY.proxy_user,
                    proxy_pass:TEMP_PROXY.proxy_pass,
                    proxy_server:res.data.data[0].server
                }
            }
        } catch (err) {
            console.log("获取备用代理IP失效，重新获取", err.message)
            // 可选：打印错误日志
        }
        attempts++;
    }

    console.log("获取3次备用代理IP失败，退出浏览器")
    return null
}

async function disableLoadMedia(page){
    await page.setCacheEnabled(false);
    // 开启请求拦截
    await page.setRequestInterception(true);

    page.on('request', (request) => {
        const resourceType = request.resourceType();
        const url = request.url().toLowerCase();

        const blockedPatterns = [
            'syndicatedsearch.goog',
            'doubleclick.net',
        ];

        // 拦截图片、CSS、字体、媒体、favicon
        if (
            blockedPatterns.some(pattern => url.includes(pattern)) ||
            ['image', 'stylesheet', 'font', 'media'].includes(resourceType) ||
            url.endsWith('.css') ||
            url.endsWith('.ico') ||              // favicon 文件
            url.includes('favicon')              // 例如 /favicon.png 或 favicon.ico?ver=2
        ) {
            request.abort();
        } else {
            request.continue();
        }
    });
}

async function doActions(page, actions) {
    
    for (const act of actions) {
        if (act.action === 'click') {
            console.log("执行点击操作：", act.selector.value)
            if (act.selector.type === 'xpath') {
                const xp = 'xpath='+act.selector.value;
                await page.click(xp, { timeout: 60000 });
            }else{
                await page.waitForSelector(act.selector.value, { timeout: 60000 });
                await page.click(act.selector.value, { timeout: 60000 });
            }
        } else if (act.action === 'type') {
            let el
            if (act.selector.type === 'xpath') {
                const xp = '::-p-xpath('+act.selector.value+')';
                el = await page.waitForSelector(xp, { timeout: 60000 });
            }else{
                el = await page.waitForSelector(act.selector.value, { timeout: 60000 });
            }
            await el.type(act.text); // 模拟打字效果
        }
    }

}

const browserless = {

    chromium_content: async function (url, opt = {}) {

        return limit(async () => {

            let proxy_user, proxy_pass, chromium_endpoint, proxy
            let browser, page
            let public_browser//公共浏览器

            // 设置代理和浏览器连接参数
            if (process.env.NODE_ENV === 'online') {
                chromium_endpoint = "172.17.0.1:8123"
            } else {
                chromium_endpoint = "172.245.84.92:8123"
            }
            proxy_user = Webshare_PROXY_USER
            proxy_pass = Webshare_PROXY_PASS
            proxy = `http://${Webshare_PROXY_HOST}:${Webshare_PROXY_PORT}`

            if (opt && opt.cookie) {
                //传了cookie就启用新浏览器
                browser = await puppeteer_connect(chromium_endpoint, TIMEOUT, proxy)
            } else {
                // --- 并发锁逻辑开始 ---
                if (!PUBLIC_SESSION) {
                    if (!publicSessionLock) {
                        // 第一个进入的创建锁
                        publicSessionLock = (async () => {
                            const b = await puppeteer_connect(chromium_endpoint, TIMEOUT, proxy)
                            console.log("创建公共浏览器会话-chromium_content")
                            b.on('disconnected', async () => {
                                console.warn('⚠️ Browser disconnected');
                                PUBLIC_SESSION = null;
                                publicSessionLock = null;
                            });
                            PUBLIC_SESSION = b
                            return b
                        })();
                    }
                    browser = await publicSessionLock
                } else {
                    browser = PUBLIC_SESSION
                }
                // --- 并发锁逻辑结束 ---
                public_browser = true
            }

            try {

                page = await browser.newPage();
                await page.setJavaScriptEnabled(true);

                //设置cookie
                if (opt && opt.cookie) {
                    await browser.setCookie(...opt.cookie)
                }

                // 在打开任何页面之前设置 UA
                await page.setUserAgent(
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
                    'AppleWebKit/537.36 (KHTML, like Gecko) ' +
                    'Chrome/121.0.0.0 Safari/537.36'
                );

                // 禁止加载媒体资源（提高渲染速度）
                await disableLoadMedia(page);

                await page.authenticate({
                    username: proxy_user,
                    password: proxy_pass,
                }); // 正式验证代理用户名密码 :contentReference[oaicite:1]{index=1}

                const response = await page.goto(url, {
                    timeout: TIMEOUT,
                    waitUntil: opt.waitUntil || 'networkidle2'
                });

                // 检查 HTTP 状态码
                if (response.status() !== 200) {
                    console.error(`无头浏览器：Request failed with status code: ${response.status()}`);
                    throw new Error(`HTTP request failed with status ${response.status()}`);
                }

                if (opt && opt.element_type && opt.element) {
                    if (opt.element_type === 'xpath') {
                        console.log("等待xpath元素：", opt.element)
                        await page.waitForSelector('xpath/' + opt.element, { timeout: 60000 });
                    } else {
                        console.log("等待css元素：", opt.element)
                        await page.waitForSelector(opt.element, { timeout: 60000 });
                    }
                }

                const html = await page.content();

                await page.close()

                return {
                    data: html
                }
            } catch (error) {
                if (error.name === 'TimeoutError') {
                    console.error('错误：等待元素超时');
                    // 处理超时错误
                    // 可以采取重试策略、记录日志、继续执行其他操作等
                    throw error
                } else {
                    console.error('Error in chromium_content:', error);
                    throw new Error(`出现错误：${error.message}，请检查参数是否正确，或者稍后重试。相关咨询、帮助及开通方式，均在 https://devtool.uk/plugin。`);
                }
            } finally {
                if (public_browser) {
                    // 强制再执行一次 page.close，不考虑报错
                    try { await page.close(); } catch (e) { }
                } else {
                    await browser.close()
                }
            }
        })

    },
    // 国内无头浏览器
    cn_chromium_content: async function (url, opt = {}) {

        let proxy_user, proxy_pass, chromium_endpoint, proxy
        let browser, page

        chromium_endpoint = "172.17.0.1:8123";
        ({proxy,proxy_user,proxy_pass} = await getQingGuoProxy())
        //国内代理，每次都用新的浏览器
        browser = await puppeteer_connect(chromium_endpoint, TIMEOUT, proxy)

        try {

            page = await browser.newPage();
            await page.setJavaScriptEnabled(true);
            // 伪装 navigator.webdriver
            await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false
            });
            });


            //设置cookie
            if (opt && opt.cookie) {
                await browser.setCookie(...opt.cookie)
            }
            
            // 在打开任何页面之前设置 UA
            await page.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
                'AppleWebKit/537.36 (KHTML, like Gecko) ' +
                'Chrome/121.0.0.0 Safari/537.36'
            );

            // 在页面加载之前注入一堆伪装，覆盖 headless 指纹
            await page.evaluateOnNewDocument(() => {
                try {
                    // webdriver
                    Object.defineProperty(navigator, 'webdriver', { get: () => false, configurable: true });
                    // languages
                    Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh'], configurable: true });
                    // plugins: 用更真实的对象而非数字
                    Object.defineProperty(navigator, 'plugins', { get: () => [{ name: 'Chrome PDF Plugin' }, { name: 'Shockwave Flash' }], configurable: true });

                    // chrome object
                    window.chrome = { runtime: {} };

                    // hardware concurrency / device memory
                    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8, configurable: true });
                    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8, configurable: true });

                    // permissions spoof
                    const oldQuery = navigator.permissions && navigator.permissions.query;
                    if (oldQuery) {
                        navigator.permissions.__proto__.query = (parameters) => {
                            if (parameters && parameters.name === 'notifications') {
                                return Promise.resolve({ state: Notification.permission });
                            }
                            return oldQuery(parameters);
                        };
                    }

                    // 添加更多浏览器指纹特征
                    Object.defineProperties(navigator, {
                        hardwareConcurrency: { value: 8 },
                        deviceMemory: { value: 8 },
                        platform: { value: 'Win32' },
                        plugins: { value: [
                            { name: 'Chrome PDF Plugin' },
                            { name: 'Chrome PDF Viewer' },
                            { name: 'Native Client' }
                        ]},
                        languages: { value: ['zh-CN', 'zh', 'en-US', 'en'] }
                    });

                    // WebGL spoof (simple)
                    const getParameter = WebGLRenderingContext.prototype.getParameter;
                    WebGLRenderingContext.prototype.getParameter = function (parameter) {
                        // UNMASKED_VENDOR_WEBGL = 37445, UNMASKED_RENDERER_WEBGL = 37446
                        if (parameter === 37445) return 'Intel Inc.';
                        if (parameter === 37446) return 'Intel Iris OpenGL Engine';
                        return getParameter(parameter);
                    };

                    // AudioContext fingerprint mitigation (basic)
                    try {
                        const orig = window.OfflineAudioContext.prototype.createAnalyser;
                        // noop - just ensure exists (advanced spoofing需要更多)
                    } catch (e) { }
                } catch (e) { }
            });

            // 设置默认cookie
            const defaultCookies = [
                {
                    name: 'user_session_variant',
                    value: Math.random().toString(36).substring(7),
                    domain: new URL(url).hostname
                },
                {
                    name: 'session_id',
                    value: Date.now().toString(36),
                    domain: new URL(url).hostname
                }
            ];

            // 合并自定义cookie和默认cookie
            if (opt && opt.cookie) {
                await browser.setCookie(...[...defaultCookies, ...opt.cookie]);
            } else {
                await browser.setCookie(...defaultCookies);
            }

  

            // 补齐 extra headers — 注意 sec-fetch-site 我设为 none（顶级导航通常是 none）
            await page.setExtraHTTPHeaders({
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'cache-control': 'max-age=0',
                'sec-ch-ua': '"Chromium";v="121", "Google Chrome";v="121"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'sec-fetch-dest': 'document',
                'sec-fetch-mode': 'navigate',
                'sec-fetch-site': 'none',
                'sec-fetch-user': '?1',
                'upgrade-insecure-requests': '1'
            });


            // 禁止加载媒体资源（提高渲染速度）
            await disableLoadMedia(page);

            await page.authenticate({
                username: proxy_user,
                password: proxy_pass,
            }); // 正式验证代理用户名密码 :contentReference[oaicite:1]{index=1}

            const response = await page.goto(url, {
                timeout: TIMEOUT,
                waitUntil: opt.waitUntil || 'domcontentloaded'
            });

            // 检查 HTTP 状态码
            if (response.status() !== 200) {

                console.log('----ERROR RESPONSE----');
        console.log('URL:', response.url());
        console.log('STATUS:', response.status());
        console.log('HEADERS:', response.headers());
        const text = await response.text();
        console.log('BODY (first 2000 chars):\n', text.slice(0, 2000));
        console.log('----END RESPONSE----\n');


                console.error(`中国无头浏览器：Request failed with status code: ${response.status()}`);
                throw new Error(`HTTP request failed with status ${response.status()}`);
            }

            if (opt && opt.element_type && opt.element) {
                if (opt.element_type === 'xpath') {
                    console.log("等待xpath元素：", opt.element)
                    await page.waitForSelector('xpath/' + opt.element, { timeout: 60000 });
                }else{
                    console.log("等待css元素：", opt.element)
                    await page.waitForSelector(opt.element, { timeout: 60000 });
                }
            }

            const html = await page.content();


            await page.close()

            return {
                data: html
            }
        } catch (error) {
            if (error.name === 'TimeoutError') {
                console.error('错误：等待元素超时');
                // 处理超时错误
                // 可以采取重试策略、记录日志、继续执行其他操作等
                throw error
            } else {
                console.error('Error in chromium_content:', error);
                throw new Error(`出现错误：${error.message}，请检查参数是否正确，或者稍后重试。相关咨询、帮助及开通方式，均在 https://devtool.uk/plugin`);
            }
        } finally {
            await browser.close()
        }

    },

    google_search: async function (keyword, retryCount = 0) {
        return limit(async () => {
        const search_count = await redis.incr("google_search_count")
        let proxy_user, proxy_pass, chromium_endpoint, proxy
        let browser, page

        if (process.env.NODE_ENV === 'online') {
            chromium_endpoint = "172.17.0.1:8123"
        } else {
            chromium_endpoint = "172.245.84.92:8123"
        }
        proxy_user = 'liyylnev-rotate'
        proxy_pass = 'n8yufdsr2u5q'
        proxy = `http://${Webshare_PROXY_HOST}:${Webshare_PROXY_PORT}`

        // --- 并发锁逻辑开始 ---
        if (!GOOGLE_SESSION) {
            if (!googleSessionLock) {
                // 第一个进入的创建锁
                googleSessionLock = (async () => {
                    const b = await puppeteer_connect(chromium_endpoint, TIMEOUT, proxy)
                    console.log("创建谷歌搜索浏览器会话")
                    b.on('disconnected', async () => {
                        console.warn('⚠️ Browser disconnected');
                        GOOGLE_SESSION = null;
                        googleSessionLock = null;
                    });
                    GOOGLE_SESSION = b
                    return b
                })();
            }
            browser = await googleSessionLock
        } else {
            browser = GOOGLE_SESSION
        }
        // --- 并发锁逻辑结束 ---

        try {

            page = await browser.newPage();

            // 在打开任何页面之前设置 UA
            await page.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
                'AppleWebKit/537.36 (KHTML, like Gecko) ' +
                'Chrome/121.0.0.0 Safari/537.36'
            );

            await page.authenticate({
                username: proxy_user,
                password: proxy_pass,
            }); // 正式验证代理用户名密码 :contentReference[oaicite:1]{index=1}

            // 禁止加载媒体资源（提高渲染速度）
            await disableLoadMedia(page);

            console.log(chromium_endpoint, proxy_user, proxy_pass)
            let totalBytes = 0;

            page.on('response', async (response) => {
                try {
                    const buffer = await response.buffer();
                    totalBytes += buffer.length;
                } catch (err) {
                // 某些响应可能没有主体（如 204/304），跳过即可
                    console.log("谷歌搜索出现错误", err.message)
                }
            });

            await page.setDefaultNavigationTimeout(120000);  // 设置导航的默认 timeout
            await page.setDefaultTimeout(150000);


            const cx = ['c277c25def5cf420c', 'c41a0f846c1fe490c', 'f012bf6d1cf90477e', '93d449f1c4ff047bc','10fe0d70750b2423c','74ac2ca7f804a4408','7660206f8e0b84ba3'
                ,'6457c8d0218494fd8', '22eb5e8ce100049f4','a68056744fdfe4ca6'
            ];
            // const ces = `https://cse.google.com/cse?cx=${cx[search_count % 10]}#gsc.tab=0&gsc.q=${keyword}&gsc.sort=&gsc.page=1`
            const ces = `https://cse.google.com/cse?cx=${cx[search_count % 10]}`

            const response = await page.goto(ces, {
                timeout: TIMEOUT
            });

            // 检查 HTTP 状态码
            if (response.status() !== 200) {
                console.error(`Request failed with status code: ${response.status()}`);
                throw new Error(`HTTP request failed with status ${response.status()}`);
            }
await page.waitForSelector('#gsc-i-id1');
await page.type('#gsc-i-id1', keyword); // 模拟打字效果
await page.click('.gsc-search-button'); // 聚焦并选中文本（如果已有）
await page.waitForFunction(() => {
  const el = document.querySelector('div.gsc-control-wrapper-cse');
  return el && !el.classList.contains('gsc-loading-fade');
});
            const html = await page.content();

              console.log(`💾 Total bandwidth: ${(totalBytes / 1024).toFixed(2)} KB，搜索词：${keyword}`);
            await page.close()

            return html
        } catch (error) {
            // 断开时重置全局变量，防止死锁
            if (browser === GOOGLE_SESSION) {
                try { await browser.close(); } catch (e) {}
            }
            if ( retryCount < 1 ) {
                console.error('Google Search 网络/页面异常，重试:', error.message);
                return await this.google_search(keyword, retryCount + 1);
            } else {
                console.error('Error in chromium Google Search API:', error.message);
                return null;
            }
        } finally {
            // 强制再执行一次 page.close，不考虑报错
                try { await page.close(); } catch (e) {}
                if (search_count % 50 === 0) {
                    // 每50次搜索关闭一次浏览器，释放资源
                    console.log("每50次搜索关闭一次浏览器，释放资源")
                    await browser.close();
                }
        }
        })
    },

    google_search_new: async function (keyword, retryCount = 0) {
        return limit(async () => {
            const search_count = await redis.incr("google_search_count");
            let page = null;
            let browser = null;

            // --- 1. 智能单例获取逻辑 ---
            const getBrowser = async () => {
                // 如果会话不存在或已断开，则创建
                if (!GOOGLE_SESSION || !GOOGLE_SESSION.isConnected()) {
                    if (!googleSessionLock) {
                        googleSessionLock = (async () => {
                            const chromium_endpoint = process.env.NODE_ENV === 'online' ? "172.17.0.1:8123" : "172.245.84.92:8123";
                            const proxy = `http://${Webshare_PROXY_HOST}:${Webshare_PROXY_PORT}`;
                            
                            console.log("🚀 正在创建新的谷歌搜索浏览器会话...");
                            const b = await puppeteer_connect(chromium_endpoint, TIMEOUT, proxy);
                            
                            b.on('disconnected', () => {
                                console.warn('⚠️ 浏览器连接已断开');
                                GOOGLE_SESSION = null;
                                googleSessionLock = null;
                            });
                            return b;
                        })();
                    }
                    GOOGLE_SESSION = await googleSessionLock;
                }
                return GOOGLE_SESSION;
            };

            try {
                browser = await getBrowser();
                activeRequestCount++; // ✅ 计数器+1
                
                page = await browser.newPage();
                
                // 设置严格的超时，防止代理资源被挂起的请求长期占用
                page.setDefaultNavigationTimeout(150000); 
                page.setDefaultTimeout(150000);

                await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
                await page.authenticate({ username: 'liyylnev-rotate', password: 'n8yufdsr2u5q' });
                await disableLoadMedia(page);

                // 流量监控优化：只在开发环境或抽样开启，减少 CPU 压力
                let totalBytes = 0;
                const onResponse = async (res) => {
                    try { const buf = await res.buffer(); totalBytes += buf.length; } catch(e) {}
                };
                page.on('response', onResponse);

                const cxList = ['c277c25def5cf420c', 'c41a0f846c1fe490c', 'f012bf6d1cf90477e', '93d449f1c4ff047bc', '10fe0d70750b2423c', '74ac2ca7f804a4408', '7660206f8e0b84ba3', '6457c8d0218494fd8', '22eb5e8ce100049f4', 'a68056744fdfe4ca6'];
                
                // 随机 CX 避免并发冲突
                const selectedCx = cxList[Math.floor(Math.random() * cxList.length)];
                const ces = `https://cse.google.com/cse?cx=${selectedCx}`;

                const response = await page.goto(ces, { waitUntil: 'networkidle2' });
                if (response.status() !== 200) throw new Error(`HTTP ${response.status()}`);

                await page.waitForSelector('#gsc-i-id1');
                await page.type('#gsc-i-id1', keyword, { delay: 50 });
                await page.click('.gsc-search-button');

                await page.waitForFunction(() => {
                    const el = document.querySelector('div.gsc-control-wrapper-cse');
                    return el && !el.classList.contains('gsc-loading-fade');
                }, { timeout: 15000 });

                const html = await page.content();
                return html;

            } catch (error) {
                console.error(`❌ [Attempt ${retryCount}] 搜索失败: ${keyword} - ${error.message}`);
                
                if (page) {
                    try {
                        page.removeAllListeners();
                        await page.close().catch(() => {});
                    } catch (e) {}
                    page = null; // 显式置空
                }
                
                // 失败后立即释放计数器 (因为我们要开启一个新的递归请求，那个请求会再次 +1)
                activeRequestCount--; 
    
                // 递归重试
                if (retryCount < 1) {
                    return await this.google_search_new(keyword, retryCount + 1);
                }
                return null;
            } finally {
                // --- 资源清理核心 ---
                if (page) {
                    activeRequestCount--; // ✅ 计数器-1 只有当 page 还没被 catch 块清理过时，才执行清理
                    try {
                        // 1. 先关闭拦截器，防止后续网络请求报错
                        if (page.isClosed() === false) { 
                            await page.setRequestInterception(false).catch(() => {});
                        }
                        // 2. 移除所有监听器 (关键步骤，防止闭包内存泄露)
                        page.removeAllListeners();
                        // 3. 关闭页面
                        await page.close().catch(() => {});
                    } catch (e) {}
                    page = null; // 4. 显式解除引用，帮助 V8 GC 回收
                }
                // --- 2. 平滑重启逻辑 ---
                if (search_count % 50 === 0 && GOOGLE_SESSION) {
                    console.log(`♻️ [自动维护] 触发第 ${search_count} 次请求的资源回收...`);
                    
                    const oldBrowser = GOOGLE_SESSION;
                    GOOGLE_SESSION = null;     // 立即切断新请求的入口
                    googleSessionLock = null;  // 重置锁
    
                    // 30秒后杀死旧浏览器，此时旧请求应该都跑完了
                    setTimeout(async () => {
                        if (oldBrowser) {
                            const pages = await oldBrowser.pages().catch(() => []);
                            console.log(`🧹 执行清理：旧浏览器剩余 ${pages.length} 个页面，强制关闭。`);
                            await oldBrowser.close().catch(err => console.error("旧浏览器关闭异常:", err.message));
                        }
                    }, 30000);
                }
            }
        });
    },

    extract_youtube_audio_url: async function (toolurl,videourl, opt = {}) {

        let proxy_user, proxy_pass, chromium_endpoint, proxy
        let browser, page
        let public_browser

        if (process.env.NODE_ENV === 'online') {
            chromium_endpoint = "172.17.0.1:8123"
        } else {
            chromium_endpoint = "172.245.84.92:8123"
        }
        proxy_user = Webshare_PROXY_USER
        proxy_pass = Webshare_PROXY_PASS
        proxy = `http://${Webshare_PROXY_HOST}:${Webshare_PROXY_PORT}`

        // --- 并发锁逻辑开始 ---
        if (!PUBLIC_SESSION) {
            if (!publicSessionLock) {
                // 第一个进入的创建锁
                publicSessionLock = (async () => {
                    const b = await puppeteer_connect(chromium_endpoint, TIMEOUT, proxy)
                    console.log("创建公共浏览器会话-extract_youtube_audio_url")
                    b.on('disconnected', async () => {
                        console.warn('⚠️ Browser disconnected');
                        PUBLIC_SESSION = null;
                        publicSessionLock = null;
                    });
                    PUBLIC_SESSION = b
                    return b
                })();
            }
            browser = await publicSessionLock
        } else {
            browser = PUBLIC_SESSION
        }
        // --- 并发锁逻辑结束 ---
        public_browser = true

        try {

            page = await browser.newPage();

            // 在打开任何页面之前设置 UA
            await page.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
                'AppleWebKit/537.36 (KHTML, like Gecko) ' +
                'Chrome/121.0.0.0 Safari/537.36'
            );

            await page.authenticate({
                username: proxy_user,
                password: proxy_pass,
            }); // 正式验证代理用户名密码 :contentReference[oaicite:1]{index=1}

            //设置cookie
            if (opt && opt.cookie) {
                await browser.setCookie(...opt.cookie)
            }

            // 禁止加载媒体资源（提高渲染速度）
            await disableLoadMedia(page);

            // ...existing code...
            let getinfoResult; // 用于主流程等待 getinfo 响应
            const getinfoPromise = new Promise((resolve, reject) => {
                getinfoResult = { resolve, reject };
            });

            page.on('response', async (response) => {
                if (response.url().includes('/getinfo')) {
                    console.log('捕获到响应:', response.url());
                    try {
                        const responseBody = await response.json();
                        if (responseBody.status !== 'success') {
                            getinfoResult.reject(new Error('获取音频信息失败，请重试'));
                        } else {
                            getinfoResult.resolve(responseBody);
                        }
                        console.log('返回的数据:', responseBody);
                    } catch (err) {
                        getinfoResult.reject(err);
                    }
                }
            });
      

            const response = await page.goto(toolurl, {
                timeout: TIMEOUT,
                waitUntil: 'networkidle2',
            });

            // 检查 HTTP 状态码
            if (response.status() !== 200) {
                console.error(`Request failed with status code: ${response.status()}`);
                throw new Error(`HTTP request failed with status ${response.status()}`);
            }

            console.log("getinfoResult:", getinfoResult)

                        // 等待 input 和 button 出现
  await page.waitForSelector('#videoUrl');
  await page.waitForSelector('#videoBtn');

  // 在 input 中输入链接
  const videoLink = videourl;
  await page.click('#videoUrl', { clickCount: 3 }); // 聚焦并选中文本（如果已有）
  await page.type('#videoUrl', videoLink); // 输入链接 :contentReference[oaicite:1]{index=1}
    // 点击按钮提交
  await page.click('#videoBtn');
  await page.waitForSelector('a.js-unmask.ko-btn.btn.btn-lg.btn-primary', {timeout:120000})


  // 查找 Extract Audio 对应的 <a> 标签
  const audio_url = await page.evaluate(() => {
    const a = Array.from(document.querySelectorAll('a.js-download.btn-success'))
      .find(el => el.textContent.trim().includes('Extract Audio'));

    if (!a) return null;
    return a.href
  });
            await page.close()

            return audio_url
        } catch (error) {
            if (error.message && error.message.includes('net::ERR')) {
                console.error('Extract YouTube Audio 网络连接失败:', error.message);
                // 这里可以做额外处理，比如重试、报警等
                return await this.extract_youtube_audio_url(toolurl,videourl) //重试
            }
            console.error('Error in chromium screen shot:', error);
            return null
        } finally {
            if(public_browser){
                // 强制再执行一次 page.close，不考虑报错
                try { await page.close(); } catch (e) {}
            }else{
                await browser.close()
            }
        }
    },

    screenshot: async function (url, opt = {}) {

        let proxy_user, proxy_pass, chromium_endpoint, proxy
        let browser, page
        let public_browser//公共浏览器

        if (opt && opt.proxy && opt.proxy === "china") {
            let attempts = 0;
            let success = false;
            while (attempts < 3 && !success) {
                try {
                    const res = await axios.get(qingguo_api_url);
                    console.log("使用青果代理：", res.data)
                    if (res.data && res.data.code === 'SUCCESS' && res.data.data && res.data.data.length > 0) {
                        chromium_endpoint = "1.15.114.179:8123"
                        proxy_user = qingguo_proxy_user
                        proxy_pass = qingguo_proxy_pass
                        proxy = 'http://' + res.data.data[0].server;
                        success = true;
                    }
                } catch (err) {
                    console.log("获取代理IP失效，重新获取", err)
                    // 可选：打印错误日志
                }
                attempts++;
            }
            if (attempts === 3) {
                console.log("获取3次代理IP失败，退出浏览器")
                return null
            }

            //国内代理，每次都用新的浏览器
            browser = await puppeteer_connect(chromium_endpoint, TIMEOUT, proxy)


        } else {
            if (process.env.NODE_ENV === 'online') {
                chromium_endpoint = "172.17.0.1:8123"
            } else {
                chromium_endpoint = "172.245.84.92:8123"
            }
            proxy_user = Webshare_PROXY_USER
            proxy_pass = Webshare_PROXY_PASS
            proxy = `http://${Webshare_PROXY_HOST}:${Webshare_PROXY_PORT}`

            if (opt && opt.cookie) {
                //国外代理，传了cookie就用新浏览器，否则共享
                browser = await puppeteer_connect(chromium_endpoint, TIMEOUT, proxy)
            }else{
                // --- 并发锁逻辑开始 ---
                if (!PUBLIC_SESSION) {
                    if (!publicSessionLock) {
                        // 第一个进入的创建锁
                        publicSessionLock = (async () => {
                            const b = await puppeteer_connect(chromium_endpoint, TIMEOUT, proxy)
                            console.log("创建公共浏览器会话-screenshot")
                            b.on('disconnected', async () => {
                                console.warn('⚠️ Browser disconnected');
                                PUBLIC_SESSION = null;
                                publicSessionLock = null;
                            });
                            PUBLIC_SESSION = b
                            return b
                        })();
                    }
                    browser = await publicSessionLock
                } else {
                    browser = PUBLIC_SESSION
                }
                // --- 并发锁逻辑结束 ---
                public_browser = true
            }

        }
    
        //设置cookie
        if (opt && opt.cookie) {
            await browser.setCookie(...opt.cookie)
        }

        try {

            page = await browser.newPage();

            // Create downloads directory if it doesn't exist
            const downloadDir = path.join(__dirname, '../..', 'downloads');
            if (!fs.existsSync(downloadDir)) {
                fs.mkdirSync(downloadDir);
            }

            // 在打开任何页面之前设置 UA
            await page.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
                'AppleWebKit/537.36 (KHTML, like Gecko) ' +
                'Chrome/121.0.0.0 Safari/537.36'
            );
            await page.setExtraHTTPHeaders({
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6,zh-TW;q=0.5'
            });

            await page.authenticate({
                username: proxy_user,
                password: proxy_pass,
            }); // 正式验证代理用户名密码 :contentReference[oaicite:1]{index=1}

            const response = await page.goto(url, {
                timeout: TIMEOUT,
                waitUntil: 'networkidle2',
            });

            // 检查 HTTP 状态码
            if (response.status() !== 200) {
                console.error(`Request failed with status code: ${response.status()}`);
                throw new Error(`HTTP request failed with status ${response.status()}`);
            }

            // Generate filename with timestamp
            const timestamp = new Date().getTime();
            const filepath = path.join(downloadDir, `screenshot_${timestamp}.png`);
            const filename = `screenshot_${timestamp}.png`

            if (opt && opt.element) {
                const selector_type = tool.identifySelector(opt.element)
                let selector = opt.element
                if (selector_type === 'xpath') {
                    selector = `::-p-xpath(${opt.element})`;
                }

                const elHandle = await page.waitForSelector(selector);
                await elHandle.scrollIntoViewIfNeeded();
                await elHandle.screenshot({ path: filepath });

            } else {
                await page.screenshot({
                    path: filepath,           // 保存路径
                    fullPage: true,           // 是否截取整个滚动区域
                });
            }

            await page.close()

            return filename
        } catch (error) {
            console.error('Error in chromium screen shot:', error);
            return null
        } finally {
            if (public_browser) {
                // 强制再执行一次 page.close，不考虑报错
                 try { await page.close(); } catch (e) {}
            } else {
                await browser.close();
            }
        }
    },
    chromium: async function (url, opt = {}) {

        let proxy_user, proxy_pass, chromium_endpoint, proxy
        let browser

        if (1) {
            let attempts = 0;
            let success = false;
            while (attempts < 3 && !success) {
                try {
                    const res = await axios.get(qingguo_api_url);
                    console.log("使用青果代理：", res.data)
                    if (res.data && res.data.code === 'SUCCESS' && res.data.data && res.data.data.length > 0) {
                        chromium_endpoint = "1.15.114.179:8123"
                        proxy_user = qingguo_proxy_user
                        proxy_pass = qingguo_proxy_pass
                        proxy = 'http://' + res.data.data[0].server;
                        success = true;
                    }
                } catch (err) {
                    console.log("获取代理IP失效，重新获取", err)
                    // 可选：打印错误日志
                }
                attempts++;
            }
            if (attempts === 3) {
                console.log("获取3次代理IP失败，退出浏览器")
                return null
            }

        } else {
            if (process.env.NODE_ENV === 'online') {
                chromium_endpoint = "172.17.0.1:8123"
            } else {
                chromium_endpoint = "172.245.84.92:8123"
            }
            proxy_user = Webshare_PROXY_USER
            proxy_pass = Webshare_PROXY_PASS
            proxy = `http://${Webshare_PROXY_HOST}:${Webshare_PROXY_PORT}`
        }

        browser = await puppeteer_connect(chromium_endpoint, TIMEOUT, proxy)

        const browserId = generateConnectionId()
        browser.on('disconnected', () => {
            console.warn('⚠️ 长会话浏览器关闭 Browser disconnected');
            // 清理状态
            delete browser_map[browserId];
            // 这里可以触发重连逻辑
        });
        browser_map[browserId] = {
            browser:browser,
            proxy_user:proxy_user,
            proxy_pass:proxy_pass,
            pages:{}
        }
        
        return browserId

    },

    page: async function (url, opt = {}) {

        let browser, page
        let browserId = opt.browserId
        console.log(browser_map)
        if (!browser_map[browserId]) {
            throw new Error(`browserId无效，请重新通过browser工具重新生成`);
        }

        browser  =  browser_map[browserId].browser


        if (opt && opt.cookie) {
            await browser.setCookie(...opt.cookie)
        }

        try {

            page = await browser.newPage();

            //设置cookie
            if (opt && opt.cookie) {
                await browser.setCookie(...opt.cookie)
            }
            
            // 在打开任何页面之前设置 UA
            await page.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
                'AppleWebKit/537.36 (KHTML, like Gecko) ' +
                'Chrome/121.0.0.0 Safari/537.36'
            );

            await page.authenticate({
                username: browser_map[browserId].proxy_user,
                password: browser_map[browserId].proxy_pass,
            }); // 正式验证代理用户名密码 :contentReference[oaicite:1]{index=1}

            const response = await page.goto(url, {
                timeout: TIMEOUT,
                waitUntil: 'networkidle2',
            });

            // 检查 HTTP 状态码
            if (response.status() !== 200) {
                console.error(`无头浏览器：Request failed with status code: ${response.status()}`);
                throw new Error(`HTTP request failed with status ${response.status()}`);
            }

            // await page.click('::-p-xpath(//*[@id="main"]/div[3]/ul/li[0]/div[1]/h3/a)')

            const html = await page.content();

            const pageId = generateConnectionId()
            browser_map[browserId].pages[pageId] = page

            return {
                data: html
            }
        } catch (error) {
            console.error('Error in chromium_content:', error);
            return null
        } finally {
            // if(public_browser){
            //     // 强制再执行一次 page.close，不考虑报错
            //     try { await page.close(); } catch (e) {}
            // }else{
            //     await browser.close()
            // }
        }

    },
    
    //flk.npc.gov.cn
    cn_law: async function (urls) {
        let proxy_user, proxy_pass, chromium_endpoint, proxy
        let browser

        ({proxy,proxy_user,proxy_pass} = await getQingGuoProxy())
        chromium_endpoint = "1.15.114.179:8123"
        browser = await puppeteer_connect(chromium_endpoint, TIMEOUT, proxy)

        let doc_direct_link = []
        try {

            // 假设我们要并行打开 3 个页面，分别搜索不同的关键词
            const pagePromises = urls.map(async (url) => {
               
                const p = await browser.newPage();
                await p.setUserAgent(
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
                    'AppleWebKit/537.36 (KHTML, like Gecko) ' +
                    'Chrome/121.0.0.0 Safari/537.36'
                );
                await p.authenticate({
                    username: proxy_user,
                    password: proxy_pass,
                });
                const response = await p.goto(url, {
                    timeout: TIMEOUT,
                    // waitUntil: 'networkidle2',
                });
                if (response.status() !== 200) {
                    console.error(`无头浏览器：Request failed with status code: ${response.status()}`);
                    await p.close();
                    throw new Error(`HTTP request failed with status ${response.status()}`);
                }
                const doc = await p.evaluate(() => {
                    // 你在页面中执行的 JavaScript 代码
                    return downLoadWordFileFileBs ? downLoadWordFileFileBs : downLoadPdfFileFileBs || null;
                });
                await redis.set(url,doc,"EX",15*60*60*24)
                doc_direct_link.push({
                    doc_url:url,
                    doc_direct_link:doc
                })
                // return doc_url;
            });

            await Promise.all(pagePromises);

            return doc_direct_link
        } catch (error) {
            console.error('Error in chromium_content:', error);
            return []
        } finally {
            await browser.close()
        }

    },
    //专利查询
    zlcx: async function (keyword,page) {
        let proxy_user, proxy_pass, chromium_endpoint, proxy
        let browser

        ({proxy,proxy_user,proxy_pass} = await getQingGuoProxy())
        chromium_endpoint = "1.15.114.179:8123"
        browser = await puppeteer_connect(chromium_endpoint, TIMEOUT, proxy)

        try {

                const p = await browser.newPage();
                await p.setUserAgent(
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
                    'AppleWebKit/537.36 (KHTML, like Gecko) ' +
                    'Chrome/121.0.0.0 Safari/537.36'
                );
                await p.authenticate({
                    username: proxy_user,
                    password: proxy_pass,
                });

                // 开启请求拦截
            await p.setRequestInterception(true);

            p.on('request', (request) => {
                const resourceType = request.resourceType();
                const url = request.url().toLowerCase();

                const blockedPatterns = [
                    'syndicatedsearch.goog',
                    'doubleclick.net',
                ];

                // 拦截图片、CSS、字体、媒体、favicon
                if (
                    blockedPatterns.some(pattern => url.includes(pattern)) ||
                    ['image', 'stylesheet', 'font', 'media'].includes(resourceType) ||
                    url.endsWith('.css') ||
                    url.endsWith('.ico') ||              // favicon 文件
                    url.includes('favicon')              // 例如 /favicon.png 或 favicon.ico?ver=2
                ) {
                    request.abort();
                } else {
                    request.continue();
                }
            });

                const url = "https://kns.cnki.net/kns8s/defaultresult/index?classid=VUDIXAIY&korder=SU&kw=" + keyword
                const response = await p.goto(url, {
                    timeout: TIMEOUT,
                    waitUntil: 'domcontentloaded',
                });
                if (response.status() !== 200) {
                    console.error(`无头浏览器：Request failed with status code: ${response.status()}`);
                    await p.close();
                    throw new Error(`HTTP request failed with status ${response.status()}`);
                }

                

                const html = await p.content()
     

            return html
        } catch (error) {
            console.error('Error in chromium_content:', error);
            return null
        } finally {
            await browser.close()
        }

    },

    weixin_search: async function (keyword,page) {
        let proxy_user, proxy_pass, chromium_endpoint, proxy
        let browser

        ({proxy,proxy_user,proxy_pass} = await getQingGuoProxy())
        chromium_endpoint = "172.17.0.1:8123"
        browser = await puppeteer_connect(chromium_endpoint, TIMEOUT, proxy)

        try {

                const p = await browser.newPage();
                await p.setUserAgent(
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
                    'AppleWebKit/537.36 (KHTML, like Gecko) ' +
                    'Chrome/121.0.0.0 Safari/537.36'
                );

                // 禁止加载媒体资源（提高渲染速度）
                await disableLoadMedia(p);
            
                await p.authenticate({
                    username: proxy_user,
                    password: proxy_pass,
                });
                const url = "https://weixin.sogou.com/weixin?ie=utf8&s_from=input&_sug_=n&_sug_type_=1&type=2&query=" + keyword + "&page=" + page
                const response = await p.goto(url, {
                    timeout: TIMEOUT,
                    waitUntil: 'networkidle2',
                });
                if (response.status() !== 200) {
                    console.error(`无头浏览器：Request failed with status code: ${response.status()}`);
                    await p.close();
                    throw new Error(`HTTP request failed with status ${response.status()}`);
                }

                console.log("开始采集微信文章")
                const resultList = await p.evaluate(() => {
  const results = [];
  for (let i = 0; i < 10; i++) {
    const el = document.querySelector(`#sogou_vr_11002601_title_${i}`);
    if (el) {
      let href = el.getAttribute('href');
      if (href) {
        // 如果 href 已经是完整的 weixin.sogou.com 链接，就直接用它
        if (href.includes('weixin.sogou.com')) {
        //   results.push(href);
        } else {
          href = 'https://weixin.sogou.com' + href
        }
      }
      const title = el.textContent.trim()
      const from = document.querySelector(`#sogou_vr_11002601_box_${i} .all-time-y2`).textContent.trim()
      const s2_el = document.querySelector(`#sogou_vr_11002601_box_${i} .s2`)
     const pureText = [...s2_el.childNodes]
                    .filter(node => node.nodeType === Node.TEXT_NODE)
                    .map(node => node.textContent.trim())
                    .join(' ');
      results.push({
        title:title,
        href:href,
        from:from,
        date:pureText
      })
    }
  }
  return results;
});
console.log(resultList)
const pagesData = await Promise.all(resultList.map(async (item, index) => {
  const subpage = await browser.newPage();
  try {

    // 禁用 JS 执行，页面不会跳转
    await subpage.setJavaScriptEnabled(false);
    
    await subpage.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
        'AppleWebKit/537.36 (KHTML, like Gecko) ' +
        'Chrome/121.0.0.0 Safari/537.36'
    );
    await subpage.authenticate({
        username: proxy_user,
        password: proxy_pass,
    });

    await subpage.goto(item.href);

    const html = await subpage.content();

    const regex = /url\s*\+=\s*['"`]([^'"`]+)['"`]/g;
  let match;
  let url = '';

  while ((match = regex.exec(html)) !== null) {
    url += match[1];
  }

  // 简单还原后清洗
  url = url.replace('@', '').replace(/\*+/g, '*'); // 替换@符号和多余星号等
  console.log("真实url", url)
  resultList[index].href = url
  return url;

  } catch (err) {
    console.error(`Failed to open ${item.href}:`, err.message);
    await subpage.close();
    return { error: err.message };
  }
}));
     

            return resultList
        } catch (error) {
            console.error('Error in chromium_content:', error);
            return []
        } finally {
            await browser.close()
        }

    },

    jipiao_search: async function (opt = {}) {

        let proxy_user, proxy_pass, chromium_endpoint, proxy
        let browser, page
        let public_browser

        if (process.env.NODE_ENV === 'online') {
            chromium_endpoint = "172.17.0.1:8123"
        } else {
            chromium_endpoint = "172.245.84.92:8123"
        }
        proxy_user = Webshare_PROXY_USER
        proxy_pass = Webshare_PROXY_PASS
        proxy = `http://${Webshare_PROXY_HOST}:${Webshare_PROXY_PORT}`

        // --- 并发锁逻辑开始 ---
        if (!PUBLIC_SESSION) {
            if (!publicSessionLock) {
                // 第一个进入的创建锁
                publicSessionLock = (async () => {
                    const b = await puppeteer_connect(chromium_endpoint, TIMEOUT, proxy)
                    b.on('disconnected', async () => {
                        console.warn('⚠️ Browser disconnected');
                        PUBLIC_SESSION = null;
                        publicSessionLock = null;
                    });
                    PUBLIC_SESSION = b
                    return b
                })();
            }
            browser = await publicSessionLock
        } else {
            browser = PUBLIC_SESSION
        }
        // --- 并发锁逻辑结束 ---
        public_browser = true

        try {

            page = await browser.newPage();

            // 在打开任何页面之前设置 UA
            await page.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
                'AppleWebKit/537.36 (KHTML, like Gecko) ' +
                'Chrome/121.0.0.0 Safari/537.36'
            );

            await page.authenticate({
                username: proxy_user,
                password: proxy_pass,
            }); // 正式验证代理用户名密码 :contentReference[oaicite:1]{index=1}

            //设置cookie
            if (opt && opt.cookie) {
                await browser.setCookie(...opt.cookie)
            }

            // 开启请求拦截
            await page.setRequestInterception(true);

            page.on('request', (request) => {
                const resourceType = request.resourceType();
                const url = request.url().toLowerCase();

                const blockedPatterns = [
                    'syndicatedsearch.goog',
                    'doubleclick.net',
                ];

                // 拦截图片、CSS、字体、媒体、favicon
                if (
                    blockedPatterns.some(pattern => url.includes(pattern)) ||
                    ['image', 'font', 'media'].includes(resourceType) ||
                    url.endsWith('.ico') ||              // favicon 文件
                    url.includes('favicon')              // 例如 /favicon.png 或 favicon.ico?ver=2
                ) {
                    request.abort();
                } else {
                    request.continue();
                }
            });

            const response = await page.goto("https://www.vakatrip.com/", {
                timeout: TIMEOUT,
                waitUntil: 'domcontentloaded',
            });

            // 检查 HTTP 状态码
            if (response.status() !== 200) {
                console.error(`Request failed with status code: ${response.status()}`);
                throw new Error(`HTTP request failed with status ${response.status()}`);
            }

                        // 等待 input 和 button 出现
  await page.waitForSelector('input.el-input__inner');
await page.type('input.el-input__inner', 'hkg'); // 输入出发地
await page.waitForSelector('div.el-scrollbar', { visible : true});

// Create downloads directory if it doesn't exist
            const downloadDir = path.join(__dirname, '../..', 'downloads');
            if (!fs.existsSync(downloadDir)) {
                fs.mkdirSync(downloadDir);
            }
 // Generate filename with timestamp
            const timestamp = new Date().getTime();
            const filepath = path.join(downloadDir, `screenshot_${timestamp}.png`);
            const filename = `screenshot_${timestamp}.png`

            await page.screenshot({
                    path: filepath,           // 保存路径
                    fullPage: true,           // 是否截取整个滚动区域
                });

            await page.close()

            return filepath
        } catch (error) {
            console.error('Error in chromium screen shot:', error);
            return null
        } finally {
            if(public_browser){
                // 强制再执行一次 page.close，不考虑报错
                try { await page.close(); } catch (e) {}
            }else{
                await browser.close()
            }
        }
    },
};
export { getQingGuoProxy, Webshare_PROXY_USER, Webshare_PROXY_PASS }
export default browserless;