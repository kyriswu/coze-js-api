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
                msg: '为了保证付费用户的使用体验，免费用户有使用频率限制，请联系作者购买api_key！【B站:小吴爱折腾】',
                data: [{
                    'title': '免费用户有频率限制，1小时内使用1次，付费购买api_key，请联系作者！【B站:小吴爱折腾】',
                    'link': 'https://space.bilibili.com/396762480',
                    'snippet': '免费用户有频率限制，1小时内使用1次，付费购买api_key，请联系作者！【B站:小吴爱折腾】'
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
                return res.send({ msg: "维护成本大，每天免费使用1次，购买api_key解锁更多次数，需要请请联系作者【B站：小吴爱折腾】" })
            }
        } else {
            const { keyId, valid, remaining, code } = await unkey.verifyKey(unkey_api_id, api_key, 0);
            if (!valid) {
                return res.send({
                    msg: 'API Key 无效或已过期，请检查后重试！'
                });
            }
            if (remaining == 0) {
                return res.send({
                    msg: 'API Key 使用次数已用完，请联系作者续费！'
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
                res.send({ msg: "获取飞书授权令牌失败。如果多次重试无效，请联系管理员处理。" })
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
                        msg:"请核对一下工作流序号是否填写无误。如果多次重试无效，请联系管理员处理。"
                    })
                }
            }
        }

    }

}


export default commonUtils