import axios from 'axios';
import fs from 'fs';
import { URL,fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path'
import { execFile } from 'child_process';
import { exec } from 'child_process';
import util from 'util';
import { response } from 'express';
import redis from './redisClient.js';
import crypto from 'crypto';
import whisperapi from './whisperapi.js';
import { JSDOM } from 'jsdom';
import { Throttle } from 'stream-throttle';
import { th_youtube } from './tikhub.io.js';
import browserless from './ThirdParrtyApi/browserless.js';
import filetool from './ThirdParrtyApi/filetool.js';
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Convert exec to Promise-based function
const execPromise = util.promisify(exec);

const tool = {
    request_chromium: async function (url, cookie, xpath, selector, waitUntil) {

        if(!this.isValidUrl(url)){
            throw new Error("url链接不正确，请使用正确的链接")
        }
        // 增加特殊域名列表，命中则走国内代理逻辑
        const chinaDomainList = [
            'tophub.today','qunar.com','zjedu.org','org.cn','news.cn','douyin.com','gz-cmc.com','10jqka.com.cn','sina.com.cn','gov.cn'
            // 可继续添加更多域名
        ];
        const urlObj = new URL(url);
        const isChinaDomain = chinaDomainList.some(domain => urlObj.hostname.endsWith(domain));
        console.log("当前访问的域名：", urlObj.hostname, "是否为国内域名：", isChinaDomain);
        if (!isChinaDomain) {
             try {
                let response = await browserless.chromium_content(url, {cookie:cookie, element_type: xpath ? 'xpath' : 'selector', element: xpath || selector, waitUntil:waitUntil || 'domcontentloaded'});
                return response.data;
             }catch(err){
                console.error("Browserless 请求失败：", err);
                return null;
             }
             
        }

        const options = {
            method: 'POST',
            url: 'http://1.15.114.179:3000/cn_explorer',
            headers: { 'content-type': 'application/json' },
            data: {
                url: url,
                xpath: xpath ? xpath : null,
                selector: selector ? selector : null,
                cookie: cookie ? cookie : null
            }
        };

        try {
            const { data } = await axios.request(options);
            return data.data
        } catch (error) {
            console.error(error);
            return null
        }
    },
    whoisinfo: function (domain) {
        const python = 'python';
        const script = path.join(__dirname, '../whoisinfo.py');

        execFile(python, [script, domain], (error, stdout, stderr) => {
            if (error) {
                // console.error(error);
            }

            const output = stdout.trim().split('\n');

            console.log('Whois Information:', output);
            return output[0]
        });
    },
    mix_videos: async function (videos) {
        try {
            const downloadDir = path.join(__dirname, '..', 'downloads');
            const timestamp = new Date().getTime();
            const txt_filename = `${timestamp}_filelist.txt`
            const txt_filepath = path.join(downloadDir, txt_filename);
            
            let fileListContent = '';

            for (let i = 0; i < videos.length; i++) {
                let video_name = path.basename(videos[i]);
                let video_path = path.join(downloadDir, video_name);
                if (!fs.existsSync(video_path)) {
                    throw new Error(`文件不存在: ${videos[i]}`);
                }

                // 注意：ffmpeg concat 格式中的路径要使用绝对路径并包裹在单引号中
                fileListContent += `file '${video_path}'\n`;
            }

            // 写入 txt 文件，设定编码为 utf8
            fs.writeFileSync(txt_filepath, fileListContent, { encoding: 'utf8' });

            console.log('生成的视频列表文件路径：', txt_filename);
            const out_video_name = `video_${timestamp}.mp4`
            const out_video_path = path.join(downloadDir, out_video_name);
            const command = `ffmpeg -f concat -safe 0 -i ${txt_filepath} -c copy -y ${out_video_path}`;
            const { stdout, stderr } = await execPromise(command)
            return out_video_name
        }catch(err){
            console.error(err)
            throw err
        }
        
    },
    mix_video_and_audio: async function(video_url, audio_url) {
        const downloadDir = path.join(__dirname, '..', 'downloads');
        const video = await this.download_video(video_url)
        const audio = await this.download_audio(audio_url)
        const timestamp = new Date().getTime();
        const output_video = `video_${timestamp}.mp4`;
        const output_path = path.join(downloadDir, output_video);
         // Construct ffmpeg command
            const command = `ffmpeg -i ${video.filepath} -i ${audio.filepath} -filter_complex "[1:a]apad=pad_dur=100000[aud]" -map 0:v:0 -map "[aud]" -c:v copy -c:a aac -shortest ${output_path}`
            
            // Execute ffmpeg command
            const { stdout, stderr } = await execPromise(command);
            
        return output_video
    },
    gen_cookie: async function (cookieStr, domain, path) {
        // 目标网站的域名和路径（需替换为实际值）
        // const domain = 'example.com'; // 请替换为目标网站的实际域名
        // const path = '/';

        // 解析 Cookie 字符串为 Puppeteer 可用的对象数组
        const cookies = cookieStr.split('; ').map(pair => {
            const [name, ...valueParts] = pair.split('=');
            const value = valueParts.join('='); // 处理值中包含等号的情况
            return { name, value, domain, path };
        });

        return cookies
    },
    /**
 * 判断输入是 CSS Selector 还是 XPath，或者都不是
 * @param {string} sel - 选择器字符串
 * @returns {'css'|'xpath'}
 * @throws {Error} - 输入无效时抛错
 */
 identifySelector: function (sel) {
     const s = sel.trim();
  const xpathStart = s.startsWith('//') || s.startsWith('(/') || s.startsWith('/html') || s.startsWith('/');
  const xpathSyntax = s.includes('@') || s.includes('::') || s.includes('[');
  if (xpathStart || xpathSyntax) return 'xpath';
  return 'css';
},
    // 计算距离今晚24点还有多少秒
    getSecondsToMidnight: function() {
        // 获取当前 UTC 时间，加 8 小时得到北京时间
        const now = new Date();
        const beijingNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);

        // 构造北京时间的明天零点
        const midnight = new Date(beijingNow);
        midnight.setHours(24, 0, 0, 0);

        // 计算北京时间剩余秒数
        const diffMs = midnight - beijingNow;
        return Math.floor(diffMs / 1000);
    },
    isValidUrl: function (url) {
        try {
            new URL(url);
            return true;
        } catch (e) {
            return false;
        }
    },
    download_image: async function (url) {
        try {
            // Create downloads directory if it doesn't exist
            const downloadDir = path.join(__dirname, '..', 'downloads');
            if (!fs.existsSync(downloadDir)) {
                fs.mkdirSync(downloadDir);
            }

            // Generate filename with timestamp
            const timestamp = new Date().getTime();
            const tempFile = path.join(downloadDir, `image_${timestamp}.tmp`);
            const finalFile = path.join(downloadDir, `image_${timestamp}.jpg`);

            // Download image 
            const response = await axios({
                method: 'get',
                url: url,
                responseType: 'stream',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            // Save to temp file
            const writer = fs.createWriteStream(tempFile);
            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', async () => {
                    try {
                        // Convert to jpg using ffmpeg
                        await execPromise(`ffmpeg -i ${tempFile} ${finalFile}`);
                        // Delete temp file
                        fs.unlinkSync(tempFile);
                        const stats = fs.statSync(finalFile);
                        resolve({
                            success: true,
                            filepath: finalFile,
                            filename: path.basename(finalFile),
                            size: stats.size
                        });
                    } catch (err) {
                        reject(err);
                    }
                });
                writer.on('error', reject);
            });

        } catch (error) {
            console.error('Error downloading image:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    yt_dlp_audio: async function (url) {    
        try {
            let audio_url = await browserless.extract_youtube_audio_url("https://tuberipper.com/",url)
            let audio = await tool.download_audio(audio_url)
            return {
                success: true,
                filepath: audio.filepath,
                filename: audio.filename,
                is_audio: true,
            };
        } catch (error) {
            return {
                success: false, 
                error: error.message
            };
        }
    },
    getExtensionFromCodec: function(codec) {
        const codecToExt = {
            // 音频编码
            'mp3': 'mp3',
            'aac': 'm4a',
            'wav': 'wav',
            'vorbis': 'ogg',
            'opus': 'opus',
            'flac': 'flac',
            'pcm_s16le': 'wav',    // PCM 编解码器
            'alaw': 'wav',         // A-law 编解码器
            'mulaw': 'wav',        // μ-law 编解码器
            'speex': 'spx',        // Speex 编解码器
            'ac3': 'ac3',          // AC3 编解码器
            'eac3': 'eac3',        // EAC3 编解码器
            'dts': 'dts',          // DTS 编解码器
            'truehd': 'truehd',    // TrueHD 编解码器
            'midi': 'midi',        // MIDI 编解码器

            // 视频编码
            'h264': 'mp4',         // H.264 编解码器
            'hevc': 'mp4',         // HEVC (H.265) 编解码器
            'vp8': 'webm',         // VP8 编解码器
            'vp9': 'webm',         // VP9 编解码器
            'av1': 'mp4',          // AV1 编解码器
            'mpeg4': 'mp4',        // MPEG4 编解码器
            'theora': 'ogg',       // Theora 编解码器
            'divx': 'avi',         // DivX 编解码器
            'xvid': 'avi',         // Xvid 编解码器
            'prores': 'mov',       // Apple ProRes 编解码器
            'dnxhd': 'mov',        // Avid DNxHD 编解码器
            'jpeg2000': 'mov',     // JPEG 2000 编解码器
            'flv': 'flv',          // FLV 编解码器
            'wmv1': 'wmv',         // Windows Media Video 1
            'wmv2': 'wmv',         // Windows Media Video 2
            'vp6': 'flv',          // VP6 编解码器
            'vp7': 'flv',          // VP7 编解码器
            'mjpeg': 'avi',        // Motion JPEG 编解码器

            // 容器格式
            'matroska': 'mkv',     // Matroska 容器
            'mov': 'mov',          // QuickTime 容器
            'avi': 'avi',          // AVI 容器
            'flv': 'flv',          // FLV 容器
            'webm': 'webm',        // WebM 容器
            'mp4': 'mp4',          // MP4 容器
            'ogg': 'ogg',          // Ogg 容器
            'm3u8': 'm3u8',        // HLS 流媒体容器
            'ts': 'ts',            // MPEG-TS 容器
            '3gp': '3gp',          // 3GP 容器
            '3g2': '3g2',          // 3G2 容器
            'avi': 'avi'           // AVI 容器
        };

        return codecToExt[codec] || 'mp4';
    },
    get_media_info: async function (file) {
        var command = ""
        if (process.env.NODE_ENV === 'online'){
             command = `ffprobe -v quiet -print_format json -show_format -show_streams "${file}"`;
        }else{
             command = `ffmpeg.ffprobe -v quiet -print_format json -show_format -show_streams "${file}"`;
        }

        try {
            // Execute ffmpeg command
            const { stdout, stderr } = await execPromise(command);

            const info = JSON.parse(stdout);
            // Get file type info
            const stream = info.streams[0];
            const format = info.format;
            return {
                success: true,
                type: stream.codec_type, // 'audio' or 'video'
                codec: stream.codec_name,
                format: format.format_name,
                extension: this.getExtensionFromCodec(stream.codec_name)
            };
        } catch (error) {
            console.log(error)
            return {success:false, error: error.message};
        }
    },
    format_SRT_timestamp: function(seconds){
        const date = new Date(seconds * 1000);
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        const secs = String(date.getUTCSeconds()).padStart(2, '0');
        const millis = String(date.getUTCMilliseconds()).padStart(3, '0');
        return `${hours}:${minutes}:${secs},${millis}`;
    },
      /**
     * 用于将字符串转换为数字位索引
     * @param {string} str - 需要转换的秒数
     * @returns {string} 格式化后的时间字符串
     */
    hashCode: function(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const chr = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0; // 转为32位整数
        }
        return Math.abs(hash);
    },
    /**
     * 将秒数转换为时分秒格式
     * @param {number} seconds - 需要转换的秒数
     * @returns {string} 格式化后的时间字符串
     */
    formatDuration: function(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        let result = '';
        
        if (hours > 0) {
            result += `${hours}时`;
        }
        if (minutes > 0) {
            result += `${minutes}分`;
        }
        if (secs > 0 || result === '') {
            result += `${secs}秒`;
        }
        
        return result;
    },
    getMediaDuration: async function(file){
        var command = ""
        if (process.env.NODE_ENV === 'online'){
             command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${file}`;
        }else{
             command = `ffmpeg.ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${file}`;
        }
        
        try {
            // Execute ffmpeg command
            const { stdout, stderr } = await execPromise(command);
            console.log("stdout",stdout)
            console.log("stderr",stderr)
            return {success:true,duration:parseFloat(stdout.trim())};
        } catch (error) {
            return {success:false, error: error.message};
        }
    },
    /**
     * @param {string} text - 需要计算 MD5 的文本
     */
    md5: function(text) {
        return crypto.createHash('md5').update(text).digest('hex');
    },
    // Add helper function to convert bytes to MB
    bytesToMB: function(bytes) {
        return (bytes / (1024 * 1024)).toFixed(2);
    },
    download_video: async function (url,sourceUrl) {
        console.log(`Video Direct Link：${url} `)
        console.log(`Video Source Url：${sourceUrl} `)
        const downloadDir = path.join(__dirname, '..', 'downloads');
        if (!fs.existsSync(downloadDir)) {
            fs.mkdirSync(downloadDir);
        }

        // Generate filename with timestamp and extension
        const timestamp = new Date().getTime();
        const extension = 'mp4';
        var filename = `video_${timestamp}.${extension}`;
        var filepath = path.join(downloadDir, filename);
        
        try {
            // Download video with progress tracking
            const rateLimit = 100 * (1024 * 1024); // 0.5MB/s limit
            let response
            if (sourceUrl && (sourceUrl.includes('youtube.com') || sourceUrl.includes('youtu.be'))) {
                let xxx = await tool.yt_dlp_audio(sourceUrl)
                console.log("yt-dlp 返回：", xxx)
                if (!xxx.success) {
                    console.error("yt-dlp 错误：", xxx.error, "下载youtube失败，重试 第1次 。。。")
                    xxx = await tool.yt_dlp_audio(sourceUrl)
                    if (!xxx.success) {
                        console.error("yt-dlp 错误：", xxx.error, "下载youtube失败，重试 第2次 。。。")
                        xxx = await tool.yt_dlp_audio(sourceUrl)
                        if (!xxx.success) {
                            console.error("yt-dlp 错误：", xxx.error, "下载youtube失败，重试 第3次 。。。")
                            xxx = await tool.yt_dlp_audio(sourceUrl)
                            if (!xxx.success) {
                                throw new Error(xxx.error);
                            }
                        }
                    }
                }
                
                return xxx
            } else {
                response = await axios({
                    method: 'get',
                    url: url,
                    responseType: 'stream',
                    headers: {
                        'Accept': '*/*',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Edg/136.0.0.0'
                    },
                    timeout: 600000,
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity,
                });
            }
            if (!filetool.is_video(response.headers['content-type'])) {
                throw new Error('视频链接无效！请查看视频教程：【https://www.bilibili.com/video/BV169TizqE58】');
            }
            
            const totalSize = parseInt(response.headers['content-length'], 10);
            let downloadedSize = 0;
            let lastTime = Date.now();
            let bytesThisSecond = 0;

            const writer = fs.createWriteStream(filepath);
            const throttle = new Throttle({ rate: rateLimit });

            // 监听 throttled 数据流
            // throttle.on('data', (chunk) => {
            //     downloadedSize += chunk.length;
            //     bytesThisSecond += chunk.length;

            //     const now = Date.now();
            //     const timeDiff = now - lastTime;

            //     if (timeDiff >= 1000) {
            //         const speed = bytesThisSecond / (timeDiff / 1000);
            //         const progress = (downloadedSize / totalSize) * 100;
            //         console.log(`Download progress: ${progress.toFixed(2)}%, Speed: ${(speed / 1024 / 1024).toFixed(2)} MB/s`);

            //         bytesThisSecond = 0;
            //         lastTime = now;
            //     }
            // });

            // 替换 pipe 流为带节流的流
            response.data.pipe(throttle).pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    console.log(`视频下载成功，视频大小：${this.bytesToMB(totalSize)}MB`)
                     this.get_media_info(filepath)
                        .then(info => {
                            if (!info.success) {
                                return reject(new Error(info.error));
                            }
                            if (info.success) {
                                const newPath = filepath.replace(/\.[^.]+$/, `.${info.extension}`);
                                fs.renameSync(filepath, newPath);
                                filepath = newPath;
                                filename = path.basename(filepath);
                                console.log(`视频转换成功，新的文件名：${filename}`);
                            }

                            resolve({
                                success: true,
                                filepath: filepath,
                                filename: filename,
                                size: this.bytesToMB(totalSize)
                            });
                        })
                        .catch(error => reject(error));
                    });

                writer.on('error', reject);
            });

        } catch (error) {
            console.error('Error downloading video:', error, " video url:", url);
            return {
                success: false,
                error: error.message
            };
        }
    },
    isLocalFile: async function (url) {
        const downloadDir = path.join(__dirname, '..', 'downloads');
        if (!fs.existsSync(downloadDir)) {
            fs.mkdirSync(downloadDir);
        }

        if (url.includes('devtool.uk')){
            let filename = path.basename(url);
            // 获取文件名后缀
            let ext = path.extname(filename);
            let filepath = path.join(downloadDir, filename);
            if (fs.existsSync(filepath)) {

                return {
                    isLocalFile: true,
                    filepath: filepath,
                    filename: filename,
                    is_video: ext === '.mp4' || ext === '.webm' || ext === '.mov' || ext === '.avi',
                    is_audio: ext === '.mp3' || ext === '.wav' || ext === '.aac' || ext === '.ogg',
                }
            }
        }

        return {
            isLocalFile: false,
        }
    },
    //通用下载文件
    download_file: async function (url) {
        const downloadDir = path.join(__dirname, '..', 'downloads');
        if (!fs.existsSync(downloadDir)) {
            fs.mkdirSync(downloadDir);
        }
        
        const isf = await this.isLocalFile(url)
        if (isf.isLocalFile) return {
            success: true,
            ...isf
        }


        // Generate filename with timestamp and extension
        const timestamp = new Date().getTime();
        var filename = `file_${timestamp}`;
        var filepath = path.join(downloadDir, filename);
        
        try {
            // Download video with progress tracking
            const rateLimit = 100 * (1024 * 1024); // 0.5MB/s limit
            let response = await axios({
                method: 'get',
                url: url,
                responseType: 'stream',
                headers: {
                    'Accept': '*/*',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Edg/136.0.0.0'
                },
                timeout: 600000,
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
            });
            
            const totalSize = parseInt(response.headers['content-length'], 10);
            let downloadedSize = 0;
            let lastTime = Date.now();
            let bytesThisSecond = 0;

            const writer = fs.createWriteStream(filepath);
            const throttle = new Throttle({ rate: rateLimit });

            // 监听 throttled 数据流
            // throttle.on('data', (chunk) => {
            //     downloadedSize += chunk.length;
            //     bytesThisSecond += chunk.length;

            //     const now = Date.now();
            //     const timeDiff = now - lastTime;

            //     if (timeDiff >= 1000) {
            //         const speed = bytesThisSecond / (timeDiff / 1000);
            //         const progress = (downloadedSize / totalSize) * 100;
            //         console.log(`Download progress: ${progress.toFixed(2)}%, Speed: ${(speed / 1024 / 1024).toFixed(2)} MB/s`);

            //         bytesThisSecond = 0;
            //         lastTime = now;
            //     }
            // });

            // 替换 pipe 流为带节流的流
            response.data.pipe(throttle).pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    console.log(`文件下载成功，文件大小：${this.bytesToMB(totalSize)}MB`)
                     this.get_media_info(filepath)
                        .then(info => {
                            if (!info.success) {
                                return reject(new Error(info.error));
                            }
                            if (info.success) {
                                const newPath = filepath + `.${info.extension}`;
                                fs.renameSync(filepath, newPath);
                                filepath = newPath;
                                filename = path.basename(filepath);
                                console.log(`文件保存成功，新的文件名：${filename}`);
                            }

                            resolve({
                                success: true,
                                filepath: filepath,
                                filename: filename,
                                size: this.bytesToMB(totalSize),
                                is_video: info.type === 'video',
                                is_audio: info.type === 'audio',
                            });
                        })
                        .catch(error => reject(error));
                    });

                writer.on('error', reject);
            });

        } catch (error) {
            console.error('Error downloading file:', error, " file url:", url);
            return {
                success: false,
                error: error.message
            };
        }
    },
    download_audio: async function (audio_url) {

        const downloadDir = path.join(__dirname, '..', 'downloads');
        if (!fs.existsSync(downloadDir)) {
            fs.mkdirSync(downloadDir);
        }

        // Generate filename with timestamp and extension
        const timestamp = new Date().getTime();
        const extension = 'mp3'
        var filename = `audio_${timestamp}.${extension}`;
        var filepath = path.join(downloadDir, filename);

        try {
            // Download video with progress tracking
            const response = await axios({
                method: 'get',
                url: audio_url,
                responseType: 'stream', 
                headers: {
                    'Accept': '*/*',
                    'sec-ch-ua': '"Chromium";v="137", "Not/A)Brand";v="24", "Google Chrome";v="137"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Windows"',
                    'sec-fetch-dest': 'document',
                    'sec-fetch-mode': 'navigate', 
                    'sec-fetch-site': 'none',
                    'sec-fetch-user': '?1',
                    'upgrade-insecure-requests': '1',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
                },
                timeout: 600000,
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
            });

            console.log(`开始下载音频：${audio_url}`)
            console.log(`状态码：${response.status}`)

            if (!filetool.is_audio(response.headers['content-type'])) {
                throw new Error('音频链接无效！');
            }

            // Get total size
            const totalSize = parseInt(response.headers['content-length'], 10);
            let downloadedSize = 0;

            // Create write stream
            const writer = fs.createWriteStream(filepath);

            // Pipe the response to the file while tracking progress
            response.data.on('data', (chunk) => {
                downloadedSize += chunk.length;
                const progress = (downloadedSize / totalSize) * 100;
                // console.log(`Download progress: ${progress.toFixed(2)}%`);
            });

            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => {

                 this.get_media_info(filepath)
                        .then(info => {
                            if (!info.success) {
                                return reject(new Error(info.error));
                            }
                            if (info.success) {
                                const newPath = filepath.replace(/\.[^.]+$/, `.${info.extension}`);
                                fs.renameSync(filepath, newPath);
                                filepath = newPath;
                                filename = path.basename(filepath);
                                console.log(`音频转换成功，新的文件名：${filename}`,newPath,info);
                            }

                            resolve({
                                success: true,
                                filepath: filepath,
                                filename: filename,
                                size: this.bytesToMB(totalSize)
                            });
                        })
                        .catch(error => reject(error));
                    });

                writer.on('error', reject);
            });

        } catch (error) {
            console.error('Error downloading audio:', error);
            // 如果下载失败，删除临时文件
            fs.unlink(filepath, (err) => {
                if (err) console.error('Error deleting audio file:', err);
            });
            return {
                success: false,
                error: error.message
            };
        }
    },
    video_to_audio: async function (video) {
        try {
            // Get the directory and original filen ame
            const dir = path.dirname(video);
            const originalFilename = path.basename(video);
            const extension = path.extname(video);
            
            // Replace 'video' with 'audio' in filename and change extension to .wav
            const outputFile = path.join(dir, originalFilename.replace('video', 'audio').replace(extension, '.mp3'));

            // Construct ffmpeg command
            const command = `ffmpeg -i ${video} -vn -ac 1 -ar 16000 -q:a 2 -y ${outputFile}`
            
            // Execute ffmpeg command
            const { stdout, stderr } = await execPromise(command);
            
            if (stderr && !fs.existsSync(outputFile)) {
                throw new Error('Audio conversion failed: ' + stderr);
            }
            // 成功后删除视频文件
            fs.unlink(video, (err) => {
                if (err) console.error('Error deleting video file:', err);
            });

            return {
                success: true,
                inputFile: video,
                outputFile: outputFile,
                stdout: stdout,
                stderr: stderr
            };

        } catch (error) {
            console.error('Error converting video to audio:', error.message, "\n 视频URL：", video);
            // 如果转换失败，删除视频文件
            fs.unlink(video, (err) => {
                if (err) console.error('Error deleting video file:', err);
            });
            return {
                success: false,
                error: error.message
            };
        }
    },
    remove_query_param: function (url) {
        const urlObj = new URL(url);
        return urlObj.origin + urlObj.pathname;
    },
    extract_url: function (text) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const matches = text.match(urlRegex);
        return matches ? matches[0] : null;
    },
    url_preprocess: async function (url) {
        try {
            const urlObj = new URL(url);
            // 检查域名是否为 bilibili.com
            if (!urlObj.hostname.endsWith('bilibili.com')) {
                return url;
            }

            // 检查是否匹配 /video/av{数字} 格式
            const avPattern = /^\/video\/av\d+\/?$/;
            if(avPattern.test(urlObj.pathname)){
                const response = await axios.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Edg/136.0.0.0'
                    },
                    // proxy: {
                    //     host: 'p.webshare.io',
                    //     port: 80,
                    //     auth: {
                    //         username: 'umwhniat-rotate',
                    //         password: 'eudczfs5mkzt'
                    //     },
                    //     protocol: 'http'
                    // }
                });
                if (response.status !== 200) {
                    throw new Error(`查询BV链接失败，HTTP error! status: ${response.status}`);
                }
                const htmlContent = response.data;
                const dom = new JSDOM(htmlContent);
                const { document, window } = dom.window;
                // Find meta tag with property="og:url"
                const metaTag = document.querySelector('meta[property="og:url"]');
                if (metaTag) {
                    const realUrl = metaTag.getAttribute('content');
                    console.log("真实BV链接：", realUrl)
                    return realUrl;
                }else{
                    console.log("没有找到meta标签：", htmlContent)
                    return url;
                }
            }

            // 如果不是 av 号或处理失败，直接返回原始 URL
            return url;

        } catch (error) {
            console.error('Error in url_preprocess:', error);
            // URL 解析失败
            return url;
        }       
    },
    get_video_url: async function (input_text) {
        try{
            var data = ""
            const key = this.md5(input_text)
            const value = await redis.get(key)

            if (value === null){

                if (input_text.includes('youtube.com') || input_text.includes('youtu.be')) {
                    let audio_url = await browserless.extract_youtube_audio_url("https://tuberipper.com/",input_text)

                    data = {
                        // title: response.title,
                        audio_url: audio_url,
                        video_url: audio_url
                    };
                        
                    // await redis.set(key, JSON.stringify(data), 'NX', 'EX', 3600 * 1);
                   
                }else{
                    
                    // 如果是其他视频链接，使用下载工具 API 获取视频信息
                    const response = await axios.post(
                        'https://api.xiazaitool.com/api/parseVideoUrl',
                        {
                            url:input_text,
                            token:'ca30558557e04da5ad5157f67bf1e10d'
                        }
                    );
                    console.log("下载狗查询：", JSON.stringify(response.data))
                    if(response.data.success){
                        data = {
                            title: response.data.data.title,
                            video_url: response.data.data.videoUrls,
                        };
                        await redis.set(key, JSON.stringify(data), 'NX', 'EX', 3600 * 1);
                    }else{
                        return {
                            success:false,
                            data: response.data.message
                        }
                    }
                }

            }else{
                data = JSON.parse(value)
                // console.log("缓存：", data)
            }

            return {
                success:true,
                data: data
            }
        }catch(error){
            console.log("出现错误：", error)
            return {
                success:false,
                data: error.message
            }
        }
    },
    /**
     * 更新语音转录的使用限制
     * @param string api_key 付费用户密钥
     * @param string free_key 免费用户密钥
     * @param number left_time 剩余解析时长
     */
    update_asr_key: async function (api_key, free_key, left_time) {
        if (free_key) {
            await redis.set(free_key, left_time);
        }
    },
    /**
     * 
     * @param {string} input_file 源文件
     * @param {string} output_type 目标类型
     * @returns 
     */
    audio_format_convert: async function (input_file, output_type) {
        const output_file = `${input_file}.${output_type}`
        const command = `ffmpeg -i ${input_file} ${output_file}`;

        try {
            // Execute ffmpeg command
            const { stdout, stderr } = await execPromise(command);
            fs.unlink(input_file,(err) => {
                if (err) throw err
            });
            return {success:true,filepath:output_file};
        } catch (error) {
             fs.unlink(input_file,(err) => {
                if (err) throw err
            });
             fs.unlink(output_file,(err) => {
                if (err) throw err
            });
            return {success:false, error: error.message};
        }
    }
    
};

export default tool;