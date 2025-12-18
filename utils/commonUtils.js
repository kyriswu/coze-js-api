import redis from "./redisClient.js"
import feishu from "./ThirdParrtyApi/feishu.js";
import unkey from './unkey.js';

const feishu_app_id = "cli_a9ac6d7fbbb89cda"
const feishu_app_secret = "L2YlP93rB84bwQgfT1U8cbFepNBR26sd"

const workflow_info_bitable_token = "Doodb9MS2aH8wksKAm0cxwPank3"

const workflow_info_bitable_table_token = "tblWUWiaquWZrh8p"


/**
 * 通用工具类，用于存放通用方法
 */
const commonUtils = {
    /**
     * 报错信息(统一处理)
     */
    MESSAGE:{
        TOKEN_EXPIRED:'令牌无效，续费或者购买，请访问：https://devtool.uk/plugin',
        TOKEN_NO_TIMES:'令牌无可用次数，续费或者购买，请访问：https://devtool.uk/plugin',
        FREE_KEY_EXPIRED_1:"免费版每日仅能使用 1 次，付费即可解锁不限次 / 更多次数权益！相关咨询、帮助及开通方式，均在 https://devtool.uk/plugin ",
        FREE_KEY_EXPIRED_3:"免费版每日仅能使用 3 次，付费即可解锁不限次 / 更多次数权益！相关咨询、帮助及开通方式，均在 https://devtool.uk/plugin ",
        LARK_ACCESS_KEY_ERROR:"获取飞书授权令牌失败。相关咨询、帮助及开通方式，均在 https://devtool.uk/plugin ",
        COZE_WORKFLOE_ERROR:"请核对工作流序号是否填写无误。相关咨询、帮助及开通方式，均在 https://devtool.uk/plugin ",
        SERVER_ERROR:'服务器内部异常，请稍后重试',
        FREE_API_USE_LIMIT:"为了保证付费用户的使用体验，免费用户有使用频率限制。付费即可解锁不限次 / 更多次数权益！相关咨询、帮助及开通方式，均在 https://devtool.uk/plugin",
        FREE_API_HOUR_USE_LIMIT:"免费用户有频率限制，1小时内使用1次。付费即可解锁不限次 / 更多次数权益！相关咨询、帮助及开通方式，均在 https://devtool.uk/plugin",
        HELP_LINK:"https://devtool.uk/plugin",
        VIDEO_PARSE_ERROR:"无法解析此链接，本插件支持快手/抖音/小红书/B站/Youtube/tiktok。相关咨询、帮助及开通方式，均在 https://devtool.uk/plugin",
        PLUGIN_NEED_PAY:"本插件后期将收费。相关咨询、帮助及开通方式，均在 https://devtool.uk/plugin"
    },
    /**
     * 验证免费key是否可用
     * @param {string} key 免费key
     * @returns 相关提示信息
     */
    valid_free_key: async function (key) {
        var flag = false;
        const value = await redis.get(key)
        if (value === null) {
            // 不存在，创建 key 并设置初始值
            const now = new Date();
            const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const secondsSinceMidnight = Math.floor((now - midnight) / 1000);
            console.log("创建key:", key, "初始值为0，过期时间为", secondsSinceMidnight);
            await redis.set(key, 0, 'EX', 60 * 60);
            flag = true
        }
        if (!flag) {
            console.log(`用户 ${req.headers['user-identity']} 的免费版使用次数已用完`);
            return res.send({
                code: 0,
                msg: commonUtils.MESSAGE.TOKEN_NO_TIMES,
                data: [{
                    'title': commonUtils.MESSAGE.FREE_API_USE_LIMIT,
                    'link': commonUtils.MESSAGE.HELP_LINK,
                    'snippet': commonUtils.MESSAGE.FREE_API_USE_LIMIT
                }]
            });
        }
    },

    /**
     * 
     * @param {string} key_header reids密钥抬头
     * @param {string} unkey_api_id  unkey_api_id
     * @param {string} api_key 接口访问令牌
     * @param {*} req
     * @param {*} res
     * @returns 
     */
    valid_redis_key: async function (key_header, unkey_api_id, api_key, req, res) {
        if (!api_key) {
            const redis_key = req.headers['user-identity'] ? key_header + req.headers['user-identity'] : 'test';
            const value = await redis.get(redis_key);
            if (value === null) {
                // 不存在，创建 key 并设置初始值
                const now = new Date();
                const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const secondsSinceMidnight = Math.floor((now - midnight) / 1000);
                await redis.set(redis_key, 0, 'EX', secondsSinceMidnight);
            } else {
                return res.send({ msg: commonUtils.MESSAGE.FREE_KEY_EXPIRED_1 })
            }
        } else {
            const { keyId, valid, remaining, code } = await unkey.verifyKey(unkey_api_id, api_key, 0);
            if (!valid) {
                return res.send({
                    msg: commonUtils.MESSAGE.TOKEN_EXPIRED
                });
            }
            if (remaining == 0) {
                return res.send({
                    msg: commonUtils.MESSAGE.TOKEN_NO_TIMES
                });
            }
        }
    },

    /**
     * 验证免费key使用次数还够不够
     * @param {string} key 
     * @returns 
     */
    free_key_used: async function (key) {
        let value = await redis.get(key);
        if (value === null) {
            // 不存在，创建 key 并设置初始值
            const now = new Date();
            const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const secondsSinceMidnight = Math.floor((now - midnight) / 1000);
            await redis.set(key, 0, 'EX', secondsSinceMidnight);
            value = 0;
            console.log(`键 ${key} 不存在，已创建并初始化为 0`);
        } else {
            console.log(`键 ${key} 已存在，当前值为 ${value}`);
        }
        return value;
    },

    /**
     * 从飞书多维表格中读取工作流信息
     * @param {*} workflow_num 工作流编号
     */
    get_one_workflow_id_from_bitable: async function (workflow_num,res) {
        if (!workflow_num) {
            res.send({ 
                code:-1,
                msg: "工作流编号不可以为空！" 
            })
        } else {
            const access_token = await feishu.getAccessToken(feishu_app_id, feishu_app_secret)
            if (!access_token) {
                res.send({ msg: commonUtils.MESSAGE.LARK_ACCESS_KEY_ERROR})
            } else {
                const fitler = {
                    "filter": {
                        "conjunction": "and",
                        "conditions": [
                            {
                                "field_name": "工作流编号",
                                "operator": "is",
                                "value": [
                                    workflow_num
                                ]
                            }
                        ]
                    }
                }
                const response = await feishu.bitable_search(access_token,workflow_info_bitable_token,workflow_info_bitable_table_token,fitler);
                if ( response.data.items.length > 0) {
                    return response.data.items[0].fields.工作流ID[0].text
                }else {
                    res.send({
                        code:-1,
                        msg:commonUtils.MESSAGE.COZE_WORKFLOE_ERROR
                    })
                }
            }
        }

    }

}


export default commonUtils