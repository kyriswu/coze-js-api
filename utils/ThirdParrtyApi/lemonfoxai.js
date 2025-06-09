import axios from 'axios';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

const APIKEY = "IiVQKvhX0It8AZZikI2uD7CQr2ow4hAM"

const openai = new OpenAI({
  apiKey: APIKEY,
  baseURL: "https://api.lemonfox.ai/v1",
});

const lemonfoxai = {
    openaiSTT : async function (options = {}) {
        const {
            file_path = null,
            file_url = null,
            language = 'chinese',
            max_speakers = null,
            min_speakers = null,
            speaker_labels = false,
            response_format = 'text'
        } = options;

        return new Promise(async (resolve, reject) => {
            try{
                const transcription = await openai.audio.transcriptions.create({
                    file: fs.createReadStream(file_path, {
                        highWaterMark: 1024 * 1024 // 设置 1MB 的缓冲区大小
                    }),
                    model: "whisper-1",
                    language: language,
                    speaker_labels: speaker_labels,
                    response_format: response_format,
                    ...(min_speakers && { min_speakers }),
                    ...(max_speakers && { max_speakers })
                });

                console.log(Object.keys(transcription))

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
    speech_to_text: async function ({
        file_url,
        response_format = 'text',
        language,
        speaker_labels,
        max_speakers,
        min_speakers,
        callback_url,
        prompt
    } = {}) {

        const body = new FormData();
        body.append('file', file_url);
        body.append('response_format', response_format);
        if (language) {
            body.append('language', language);
        }
        if (speaker_labels) {
            body.append('speaker_labels', speaker_labels)
        }
        if (max_speakers) {
            body.append('max_speakers', max_speakers)
        }
        if (min_speakers) {
            body.append('max_speakers', min_speakers)
        }
        if (callback_url) {
            body.append('callback_url', callback_url)
        }
        if (prompt) {
            body.append('prompt', prompt)
        }
        try {
            const response = await axios.post('https://api.lemonfox.ai/v1/audio/transcriptions', body, {
                headers: {
                    'Authorization': `Bearer ${APIKEY}`
                }
            });
            return {success:true, data:response.data}
        } catch (error) {
            console.error('Error:', error);
            return {success:false, error:error}
        }
    }
};

export default lemonfoxai;