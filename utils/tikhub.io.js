import axios from 'axios';
import unkey from './unkey.js';
import redis from './redisClient.js';
import commonUtils from './commonUtils.js'; 



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

// 小红书
export const th_xiaohongshu = {
    // 获取笔记信息 V1
    get_note_info_v1:async function (req, res) {
        var note_id = req.body.note_id
        var share_text = req.body.share_text
        if (!note_id && !share_text) {
            return res.send({msg: "note_id or share_text is required"})
        }

        var api_key = req.body.api_key
        const free_key = await commonUtils.valid_redis_key("th_xiaohongshu_get_note_info_v1",unkey_api_id,api_key,req)
        var config = {
            method: 'get',
            url: `https://api.tikhub.io/api/v1/xiaohongshu/app/get_note_info?`+ (note_id ? `note_id=${note_id}` : `share_text=${share_text}`),
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + tikhub_api_token
            }
        };
        try {
            const response = await axios(config)
            const note = response.data.data
            var msg = null
            if (api_key) {
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1);
                msg = `API Key 剩余调用次数：${remaining}`;
            }else{
                await redis.incr(free_key);//每次调用增加一次
                msg = `今日免费使用次数：${3 - await commonUtils.free_key_used(free_key)}`;
            }
            if(!response.data.code==200){
                return res.send({msg: "获取笔记失败"})
            }
            if(note.length==0){
                return res.send({msg: "没有找到笔记"})
            }else{
                return res.send({msg: msg, data: note})
            }
            
        } catch (error) {
            console.log(error)
            return res.send({msg: "服务器错误，请重试"})
        }
        
    },
    // 关键词搜索笔记
    search_notes_v2:async function (req, res) {
        var keyword = req.body.keyword
        if (!keyword) {
            return res.send({msg: "keyword is required"})
        }
        var keyword = req.body.keyword
        if (!keyword) {
            return res.send({msg: "keyword is required"})
        }
        var api_key = req.body.api_key  

        // 页码
        var page = req.body.page
        if (!page) {
            page = 1
        }
        
        // 排序
        var sort = req.body.sort
        if (!sort) {
            sort = "general"
        }else{
            switch (sort) {
                case "综合排序":
                    sort = "general"
                    break
                case "最热排序":
                    sort = "popularity_descending"
                    break
                case "最新排序":
                    sort = "time_descending"
                    break
                case "最多评论":
                    sort = "comment_descending"
                    break
                case "最多收藏":
                    sort = "collect_descending"
                    break
                default:
                    sort = "general"
                    break
            }
        }

        // 发布时间
        var publish_time = req.body.publish_time
        if (!publish_time) {
            publish_time = ""
        }else{
           if(publish_time == "不限"){
                publish_time = ""
           }
        }

        // 笔记类型
        var type = req.body.type
        if (!type) {
            type = "_0"
        }else{
            switch (type) {
                case "综合笔记":
                    type = "_0"
                    break
                case "图文笔记":
                    type = "_2"
                    break
                case "视频笔记":
                    type = "_1"
                    break
                case "直播":
                    type = "_3"
                    break
                default:
                    type = "_0"
                    break
            }
        }

        const free_key = await commonUtils.valid_redis_key("th_xiaohongshu_search_notes_v2",unkey_api_id,api_key,req);

        var config = {
            method: 'get',
            url: `https://api.tikhub.io/api/v1/xiaohongshu/app/search_notes_v2?keyword=${keyword}&page=${page}&sort=${sort}&type=${type}&publish_time=${publish_time}`,
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + tikhub_api_token
            }
        };
        try {
            const response = await axios(config)
            console.log(response.data)
            const notes = response.data.data
            var msg = null
            if (api_key) {
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1);
                msg = `API Key 剩余调用次数：${remaining}`;
            }else{
                await redis.incr(free_key);//每次调用增加一次
                msg = `今日免费使用次数：${3 - await commonUtils.free_key_used(free_key)}`;
            }
            if(!response.data.code==200){
                return res.send({msg: "获取笔记失败"})
            }
            if(notes.length===0){
                return res.send({msg: "没有找到笔记"})
            }else{
                return res.send({msg: msg, data: notes})
            }
        } catch (error) {
            console.log(error)
            return res.send({msg: "服务器错误，请重试"})
        }
    },

    // 小红书主页笔记
    fetch_home_notes:async function (req, res) {
        var url = req.body.url
        if (!url) {
            return res.send({msg: "url is required"})
        }
        // 从链接中提取出user_id
        const matched = req.body.url.match(/profile\/([0-9a-fA-F]{24})(?:\?|#|$)/i);
        if (!matched) {
            return res.send({msg: "不是小红书链接，无法从链接中提取用户ID"})
        }
        const user_id = matched[1];
        var api_key = req.body.api_key
        var cursor = req.body.cursor
        if (!cursor) {
            cursor = null
        }

        const free_key = await commonUtils.valid_redis_key('th_xiaohongshu_fetch_home_notes',unkey_api_id,api_key,req);
        var config = {
            method: 'get',
            url: `https://api.tikhub.io/api/v1/xiaohongshu/app/get_user_notes?user_id=${user_id}&cursor=${cursor}`,
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + tikhub_api_token
            }
        };
        try {
            const response = await axios(config)
            const notes = response.data.data
            var msg = null
            if (api_key) {
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1);
                msg = `API Key 剩余调用次数：${remaining}`;
            }else{
                await redis.incr(free_key);//每次调用增加一次
                msg = `今日免费使用次数：${3 - await commonUtils.free_key_used(free_key)}`;
            }
            if (!response.data.code == 200) {
                return res.send({msg: "获取用户笔记失败"});
            }   
            if (notes.length == 0) {
                return res.send({msg: "该用户没有笔记"})
            }else{
                return res.send({msg: msg, data: notes})    
            }
        } catch (error) {
            console.log(error)
            return res.send({msg: "服务器错误，请重试"})
        }

    }
}
export default {
    th_youtube,
    th_bilibili,
    th_xiaohongshu
}