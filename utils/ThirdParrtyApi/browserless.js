import axios from 'axios';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import os from 'os';


var CHROME_URL= "http://172.245.84.92:8123"
var CHROME_ENDPOINT = "172.245.84.92:8123"
if (process.env.NODE_ENV === 'online') {
    CHROME_URL= "http://172.17.0.1:8123"
    CHROME_ENDPOINT = "172.17.0.1:8123"
}
var PROXY_USER = "umwhniat-rotate"
var PROXY_PASS = "eudczfs5mkzt"
var PROXY_HOST = "p.webshare.io"
var PROXY_PORT = "80"
var proxy = 'http://' + `${PROXY_HOST}:${PROXY_PORT}`

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
  
const browserless = {

    chromium_content: async function (url,opt = {}) {
        console.log("chromium_content参数",url, opt)

        // 轮询判断 CPU 使用率小于 80 才放行
        while (getCpuUsage() >= 80) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        if (opt && opt.proxy && opt.proxy === "china") {
            let attempts = 0;
            let success = false;
            while (attempts < 3 && !success) {
                try {
                    const res = await axios.get('https://share.proxy.qg.net/get?key=FC283878');
                    console.log("使用青果代理：", res.data)
                    if (res.data && res.data.code === 'SUCCESS' && res.data.data && res.data.data.length > 0) {
                        CHROME_ENDPOINT = "1.15.114.179:8123"
                        CHROME_URL = "http://1.15.114.179:8123"
                        PROXY_USER = "FC283878"
                        PROXY_PASS = "6BDF595312DA"
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

        }else{
            if (process.env.NODE_ENV === 'online') {
                CHROME_ENDPOINT = "172.17.0.1:8123"
            }
            PROXY_USER = "umwhniat-rotate"
            PROXY_PASS = "eudczfs5mkzt"
            PROXY_HOST = "p.webshare.io"
            PROXY_PORT = "80"
            proxy = 'http://' + `${PROXY_HOST}:${PROXY_PORT}`
        }
        

        console.log({
            browserWSEndpoint: `ws://${CHROME_ENDPOINT}/chromium/content?timeout=180000`,  // 替换为你的本地端口
            args: [
                `--proxy-server=${proxy}`,
                '--no-sandbox',
                '--proxy-bypass-list=<-loopback>;localhost;127.0.0.1;172.17.0.1'  // 移除 localhost 的跳过规则
            ],
            headless: true,  // 设置为 false 以便调试
        })
        const browser = await puppeteer.connect({
            browserWSEndpoint: `ws://${CHROME_ENDPOINT}/chromium?timeout=180000`,  // 替换为你的本地端口
            args: [
                `--proxy-server=${proxy}`,
                '--no-sandbox',
                '--proxy-bypass-list=<-loopback>;localhost;127.0.0.1;172.17.0.1'  // 移除 localhost 的跳过规则
            ],
            headless: false,  // 设置为 false 以便调试
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
                username: PROXY_USER,
                password: PROXY_PASS,
            }); // 正式验证代理用户名密码 :contentReference[oaicite:1]{index=1}

            await page.goto(url, {
                timeout: 180000,
                // waitUntil: 'networkidle2',
            });

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
        
        try {
            const response = await axios({
                method: 'POST',
                url: endpoint,  // Session 总超时设为 3 分钟
                headers: {
                    'sec-ch-ua': '"Microsoft Edge";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Windows"',
                    'sec-fetch-dest': 'document',
                    'sec-fetch-mode': 'navigate',
                    'sec-fetch-site': 'same-origin',
                    'sec-fetch-user': '?1',
                    'upgrade-insecure-requests': '1',
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 Edg/137.0.0.0'
                },
                timeout: 180000,  // axios 客户端超时
                data: {
                    url,
                    gotoOptions: {
                    // waitUntil: 'networkidle0',
                    timeout: 180000  // page.goto 等待超时设为 3 分钟
                    },
                    authenticate: {
                        username: PROXY_USER,
                        password: PROXY_PASS
                    },
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
                }
            });
            // console.log(response.data)
            return response
        } catch (error) {
            console.error('Error in chromium_content:', error);
            return null
        }

    },

    openWithPorxy: async function(url) {
                    // Browserless 的 websocket endpoint
            const browser = await puppeteer.connect({
                browserWSEndpoint: `ws://${PROXY_HOST}:8123?timeout=120000`,  // 替换为你的本地端口
                args: [
                    `--proxy-server=${proxy}`,
                    '--no-sandbox',
                    '--proxy-bypass-list=<-loopback>;localhost;127.0.0.1;172.17.0.1'  // 移除 localhost 的跳过规则
                ],
                headless: false,  // 设置为 false 以便调试
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
                username: PROXY_USER,
                password: PROXY_PASS,
            }); // 正式验证代理用户名密码 :contentReference[oaicite:1]{index=1}

            await page.goto(url, {
                timeout: 180000,
                waitUntil: 'networkidle2',
            });

            const html = await page.content();
            return html
        } finally {
            await browser.close();
        }
    }
};

export default browserless;