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
                return res.send({msg: commonUtils.MESSAGE.FREE_KEY_EXPIRED_1})
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
        await commonUtils.valid_redis_key("th_xiaohongshu_get_note_info_v1",unkey_api_id,api_key,req,res)
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
            return res.send({ msg: "服务器错误，请重试" })
        }

    },
    // 关键词搜索笔记
    search_notes_v2: async function (req, res) {
        var keyword = req.body.keyword
        if (!keyword) {
            return res.send({ msg: "keyword is required" })
        }
        var keyword = req.body.keyword
        if (!keyword) {
            return res.send({ msg: "keyword is required" })
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
        } else {
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
        } else {
            if (publish_time == "不限") {
                publish_time = ""
            }
        }

        // 笔记类型
        var type = req.body.type
        if (!type) {
            type = "_0"
        } else {
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

        await commonUtils.valid_redis_key("th_xiaohongshu_search_notes_v2", unkey_api_id, api_key, req, res);

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
            }
            if (response.data.code !== 200) {
                return res.send({ msg: "获取笔记失败" })
            }
            if (notes.length === 0) {
                return res.send({ msg: "没有找到笔记" })
            } else {
                return res.send({ msg: msg, data: notes })
            }
        } catch (error) {
            console.log(error)
            return res.send({ msg: commonUtils.MESSAGE.SERVER_ERROR })
        }
    },

    // 小红书主页笔记
    fetch_home_notes: async function (req, res) {
        var url = req.body.url
        if (!url) {
            return res.send({ msg: "url is required" })
        }
        // 从链接中提取出user_id
        const matched = req.body.url.match(/profile\/([0-9a-fA-F]{24})(?:\?|#|$)/i);
        if (!matched) {
            return res.send({ msg: "不是小红书链接，无法从链接中提取用户ID" })
        }
        const user_id = matched[1];
        var api_key = req.body.api_key
        var cursor = req.body.cursor
        if (!cursor) {
            cursor = null
        }

        await commonUtils.valid_redis_key('th_xiaohongshu_fetch_home_notes', unkey_api_id, api_key, req, res);
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
            }
            if (response.data.code !== 200) {
                return res.send({ msg: "获取用户笔记失败" });
            }
            if (notes.length == 0) {
                return res.send({ msg: "该用户没有笔记" })
            } else {
                return res.send({ msg: msg, data: notes })
            }
        } catch (error) {
            console.log(error)
            return res.send({ msg: commonUtils.MESSAGE.SERVER_ERROR })
        }

    }
}

