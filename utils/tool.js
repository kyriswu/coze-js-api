const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const { response } = require('express');
const redis = require('./redisClient');
const crypto = require('crypto');
const whisperapi = require('./whisperapi');
const { JSDOM } = require('jsdom');
const { Throttle } = require('stream-throttle');

// Convert exec to Promise-based function
const execPromise = util.promisify(exec);

const tool = {
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
    download_video: async function (url) {
        try {
            // First check if it's a video
            const videoCheck = await this.is_video(url);
            if (!videoCheck.is_video) {
                throw new Error('视频链接无效');
            }

            // Create downloads directory if it doesn't exist
            const downloadDir = path.join(__dirname, '..', 'downloads');
            if (!fs.existsSync(downloadDir)) {
                fs.mkdirSync(downloadDir);
            }

            // Generate filename with timestamp and extension
            const timestamp = new Date().getTime();
            const extension = videoCheck.extension;
            const filename = `video_${timestamp}.${extension}`;
            const filepath = path.join(downloadDir, filename);

            // Download video with progress tracking
            const rateLimit = 100 * (1024 * 1024); // 0.5MB/s limit
            const response = await axios({
                method: 'get',
                url: url,
                responseType: 'stream',
                headers: {
                    'Accept': '*/*',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Edg/136.0.0.0'
                },
                timeout: 30000,
                maxContentLength: Infinity,
                maxBodyLength: Infinity
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
                    console.log(`视频下载成功，视频大小：${this.bytesToMB(totalSize)}MB`)
                    resolve({
                        success: true,
                        filepath: filepath,
                        filename: filename,
                        size: this.bytesToMB(totalSize)
                    });
                });

                writer.on('error', reject);
            });

        } catch (error) {
            console.error('Error downloading video:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    download_audio: async function (audio_url) {
        try {
            const audioCheck = await this.is_audio(audio_url);
            if (!audioCheck.is_audio) {
                throw new Error('音频链接无效');
            }

            // Create downloads directory if it doesn't exist
            const downloadDir = path.join(__dirname, '..', 'downloads');
            if (!fs.existsSync(downloadDir)) {
                fs.mkdirSync(downloadDir);
            }

            // Generate filename with timestamp and extension
            const timestamp = new Date().getTime();
            const extension = audioCheck.extension
            const filename = `audio_${timestamp}.${extension}`;
            const filepath = path.join(downloadDir, filename);

            // Download video with progress tracking
            const response = await axios({
                method: 'get',
                url: audio_url,
                responseType: 'stream',
                headers: {
                    'Accept': '*/*',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Edg/136.0.0.0'
                }
            });

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
                    resolve({
                        success: true,
                        filepath: filepath,
                        filename: filename,
                        size: this.bytesToMB(totalSize)
                    });
                });

                writer.on('error', reject);
            });

        } catch (error) {
            console.error('Error downloading audio:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    },
    is_video: async function (url) {
        try {
            const response = await axios.head(url);
            const contentType = response.headers['content-type'];

            const contentLength = parseInt(response.headers['content-length'], 10)
            console.log(contentType)
            // MIME类型到文件扩展名的映射
            const mimeToExtension = {
                'video/mp4': 'mp4',
                'video/mpeg': 'mpeg',
                'video/quicktime': 'mov',
                'video/webm': 'webm',
            };
            
            // 查找匹配的视频类型
            const matchedType = Object.keys(mimeToExtension).find(type => 
                contentType.toLowerCase().includes(type)
            );
            console.log("matchedType:",!!matchedType)
            
            return {
                is_video: !!matchedType,
                mime_type: matchedType || null,
                content_type: contentType,
                extension: matchedType ? mimeToExtension[matchedType] : null,
                size: this.bytesToMB(contentLength)
            };
        } catch (error) {
            console.error('Error getting video type:', error.message);
            return {
                is_video: false,
                mime_type: null,
                content_type: null,
                extension: null,
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
            console.error('Error converting video to audio:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    },
    is_audio: async function (url) {
        try {
            const response = await axios.head(url);
            const contentType = response.headers['content-type'];
            console.log(contentType);
            const contentLength = parseInt(response.headers['content-length'], 10)
            // MIME类型到文件扩展名的映射
            const mimeToExtension = {
                'audio/mpeg': 'mp3',
                'audio/mp4': 'm4a',
                'audio/wav': 'wav',
                'audio/x-wav': 'wav',
                'audio/ogg': 'ogg',
                'audio/aac': 'aac',
                'audio/flac': 'flac'
            };
            
            // 查找匹配的音频类型
            const matchedType = Object.keys(mimeToExtension).find(type => 
                contentType.toLowerCase().includes(type)
            );
            console.log("matchedType:", !!matchedType);
            
            return {
                is_audio: !!matchedType,
                mime_type: matchedType || null,
                content_type: contentType,
                extension: matchedType ? mimeToExtension[matchedType] : null,
                size: this.bytesToMB(contentLength)
            };
        } catch (error) {
            console.error('Error getting audio type:', error.message);
            return {
                is_audio: false,
                mime_type: null,
                content_type: null,
                extension: null,
                error: error.message
            };
        }
    },
    // deal_douyin_url: async function (url) {
    //     const urlObj = new URL(url);
    //     if (urlObj.hostname === 'v.douyin.com') {
    //         const response = await axios({
    //             method: 'get',
    //             url: url,
    //             headers: {
    //                 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Edg/136.0.0.0'
    //             }
    //         });
            
    //     }
    // },
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
                    proxy: {
                        host: 'p.webshare.io',
                        port: 80,
                        auth: {
                            username: 'umwhniat-rotate',
                            password: 'eudczfs5mkzt'
                        },
                        protocol: 'http'
                    }
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
                const response = await axios.post(
                    'https://api.xiazaitool.com/api/parseVideoUrl',
                    {
                        url:input_text,
                        token:'ca30558557e04da5ad5157f67bf1e10d'
                    }
                );
                data = response.data
                console.log("查询：", JSON.stringify(data))
                if(data.success){
                    await redis.set(key, JSON.stringify(data), 'NX', 'EX', 3600 * 3);
                }else{
                    throw new Error(data.message)
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
                data: response.data
            }
        }
    },
    /**
     * 
     * @param string video_url 视频链接
     * @param string download_link 下载直链
     * @param string task_id 任务ID
     * @param number left_time 剩余时间，单位(秒)
     * @param string api_key 付费版用户密钥
     * @param string free_key 免费版用户密钥
     */
    video_to_subtitle: async function(video_url, download_link, task_id, left_time, api_key, free_key,language){

        var download //视频下载信息
        var convert //音频转换信息
        var stt //asr
        var duration //时长
        try{
            var value = await redis.get(video_url)

            if (value === null) {
                console.log("开始处理任务",{
                    video_url:video_url,
                    52:download_link
                })
                 download = await this.download_video(download_link)
                if (!download.success) throw new Error(download.error);
                 duration = await this.getMediaDuration(download.filepath)
                if (!duration.success) throw new Error(duration.error)
                if (duration.duration > left_time) throw new Error("任务失败！本视频时长"+ this.formatDuration(duration.duration) +"，账户剩余时长"+this.formatDuration(left_time)+"，需要充值额度！请联系作者购买包月套餐（15元180分钟，30元450分钟，50元1000分钟）【vx：xiaowu_azt】")
                 convert = await this.video_to_audio(download.filepath)
                if (!convert.success) throw new Error(convert.error);

                 stt = await whisperapi.openaiSTT({"file_path":convert.outputFile,speaker_labels:true,language:language})
                if (!stt.success) throw new Error(stt.error);

                value = stt.transcription

                //字幕信息保存90天
                await redis.set(video_url, JSON.stringify(value), 'EX', 3600 * 24 * 90);
                
                //日志
                console.log("任务处理成功",{
                    video:download,
                    audio:convert,
                    stt:stt,
                    duration:this.formatDuration(duration.duration)
                })
                
            }else{
                value = JSON.parse(value)
            }

            const reDownloadKey = free_key + api_key + video_url
            const exist = await redis.exists(reDownloadKey);
            if (!exist){
                //更新套餐额度:剩余时间-当前视频时间
                left_time = Math.floor(left_time-value.duration)
                this.update_asr_key(api_key, free_key, left_time)
                redis.set(reDownloadKey,1,'EX', 3600*24)//一天之内重复下载不用扣费
            }

            const result = {
                success: true,
                transcription: value
            }
            //异步任务返回
            await redis.set("task_"+task_id, JSON.stringify(result), 'EX', 3600 * 72);
            //同步任务返回
            return result

        }catch(err){
            console.log("获取字幕失败：",err.message,{
                video:download,
                audio:convert,
                stt:stt,
                duration:this.formatDuration(duration.duration)
            })
            if (download && download.filepath) fs.promises.unlink(download.filepath).catch(()=>{})
            if (convert && convert.outputFile) fs.promises.unlink(convert.outputFile).catch(()=>{})
            
            //更新任务状态信息
            await redis.set("task_"+task_id, err.message, 'EX', 3600 * 72);
            return {
                success: false,
                error: err.message //json格式
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
        console.log(command)

        try {
            // Execute ffmpeg command
            const { stdout, stderr } = await execPromise(command);
            console.log("stdout",stdout)
            console.log("stderr",stderr)
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

module.exports = tool;