const axios = require('axios');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const APIKEY = "3b626c757811448ca2fdeb307aa7076a"

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
    }
};

module.exports = aimlapi;