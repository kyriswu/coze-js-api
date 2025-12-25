import { getWebAuthenticationUrl, getWebOAuthToken, refreshOAuthToken, CozeAPI } from '@coze/api';
import redis from '../redisClient.js';  // 注意：引入redis时也需要添加.js扩展名
import axios from 'axios';
import commonUtils from '../commonUtils.js';
import unkey from '../unkey.js';

const unkey_api_id = "api_413Kmmitqy3qaDo4"

const config = {
    "client_type": "web",
    "client_id": "02946235786684291985716943699095.app.coze",
    "coze_www_base": "https://www.coze.cn",
    "coze_api_base": "https://api.coze.cn",
    "client_secret": "aP3SVwQRVdwaqZeD44cJLpfqWW1Tzw5cQFErLEP391q4NBzi",
    "redirect_uris": [
        "http://localhost:3000/coze-auth-callback",
        "https://coze-js-api.devtool.uk/coze-auth-callback",
        "http://127.0.0.1:8080/callback"
    ]
}
var REDIRECT_URI = ""
if (process.env.NODE_ENV === 'online'){
    REDIRECT_URI = "https://coze-js-api.devtool.uk/coze-auth-callback";
}else{
    REDIRECT_URI = "http://localhost:3000/coze-auth-callback";
}


function timestampToDatetime(timestamp) {
    return new Date(timestamp * 1000).toLocaleString();
}

const personal_key = "pat_LFKXTpOajVc0AXlu0SM7zTppJv8yHOtlQpdxWkC5J3Xp3amTR2acHX0di0l8Dv9z"

const AuthUrl = `https://www.coze.cn/api/permission/oauth2/authorize?response_type=code&client_id=02946235786684291985716943699095.app.coze&redirect_uri=http://localhost:3000/coze-auth-callback&state=1294848`

