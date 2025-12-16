import axios from "axios";
import unkey from './unkey.js';
import commonUtils from "./commonUtils.js";

const qwether_api_key = "f0859240db85483c8b570ca7a57c2739"
const unkey_api_id = "api_413Kmmitqy3qaDo4"

export const qweather_tool = {
    // 获取城市气象编码
    get_city_weather_code: async function (req, res) {
        // 上级行政区名称 可为 省/市
        var adm = req.body.adm
        // 想要查询气象编码的区域
        var location = req.body.location
        console.log(req.body)
        if (!location) {
            return res.send({ msg: "地区名称不可为空！" })
        }
        var api_key = req.body.api_key
        await commonUtils.valid_redis_key("qweather_get_city_weather_code1", unkey_api_id, api_key, req,res)
        var reqUrl = adm ? `https://jr5rk6643a.re.qweatherapi.com/geo/v2/city/lookup?location=${location}&adm=${adm}` : `https://jr5rk6643a.re.qweatherapi.com/geo/v2/city/lookup?location=${location}`
        console.log(reqUrl)
        var config = {
            method: "get",
            url: reqUrl,
            headers: {
                "X-QW-Api-Key": "" + qwether_api_key,
                "Content-Type": "application/json"
            }
        }
        try {
            const response = await axios(config)
            const data = response.data
            var msg = null
            if (api_key) {
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1);
                msg = `API Key 剩余调用次数：${remaining}`;
            }
            if (!response.data.code === 200) {
                return res.send({ msg: "获取气象编码失败" });
            }
            if (data.location.length == 0) {
                return res.send({ msg: "未获取到气象编码信息" })
            } else {
                return res.send({ msg: msg, data: data.location })
            }
        } catch (error) {
            console.log(error)
            return res.send({ msg: commonUtils.MESSAGE.SERVER_ERROR})
        }
    },

    // 获取历史气象信息
    get_history_weather: async function (req, res) {
        const city_weather_code = req.body.city_weather_code
        if (!city_weather_code) {
            return res.send({ msg: "城市气象代码不可为空" })
        }
        const code_match = city_weather_code.match(/^101\d{6}$/)
        if (!code_match) {
            return res.send({ msg: "城市气象编码格式不正确，请填写合规的城市气象代码" })
        }
        const dateStr = req.body.date
        if (!dateStr) {
            return res.send({ msg: "日期不可为空!" })
        }
        // 第一步：正则校验格式（4位年+2位月(01-12)+2位日(01-31)）
        const reg = /^(\d{4})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])$/;
        if (!reg.test(dateStr)) return false;

        // 第二步：拆分年、月、日并校验实际日期合法性
        const year = parseInt(dateStr.substring(0, 4), 10);
        const month = parseInt(dateStr.substring(4, 6), 10) - 1; // JS月份从0开始（0=1月，11=12月）
        const day = parseInt(dateStr.substring(6, 8), 10);

        const date = new Date(year, month, day);
        // 验证：日期对象的年/月/日与输入一致（排除2月30日、13月等非法日期）
        if (!(date.getFullYear() === year &&
            date.getMonth() === month &&
            date.getDate() === day)) {
            return res.send({ msg: "日期格式不正确，请填写合规的日期格式" })
        }

        var api_key = req.body.api_key

        await commonUtils.valid_redis_key("qweather_get_history_weather", unkey_api_id, api_key, req,res)
        var config = {
            method: "get",
            url: `https://jr5rk6643a.re.qweatherapi.com/v7/historical/weather?location=${city_weather_code}&date=${dateStr}`,
            headers: {
                "X-QW-Api-Key": "" + qwether_api_key,
                "Content-Type": "application/json"
            }
        }
        try {
            const response = await axios(config)
            const weather = response.data
            var msg = null
            if (api_key) {
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1);
                msg = `API Key 剩余调用次数：${remaining}`;
            }
            if (!response.data.code === 200) {
                return res.send({ msg: "获取气象信息失败" });
            }
            if (weather.weatherDaily.length == 0) {
                return res.send({ msg: "未获取到气象信息" })
            } else {
                return res.send({ msg: msg, data: weather.weatherDaily })
            }
        } catch (error) {
            console.log(error)
            return res.send({ msg: commonUtils.MESSAGE.SERVER_ERROR })
        }
    }
}

export default {
    qweather_tool
}