import axios from 'axios';
import fs from 'fs';
import path from 'path';

var proxy = 'http://p.webshare.io:80';
var CHROME_URL= "http://172.245.84.92:8123"
if (process.env.NODE_ENV === 'online') {
     CHROME_URL= "http://172.17.0.1:8123"
}
var PROXY_USER = "umwhniat-rotate"
var PROXY_PASS = "eudczfs5mkzt"

  
const browserless = {

    chromium_content: async function (url,params = {}) {

        if (params.proxy && params.proxy === "china") {
            let attempts = 0;
            let success = false;
            while (attempts < 3 && !success) {
                try {
                    const res = await axios.get('https://share.proxy.qg.net/get?key=FC283878');
                    console.log("使用青果代理：", res.data)
                    if (res.data && res.data.code === 'SUCCESS' && res.data.data && res.data.data.length > 0) {
                        proxy = 'http://' + res.data.data[0].server;
                        CHROME_URL = "http://1.15.114.179:8123"
                        PROXY_USER = "FC283878"
                        PROXY_PASS = "6BDF595312DA"
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

        }
        
        const launch = {
        args: [
                `--proxy-server=${proxy}`,
                '--no-sandbox',
                '--proxy-bypass-list=<-loopback>;localhost;127.0.0.1;172.17.0.1'  // 移除 localhost 的跳过规则

            ],
            headless: false,  // 设置为 false 以便调试
        };

        const endpoint = `${CHROME_URL}/chromium/content`
        + `?timeout=180000`
        + `&launch=${encodeURIComponent(JSON.stringify(launch))}`;

        console.log({
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
            })
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

    }
};

export default browserless;