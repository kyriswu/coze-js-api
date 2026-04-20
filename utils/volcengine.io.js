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
        if (!api_key) {
            return res.send({ code: -1, msg: commonUtils.MESSAGE.TOKEN_EMPTY });
        }

        try {
            const { valid, remaining: currentRemaining } = await unkey.verifyKey(unkey_api_id, api_key, 0, { platform: 'volcengine', action: 'seedream_5_0_lite_generate_image' });
            if (!valid) {
                return res.send({ code: -1, msg: commonUtils.MESSAGE.TOKEN_EXPIRED });
            }
            if (currentRemaining < 5) {
                return res.send({ code: -1, msg: commonUtils.MESSAGE.TOKEN_NO_TIMES });
            }

            const payload = {
                model,
                prompt,
                size,
                output_format,
                watermark
            };
consoloe.log("image", image);  
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

            // 根据生成的图片数量扣费，每张图片扣 5 积分
            const generatedImages = response.data?.data || [];
            const cost = generatedImages.length * 5;
            const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, cost, { platform: 'volcengine', action: 'seedream_5_0_lite_generate_image' });

            return res.send({
                code: 200,
                msg: `生成 ${generatedImages.length} 张图片，扣费 ${cost} 积分，剩余 ${remaining} 积分`,
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
