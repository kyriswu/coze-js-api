import redis from "./redisClient.js"

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
     * @returns 
     */
    valid_redis_key: async function (key_header, unkey_api_id, api_key, req) {
        const free_key = key_header + req.headers['user-identity']
        if (api_key) {
            const redis_key = req.headers['user-identity'] ? key_header + req.headers['user-identity'] : 'test';
            const value = await redis.get(redis_key);
            if (value === null) {
                // 不存在，创建 key 并设置初始值
                const now = new Date();
                const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const secondsSinceMidnight = Math.floor((now - midnight) / 1000);
                await redis.set(redis_key, 0, 'EX', secondsSinceMidnight);
            } else {
                if (!api_key) {
                    return res.send({ msg: "维护成本大，每天免费使用1次，购买api_key解锁更多次数，需要请请联系作者【B站：小吴爱折腾】" })
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
            }
        } else {
            this.valid_free_key(free_key)
            return free_key
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
    }

}


export default commonUtils