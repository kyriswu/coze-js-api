import axios from 'axios';
import unkey from './unkey.js';
import commonUtils from './commonUtils.js';

const unkey_api_id = 'api_413Kmmitqy3qaDo4';
const ark_base_url = process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com';
const ARK_API_KEY = 'f76941d3-dda6-4455-89bd-484276d6465a';
const seedream_5_0_lite_model = 'doubao-seedream-5-0-260128';

export const ve_seedream_5_0_lite = {
    // Seedream 5.0 Lite 图片生成（文生图 / 图生图 / 多图融合）
    generate_image: async function (req, res) {
        const paramsFromReq = {
            ...(req.query || {}),
            ...(req.body || {})
        };

        const {
            prompt,
            image,
            model = seedream_5_0_lite_model,
            size = '2K',
            output_format = 'png',
            watermark = false,
            sequential_image_generation,
            api_key
        } = paramsFromReq;

        if (!prompt) {
            return res.send({ code: -1, msg: 'prompt is required' });
        }

        try {
            const isValid = await commonUtils.valid_redis_key('volcengine_seedream_5_0_lite_generate_image', unkey_api_id, api_key, req, res);
            if (!isValid) return;

            const payload = {
                model,
                prompt,
                size,
                output_format,
                watermark
            };

            if (typeof image !== 'undefined') {
                payload.image = image;
            }
            if (typeof sequential_image_generation !== 'undefined') {
                payload.sequential_image_generation = sequential_image_generation;
            }

            const response = await axios.post(
                `${ark_base_url}/api/v3/images/generations`,
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${ARK_API_KEY}`
                    }
                }
            );

            let msg = 'success';
            if (api_key) {
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 5, { platform: 'volcengine', action: 'seedream_5_0_lite_generate_image' });
                msg = `API Key 剩余积分：${remaining}`;
            }

            return res.send({
                code: 200,
                msg,
                data: response.data || {}
            });
        } catch (error) {
            const detail = error.response ? error.response.data : error.message;
            console.error('Seedream Generate Image Error:', detail);
            if (!res.headersSent) {
                return res.send({
                    code: -1,
                    msg: commonUtils.MESSAGE.SERVER_ERROR,
                    data: detail
                });
            }
        }
    }
};

export default {
    ve_seedream_5_0_lite
};