// 公众号
export const th_wechat_media = {
    //通过公众号用户id获取微信公众号文章列表
    get_wechat_mp_article_list: async function (req, res) {
        const gh_id = req.body.gh_id
        if (!gh_id) {
            res.send({ msg: "公众号用户id不能为空" })
        }
        // 偏移量
        const offset = req.body.offset
        const api_key = req.body.api_key
        await commonUtils.valid_redis_key("th_wx_mp_articles", unkey_api_id, api_key, req, res)
        const config = {
            method: 'get',
            url: `https://api.tikhub.io/api/v1/wechat_mp/web/fetch_mp_article_list?ghid=${gh_id}`,
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + tikhub_api_token
            }
        };
        try {
            const response = await axios(config)
            const d = response.data.data
            let msg = null;
            if (api_key) {
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1);
                msg = `API Key 剩余调用次数：${remaining}`;
            }
            if (response.data.code !== 200) {
                return res.send({ msg: "获取微信公众号文章列表失败" });
            }
            if (d.length === 0) {
                return res.send({ msg: "未获取微信公众号文章列表" })
            } else {
                return res.send({ msg: msg, data: d })
            }
        } catch (error) {
            console.log(error)
            return res.send({ msg: commonUtils.MESSAGE.SERVER_ERROR })
        }
    },

    // 获取公众号文章详情JSON
    fetch_mp_article_detail_json: async function (req, res) {
        const url = req.body.url
        if (!url) {
            res.send({ msg: "公众号文章链接不能为空" })
        }
        const api_key = req.body.api_key
        await commonUtils.valid_redis_key("th_wx_mp_article_json", unkey_api_id, api_key, req, res)
        const config = {
            method: 'get',
            url: `https://api.tikhub.io/api/v1/wechat_mp/web/fetch_mp_article_detail_json?url=${url}`,
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + tikhub_api_token
            }
        };
        try {
            const response = await axios(config)
            const d = response.data.data
            let msg = null;
            if (api_key) {
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1);
                msg = `API Key 剩余调用次数：${remaining}`;
            }
            if (response.data.code !== 200) {
                return res.send({ msg: "获取公众号文章详情JSON失败" });
            }
            if (d.length === 0) {
                return res.send({ msg: "未获取公众号文章详情JSON" })
            } else {
                return res.send({ msg: msg, data: d })
            }
        } catch (error) {
            console.log(error)
            return res.send({ msg: commonUtils.MESSAGE.SERVER_ERROR })
        }
    },

    // 获取公众号文章详情html
    fetch_mp_article_detail_html: async function (req, res) {
        const url = req.body.url
        if (!url) {
            res.send({ msg: "公众号文章链接不能为空" })
        }
        const api_key = req.body.api_key
        await commonUtils.valid_redis_key("th_wx_mp_article_html", unkey_api_id, api_key, req, res)
        const config = {
            method: 'get',
            url: `https://api.tikhub.io/api/v1/wechat_mp/web/fetch_mp_article_detail_html?url=${url}`,
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + tikhub_api_token
            }
        };
        try {
            const response = await axios(config)
            const d = response.data.data
            let msg = null;
            if (api_key) {
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1);
                msg = `API Key 剩余调用次数：${remaining}`;
            }
            if (response.data.code !== 200) {
                return res.send({ msg: "获取公众号文章详情html失败" });
            }
            if (d.length === 0) {
                return res.send({ msg: "未获取公众号文章详情html内容" })
            } else {
                return res.send({ msg: msg, data: d })
            }
        } catch (error) {
            console.log(error)
            return res.send({ msg: commonUtils.MESSAGE.SERVER_ERROR })
        }
    },


    // 获取公众号文章阅读量
    fetch_mp_article_read_count: async function (req, res) {
        const url = req.body.url
        if (!url) {
            res.send({ msg: "公众号文章链接不能为空" })
        }
        const api_key = req.body.api_key
        await commonUtils.valid_redis_key("th_wx_mp_article_read_count", unkey_api_id, api_key, req, res)

        const config = {
            method: 'get',
            url: `https://api.tikhub.io/api/v1/wechat_mp/web/fetch_mp_article_read_count?url=${url}`,
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + tikhub_api_token
            }
        };
        try {
            const response = await axios(config)
            const d = response.data.data
            let msg = null;
            if (api_key) {
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1);
                msg = `API Key 剩余调用次数：${remaining}`;
            }
            if (response.data.code !== 200) {
                return res.send({ msg: "获取公众号文章阅读量失败" });
            }
            if (d.length === 0) {
                return res.send({ msg: "未获取到阅读量" })
            } else {
                return res.send({ msg: msg, data: d })
            }
        } catch (error) {
            console.log(error)
            return res.send({ msg: commonUtils.MESSAGE.SERVER_ERROR })
        }
    },

    // 获取微信公众号文章评论列表
    fetch_mp_article_comment_list: async function (req, res) {
        const url = req.body.url
        if (!url) {
            res.send({ msg: "公众号文章链接不能为空" })
        }
        const api_key = req.body.api_key
        await commonUtils.valid_redis_key("th_wx_mp_article_comments", unkey_api_id, api_key, req, res)

        const config = {
            method: 'get',
            url: `https://api.tikhub.io/api/v1/wechat_mp/web/fetch_mp_article_comment_list?url=${url}`,
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + tikhub_api_token
            }
        };
        try {
            const response = await axios(config)
            const d = response.data.data
            let msg = null;
            if (api_key) {
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1);
                msg = `API Key 剩余调用次数：${remaining}`;
            }
            if (response.data.code !== 200) {
                return res.send({ msg: "获取微信公众号文章评论列表失败" });
            }
            if (d.length === 0) {
                return res.send({ msg: "该文章没有评论" })
            } else {
                return res.send({ msg: msg, data: d })
            }
        } catch (error) {
            console.log(error)
            return res.send({ msg: commonUtils.MESSAGE.SERVER_ERROR })
        }
    },

    // 获取微信公众号长链接转短链接
    mp_url_long2short: async function (req, res) {
        const url = req.body.url
        if (!url) {
            res.send({ msg: "公众号文章链接不能为空" })
        }
        const api_key = req.body.api_key
        await commonUtils.valid_redis_key("th_wx_mp_article_comments", unkey_api_id, api_key, req, res)

        const config = {
            method: 'get',
            url: `https://api.tikhub.io/api/v1/wechat_mp/web/fetch_mp_article_url_conversion?url=${url}`,
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + tikhub_api_token
            }
        };
        try {
            const response = await axios(config)
            const d = response.data.data
            let msg = null;
            if (api_key) {
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1);
                msg = `API Key 剩余调用次数：${remaining}`;
            }
            if (response.data.code !== 200) {
                return res.send({ msg: "链接长转短失败" });
            }
            if (d.length === 0) {
                return res.send({ msg: "未获取到短链接" })
            } else {
                return res.send({ msg: msg, data: d })
            }
        } catch (error) {
            console.log(error)
            return res.send({ msg: commonUtils.MESSAGE.SERVER_ERROR })
        }
    }
}

