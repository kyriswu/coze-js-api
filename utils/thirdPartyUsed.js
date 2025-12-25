import unkey from './unkey.js';
import commonUtils from './commonUtils.js';

// 建议将配置放入环境变量或配置文件中
const UNKEY_API_ID = "api_5Lr9BkgzzR2bhKcY";

// 定义枚举提高可读性
const REQUEST_TYPE = {
    QUERY: 1, // 询问剩余次数
    CONSUME: 2 // 使用次数-1
};

export const thirdPartyUsed = {
    /**
     * 第三方调用我方api密钥管理
     */
    key_used: async function (req, res) {
        const { api_key, type } = req.body;

        // 1. 基础参数校验
        if (!api_key || !type) {
            return res.status(400).send({ 
                code: 400, 
                msg: `${!api_key ? 'api_key' : 'type'} 不可为空!` 
            });
        }

        try {
            // 2. 确定消耗额度 (Type 2 消耗 1 次, Type 1 消耗 0 次)
            const cost = type === REQUEST_TYPE.CONSUME ? 1 : 0;
            
            // 3. 调用 Unkey 验证
            const { valid, remaining, error } = await unkey.verifyKey(UNKEY_API_ID, api_key, cost);

            // 4. 处理验证结果
            if (!valid) {
                return res.send({ 
                    code: -1, 
                    remaining_times: null, 
                    msg: commonUtils.MESSAGE.TOKEN_EXPIRED 
                });
            }

            // 5. 处理额度逻辑
            if (remaining <= 0 && type === REQUEST_TYPE.QUERY) {
                return res.send({ 
                    code: -1, 
                    remaining_times: 0, 
                    msg: commonUtils.MESSAGE.TOKEN_NO_TIMES 
                });
            }

            // 6. 统一成功返回
            return res.send({ 
                code: 200, 
                remaining_times: remaining, 
                msg: 'success' 
            });

        } catch (error) {
            console.error('Unkey Verification Error:', error);
            return res.status(500).send({ 
                code: -1, 
                remaining_times: null, 
                msg: commonUtils.MESSAGE.SERVER_ERROR 
            });
        }
    }
};

export default thirdPartyUsed;