const coze = {
    getApiClient: async function () {
        var access_token = await redis.get("coze_api_access_token")
        if(!access_token){
            const refresh_token = await redis.get("coze_api_refresh_token")
            access_token = await this.refresh_token(refresh_token)

        }
        console.log(access_token)
        const apiClient = new CozeAPI({
            token: access_token,
            baseURL: 'https://api.coze.cn'
        });
        return apiClient
    },
    callback: async function (req, res) {

        const { code } = req.query;

        if (!code) {
            return res.send({
                "code": -1,
                "msg": "code为空，授权失败"
            })
        }

        try {
            // Get access token
            const oauthToken = await getWebOAuthToken({
                baseURL: config.coze_api_base,
                clientId: config.client_id,
                clientSecret: config.client_secret,
                code: code,
                redirectUrl: REDIRECT_URI,
            });

            // Render callback page
            const expiresStr = timestampToDatetime(oauthToken.expires_in);

            await redis.set("coze_api_access_token", oauthToken.access_token, "EX", oauthToken.expires_in)
            await redis.set("coze_api_refresh_token", oauthToken.refresh_token, "EX", 3600 * 24 * 30)

            return res.send({
                token_type: "web",
                access_token: oauthToken.access_token,
                refresh_token: oauthToken.refresh_token,
                expires_in: `${oauthToken.expires_in} (${expiresStr})`,
            })
        } catch (error) {
            console.error("Failed to get access token:", error);
            return res.send({
                "code": -1,
                "msg": error.message
            })
        }
    },
    refresh_token: async function () {
        try{
            const refresh_token = await redis.get("coze_api_refresh_token")
            const oauthToken = await refreshOAuthToken({
                baseURL: config.coze_api_base,
                clientId: config.client_id,
                clientSecret: config.client_secret,
                refreshToken: refresh_token,
            });

            const expiresStr = timestampToDatetime(oauthToken.expires_in);
            console.log({
                token_type: "web",
                access_token: oauthToken.access_token,
                refresh_token: oauthToken.refresh_token,
                expires_in: `${oauthToken.expires_in} (${expiresStr})`,
            })
            await redis.set("coze_api_access_token", oauthToken.access_token, "EX", 60 * 14)
            await redis.set("coze_api_refresh_token", oauthToken.refresh_token, "EX", 3600 * 24 * 30)
            return oauthToken.access_token
        }catch(error){
            console.error("Failed to refresh token:", error);
            return ""
        }

    },
    generate_video_caption: async function (url, retried = false) {
        console.log("audio地址：", url)
        try {
            var access_token = await redis.get("coze_api_access_token")
            if (!access_token) {
                access_token = await this.refresh_token()
            }
            console.log("access_token", access_token)
            const response = await axios({
                method: 'post',
                url: 'https://api.coze.cn/v1/workflow/stream_run',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                },
                data: {
                    workflow_id: "7510990626922512396",
                    parameters: {
                        url: url,
                        language: "汉语"
                    }
                }
            });

            console.log(response.headers)
            console.log("插件原始字幕结果：", response.data);

            const messageDataMatch = response.data.match(/event:\s*message\s*data:\s*(\{[\s\S]*?)(?=\n(?:id:|event:|$))/i);

            if (messageDataMatch) {
                const messageData = messageDataMatch[1].trim();
                return JSON.parse(messageData);
            } else {
                // 只重试一次，防止死循环
                if (!retried) {
                    console.warn("未找到有效的 message data 内容，尝试重新生成字幕");
                    return await this.generate_video_caption(url, true);
                }
                throw new Error("未找到有效的 message data 内容");
            }

        } catch (error) {
            console.error("Failed to generate video caption:", error);
            throw error;
        }
    },

    /**
     * 工作流主运行接口
     */
    workflow_run: async  (req, res) => {
        const { workflow: workflow_name, api_key, parameters = {} } = req.body;

        if (!workflow_name) return res.send({ code: -1, msg: "工作流名称不能为空！" });
        if (!api_key) return res.send({ code: -1, msg: commonUtils.MESSAGE.TOKEN_EMPTY });

        try {
            const check = await unkey.verifyKey(unkey_api_id, api_key, 0);
            if (!check.valid) return res.send({ code: -1, msg: commonUtils.MESSAGE.TOKEN_EXPIRED });
            if (check.remaining <= 0) return res.send({ code: -1, msg: commonUtils.MESSAGE.TOKEN_NO_TIMES });

            const workflow_id = await commonUtils.get_one_workflow_id_from_bitable(workflow_name);

            // 【核心修复】：使用 coze 直接调用，避免 this 指向错误
            coze._runBackgroundWorkflow(workflow_id, parameters, api_key).catch(e => {
                console.error("[Fatal] 后台任务启动器异常:", e.message);
            });

            return res.send({ 
                code: 200, 
                msg: "运行中，请稍后",
                data: {
                    status: "processing",
                    workflow: workflow_name,
                    remaining_before: check.remaining
                }
            });

        } catch (error) {
            console.error("Workflow Run 入口异常:", error.message);
            return res.send({ 
                code: -1, 
                msg: error.message || commonUtils.MESSAGE.SERVER_ERROR 
            });
        }
    },

    /**
     * 内部异步处理线程
     */
    _runBackgroundWorkflow: async function (workflow_id, parameters, api_key) {
        try {
            // 这里同样建议使用 coze.getAccessToken() 替代 this.getAccessToken()
            const finalAuth = `Bearer ${personal_key}`;

            const response = await axios({
                method: 'post',
                url: 'https://api.coze.cn/v1/workflow/run',
                timeout: 180000,
                headers: {
                    'Authorization': finalAuth,
                    'Content-Type': 'application/json'
                },
                data: { workflow_id, parameters }
            });

            if (response.data.code === 0) {
                const consume = await unkey.verifyKey(unkey_api_id, api_key, 1);
                console.log(`[Success] 执行成功，扣费完成`);
            }
        } catch (error) {
            console.error(`[Background Task Failed]`, error.message);
        }
    }
}

export default coze