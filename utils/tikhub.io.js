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

// 小红书工具模块
export const th_xiaohongshu = {
    /**
     * 获取笔记信息 V1
     */
    get_note_info_v1: async function (req, res) {
        const { note_id, share_text, api_key } = req.body;

        if (!note_id && !share_text) {
            return res.send({ code: -1, msg: "note_id 或 share_text 不能为空" });
        }

        try {
            // 重要：必须判断并 return。如果校验失败，commonUtils 内部会发出 res.send
            const isValid = await commonUtils.valid_redis_key("xhs_note_info", unkey_api_id, api_key, req, res);
            if (!isValid) return;

            const url = `https://api.tikhub.io/api/v1/xiaohongshu/app/get_note_info?${note_id ? `note_id=${note_id}` : `share_text=${encodeURIComponent(share_text)}`}`;

            const response = await axios.get(url, {
                headers: { "Authorization": `Bearer ${tikhub_api_token}` }
            });

            // 修正判断逻辑：response.data.code !== 200
            if (response.data?.code !== 200) {
                return res.send({ code: -1, msg: "第三方接口获取笔记失败" });
            }

            const note = response.data.data;
            if (!note || (Array.isArray(note) && note.length === 0)) {
                return res.send({ code: -1, msg: "没有找到笔记信息" });
            }

            // 统一扣费与消息处理
            let msg = "success";
            if (api_key) {
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1);
                msg = `API Key 剩余调用次数：${remaining}`;
            }

            return res.send({ code: 200, msg, data: note });

        } catch (error) {
            console.error("XHS Note Info Error:", error.message);
            return res.send({ code: -1, msg: commonUtils.MESSAGE.SERVER_ERROR });
        }
    },

    /**
     * 关键词搜索笔记
     */
    search_notes_v2: async function (req, res) {
        const { keyword, api_key, page = 1, sort: rawSort, publish_time: rawTime, type: rawType } = req.body;

        if (!keyword) return res.send({ code: -1, msg: "keyword is required" });

        // 统一映射逻辑
        const sortMap = { "综合排序": "general", "最热排序": "popularity_descending", "最新排序": "time_descending", "最多评论": "comment_descending", "最多收藏": "collect_descending" };
        const typeMap = { "综合笔记": "_0", "图文笔记": "_2", "视频笔记": "_1", "直播": "_3" };

        const sort = sortMap[rawSort] || "general";
        const type = typeMap[rawType] || "_0";
        const publish_time = rawTime === "不限" ? "" : (rawTime || "");

        try {
            const isValid = await commonUtils.valid_redis_key("xhs_search", unkey_api_id, api_key, req, res);
            if (!isValid) return;

            const url = `https://api.tikhub.io/api/v1/xiaohongshu/app/search_notes_v2?keyword=${encodeURIComponent(keyword)}&page=${page}&sort=${sort}&type=${type}&publish_time=${publish_time}`;
            const response = await axios.get(url, {
                headers: { "Authorization": `Bearer ${tikhub_api_token}` }
            });

            if (response.data.code !== 200) return res.send({ code: -1, msg: "搜索失败" });

            const notes = response.data.data || [];

            let msg = "success";
            if (api_key) {
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1);
                msg = `API Key 剩余调用次数：${remaining}`;
            }

            return res.send({ code: 200, msg, data: notes });
        } catch (error) {
            return res.send({ code: -1, msg: commonUtils.MESSAGE.SERVER_ERROR });
        }
    },

    /**
     * 小红书主页笔记提取
     */
    fetch_home_notes: async function (req, res) {
        const { url, api_key, cursor = null } = req.body;
        if (!url) return res.send({ code: -1, msg: "url is required" });

        // 使用正则提取 user_id
        const matched = url.match(/profile\/([0-9a-fA-F]{24})/i);
        if (!matched) return res.send({ code: -1, msg: "无效的小红书主页链接" });

        const user_id = matched[1];

        try {
            const isValid = await commonUtils.valid_redis_key('xhs_home_notes', unkey_api_id, api_key, req, res);
            if (!isValid) return;

            const apiUrl = `https://api.tikhub.io/api/v1/xiaohongshu/app/get_user_notes?user_id=${user_id}&cursor=${cursor || ''}`;
            const response = await axios.get(apiUrl, {
                headers: { "Authorization": `Bearer ${tikhub_api_token}` }
            });

            if (response.data.code !== 200) return res.send({ code: -1, msg: "获取主页笔记失败" });

            const notes = response.data.data || [];
            let msg = "success";
            if (api_key) {
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1);
                msg = `API Key 剩余调用次数：${remaining}`;
            }

            return res.send({ code: 200, msg, data: notes });
        } catch (error) {
            return res.send({ code: -1, msg: commonUtils.MESSAGE.SERVER_ERROR });
        }
    }
};

