const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

// Convert exec to Promise-based function
const execPromise = util.promisify(exec);

const tool = {
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
            const extension = videoCheck.extension
            const filename = `video_${timestamp}.${extension}`;
            const filepath = path.join(downloadDir, filename);

            // Download video with progress tracking
            const response = await axios({
                method: 'get',
                url: url,
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
                        size: totalSize
                    });
                });

                writer.on('error', reject);
            });

        } catch (error) {
            console.error('Error downloading video:', error.message);
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
            // Get the directory and original filename
            const dir = path.dirname(video);
            const originalFilename = path.basename(video);
            
            // Replace 'video' with 'audio' in filename and change extension to .wav
            const outputFile = path.join(dir, originalFilename.replace('video', 'audio').replace('.mp4', '.wav'));


            // Construct ffmpeg command
            const command = `ffmpeg -i "${video}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${outputFile}"`;
            
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
    }
};

module.exports = tool;