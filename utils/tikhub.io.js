import axios from 'axios';
import unkey from './unkey.js';
import redis from './redisClient.js';

const tikhub_api_token = "k500F2ou70UEuXsHzWKAolU82AYOsIfGsK5N5ivGrXNC+VY2TN8qyjynJg=="
const unkey_api_id = "api_413Kmmitqy3qaDo4"

export const th_youtube = {
    get_video_info: async function (url) {
        // 1. 从链接中提取出视频ID
        const matched = url.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/);
        if (!matched) {
            throw new Error("无法从链接中提取视频ID");
        }
        const videoId = matched[1];
        // 2. 调用 TikHub API 获取视频信息
        try{
            var config = {
            method: 'get',
            url: 'https://api.tikhub.io/api/v1/youtube/web/get_video_info?video_id='+videoId,
            headers: {
                "Authorization": "Bearer k500F2ou70UEuXsHzWKAolU82AYOsIfGsK5N5ivGrXNC+VY2TN8qyjynJg=="
            }
        };

        const response = await axios(config)
        if (response.data.code == 200) {
            return response.data.data
        }
        }catch (error) {
            console.error("获取Youtube视频信息失败:", error.message);
            throw new Error("获取Youtube视频信息失败，请稍后再试");
        }
    }
    
};

export const th_bilibili = {
    get_aid_cid: async function(url) {
        return new Promise(async (resolve, reject) => {
            // 1. 从链接中提取出 BV 号
            const matched = url.match(/\/video\/(BV[0-9A-Za-z]+)/i);
            if (!matched) {
                reject({success: false,aid:null,cid:null,error:"不是B站链接"})
            }
            const bvid = matched[1];

            // 2. 调用 B 站接口获取信息
            const apiUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;
            const response = await fetch(apiUrl, { 
                headers: { 'Accept': 'application/json' }
            });
            // if (!response.ok) {
            //     throw new Error(`接口请求失败：${response.status}`);
            // }
            const json = await response.json();
            console.log(json.data)
            if (json.code != 0) {
                reject({success: false,aid:null,cid:null,error:"获取aid,cid失败"})
            }
            // 3. 解析 aid 和 cid
            const aid = json.data.aid;
            const cid = json.data.pages[0].cid;
            resolve({success:true,aid:aid,cid:cid,error:null})
        })
    },
    fetch_one_video_v2: async function (req, res) {
        var api_key = req.body.api_key
        var url = req.body.url
        if (!url) {
            return res.send({msg: "url is required"})
        }

        // 1. 从链接中提取出 BV 号
        const matched = url.match(/\/video\/(BV[0-9A-Za-z]+)/i);
        if (!matched) {
            return res.send({msg: "无法从链接中提取 BV 号"})
        }
        const bvid = matched[1];

        // 2. 调用 B 站接口获取信息
        const apiUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;
        const response = await fetch(apiUrl, { 
            headers: { 'Accept': 'application/json' }
        });
        // if (!response.ok) {
        //     throw new Error(`接口请求失败：${response.status}`);
        // }
        const json = await response.json();
        console.log(json)
        if (json.code != 0) {
            return res.send({msg: "视频不存在或已被删除"})
        }
        // 3. 解析 aid 和 cid
        const aid = json.data.aid;
        const cid = json.data.pages[0].cid;


        //==验证==
        const redis_key = req.headers['user-identity'] ? 'th_bilibili_'+req.headers['user-identity'] : 'test';
        const value = await redis.get(redis_key);
        if (value === null) {
            // 不存在，创建 key 并设置初始值
            const now = new Date();
            const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const secondsSinceMidnight = Math.floor((now - midnight) / 1000);
            await redis.set(redis_key, 0, 'EX', secondsSinceMidnight);
        }else{
            if(!api_key){
                return res.send({msg: "维护成本大，每天免费使用1次，购买api_key解锁更多次数，需要请请联系作者【B站：小吴爱折腾】"})
            }else{
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


        var config = {
            method: 'get',
            url: `https://api.tikhub.io/api/v1/bilibili/web/fetch_one_video_v2?a_id=${aid}&c_id=${cid}`,
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + tikhub_api_token
            }
        };
        try {
            const response = await axios(config)
            const videoInfo = response.data.data.data
            var msg = null
            if (api_key) {
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1);
                msg = `API Key 剩余调用次数：${remaining}`;
            }

            if (videoInfo.subtitle.subtitles.length == 0) {
                return res.send({msg: "该视频没有字幕"})
            }else{
                const subtitleUrl = "https:" + videoInfo.subtitle.subtitles[0].subtitle_url;
                const subtitleResponse = await fetch(subtitleUrl, { 
                    headers: { 'Accept': 'application/json' }
                });
                if (!subtitleResponse.ok) {
                    return res.send({msg: "字幕内容获取失败"});
                }
                const subtitleContent = await subtitleResponse.json();
                return res.send({
                    msg: msg,
                    data: subtitleContent,
                })
            }
        } catch (error) {
            console.log(error)
            return res.send({msg: "服务器错误，请重试"})
        }
    },

    get_video_link: async function (url) {
        const {success,aid,cid,error} = await this.get_aid_cid(url)
        console.log(success,aid,cid,error)
        if (!success) throw new Error(error.error)
         var config = {
            method: 'get',
            url: `https://api.tikhub.io/api/v1/bilibili/web/fetch_one_video_v2?a_id=${aid}&c_id=${cid}`,
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + tikhub_api_token
            }
        };
        try {
            const response = await axios(config)
            console.log(response.data)
        }catch (error) {
            console.log(error)
            return res.send({msg: "服务器错误，请重试"})
        }
    }
}

export default {
    th_youtube,
    th_bilibili
}