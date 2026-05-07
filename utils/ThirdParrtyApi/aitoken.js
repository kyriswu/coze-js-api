import axios from 'axios';
import fs from 'fs';
import path from 'path';
import unkey from '../unkey.js';
import redis from '../redisClient.js';

const openaihub_api_key = 'sk-xQEHwDSCU78fni0S7Y4J0h27M9GPzfgi33RsHZxt5IFj3ylt';
const OPENAI_HUB_BASE = 'https://api.openai-hub.com';
const GPT_IMAGE_API_ID = 'api_413Kmmitqy3qaDo4';

const aitoken = {

    gpt_image_2: async function (prompt) {
        try {
            const response = await axios.post(`${OPENAI_HUB_BASE}/v1/images/generations`, {
                model: 'gpt-image-2-convert',
                n: 1,
                prompt: prompt,
                size: '1024x1024'
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openaihub_api_key}`
                }
            });
            return response.data;
        } catch (error) {
            throw new Error(`生成图像失败: ${error.message}`);
        }
    },

    gpt_image_2_edit: async function (image, mask, prompt) {
        try {
            if (!prompt || !prompt.trim()) throw new Error('prompt 不能为空');

            const form = new FormData();

            // 兼容无图、单图与多参考图：多图时按 OpenAI 规范使用 image[] 字段。
            const images = (Array.isArray(image) ? image : (image ? [image] : [])).filter(Boolean);
            for (const img of images) {
                form.append(images.length > 1 ? 'image[]' : 'image', img);
            }

            if (mask) {
                form.append('mask', mask);
            }
            form.append("model", "gpt-image-2-convert");
            form.append("prompt", prompt.trim());

            const response = await axios.post(`${OPENAI_HUB_BASE}/v1/images/edits`, form, {
                headers: {
                    'Authorization': `Bearer ${openaihub_api_key}`,
                    ...form.getHeaders()
                }
            });
            return response.data;
        } catch (error) {
            const apiMsg = error?.response?.data?.error?.message || error?.response?.data?.message;
            throw new Error(`编辑图像失败: ${apiMsg || error.message}`);
        }
    },

    /**
     * 统一入口：鉴权 + 生图（文生图 or 参考图编辑）
      * @param {{ prompt: string, imageBase64?: string|string[], api_key?: string, userIdentity?: string }} opts
     * @returns {{ imageUrl: string|null, b64Image: string|null }}
     */
    generate: async function ({ prompt, imageBase64, api_key, userIdentity }) {
        if (!prompt || !prompt.trim()) throw new Error('prompt 不能为空');

        // ── 鉴权 ──────────────────────────────────────────────────────────────
        if (api_key) {
            const { valid, remaining } = await unkey.verifyKey(GPT_IMAGE_API_ID, api_key.trim(), 0);
            if (!valid) throw Object.assign(new Error('API Key 无效或已过期，请检查后重试！'), { statusCode: 401 });
            if (remaining === 0) throw Object.assign(new Error('API Key 积分已用完，请联系作者续费！'), { statusCode: 403 });
        } else {
            const identity = userIdentity || 'anonymous';
            const trialKey = `gpt-image-2:trial:${identity}`;
            const isFirst = await redis.set(trialKey, '1', 'NX');
            if (isFirst === null) throw Object.assign(new Error('免费试用次数已用完，请提供 API Key 继续使用。'), { statusCode: 403 });
        }

        // ── 生图 ──────────────────────────────────────────────────────────────
        let item;
        if (imageBase64) {
            const imageInputs = (Array.isArray(imageBase64) ? imageBase64 : [imageBase64]).filter(Boolean);

            const form = new FormData();

            for (const [index, imageInput] of imageInputs.entries()) {
                const matches = imageInput.match(/^data:([^;]+);base64,(.+)$/);
                const mimeType = matches ? matches[1] : 'image/png';
                const b64data = matches ? matches[2] : imageInput;
                const blob = new Blob([Buffer.from(b64data, 'base64')], { type: mimeType });
                const ext = mimeType.split('/')[1] || 'png';
                const fileName = `reference-${index + 1}.${ext}`;
                form.append(imageInputs.length > 1 ? 'image[]' : 'image', blob, fileName);
            }

            form.append('model', 'gpt-image-2-convert');
            form.append('prompt', prompt.trim());

            const resp = await fetch(`${OPENAI_HUB_BASE}/v1/images/edits`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${openaihub_api_key}` },
                body: form
            });
            const result = await resp.json();
            if (!resp.ok) throw new Error(result.error?.message || `HTTP ${resp.status}`);
            item = result.data?.[0] || {};
        } else {
            const { data: result } = await axios.post(
                `${OPENAI_HUB_BASE}/v1/images/generations`,
                { model: 'gpt-image-2-convert', n: 1, prompt: prompt.trim(), size: '1024x1024' },
                { headers: { Authorization: `Bearer ${openaihub_api_key}`, 'Content-Type': 'application/json' } }
            );
            item = result.data?.[0] || {};
        }

        // 生成成功后消费付费积分
        if (api_key) {
            await unkey.verifyKey(GPT_IMAGE_API_ID, api_key.trim(), 3);
        }

        return { imageUrl: item.url || null, b64Image: item.b64_json || null };
    }

};

export default aitoken;