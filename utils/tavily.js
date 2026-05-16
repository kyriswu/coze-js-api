import axios from 'axios';
import commonUtils from './commonUtils.js';

const tavily_api_key = process.env.TAVILY_API_KEY || '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';
const unkey_api_id = "api_413Kmmitqy3qaDo4";

/**
 * Tavily 智能搜索 API 模块
 * 提供新闻、一般搜索等功能
 */
export const tv_search = {
    /**
     * 执行 Tavily 搜索
     * @param {Object} req - Express 请求对象
     * @param {Object} res - Express 响应对象
     */
    search: async function (req, res) {
        const {
            query,
            api_key,
            search_depth = 'basic',
            max_results = 20,
            topic = 'general',
            include_answer = true,
            include_images = false,
            time_range = null,
            include_raw_content = false,
            include_image_descriptions = false
        } = req.body;

        if (!query) {
            return res.status(400).send('Invalid input: "query" is required');
        }

        if (!api_key) {
            return res.send({ code: -1, msg: commonUtils.MESSAGE.TOKEN_EMPTY });
        }

        if (!tavily_api_key) {
            return res.status(500).send('Tavily API Key not configured');
        }

        res.setTimeout(140000, () => {
            if (!res.headersSent) {
                res.status(504).send({ code: -1, msg: 'Request Timeout' });
            }
        });

        try {
            // 仅支持付费 Key
            const check = await this._verifyKey(api_key, 0);
            if (!check.valid) {
                return res.send({ code: -1, msg: commonUtils.MESSAGE.TOKEN_EXPIRED });
            }
            if (check.remaining <= 0) {
                return res.send({ code: -1, msg: commonUtils.MESSAGE.TOKEN_NO_TIMES });
            }

            // 构建 Tavily 请求体
            const tavily_request_body = {
                api_key: tavily_api_key,
                query: query,
                search_depth: search_depth,
                max_results: max_results,
                topic: topic,
                include_answer: include_answer,
                include_images: include_images,
                include_raw_content: include_raw_content,
                include_image_descriptions: include_image_descriptions
            };

            // 如果指定了时间范围，添加到请求
            if (time_range) {
                tavily_request_body.time_range = time_range;
            }

            // 调用 Tavily API
            const tavily_response = await axios.post('https://api.tavily.com/search', tavily_request_body, {
                timeout: 130000
            });

            const search_data = tavily_response.data || {};

            let msg = '';
            if (api_key) {
                // 付费版：扣费
                const { remaining } = await this._verifyKey(api_key, 2);
                msg = `API Key 剩余积分：${remaining}`;
            }

            if (!res.headersSent) {
                return res.send({
                    code: 0,
                    msg: msg,
                    data: {
                        answer: search_data.answer || '',
                        results: Array.isArray(search_data.results) ? search_data.results : [],
                        response_time: search_data.response_time || null
                    }
                });
            }
        } catch (err) {
            console.error(`Error searching Tavily: ${err.message}`);
            if (!res.headersSent) {
                return res.send({
                    code: -1,
                    msg: 'failure',
                    data: {
                        answer: '搜索失败',
                        results: [{
                            'title': '搜索失败',
                            'url': '',
                            'snippet': '搜索失败'
                        }]
                    }
                });
            }
        }
    },

    /**
     * 验证 Unkey API Key
     * @param {string} api_key - 要验证的 API Key
     * @param {number} consume - 是否扣费（0 = 不扣费，>0 = 扣费数量）
     * @returns {Promise<Object>} 验证结果
     */
    _verifyKey: async function (api_key, consume = 0) {
        try {
            const unkey = (await import('./unkey.js')).default;
            return await unkey.verifyKey(unkey_api_id, api_key, consume);
        } catch (error) {
            console.error('Error verifying key:', error.message);
            return { valid: false, remaining: 0 };
        }
    },

    /**
     * 检查用户是否可以进行免费搜索（每天一次）
     * @param {string} key - Redis key
     * @returns {Promise<boolean>} 是否可以搜索
     */
    _canSearch: async function (key) {
        try {
            const redis = (await import('./redisClient.js')).default;
            const value = await redis.get(key);
            if (value === null) {
                // 不存在，创建 key 并设置初始值；限制为每天一次（次日零点重置）
                const now = new Date();
                const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
                const secondsUntilMidnight = Math.floor((nextMidnight - now) / 1000);
                console.log("创建key:", key, "初始值为0，过期时间为", secondsUntilMidnight);
                await redis.set(key, 0, 'EX', secondsUntilMidnight);
                return true;
            } else {
                return false;
            }
        } catch (error) {
            console.error('Error checking search availability:', error.message);
            return false;
        }
    }
};

export default {
    tv_search
};
