import axios from 'axios';
import fs from 'fs';
import path from 'path';
import unkey from '../unkey.js';
import redis from '../redisClient.js';

const openaihub_api_key = 'sk-xQEHwDSCU78fni0S7Y4J0h27M9GPzfgi33RsHZxt5IFj3ylt';
const OPENAI_HUB_BASE = 'https://api.openai-hub.net';
const GPT_IMAGE_API_ID = 'api_413Kmmitqy3qaDo4';
const openaihub_GPT_IMAGE_MODEL = 'gpt-image-2';
const GPT_IMAGE_EDIT_MAX_RETRIES = Number.parseInt(process.env.GPT_IMAGE_EDIT_MAX_RETRIES || '2', 10);
const GPT_IMAGE_EDIT_RETRY_BASE_DELAY_MS = Number.parseInt(process.env.GPT_IMAGE_EDIT_RETRY_BASE_DELAY_MS || '800', 10);

const aitoken = {

    gpt_image_2: async function (prompt) {
        try {
            const response = await axios.post(`${OPENAI_HUB_BASE}/v1/images/generations`, {
                model: openaihub_GPT_IMAGE_MODEL,
                n: 1,
                prompt: prompt,
                size: 'auto'
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
            const normalizedPrompt = prompt.trim();
            const maxRetries = Number.isFinite(GPT_IMAGE_EDIT_MAX_RETRIES) ? Math.max(0, GPT_IMAGE_EDIT_MAX_RETRIES) : 2;
            const retryBaseDelayMs = Number.isFinite(GPT_IMAGE_EDIT_RETRY_BASE_DELAY_MS) ? Math.max(100, GPT_IMAGE_EDIT_RETRY_BASE_DELAY_MS) : 800;

            console.log('Received edit request with prompt:', normalizedPrompt);
            const payloadImageMeta = [];
            const preparedImages = [];
            let preparedMask = null;

            // 兼容无图、单图与多参考图：多图时按 OpenAI 规范使用 image[] 字段。
            const images = (Array.isArray(image) ? image : (image ? [image] : [])).filter(Boolean);
            for (const [index, img] of images.entries()) {
                let blob;
                let fileName = `reference-${index + 1}.png`;

                // 支持 fs.ReadStream / 文件路径 / Buffer / Blob 输入
                if (img instanceof Blob) {
                    blob = img;
                } else if (Buffer.isBuffer(img)) {
                    blob = new Blob([img], { type: 'image/png' });
                } else if (typeof img === 'string') {
                    const data = await fs.promises.readFile(img);
                    fileName = path.basename(img) || fileName;
                    blob = new Blob([data], { type: 'image/png' });
                } else if (img?.path && typeof img.path === 'string') {
                    const data = await fs.promises.readFile(img.path);
                    fileName = path.basename(img.path) || fileName;
                    blob = new Blob([data], { type: 'image/png' });
                } else {
                    throw new Error('不支持的图片输入类型');
                }

                const imageFieldName = images.length > 1 ? 'image[]' : 'image';
                preparedImages.push({ fieldName: imageFieldName, blob, fileName });
                payloadImageMeta.push({ index: index + 1, field: imageFieldName, fileName });
            }

            if (mask) {
                if (mask instanceof Blob) {
                    preparedMask = { blob: mask, fileName: 'mask.png' };
                } else if (typeof mask === 'string') {
                    const data = await fs.promises.readFile(mask);
                    preparedMask = {
                        blob: new Blob([data], { type: 'image/png' }),
                        fileName: path.basename(mask) || 'mask.png'
                    };
                } else if (mask?.path && typeof mask.path === 'string') {
                    const data = await fs.promises.readFile(mask.path);
                    preparedMask = {
                        blob: new Blob([data], { type: 'image/png' }),
                        fileName: path.basename(mask.path) || 'mask.png'
                    };
                }
            }

            const buildEditForm = () => {
                const form = new FormData();
                for (const item of preparedImages) {
                    form.append(item.fieldName, item.blob, item.fileName);
                }
                if (preparedMask) {
                    form.append('mask', preparedMask.blob, preparedMask.fileName);
                }
                form.append('model', openaihub_GPT_IMAGE_MODEL);
                form.append('prompt', normalizedPrompt);
                return form;
            };

            const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
            const isRetryableStatus = (status) => status === 408 || status === 429 || status >= 500;
            const isRetryableError = (error) => {
                const message = String(error?.message || '').toLowerCase();
                const code = error?.code || error?.cause?.code;
                return (
                    code === 'UND_ERR_HEADERS_TIMEOUT'
                    || code === 'UND_ERR_CONNECT_TIMEOUT'
                    || code === 'UND_ERR_SOCKET'
                    || code === 'ETIMEDOUT'
                    || code === 'ECONNRESET'
                    || message.includes('fetch failed')
                    || message.includes('headers timeout')
                    || message.includes('network')
                    || message.includes('timeout')
                );
            };

            console.log('[gpt_image_2_edit] openai-hub payload summary:', {
                imageCount: payloadImageMeta.length,
                images: payloadImageMeta,
                hasMask: Boolean(mask),
                endpoint: `${OPENAI_HUB_BASE}/v1/images/edits`
            });

            for (let attempt = 0; attempt <= maxRetries; attempt++) {
                try {
                    console.log('Submitting edit request with prompt:', normalizedPrompt, `(attempt ${attempt + 1}/${maxRetries + 1})`);
                    const response = await fetch(`${OPENAI_HUB_BASE}/v1/images/edits`, {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${openaihub_api_key}`
                        },
                        body: buildEditForm()
                    });

                    const contentType = (response.headers.get('content-type') || '').toLowerCase();
                    const rawBody = await response.text();
                    let result;
                    try {
                        result = rawBody ? JSON.parse(rawBody) : {};
                    } catch {
                        result = { message: rawBody };
                    }

                    if (!response.ok) {
                        const apiMsg = result?.error?.message || result?.message || `HTTP ${response.status}`;
                        const isLastAttempt = attempt >= maxRetries;
                        if (!isLastAttempt && isRetryableStatus(response.status)) {
                            const delay = retryBaseDelayMs * (2 ** attempt);
                            console.warn(`[gpt_image_2_edit] transient status ${response.status}, retrying in ${delay}ms (${attempt + 1}/${maxRetries})`);
                            await sleep(delay);
                            continue;
                        }
                        throw new Error(`编辑图像失败(${response.status}): ${apiMsg}`);
                    }

                    if (!contentType.includes('application/json')) {
                        console.warn('[gpt_image_2_edit] response is not JSON content-type, parsed as text fallback');
                    }
                    return result;
                } catch (error) {
                    const isLastAttempt = attempt >= maxRetries;
                    if (!isLastAttempt && isRetryableError(error)) {
                        const delay = retryBaseDelayMs * (2 ** attempt);
                        console.warn(`[gpt_image_2_edit] transient fetch error (${error.message}), retrying in ${delay}ms (${attempt + 1}/${maxRetries})`);
                        await sleep(delay);
                        continue;
                    }
                    throw error;
                }
            }

            throw new Error('编辑图像失败: 未知重试状态');
        } catch (error) {
            console.error('Error in gpt_image_2_edit:', error);
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
