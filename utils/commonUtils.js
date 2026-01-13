import redis from "./redisClient.js";
import feishu from "./ThirdParrtyApi/feishu.js";
import unkey from './unkey.js';

const CONFIG = {
    FEISHU_APP_ID: "cli_a9ac6d7fbbb89cda",
    FEISHU_APP_SECRET: "L2YlP93rB84bwQgfT1U8cbFepNBR26sd",
    BITABLE_TOKEN: "Doodb9MS2aH8wksKAm0cxwPank3",
    BITABLE_TABLE_TOKEN: "tblWUWiaquWZrh8p"
};

const commonUtils = {
    MESSAGE: {
        TOKEN_EMPTY: "API_KEY不能为空！相关咨询、帮助及开通方式，均在 https://devtool.uk/plugin",
        TOKEN_EXPIRED: '令牌无效，续费或者购买，请访问：https://devtool.uk/plugin',
        TOKEN_NO_TIMES: '令牌无可用次数，续费或者购买，请访问：https://devtool.uk/plugin',
        FREE_KEY_EXPIRED_1: "免费版每日仅能使用 1 次，付费即可解锁不限次权益！详情：https://devtool.uk/plugin",
        FREE_KEY_EXPIRED_3: "免费版每日仅能使用 3 次，付费即可解锁不限次权益！详情：https://devtool.uk/plugin",
        LARK_ACCESS_KEY_ERROR: "获取飞书授权令牌失败。",
        COZE_WORKFLOW_ERROR: "请核对工作流序号是否填写无误。",
        SERVER_ERROR: '服务器内部异常，请稍后重试',
        HELP_LINK: "https://devtool.uk/plugin",
        MISSING_PARAMETERS: '缺少必要参数',
        SUCCESS: '成功',
    },
    // 性别映射
    GENDER_MAP : {
        // 数字/字符串数字映射
        '1': '男',
        '0': '女',
        // 英文标准映射 (兼容更多国际化场景)
        'male': '男',
        'm': '男',
        'female': '女',
        'f': '女',
        // 中文直接透传
        '男': '男',
        '女': '女'
    },

    /**
     * 获取距离今日结束（午夜）的剩余秒数
     */
    _getSecondsUntilMidnight: function () {
        const now = new Date();
        const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        return Math.floor((midnight - now) / 1000);
    },

    /**
     * 统一校验入口
     * 重点：返回 true 代表通过，返回 false 代表已处理响应并拦截后续逻辑
     */
    valid_redis_key: async function (key_header, unkey_api_id, api_key, req, res) {
        try {
            if (!api_key) {
                // --- 免费版逻辑 ---
                const userId = req.headers['user-identity'] || 'test';
                const redis_key = `${key_header}:${userId}`;

                const exists = await redis.exists(redis_key);
                if (!exists) {
                    await redis.set(redis_key, "1", 'EX', this._getSecondsUntilMidnight());
                    return true;
                } else {
                    res.send({ code: -1, msg: this.MESSAGE.FREE_KEY_EXPIRED_1 });
                    return false;
                }
            } else {
                // --- 付费版逻辑 (Unkey) ---
                const { valid, remaining } = await unkey.verifyKey(unkey_api_id, api_key, 0);

                if (!valid) {
                    res.send({ code: -1, msg: this.MESSAGE.TOKEN_EXPIRED });
                    return false;
                }
                if (remaining <= 0) {
                    res.send({ code: -1, msg: this.MESSAGE.TOKEN_NO_TIMES });
                    return false;
                }
                return true;
            }
        } catch (error) {
            console.error("Validation Error:", error);
            if (!res.headersSent) {
                res.send({ code: -1, msg: this.MESSAGE.SERVER_ERROR });
            }
            return false;
        }
    },

    /**
     * 获取飞书 AccessToken（增加 Redis 缓存）
     */
    _getFeishuAccessToken: async function () {
        const cacheKey = "token:feishu_access_token";
        let token = await redis.get(cacheKey);
        if (token) return token;

        token = await feishu.getAccessToken(CONFIG.FEISHU_APP_ID, CONFIG.FEISHU_APP_SECRET);
        if (token) {
            // 飞书 token 有效期 2 小时，缓存 7000 秒
            await redis.set(cacheKey, token, 'EX', 7000);
        }
        return token;
    },

    /**
     * 从飞书多维表格查询工作流 ID
     */
    get_one_workflow_id_from_bitable: async function (workflow_num) {
        if (!workflow_num) throw new Error("工作流编号不可以为空！");

        // --- 增加 Workflow ID 缓存，减少对飞书 API 的查询频率 ---
        const workflowCacheKey = `cache:workflow_id:${workflow_num}`;
        const cachedId = await redis.get(workflowCacheKey);
        if (cachedId) return cachedId;

        try {
            const access_token = await this._getFeishuAccessToken();
            if (!access_token) throw new Error(this.MESSAGE.LARK_ACCESS_KEY_ERROR);

            const filter = {
                filter: {
                    conjunction: "and",
                    conditions: [{
                        field_name: "工作流编号",
                        operator: "is",
                        value: [workflow_num]
                    }]
                }
            };

            const response = await feishu.bitable_search(
                access_token,
                CONFIG.BITABLE_TOKEN,
                CONFIG.BITABLE_TABLE_TOKEN,
                filter
            );

            const items = response?.data?.items || [];
            if (items.length > 0) {
                const workflowId = items[0].fields?.工作流ID?.[0]?.text;
                if (workflowId) {
                    // 缓存 Workflow ID 1 小时，因为这个 ID 几乎不会变动
                    await redis.set(workflowCacheKey, workflowId, 'EX', 3600);
                    return workflowId;
                }
            }

            throw new Error(this.MESSAGE.COZE_WORKFLOW_ERROR);

        } catch (error) {
            console.error("Feishu Bitable Error Trace:", error.message);
            throw error;
        }
    }
};

export default commonUtils;