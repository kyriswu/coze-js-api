import axios from 'axios';
import fs from 'fs';
import path from 'path';

const yuanqi_token = "twRCDEnHXgtK4JMTD6A3CjXq3fpLb9Hu"
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
    }
};

export default tencentapi;