// 视频号
export const th_wechat_channels = {
    // 微信视频号搜索
    search_videos_by_keyword: async function (req, res) {
        const keyword = req.body.keyword
        const type = req.body.type
        if (!keyword) {
            res.send({ msg: "搜索关键词不可为空！" })
        }
        let api = "fetch_default_search"
        if (type) {
            if (type === "默认") {
                api = "fetch_default_search"
            } else if (type === "最新") {
                api = "fetch_search_latest"
            } else if (type === "综合") {
                api = "fetch_search_ordinary"
            }
        }
        const api_key = req.body.api_key
        const session_buffer = req.body.session_buffer
        await commonUtils.valid_redis_key("th_wx_channels_key_search", unkey_api_id, api_key, req, res)

        const config = {
            method: 'get',
            url: `https://api.tikhub.io/api/v1/wechat_channels/${api}?keywords=${keyword}`,
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + tikhub_api_token
            }
        };
        try {
            const response = await axios(config)
            const d = response.data.data
            let msg = null;
            if (api_key) {
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1);
                msg = `API Key 剩余调用次数：${remaining}`;
            }
            if (response.data.code !== 200) {
                return res.send({ msg: "获取相关信息失败" });
            }
            if (d.length === 0) {
                return res.send({ msg: "未获取到相关信息" })
            } else {
                return res.send({ msg: msg, data: d })
            }
        } catch (error) {
            console.log(error)
            return res.send({ msg: commonUtils.MESSAGE.SERVER_ERROR })
        }
    },

    //微信视频号视频详情
    fetch_video_detail: async function (req, res) {
        const id = req.body.id
        if (!id) {
            res.send({ msg: "视频id不能为空" })
        }
        const api_key = req.body.api_key
        await commonUtils.valid_redis_key("th_wx_video_detail", unkey_api_id, api_key, req, res)
        const config = {
            method: 'get',
            url: `https://api.tikhub.io/api/v1/wechat_channels/fetch_video_detail?id=${id}`,
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + tikhub_api_token
            }
        };
        try {
            const response = await axios(config)
            const d = response.data.data
            let msg = null;
            if (api_key) {
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1);
                msg = `API Key 剩余调用次数：${remaining}`;
            }
            if (response.data.code !== 200) {
                return res.send({ msg: "获取微信视频号视频详情失败" });
            }
            if (d.length === 0) {
                return res.send({ msg: "未获取到视频号视频详情" })
            } else {
                return res.send({ msg: msg, data: d })
            }
        } catch (error) {
            console.log(error)
            return res.send({ msg: commonUtils.MESSAGE.SERVER_ERROR })
        }
    },

    //微信视频号主页
    fetch_home_page: async function (req, res) {
        const username = req.body.username
        if (!username) {
            res.send({ msg: "用户名不能为空" })
        }
        const last_buffer = req.body.last_buffer
        const api_key = req.body.api_key
        await commonUtils.valid_redis_key("th_wx_video_detail", unkey_api_id, api_key, req, res)
        const config = {
            method: 'get',
            url: `https://api.tikhub.io/api/v1/wechat_channels/fetch_home_page?username=${username}&last_buffer=${last_buffer ? last_buffer : ""}`,
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + tikhub_api_token
            }
        };
        try {
            const response = await axios(config)
            const d = response.data.data
            let msg = null;
            if (api_key) {
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1);
                msg = `API Key 剩余调用次数：${remaining}`;
            }
            if (response.data.code !== 200) {
                return res.send({ msg: "获取微信视频号主页信息失败" });
            }
            if (d.length === 0) {
                return res.send({ msg: "没有获取到相关信息" })
            } else {
                return res.send({ msg: msg, data: d })
            }
        } catch (error) {
            console.log(error)
            return res.send({ msg: commonUtils.MESSAGE.SERVER_ERROR })
        }
    },

    //微信视频号热门话题
    fetch_hot_words: async function (req, res) {
        const api_key = req.body.api_key
        await commonUtils.valid_redis_key("th_wx_video_detail", unkey_api_id, api_key, req, res)
        const config = {
            method: 'get',
            url: `https://api.tikhub.io/api/v1/wechat_channels/fetch_hot_words`,
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + tikhub_api_token
            }
        };
        try {
            const response = await axios(config)
            const d = response.data.data
            let msg = null;
            if (api_key) {
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1);
                msg = `API Key 剩余调用次数：${remaining}`;
            }
            if (response.data.code !== 200) {
                return res.send({ msg: "获取热门话题失败" });
            }
            if (d.length === 0) {
                return res.send({ msg: "未获取到热门话题" })
            } else {
                return res.send({ msg: msg, data: d })
            }
        } catch (error) {
            console.log(error)
            return res.send({ msg: commonUtils.MESSAGE.SERVER_ERROR })
        }
    },

}

export default {
    th_youtube,
    th_bilibili,
    th_xiaohongshu,
    th_wechat_media,
    th_wechat_channels
}