import axios from 'axios';
import fs from 'fs';
import path from 'path';

var CHROME_URL= "http://172.245.84.92:8123"
  
const browserless = {
    /**
     * 语音转文字函数
     * @param {string|null} url - 音频文件URL
     * @returns {Promise<Object>} 返回转换结果
     */
    chromium_content: async function (url) {

        const proxy = 'http://p.webshare.io:80';
        const launch = {
        args: [
                `--proxy-server=${proxy}`,
                '--no-sandbox',
                '--proxy-bypass-list=<-loopback>'  // 移除 localhost 的跳过规则
            ],
            headless: true
        };

        const endpoint = `${CHROME_URL}/chromium/content`
        + `?timeout=180000`
        + `&launch=${encodeURIComponent(JSON.stringify(launch))}`;

        const response = await axios({
            method: 'POST',
            url: endpoint,  // Session 总超时设为 3 分钟
            headers: { 'Content-Type': 'application/json' },
            timeout: 180000,  // axios 客户端超时
            data: {
                url,
                gotoOptions: {
                // waitUntil: 'networkidle0',
                timeout: 180000  // page.goto 等待超时设为 3 分钟
                },
                 authenticate: {
                    username: 'umwhniat-rotate',
                    password: 'eudczfs5mkzt'
                }
            }
        });
        // console.log(response)
        return response

    }
};

export default browserless;