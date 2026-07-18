import axios from 'axios';
import fs from 'fs';

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '105fc485028350ba9832c8963646e986';
const apiToken = process.env.CLOUDFLARE_API_TOKEN || 'VLiGvDC-iD1Lv-ExmLU5AhAFuhhdUA3OW5gz70_I';
const whisperMaxFileBytes = Number(process.env.CLOUDFLARE_WHISPER_MAX_FILE_BYTES || 200 * 1024 * 1024);

// https://api.cloudflare.com/client/v4/accounts/105fc485028350ba9832c8963646e986/ai/v1/chat/completions


const CloudFlareApi = {
    
    run_whisper: async function (filePath, language) {

        const base_url = process.env.CLOUDFLARE_BASE_URL || 'https://api.cloudflare.com/client/v4';
        const url = `${base_url}/accounts/${accountId}/ai/run/@cf/openai/whisper-large-v3-turbo`;
        
        const headers = {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
        };

        const stat = await fs.promises.stat(filePath);
        if (stat.size > whisperMaxFileBytes) {
            throw new Error(`音频文件过大: ${stat.size} bytes，超过限制 ${whisperMaxFileBytes} bytes`);
        }

        // Convert audio file to base64
        const audioBuffer = await fs.promises.readFile(filePath);
        const audioBase64 = audioBuffer.toString('base64');

        const data = {
            audio: audioBase64,
        };

        if (language) {
            data.language = language;
        }

        console.log('Whisper request sent');

        try {
            const response = await axios.post(url, data, { headers });
            return response.data;
        } catch (error) {
            console.error('Error:', error.response ? error.response.data : error.message);
            throw error;
        }
    }
};

export default CloudFlareApi;