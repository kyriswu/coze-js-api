import unkey from './unkey.js';
import commonUtils from './commonUtils.js';

const unkey_api_id = "api_413Kmmitqy3qaDo4"

export const thirdPartyUsed = {
    /**
     * 第三方调用我方api密钥，我方根据调用类型返回参数
     * @param {*} req 请求参数
     * @param {*} res 反参
     */
    key_used: async function (req, res) {
        const api_key = req.body.api_key
        if (!api_key) {
            res.send({ msg: 'api_key 不可为空!' })
        }
        // type 调用类型：1：询问剩余次数; 2：调用成功，使用次数-1
        const type = req.body.type
        if (!type) {
            res.send({ msg: 'type 不可为空!' })
        }
        if (type === 1) {
            const { valid, remaining } = await unkey.verifyKey(unkey_api_id, api_key, 0);
            if (valid) {
                if (remaining > 0) {
                    res.send({ remaining_times: remaining, code: 200, msg: 'success' })
                } else {
                    res.send({ remaining_times: null, code: -1, msg: commonUtils.MESSAGE.TOKEN_NO_TIMES })
                }
            } else {
                res.send({ code: -1, remaining_times: null, msg: commonUtils.MESSAGE.TOKEN_EXPIRED })
            }
        }
        // 使用次数减一
        if(type === 2){
            const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1);
            res.send({ code: -1, remaining_times: remaining, msg: 'success' })
        }
    }
}

export default thirdPartyUsed;