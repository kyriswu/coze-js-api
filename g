[1mdiff --git a/.gitignore b/.gitignore[m
[1mindex 8387c52..1693175 100644[m
[1m--- a/.gitignore[m
[1m+++ b/.gitignore[m
[36m@@ -118,3 +118,4 @@[m [mdist[m
 package-lock.json[m
 [m
 images/*[m
[32m+[m[32mdownloads[m
\ No newline at end of file[m
[1mdiff --git a/Dockerfile b/Dockerfile[m
[1mindex 2b217cc..d449211 100644[m
[1m--- a/Dockerfile[m
[1m+++ b/Dockerfile[m
[36m@@ -1,7 +1,7 @@[m
 FROM node:22.10.0[m
 [m
 RUN apt-get update && \[m
[31m-    apt-get install -y python3 python3-venv poppler-utils && \[m
[32m+[m[32m    apt-get install -y python3 python3-venv poppler-utils ffmpeg && \[m
     apt-get clean && rm -rf /var/lib/apt/lists/*[m
 [m
 # 创建虚拟环境[m
[36m@@ -9,7 +9,8 @@[m [mRUN python3 -m venv /opt/venv[m
 [m
 # 激活虚拟环境并用它的 pip 安装 pdf2image[m
 RUN /opt/venv/bin/pip install --upgrade pip && \[m
[31m-    /opt/venv/bin/pip install pdf2image[m
[32m+[m[32m    /opt/venv/bin/pip install pdf2image && \[m
[32m+[m
 [m
 WORKDIR /app[m
 [m
[1mdiff --git a/index.js b/index.js[m
[1mindex 66694ea..54d9510 100644[m
[1m--- a/index.js[m
[1m+++ b/index.js[m
[36m@@ -1116,6 +1116,8 @@[m [mapp.post('/pdf2img', async (req, res) => {[m
 const path = require('path');[m
 const netdiskapi = require('./utils/netdiskapi');[m
 const faceplusplus = require('./utils/kuangshi');[m
[32m+[m[32mconst whisperapi = require('./utils/whisperapi');[m
[32m+[m[32mconst tool = require('./utils/tool');[m
 // 静态资源服务，访问 images 目录下的文件[m
 app.use('/images', express.static(path.join(__dirname, 'images')));[m
 [m
[36m@@ -1128,6 +1130,33 @@[m [mapp.get('/xpan/download', netdiskapi.download)[m
 [m
 app.post('/faceplusplus/face_detect', faceplusplus.face_detect)[m
 [m
[32m+[m[32mapp.post('/speech-to-text', whisperapi.speech_to_text)[m
[32m+[m
[32m+[m
[32m+[m[32mapp.post('/extract-video-subtitle', async (req, res) => {[m
[32m+[m[32m    const { url } = req.body;[m
[32m+[m[32m    if (!url) {[m
[32m+[m[32m        return res.status(400).send('Invalid input: "url" is required');[m
[32m+[m[32m    }[m
[32m+[m[41m    [m
[32m+[m
[32m+[m[32m    try{[m
[32m+[m[32m        const download = await tool.download_video(url)[m
[32m+[m[32m        if (!download.success) throw new Error(download.error);[m
[32m+[m
[32m+[m[32m            return res.send({[m
[32m+[m[32m                code: 0,[m
[32m+[m[32m                msg: 'Success',[m
[32m+[m[32m                data: download[m
[32m+[m[32m            });[m
[32m+[m[32m    }catch(error){[m
[32m+[m[32m        console.error(error)[m
[32m+[m[32m        return res.send({[m
[32m+[m[32m            code: -1,[m
[32m+[m[32m            msg: error.message[m
[32m+[m[32m        })[m
[32m+[m[32m    }[m
[32m+[m[32m})[m
 app.listen(port, () => {[m
     console.log(`Example app listening on port ${port}`)[m
 })[m
\ No newline at end of file[m