// 辅助函数：统一处理 TikHub 的请求逻辑
async function tikhubRequest(url) {
    return axios({
        method: 'get',
        url,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${tikhub_api_token}` // 请确保该变量已在作用域内定义
        }
    });
}

// 微信公众号
export const th_wechat_media = {
    /**
     * 获取微信公众号文章列表
     */
    get_wechat_mp_article_list: async function (req, res) {
        const { gh_id, offset = 0, api_key } = req.body;
        if (!gh_id) return res.send({ code: -1, msg: "公众号用户id不能为空" });

        try {
            const isValid = await commonUtils.valid_redis_key("wx_mp_list", unkey_api_id, api_key, req, res);
            if (!isValid) return;

            const url = `https://api.tikhub.io/api/v1/wechat_mp/web/fetch_mp_article_list?ghid=${gh_id}&offset=${offset}`;
            const response = await tikhubRequest(url);

            if (response.data?.code !== 200) return res.send({ code: -1, msg: "获取列表失败" });

            const data = response.data.data || [];
            let msg = "success";
            if (api_key) {
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1);
                msg = `API Key 剩余调用次数：${remaining}`;
            }

            return res.send({ code: 200, msg, data });
        } catch (error) {
            if (!res.headersSent) return res.send({ code: -1, msg: commonUtils.MESSAGE.SERVER_ERROR });
        }
    },

    /**
     * 获取文章详情（支持 JSON 和 HTML）
     * 封装通用详情获取逻辑以减少重复
     */
    _fetch_detail: async function (type, req, res) {
        const { url, api_key } = req.body;
        if (!url) return res.send({ code: -1, msg: "文章链接不能为空" });

        try {
            const isValid = await commonUtils.valid_redis_key(`wx_mp_${type}`, unkey_api_id, api_key, req, res);
            if (!isValid) return;

            const apiUrl = `https://api.tikhub.io/api/v1/wechat_mp/web/fetch_mp_article_detail_${type}?url=${encodeURIComponent(url)}`;
            const response = await tikhubRequest(apiUrl);

            if (response.data?.code !== 200) return res.send({ code: -1, msg: `获取详情${type}失败` });

            let msg = "success";
            if (api_key) {
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1);
                msg = `API Key 剩余调用次数：${remaining}`;
            }

            return res.send({ code: 200, msg, data: response.data.data });
        } catch (error) {
            if (!res.headersSent) return res.send({ code: -1, msg: commonUtils.MESSAGE.SERVER_ERROR });
        }
    },

    fetch_mp_article_detail_json: function(req, res) { return this._fetch_detail('json', req, res); },
    fetch_mp_article_detail_html: function(req, res) { return this._fetch_detail('html', req, res); },
    fetch_mp_article_read_count: function(req, res) { return this._fetch_detail('read_count', req, res); },
    fetch_mp_article_comment_list: function(req, res) { return this._fetch_detail('comment_list', req, res); },
    mp_url_long2short: function(req, res) { return this._fetch_detail('url_conversion', req, res); }
};

// 视频号
export const th_wechat_channels = {
    /**
     * 视频号搜索
     */
    search_videos_by_keyword: async function (req, res) {
        const { keyword, type, api_key } = req.body;
        if (!keyword) return res.send({ code: -1, msg: "搜索关键词不可为空！" });

        const apiMap = { "最新": "fetch_search_latest", "综合": "fetch_search_ordinary", "默认": "fetch_default_search" };
        const apiEndpoint = apiMap[type] || "fetch_default_search";

        try {
            const isValid = await commonUtils.valid_redis_key("wx_channels_search", unkey_api_id, api_key, req, res);
            if (!isValid) return;

            const url = `https://api.tikhub.io/api/v1/wechat_channels/${apiEndpoint}?keywords=${encodeURIComponent(keyword)}`;
            const response = await tikhubRequest(url);

            if (response.data?.code !== 200) return res.send({ code: -1, msg: "搜索失败" });

            let msg = "success";
            if (api_key) {
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1);
                msg = `API Key 剩余调用次数：${remaining}`;
            }

            return res.send({ code: 200, msg, data: response.data.data });
        } catch (error) {
            if (!res.headersSent) return res.send({ code: -1, msg: commonUtils.MESSAGE.SERVER_ERROR });
        }
    },

    /**
     * 视频号主页
     */
    fetch_home_page: async function (req, res) {
        const { username, last_buffer = "", api_key } = req.body;
        if (!username) return res.send({ code: -1, msg: "用户名不能为空" });

        try {
            const isValid = await commonUtils.valid_redis_key("wx_channels_home", unkey_api_id, api_key, req, res);
            if (!isValid) return;

            const url = `https://api.tikhub.io/api/v1/wechat_channels/fetch_home_page?username=${username}&last_buffer=${last_buffer}`;
            const response = await tikhubRequest(url);

            if (response.data?.code !== 200) return res.send({ code: -1, msg: "获取主页失败" });

            let msg = "success";
            if (api_key) {
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1);
                msg = `API Key 剩余调用次数：${remaining}`;
            }

            return res.send({ code: 200, msg, data: response.data.data });
        } catch (error) {
            if (!res.headersSent) return res.send({ code: -1, msg: commonUtils.MESSAGE.SERVER_ERROR });
        }
    }
};

export default {
    th_youtube,
    th_bilibili,
    th_xiaohongshu,
    th_wechat_media,
    th_wechat_channels
}