import axios from 'axios';
import fs from 'fs';
import path from 'path';

const yuanqi_token = "twRCDEnHXgtK4JMTD6A3CjXq3fpLb9Hu"
const yuanqi_app_key = "gllx3tytGYYSIXPGYw6iq1OFB1qQJ537"
const yuanqi_assistant_id = "fWDYfG1mg4NX"
const tencentapi = {
    
    ai_online_answer: async function (userId, messageText) {

        const url = 'https://yuanqi.tencent.com/openapi/v1/agent/chat/completions';
        
        const headers = {
            'X-Source': 'openapi',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${yuanqi_token}`,
        };

        const data = {
            assistant_id: "fWDYfG1mg4NX",
            user_id: userId,
            stream: false,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: messageText,
                        },
                    ],
                },
            ],
        };

        try {
            const response = await axios.post(url, data, { headers });
            return JSON.parse(response.data.choices[0].message.content);
        } catch (error) {
            console.error('Error:', error.response ? error.response.data : error.message);
            throw error;
        }
    },

    ai_answer: async function (userId, messageText, options = {}) {
        const url = 'https://open.hunyuan.tencent.com/openapi/v1/agent/chat/completions';

        const headers = {
            'X-Source': 'openapi',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${yuanqi_app_key}`,
        };

        const {
            assistantId,
            stream = false,
            version,
            chatType,
            customVariables,
        } = options;

        const effectiveAssistantId = assistantId || yuanqi_assistant_id;

        const data = {
            assistant_id: effectiveAssistantId,
            user_id: userId,
            stream,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: messageText,
                        },
                    ],
                },
            ],
        };

        if (typeof version === 'number') data.version = version;
        if (typeof chatType === 'string' && chatType) data.chat_type = chatType;
        if (customVariables && typeof customVariables === 'object' && !Array.isArray(customVariables)) {
            data.custom_variables = customVariables;
        }

        try {
            const response = await axios.post(url, data, { headers });
            return response.data;
        } catch (error) {
            console.error('ai_answer Error:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message,
            });
            throw error;
        }
    }
};

export default tencentapi;