import axios from "axios";
import unkey from './unkey.js';
import commonUtils from "./commonUtils.js";

const QWEATHER_API_KEY = "f0859240db85483c8b570ca7a57c2739";
const UNKEY_API_ID = "api_413Kmmitqy3qaDo4";

/**
 * 内部辅助函数：处理和统一个和风天气的 HTTP 请求
 */
async function qweatherFetch(url) {
    return axios({
        method: "get",
        url,
        timeout: 10000, // 增加超时控制
        headers: {
            "X-QW-Api-Key": QWEATHER_API_KEY,
            "Content-Type": "application/json"
        }
    });
}

/**
 * 内部辅助函数：校验日期 yyyymmdd 格式
 */
function isValidDate(dateStr) {
    const reg = /^(\d{4})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])$/;
    if (!reg.test(dateStr)) return false;

    const year = parseInt(dateStr.substring(0, 4), 10);
    const month = parseInt(dateStr.substring(4, 6), 10) - 1;
    const day = parseInt(dateStr.substring(6, 8), 10);
    const date = new Date(year, month, day);

    return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day;
}

export const qweather_tool = {
    /**
     * 获取城市气象编码
     */
    get_city_weather_code: async function (req, res) {
        const { adm, location, api_key } = req.body;

        if (!location) {
            return res.send({ code: -1, msg: "地区名称不可为空！" });
        }

        try {
            // 1. 权限与 Redis 校验
            const isValid = await commonUtils.valid_redis_key("qweather_city_code", UNKEY_API_ID, api_key, req, res);
            if (!isValid) return;

            // 2. 调用和风天气接口（参数编码防止乱码）
            const params = new URLSearchParams({ location });
            if (adm) params.append("adm", adm);

            const url = `https://jr5rk6643a.re.qweatherapi.com/geo/v2/city/lookup?${params.toString()}`;
            const response = await qweatherFetch(url);

            if (response.data?.code !== "200") {
                return res.send({ code: -1, msg: "和风天气接口响应异常" });
            }

            const locations = response.data.location || [];
            if (locations.length === 0) {
                return res.send({ code: -1, msg: "未查询到相关城市信息" });
            }

            // 3. 扣费逻辑：仅在数据成功获取后扣费
            let msg = "success";
            if (api_key) {
                const { remaining } = await unkey.verifyKey(UNKEY_API_ID, api_key, 1);
                msg = `API Key 剩余调用次数：${remaining}`;
            }

            return res.send({ code: 200, msg, data: locations });

        } catch (error) {
            console.error("get_city_weather_code Error:", error.message);
            if (!res.headersSent) {
                return res.send({ code: -1, msg: commonUtils.MESSAGE.SERVER_ERROR });
            }
        }
    },

    /**
     * 获取历史气象信息
     */
    get_history_weather: async function (req, res) {
        const { city_weather_code, date: dateStr, api_key } = req.body;

        if (!city_weather_code || !/^101\d{6}$/.test(city_weather_code)) {
            return res.send({ code: -1, msg: "城市气象编码格式不正确" });
        }
        if (!dateStr || !isValidDate(dateStr)) {
            return res.send({ code: -1, msg: "日期格式不正确" });
        }

        try {
            const isValid = await commonUtils.valid_redis_key("qweather_history", UNKEY_API_ID, api_key, req, res);
            if (!isValid) return;

            const url = `https://jr5rk6643a.re.qweatherapi.com/v7/historical/weather?location=${city_weather_code}&date=${dateStr}`;
            const response = await qweatherFetch(url);

            if (response.data?.code !== "200") {
                return res.send({ code: -1, msg: `获取历史气象失败: ${response.data?.code || 'unknown'}` });
            }

            const weatherDaily = response.data.weatherDaily || [];

            let msg = "success";
            if (api_key) {
                const { remaining } = await unkey.verifyKey(UNKEY_API_ID, api_key, 1);
                msg = `API Key 剩余调用次数：${remaining}`;
            }

            return res.send({ code: 200, msg, data: weatherDaily });

        } catch (error) {
            console.error("get_history_weather Error:", error.message);
            if (!res.headersSent) {
                return res.send({ code: -1, msg: commonUtils.MESSAGE.SERVER_ERROR });
            }
        }
    }
};

export default qweather_tool;