const axios = require('axios');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const APIKEY = "IiVQKvhX0It8AZZikI2uD7CQr2ow4hAM"

const openai = new OpenAI({
  apiKey: APIKEY,
  baseURL: "https://api.lemonfox.ai/v1",
});

const whisperapi = {
    openaiSTT : async function (options = {}) {
        const {
            file_path = null,
            file_url = null,
            language = 'chinese',
            max_speakers = null,
            min_speakers = null
        } = options;

        return new Promise(async (resolve, reject) => {
            try{
                const transcription = await openai.audio.transcriptions.create({
                    file: fs.createReadStream(file_path, {
                        highWaterMark: 1024 * 1024 // 设置 1MB 的缓冲区大小
                    }),
                    model: "whisper-1",
                    language: language,
                    speaker_labels: true,
                    response_format: 'verbose_json',
                    ...(min_speakers && { min_speakers }),
                    ...(max_speakers && { max_speakers })
                });

                // 成功后删除音频文件
                fs.unlink(file_path, (err) => {
                    if (err) console.error('Error deleting audio file:', err);
                });

                resolve({
                    success: true,
                    transcription: transcription
                })
            }catch(error){
                console.error(error)
                reject({
                    success: false,
                    error: error.message
                })
            }
        })
    },
    speech_to_text: async function (options = {}) {
        const {
            file_path = null,
            file_url = null,
            language = 'chinese',
            max_speakers = null,
            min_speakers = null
        } = options;

        return new Promise(async (resolve, reject) => {
            const body = new FormData();
            if (file_url) {
                body.append('file', file_url);
            }
            if (file_path) {
                console.log(file_path)
                const fileStream = fs.createReadStream(file_path, {
                    highWaterMark: 1024 * 1024 // 设置 1MB 的缓冲区
                });
                body.append('file', fileStream);
            }
            // instead of providing a URL you can also upload a file object:
            // body.append('file', new Blob([await fs.readFile('/path/to/audio.mp3')]));

            body.append('language', language);
            body.append('response_format', 'verbose_json');
            body.append('speaker_labels', 'true');
            if (max_speakers) {
                body.append('max_speakers', max_speakers)
            }
            if (min_speakers) {
                body.append('max_speakers', min_speakers)
            }

            console.log(body)
            await fetch('https://api.lemonfox.ai/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + APIKEY
                },
                body: body
            })
                .then(response => response.json()).then(data => {
                    console.log(data['text']);
                    resolve({
                        success: true,
                        transcriptions: data
                    })
                })
                .catch(error => {
                    console.error('Error:', error);
                    reject({
                        success: false,
                        error: error.message
                    })
                });

        })
    }
};

module.exports = whisperapi;