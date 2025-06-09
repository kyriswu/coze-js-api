import axios from 'axios';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

const APIKEY = "3b626c757811448ca2fdeb307aa7076a"

const api = new OpenAI({
  baseURL: 'https://api.aimlapi.com/v1',
  apiKey: 'Bearer ' + APIKEY,
});
const aimlapi = {
    /**
     * 语音转文字函数
     * @param {string|null} url - 音频文件URL
     * @returns {Promise<Object>} 返回转换结果
     */
    speech_to_text: async function ({url = null, language = 'zh'} = {}) {

        const body = JSON.stringify({
            "url": url,
            "model": "#g1_whisper-large",
            "detect_language": true,
            "diarize": true,
            "language": language
        })

        const response = await axios({
            method: 'POST',
            url: "https://api.aimlapi.com/v1/stt/create",
            headers: {
                'Authorization': 'Bearer ' + APIKEY,
                "Content-Type": "application/json"
            },
            data: body
        });
        console.log(response)
        return response.data

    },
    speech_to_text_result: async function (generation_id) {
        try {
            const response = await axios({
                method: 'GET',
                url: `https://api.aimlapi.com/v1/stt/${generation_id}`,
                headers: {
                    'Authorization': 'Bearer ' + APIKEY,
                    'Accept': '*/*'
                }
            });
            
            return response.data;
        } catch (error) {
            console.error('Error getting task result:', error.message);
            throw error;
        }
    },
    chat: async function (params) {
        const result = await api.chat.completions.create({
            model: 'o1-mini',
            messages: [
            {
                "role": "user",
                "content": ""
            },
            {
                "role": "user",
                "content": ""
            }
            ],
            temperature: 0.7,
            top_p: 0.7,
            frequency_penalty: 1,
            max_output_tokens: undefined,
            top_k: 50,
        });

        const message = result.choices[0].message.content;
        console.log(`Assistant: ${message}`);
    }
};

export default aimlapi;