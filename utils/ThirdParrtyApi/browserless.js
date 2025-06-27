import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import puppeteer from 'puppeteer-core';
import os from 'os';
import { URL, fileURLToPath } from 'url';
import tool from '../tool.js';
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

function getCpuUsage() {
    const cpus = os.cpus();
    let idle = 0;
    let total = 0;

    cpus.forEach(cpu => {
        for (let type in cpu.times) {
            total += cpu.times[type];
        }
        idle += cpu.times.idle;
    });

    const idlePercentage = (idle / total) * 100;
    return Math.floor(100 - idlePercentage) // 返回 CPU 使用率
}

async function waitUntilDownload(page, fileName = '') {
      return new Promise((resolve, reject) => {
          page._client().on('Page.downloadProgress', e => { // or 'Browser.downloadProgress'
              if (e.state === 'completed') {
                  resolve(fileName);
              } else if (e.state === 'canceled') {
                  reject();
              }
          });
      });
  }

const browserless = {

    chromium_content: async function (url, opt = {}) {


        let proxy_user, proxy_pass, chromium_endpoint, proxy

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
                console.log("获取3次代理IP失败，推出浏览器")
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

        const browser = await puppeteer.connect({
            browserWSEndpoint: `ws://${chromium_endpoint}/chromium?timeout=${TIMEOUT}&--proxy-server=${proxy}&--no-sandbox&--proxy-bypass-list=<-loopback>;localhost;127.0.0.1;172.17.0.1`,  // 替换为你的本地端口
            args: [
                `--proxy-server=${proxy}`,
                '--no-sandbox',
                '--proxy-bypass-list=<-loopback>;localhost;127.0.0.1;172.17.0.1'  // 移除 localhost 的跳过规则
            ],
            headless: false,  // 设置为 false 以便调试
        });

        try {

            const page = await browser.newPage();

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
            return {
                data: html
            }
        } catch (error) {
            console.error('Error in chromium_content:', error);
            return null
        } finally {
            await browser.close();
        }

    },

    extract_youtube_audio_url: async function (toolurl,videourl, opt = {}) {

        let proxy_user, proxy_pass, chromium_endpoint, proxy

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
                console.log("获取3次代理IP失败，推出浏览器")
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

        const browser = await puppeteer.connect({
            browserWSEndpoint: `ws://${chromium_endpoint}/chromium?timeout=${TIMEOUT}&--proxy-server=${proxy}&--no-sandbox&--proxy-bypass-list=<-loopback>;localhost;127.0.0.1;172.17.0.1`,  // 替换为你的本地端口
            args: [
                `--proxy-server=${proxy}`,
                '--no-sandbox',
                '--proxy-bypass-list=<-loopback>;localhost;127.0.0.1;172.17.0.1'  // 移除 localhost 的跳过规则
            ],
            headless: false,  // 设置为 false 以便调试
            defaultViewport: { width: 1280, height: 800 }
        });

        try {

            const page = await browser.newPage();

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
            

            return audio_url
        } catch (error) {
            console.error('Error in chromium screen shot:', error);
            return null
        } finally {
            await browser.close();
        }
    },

    screenshot: async function (url, opt = {}) {

        let proxy_user, proxy_pass, chromium_endpoint, proxy

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

        const browser = await puppeteer.connect({
            browserWSEndpoint: `ws://${chromium_endpoint}/chromium?timeout=${TIMEOUT}&--proxy-server=${proxy}&--no-sandbox&--proxy-bypass-list=<-loopback>;localhost;127.0.0.1;172.17.0.1`,  // 替换为你的本地端口
            args: [
                `--proxy-server=${proxy}`,
                '',
                '--proxy-bypass-list=<-loopback>;localhost;127.0.0.1;172.17.0.1'  // 移除 localhost 的跳过规则
            ],
            headless: false,  // 设置为 false 以便调试
            defaultViewport: { width: 1280, height: 800 }
        });

        try {

            const page = await browser.newPage();

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

            //设置cookie
            if (opt && opt.cookie) {
                await browser.setCookie(...opt.cookie)
            }

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

            return filename
        } catch (error) {
            console.error('Error in chromium screen shot:', error);
            return null
        } finally {
            await browser.close();
        }
    }
};

export default browserless;