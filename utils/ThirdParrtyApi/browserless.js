import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());
import os from 'os';
import { URL, fileURLToPath } from 'url';
import tool from '../tool.js';
import redis from '../redisClient.js';
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const TIMEOUT = 600000

const Webshare_PROXY_USER = "umwhniat-rotate"
const Webshare_PROXY_PASS = "eudczfs5mkzt"
const Webshare_PROXY_HOST = "p.webshare.io"
const Webshare_PROXY_PORT = "80"

// http://liyylnev-rotate:n8yufdsr2u5q@p.webshare.io:80

const qingguo_api_url = "https://share.proxy.qg.net/get?key=FC283878"
const qingguo_proxy_user = "FC283878"
const qingguo_proxy_pass = "6BDF595312DA"

var SESSION //长会话浏览器
var GOOGLE_SESSION //谷歌搜索长会话浏览器

var browser_map = {} //浏览器map

async function puppeteer_connect(chromium_endpoint, timeout, proxy){
    try {
        let b = await puppeteer.connect({
            browserWSEndpoint: `ws://${chromium_endpoint}/chromium?timeout=${timeout}&--proxy-server=${proxy}&--no-sandbox&--proxy-bypass-list=<-loopback>;localhost;127.0.0.1;172.17.0.1`,  // 替换为你的本地端口
            headless: 'new',  // 设置为 false 以便调试
            defaultViewport: { width: 1280, height: 800 },
            args: [
                `--proxy-server=${proxy}`,
                '--no-sandbox',
                '--proxy-bypass-list=<-loopback>;localhost;127.0.0.1;172.17.0.1'  // 移除 localhost 的跳过规则
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
    while (attempts < 5 && !success) {
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
    if (attempts === 3) {
        console.log("获取3次代理IP失败，退出浏览器")
        return null
    }
}

const browserless = {

    chromium_content: async function (url, opt = {}) {

        if(!tool.isValidUrl(url)){
            throw new Error("url链接不正确，请使用完整的链接")
        }
        let proxy_user, proxy_pass, chromium_endpoint, proxy
        let browser, page
        let public_browser//公共浏览器

        if (opt && opt.proxy && opt.proxy === "china") {
            chromium_endpoint = "1.15.114.179:8123";
            ({proxy,proxy_user,proxy_pass} = await getQingGuoProxy())
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
                browser = SESSION ? SESSION : await puppeteer_connect(chromium_endpoint, TIMEOUT, proxy)
                if (!SESSION) {
                    browser.on('disconnected', async () => {
                        console.warn('⚠️ Browser disconnected');
                        SESSION = null;  // 清理状态
                        // 这里可以触发重连逻辑
                    });
                    SESSION = browser
                }
                public_browser = true
            }

        }
    
        //设置cookie
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
                username: proxy_user,
                password: proxy_pass,
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

            const html = await page.content();

            await page.close()

            return {
                data: html
            }
        } catch (error) {
            console.error('Error in chromium_content:', error);
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

    google_search: async function (keyword) {
        await redis.incr("google_search_count")
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

        browser = GOOGLE_SESSION ? GOOGLE_SESSION : await puppeteer_connect(chromium_endpoint, TIMEOUT, proxy)
        if (!GOOGLE_SESSION) {
            browser.on('disconnected', async () => {
                console.warn('⚠️ Browser disconnected');
                GOOGLE_SESSION = null;  // 清理状态
                // 这里可以触发重连逻辑
            });
            GOOGLE_SESSION = browser
        }

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

            // 开启请求拦截
            await page.setRequestInterception(true);

            page.on('request', (request) => {
                const resourceType = request.resourceType();
                const url = request.url().toLowerCase();

                const blockedPatterns = [
                    'syndicatedsearch.goog',
                    'doubleclick.net',
                    'https://cse.google.com/adsense/search/async-ads.js'
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

            let totalBytes = 0;

            page.on('response', async (response) => {
                try {
                const buffer = await response.buffer();
                totalBytes += buffer.length;
                } catch (err) {
                // 某些响应可能没有主体（如 204/304），跳过即可
                }
            });

            const ces=`https://cse.google.com/cse?cx=93d449f1c4ff047bc#gsc.tab=0&gsc.q=${keyword}&gsc.sort=&gsc.page=1`
            const response = await page.goto(ces, {
                timeout: TIMEOUT,
            });

            // 检查 HTTP 状态码
            if (response.status() !== 200) {
                console.error(`Request failed with status code: ${response.status()}`);
                throw new Error(`HTTP request failed with status ${response.status()}`);
            }

            const html = await page.content();
              console.log(`💾 Total bandwidth: ${(totalBytes / 1024).toFixed(2)} KB`);
            await page.close()

            return html
        } catch (error) {
            console.error('Error in chromium Google Search API:', error);
            return null
        } finally {
            // 强制再执行一次 page.close，不考虑报错
                try { await page.close(); } catch (e) {}
        }
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

        browser = SESSION ? SESSION : await puppeteer_connect(chromium_endpoint, TIMEOUT, proxy)
        browser.on('disconnected', () => {
            console.warn('⚠️ Browser disconnected');
            SESSION = null;  // 清理状态
            // 这里可以触发重连逻辑
        });
        SESSION = browser
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

            const response = await page.goto(toolurl, {
                timeout: TIMEOUT,
                waitUntil: 'networkidle2',
            });

            // 检查 HTTP 状态码
            if (response.status() !== 200) {
                console.error(`Request failed with status code: ${response.status()}`);
                throw new Error(`HTTP request failed with status ${response.status()}`);
            }

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
                browser = SESSION ? SESSION : await puppeteer_connect(chromium_endpoint, TIMEOUT, proxy)
                if (!SESSION) {
                    browser.on('disconnected', async () => {
                        console.warn('⚠️ Browser disconnected');
                        SESSION = null;  // 清理状态
                        // 这里可以触发重连逻辑
                    });
                    SESSION = browser
                }
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

    weixin_search: async function (keyword,page) {
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

    
};
export { getQingGuoProxy, Webshare_PROXY_USER, Webshare_PROXY_PASS }
export default browserless;