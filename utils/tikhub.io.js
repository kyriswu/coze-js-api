import axios from 'axios';
import unkey from './unkey.js';
import redis from './redisClient.js';
import commonUtils from './commonUtils.js';
import { text } from 'express';
import fs from 'fs';



// const tikhub_api_token = "k500F2ou70UEuXsHzWKAolU82AYOsIfGsK5N5ivGrXNC+VY2TN8qyjynJg==" // 这个token权限过期了，换了一个新的，权限是一样的，大家可以放心使用
const tikhub_api_token = "lp8wPv8SxwmUqkeVR7Kq2EzscySkXMl7xRKFoxS/f+KhoUnlGiyOdze4Nw=="
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
        try {
            var config = {
                method: 'get',
                url: 'https://api.tikhub.io/api/v1/youtube/web/get_video_info?video_id=' + videoId,
                headers: {
                    "Authorization": "Bearer k500F2ou70UEuXsHzWKAolU82AYOsIfGsK5N5ivGrXNC+VY2TN8qyjynJg=="
                }
            };

            const response = await axios(config)
            if (response.data.code == 200) {
                return response.data.data
            }
        } catch (error) {
            console.error("获取Youtube视频信息失败:", error.message);
            throw new Error("获取Youtube视频信息失败，请稍后再试");
        }
    },

    // 获取 YouTube 频道视频列表
    get_channel_videos_v2: async function (req, res) {
        const paramsFromReq = {
            ...(req.query || {}),
            ...(req.body || {})
        };

        const {
            channel_id,
            lang = 'en-US',
            sortBy = 'newest',
            contentType = 'videos',
            nextToken,
            api_key
        } = paramsFromReq;

        if (!channel_id) {
            return res.send({ code: -1, msg: 'channel_id is required' });
        }

        try {
            const isValid = await commonUtils.valid_redis_key('yt_channel_videos_v2', unkey_api_id, api_key, req, res);
            if (!isValid) return;

            const apiUrl = 'https://api.tikhub.io/api/v1/youtube/web/get_channel_videos_v2';
            const queryParams = {
                channel_id,
                lang,
                sortBy,
                contentType
            };

            if (typeof nextToken !== 'undefined') {
                queryParams.nextToken = nextToken;
            }

            const response = await axios.get(apiUrl, {
                params: queryParams,
                headers: {
                    'Authorization': `Bearer ${tikhub_api_token}`
                }
            });

            if (response.data?.code !== 200) {
                return res.send({ code: -1, msg: '获取频道视频列表失败' });
            }

            let msg = 'success';
            if (api_key) {
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1, { platform: 'youtube', action: 'channel_videos' });
                msg = `API Key 剩余积分：${remaining}`;
            }

            return res.send({
                code: 200,
                msg,
                data: response.data.data || {}
            });
        } catch (error) {
            console.error('YouTube Channel Videos Error:', error.response ? error.response.data : error.message);
            if (!res.headersSent) {
                return res.send({ code: -1, msg: commonUtils.MESSAGE.SERVER_ERROR });
            }
        }
    }

};

export const th_bilibili = {
    get_aid_cid: async function (url) {
        return new Promise(async (resolve, reject) => {
            // 1. 从链接中提取出 BV 号
            const matched = url.match(/\/video\/(BV[0-9A-Za-z]+)/i);
            if (!matched) {
                reject({ success: false, aid: null, cid: null, error: "不是B站链接" })
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
                reject({ success: false, aid: null, cid: null, error: "获取aid,cid失败" })
            }
            // 3. 解析 aid 和 cid
            const aid = json.data.aid;
            const cid = json.data.pages[0].cid;
            resolve({ success: true, aid: aid, cid: cid, error: null })
        })
    },
    fetch_user_post_videos: async function (req, res) {
        const paramsFromReq = {
            ...(req.query || {}),
            ...(req.body || {})
        };

        const {
            user_id,
            post_filter = 'archive',
            page,
            ps,
            api_key
        } = paramsFromReq;

        if (!user_id) {
            return res.send({ code: -1, msg: 'user_id is required' });
        }

        try {
            const isValid = await commonUtils.valid_redis_key('bilibili_user_post_videos', unkey_api_id, api_key, req, res);
            if (!isValid) return;

            const queryParams = { user_id, post_filter };
            if (typeof page !== 'undefined' && page !== '') {
                queryParams.page = page;
            }
            if (typeof ps !== 'undefined' && ps !== '') {
                queryParams.ps = ps;
            }

            const response = await axios.get('https://api.tikhub.io/api/v1/bilibili/app/fetch_user_videos', {
                params: queryParams,
                headers: {
                    'Authorization': `Bearer ${tikhub_api_token}`
                }
            });

            if (response.data?.code !== 200) {
                return res.send({ code: -1, msg: '获取用户投稿视频失败' });
            }

            let msg = 'success';
            if (api_key) {
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1, { platform: 'bilibili', action: 'user_post_videos' });
                msg = `API Key 剩余积分：${remaining}`;
            }

            return res.send({
                code: 200,
                msg,
                data: response.data.data.data.item || {}
            });
        } catch (error) {
            console.error('Bilibili User Post Videos Error:', error.response ? error.response.data : error.message);
            if (!res.headersSent) {
                return res.send({ code: -1, msg: commonUtils.MESSAGE.SERVER_ERROR });
            }
        }
    },
    fetch_one_video_v2: async function (req, res) {
        var api_key = req.body.api_key
        var url = req.body.url
        if (!url) {
            return res.send({ msg: "url is required" })
        }

        // 1. 从链接中提取出 BV 号
        const matched = url.match(/\/video\/(BV[0-9A-Za-z]+)/i);
        if (!matched) {
            return res.send({ msg: "无法从链接中提取 BV 号" })
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
            return res.send({ msg: "视频不存在或已被删除" })
        }
        // 3. 解析 aid 和 cid
        const aid = json.data.aid;
        const cid = json.data.pages[0].cid;


        //==验证==
        const redis_key = req.headers['user-identity'] ? 'th_bilibili_' + req.headers['user-identity'] : 'test';
        const value = await redis.get(redis_key);
        if (value === null) {
            // 不存在，创建 key 并设置初始值
            const now = new Date();
            const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const secondsSinceMidnight = Math.floor((now - midnight) / 1000);
            await redis.set(redis_key, 0, 'EX', secondsSinceMidnight);
        } else {
            if (!api_key) {
                return res.send({ msg: commonUtils.MESSAGE.FREE_KEY_EXPIRED_1 })
            } else {
                const { keyId, valid, remaining, code } = await unkey.verifyKey(unkey_api_id, api_key, 0);
                if (!valid) {
                    return res.send({
                        msg: 'API Key 无效或已过期，请检查后重试！'
                    });
                }
                if (remaining == 0) {
                    return res.send({
                        msg: 'API Key 积分已用完，请联系作者续费！'
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
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1, { platform: 'bilibili', action: 'video_subtitle' });
                msg = `API Key 剩余积分：${remaining}`;
            }

            if (videoInfo.subtitle.subtitles.length == 0) {
                return res.send({ msg: "该视频没有字幕" })
            } else {
                const subtitleUrl = "https:" + videoInfo.subtitle.subtitles[0].subtitle_url;
                const subtitleResponse = await fetch(subtitleUrl, {
                    headers: { 'Accept': 'application/json' }
                });
                if (!subtitleResponse.ok) {
                    return res.send({ msg: "字幕内容获取失败" });
                }
                const subtitleContent = await subtitleResponse.json();
                return res.send({
                    msg: msg,
                    data: subtitleContent,
                })
            }
        } catch (error) {
            console.log(error)
            return res.send({ msg: "服务器错误，请重试" })
        }
    },

    fetch_video_comments: async function (req, res) {
        const paramsFromReq = {
            ...(req.query || {}),
            ...(req.body || {})
        };

        const {
            av_id,
            bv_id,
            mode = 3,
            next_offset = 0,
            api_key
        } = paramsFromReq;

        if (!av_id && !bv_id) {
            return res.send({ code: -1, msg: 'av_id 或 bv_id 不能为空' });
        }

        try {
            const isValid = await commonUtils.valid_redis_key('bilibili_video_comments', unkey_api_id, api_key, req, res);
            if (!isValid) return;

            const queryParams = { mode, next_offset };
            if (av_id) queryParams.av_id = av_id;
            if (bv_id) queryParams.bv_id = bv_id;

            const response = await axios.get('https://api.tikhub.io/api/v1/bilibili/app/fetch_video_comments', {
                params: queryParams,
                headers: {
                    'Authorization': `Bearer ${tikhub_api_token}`
                }
            });

            if (response.data?.code !== 200) {
                return res.send({ code: -1, msg: '获取视频评论失败' });
            }

            let msg = 'success';
            if (api_key) {
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1, { platform: 'bilibili', action: 'video_comments' });
                msg = `API Key 剩余积分：${remaining}`;
            }

            return res.send({
                code: 200,
                msg,
                data: response.data.data.data.replies || {}
            });
        } catch (error) {
            console.error('Bilibili Video Comments Error:', error.response ? error.response.data : error.message);
            if (!res.headersSent) {
                return res.send({ code: -1, msg: commonUtils.MESSAGE.SERVER_ERROR });
            }
        }
    },

    get_video_link: async function (url) {
        const { success, aid, cid, error } = await this.get_aid_cid(url)
        console.log(success, aid, cid, error)
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
        } catch (error) {
            console.log(error)
            return res.send({ msg: "服务器错误，请重试" })
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
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1, { platform: 'xiaohongshu', action: 'note_info' });
                msg = `API Key 剩余积分：${remaining}`;
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
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1, { platform: 'xiaohongshu', action: 'search_notes' });
                msg = `API Key 剩余积分：${remaining}`;
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
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1, { platform: 'xiaohongshu', action: 'home_notes' });
                msg = `API Key 剩余积分：${remaining}`;
            }

            return res.send({ code: 200, msg, data: notes });
        } catch (error) {
            return res.send({ code: -1, msg: commonUtils.MESSAGE.SERVER_ERROR });
        }
    }
};

// 辅助函数：统一处理 TikHub 的请求逻辑
async function tikhubRequest(url) {
    return axios.get(
        url,
        {
            headers: {
                "Authorization": `Bearer ${tikhub_api_token}` // 请确保该变量已在作用域内定义
            }
        }
    );
}

function normalizeWechatArticleDetail(data) {
    const detail = data || {};

    return {
        content: detail.content || detail.html || detail.article_content || detail.rich_text || '',
        link: detail.link || detail.url || detail.article_url || detail.mp_url || '',
        title: detail.title || detail.article_title || detail.nick_name || ''
    };
}

// 微信公众号
export const th_wechat_media = {
    /**
     * 获取微信公众号文章列表
     */
    get_wechat_mp_article_list: async function (req, res) {
        const { gh_id, offset, api_key } = req.body;
        if (!gh_id) return res.send({ code: -1, msg: "公众号用户id不能为空" });
        try {
            const isValid = await commonUtils.valid_redis_key("wx_mp_list", unkey_api_id, api_key, req, res);
            if (!isValid) return;

            const apiUrl = "https://api.tikhub.io/api/v1/wechat_mp/web/fetch_mp_article_list";

            const response = await axios.get(apiUrl, {
                params: {
                    ghid: gh_id,   // 这里会自动被编码，例如 '+' 变成 '%2B'
                    offset: offset
                },
                headers: { "Authorization": `Bearer ${tikhub_api_token}`, "Content-Type": "application/json", }
            });
            if (response.data?.code !== 200) return res.send({ code: -1, msg: "获取列表失败" });
            const data = response.data.data || [];
            let msg = "success";
            if (api_key) {
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 2, { platform: 'wechat_mp', action: 'article_list' });
                msg = `API Key 剩余积分：${remaining}`;
            }
            return res.send({ code: 200, msg, data });
        } catch (error) {
            console.error("Fetch WeChat MP Article List Error:", error);
            if (!res.headersSent) return res.send({ code: -1, msg: commonUtils.MESSAGE.SERVER_ERROR });
        }
    },

    /**
     * 搜索微信公众号文章
     */
    fetch_search_article: async function (req, res) {
        const paramsFromReq = {
            ...(req.query || {}),
            ...(req.body || {})
        };

        const {
            keyword,
            offset = 0,
            sort_type = '_0',
            api_key
        } = paramsFromReq;

        if (!keyword) {
            return res.send({ code: -1, msg: 'keyword is required' });
        }

        if (!['_0', '_2', '_4'].includes(String(sort_type))) {
            return res.send({ code: -1, msg: 'sort_type 必须是 _0 / _2 / _4' });
        }

        const maxAttempts = 3;
        const minBackoffMs = 300;
        const maxBackoffMs = 1200;
        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        const getRandomBackoff = () => Math.floor(Math.random() * (maxBackoffMs - minBackoffMs + 1)) + minBackoffMs;
        const isTransientHttpError = (error) => {
            const status = error?.response?.status;
            return !status || [429, 500, 502, 503, 504].includes(status);
        };

        try {
            const isValid = await commonUtils.valid_redis_key('wx_mp_search_article', unkey_api_id, api_key, req, res);
            if (!isValid) return;

            let response = null;
            let lastError = null;

            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    response = await axios.get('https://api.tikhub.io/api/v1/wechat_mp/web/fetch_search_article', {
                        params: {
                            keyword,
                            offset,
                            sort_type
                        },
                        headers: {
                            'Authorization': `Bearer ${tikhub_api_token}`
                        }
                    });

                    if (response.data?.code === 200) {
                        break;
                    }

                    if (attempt < maxAttempts) {
                        const delayMs = getRandomBackoff();
                        console.warn(`[wx_mp_search_article] upstream code=${response.data?.code}, retrying ${attempt + 1}/${maxAttempts} in ${delayMs}ms`);
                        await sleep(delayMs);
                        continue;
                    }

                    return res.send({ code: -1, msg: response.data?.message_zh || response.data?.message || '搜索公众号文章失败' });
                } catch (error) {
                    lastError = error;
                    const canRetry = attempt < maxAttempts && isTransientHttpError(error);

                    if (!canRetry) {
                        throw error;
                    }

                    const delayMs = getRandomBackoff();
                    const status = error?.response?.status || 'NETWORK';
                    console.warn(`[wx_mp_search_article] transient error status=${status}, retrying ${attempt + 1}/${maxAttempts} in ${delayMs}ms`);
                    await sleep(delayMs);
                }
            }

            if (!response || response.data?.code !== 200) {
                if (lastError) {
                    throw lastError;
                }
                return res.send({ code: -1, msg: '搜索公众号文章失败' });
            }

            let msg = 'success';
            if (api_key) {
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 2, { platform: 'wechat_mp', action: 'search_article' });
                msg = `API Key 剩余积分：${remaining}`;
            }

            return res.send({
                code: 200,
                msg,
                data: response.data.data || {}
            });
        } catch (error) {
            console.error('Fetch WeChat MP Search Article Error:', error.response ? error.response.data : error.message);
            if (!res.headersSent) {
                return res.send({ code: -1, msg: commonUtils.MESSAGE.SERVER_ERROR });
            }
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
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1, { platform: 'wechat_mp', action: `article_detail_${type}` });
                msg = `API Key 剩余积分：${remaining}`;
            }

            const data = ['json', 'html'].includes(type)
                ? normalizeWechatArticleDetail(response.data.data)
                : (response.data.data || {});

            return res.send({ code: 200, msg, data });
        } catch (error) {
            if (!res.headersSent) return res.send({ code: -1, msg: commonUtils.MESSAGE.SERVER_ERROR });
        }
    },

    fetch_mp_article_detail_json: function (req, res) { return this._fetch_detail('json', req, res); },
    fetch_mp_article_detail_html: function (req, res) { return this._fetch_detail('html', req, res); },
    fetch_mp_article_read_count: function (req, res) { return this._fetch_detail('read_count', req, res); },
    fetch_mp_article_comment_list: function (req, res) { return this._fetch_detail('comment_list', req, res); },
    mp_url_long2short: function (req, res) { return this._fetch_detail('url_conversion', req, res); }
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
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1, { platform: 'wechat_channels', action: 'search_videos' });
                msg = `API Key 剩余积分：${remaining}`;
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
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1, { platform: 'wechat_channels', action: 'home_page' });
                msg = `API Key 剩余积分：${remaining}`;
            }

            return res.send({ code: 200, msg, data: response.data.data });
        } catch (error) {
            if (!res.headersSent) return res.send({ code: -1, msg: commonUtils.MESSAGE.SERVER_ERROR });
        }
    }
};


export const th_douyin = {
    //获取用户主页作品数据
    fetch_user_post_videos: async function (req, res) {
        // sec_user_id: 用户sec_user_id
        // max_cursor: 最大游标，用于翻页，第一页为0，第二页为第一次响应中的max_cursor值。
        // count: 最大数量，不要超过20，建议保持不变。
        // sort_type: 排序类型，可选值如下：
        // 0: 最新排序-默认
        // 1: 最热排序
        let { sec_user_id, max_cursor, count, sort_type, api_key } = req.body;
        if (!sec_user_id) {
            return res.send({ code: -1, msg: "抖音用户ID不能为空" });
        }
        if (!max_cursor) {
            max_cursor = "0"
        }
        if (!count) {
            count = "10"
        }
        if (!sort_type) {
            sort_type = "0"
        }
        try {
            // 重要：必须判断并 return。如果校验失败，commonUtils 内部会发出 res.send
            const isValid = await commonUtils.valid_redis_key("dy_user_post_videos", unkey_api_id, api_key, req, res);
            if (!isValid) return;

            const url = `https://api.tikhub.io/api/v1/douyin/app/v3/fetch_user_post_videos?sec_user_id=${sec_user_id}&max_cursor=${max_cursor}&count=${count}&sort_type=${sort_type}`;

            const response = await axios.get(url, {
                headers: { "Authorization": `Bearer ${tikhub_api_token}` }
            });

            // 修正判断逻辑：response.data.code !== 200
            if (response.data?.code !== 200) {
                return res.send({ code: -1, msg: "获取笔记失败" });
            }

            const d = response.data.data;
            if (!d || (Array.isArray(d) && d.length === 0)) {
                return res.send({ code: -1, msg: "没有找到相关数据" });
            }
            const list = d.aweme_list || [];
            const arr = list.map(item => {
                // 提取 aweme_info，防止 item 为空报错
                const author = item.author || {};
                const video = item.video || {};
                const statistics = item.statistics || {};
                return {
                    author_name: author.nickname || "",     // 作者昵称
                    signature: author.signature || "",      // 简介
                    sec_uid: author.sec_uid || "",          // 用户ID
                    author_avatar: author.avatar_larger?.url_list?.[0] || "",          // 用户头像
                    share_url: item.share_url || "",        // 分享链接
                    desc: item.desc || "",                  // 视频描述
                    caption: item.caption || "",            // 视频tag
                    title: item.item_title || "",           // 视频标题
                    video_duration: video.duration || 0,    // 视频时长
                    // 使用可选链 ?. 防止深层路径不存在导致报错
                    video_url: video.play_addr?.url_list?.[0] || "",
                    comment_count: statistics.comment_count || 0, // 评论量
                    like_count: statistics.digg_count || 0,       // 点赞量
                    collect_count: statistics.collect_count || 0, // 收藏量
                    share_count: statistics.share_count || 0,
                    aweme_id: item.aweme_id || "",          // 视频ID
                };
            });
            // 统一扣费与消息处理
            let msg = "success";
            if (api_key) {
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1, { platform: 'douyin', action: 'user_post_videos' });
                msg = `API Key 剩余积分：${remaining}`;
            }
            return res.send({ code: 200, msg, data: { info: arr, max_cursor: d.max_cursor, min_cursor: d.min_cursor } });

        } catch (error) {
            console.error("DouYin Viedos Info Error:", error);
            return res.send({ code: -1, msg: commonUtils.MESSAGE.SERVER_ERROR });
        }
    },

    // 获取用户主页作品数据（原始返回，扣费2点）
    fetch_user_post_videos_v3: async function (req, res) {
        const paramsFromReq = {
            ...(req.query || {}),
            ...(req.body || {})
        };

        let {
            sec_user_id,
            max_cursor = "0",
            count = "10",
            sort_type = "0",
            api_key
        } = paramsFromReq;

        if (!sec_user_id) {
            return res.send({ code: -1, msg: "抖音用户ID不能为空" });
        }

        try {
            const isValid = await commonUtils.valid_redis_key("dy_user_post_videos_v3", unkey_api_id, api_key, req, res);
            if (!isValid) return;

            const apiUrl = "https://api.tikhub.io/api/v1/douyin/app/v3/fetch_user_post_videos";
            const response = await axios.get(apiUrl, {
                params: {
                    sec_user_id,
                    max_cursor,
                    count,
                    sort_type
                },
                headers: {
                    "Authorization": `Bearer ${tikhub_api_token}`
                }
            });

            if (response.data?.code !== 200) {
                return res.send({ code: -1, msg: "获取用户主页作品失败" });
            }

            const data = response.data.data;
            if (!data || (Array.isArray(data) && data.length === 0)) {
                return res.send({ code: -1, msg: "没有找到相关数据" });
            }

            let msg = "success";
            if (api_key) {
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 2, { platform: 'douyin', action: 'user_post_videos_v3' });
                msg = `API Key 剩余积分：${remaining}`;
            }

            return res.send({ code: 200, msg, data });
        } catch (error) {
            console.error("DouYin User Post Videos V3 Error:", error.message);
            return res.send({ code: -1, msg: commonUtils.MESSAGE.SERVER_ERROR });
        }
    },
    //获取综合搜索
    fetch_general_search_v1: async function (req, res) {
        //keyword: 搜索关键词，如 "猫咪"
        // cursor: 翻页游标（首次请求传 0）
        // sort_type: 排序方式
        // 0: 综合排序
        // 1: 最多点赞
        // 2: 最新发布
        // publish_time: 发布时间筛选
        // 0: 不限
        // 1: 最近一天
        // 7: 最近一周
        // 180: 最近半年
        // filter_duration: 视频时长筛选
        // 0: 不限
        // 0-1: 1分钟以内
        // 1-5: 1-5分钟
        // 5-10000: 5分钟以上
        // content_type: 内容类型筛选
        // 0: 不限
        // 1: 视频
        // 2: 图片
        // 3: 文章
        // search_id: 搜索ID（首次请求传空，翻页时从上次响应获取）
        // backtrace: 翻页回溯标识（首次请求传空，翻页时从上次响应获取）
        let { keyword, cursor, publish_time, filter_duration, content_type, search_id, backtrace, sort_type, api_key } = req.body;
        console.log("Received general search request with params:", { keyword, cursor, publish_time, filter_duration, content_type, search_id, backtrace, sort_type }); 
        if (!cursor) {
            cursor = 0
        }
        if (!sort_type) {
            sort_type = "0"
        }
        if (!keyword) {
            return res.send({ code: -1, msg: "搜索关键词不能为空" });
        }
        if (!publish_time) {
            publish_time = "0"
        }
        // if (!filter_duration) {
        //     filter_duration = "0"
        // }
        if (!content_type) {
            content_type = "0"
        }
        const data = {
            "keyword": keyword,
            "cursor": cursor,
            "sort_type": sort_type,
            "publish_time": publish_time,
            // "filter_duration": filter_duration,
            "search_id": filter_duration,// 先临时使用filter_duraton字段传递search_id，后续如果接口更新了再调整
            "content_type": content_type,
            "search_id": search_id,
            "backtrace": backtrace
        }
        console.log("Received general search request with data:", data);
        try {
            // 重要：必须判断并 return。如果校验失败，commonUtils 内部会发出 res.send
            const isValid = await commonUtils.valid_redis_key("dy_general_search_v3", unkey_api_id, api_key, req, res);
            if (!isValid) return;

            const url = `https://api.tikhub.io/api/v1/douyin/search/fetch_general_search_v1`;

            const response = await axios.post(url, data, {
                headers: { "Authorization": `Bearer ${tikhub_api_token}` }
            });
            // 修正判断逻辑：response.data.code !== 200
            if (response.data?.code !== 200) {
                return res.send({ code: -1, msg: "第三方接口获取笔记失败" });
            }

            const d = response.data.data;
            if (!d || (Array.isArray(d) && d.length === 0)) {
                return res.send({ code: -1, msg: "没有找到相关数据" });
            }
            const list = d.data || [];
            const arr = list.map(item => {
                // 提取 aweme_info，防止 item 为空报错
                const info = item.aweme_info || {};
                const author = info.author || {};
                const video = info.video || {};
                const statistics = info.statistics || {};
                return {
                    author_name: author.nickname || "",     // 作者昵称
                    signature: author.signature || "",      // 简介
                    sec_uid: author.sec_uid || "",          // 用户ID
                    share_url: info.share_url || "",        // 分享链接
                    desc: info.desc || "",                  // 视频描述
                    caption: info.caption || "",            // 视频tag
                    title: info.item_title || "",           // 视频标题
                    video_duration: video.duration || 0,    // 视频时长
                    // 使用可选链 ?. 防止深层路径不存在导致报错
                    video_url: video.play_addr?.url_list?.[0] || "",
                    comment_count: statistics.comment_count || 0, // 评论量
                    like_count: statistics.digg_count || 0,       // 点赞量
                    collect_count: statistics.collect_count || 0, // 收藏量
                    share_count: statistics.share_count || 0,     // 分享量
                    aweme_id: info.aweme_id || "",          // 视频ID
                };
            });

            const nextSearchId =
                d.search_id ||
                d.log?.search_id ||
                d.log_pb?.impr_id ||
                d.extra?.search_request_id ||
                d.extra?.logid ||
                '';

            // 统一扣费与消息处理
            let msg = "success";
            if (api_key) {
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1, { platform: 'douyin', action: 'general_search' });
                msg = `API Key 剩余积分：${remaining}`;
            }

            if (nextSearchId) {
                msg = `${msg}，下次搜索search_id为：${nextSearchId}`;
            }

            return res.send({ code: 200, msg, data: { info: arr, cursor: d.cursor, has_more: d.has_more } });

        } catch (error) {
            console.error("DouYin Viedos Info Error:", error);
            return res.send({ code: -1, msg: commonUtils.MESSAGE.SERVER_ERROR });
        }

    },

    // 获取视频搜索结果
    fetch_video_search_v2: async function (req, res) {
        let { keyword, cursor, publish_time, filter_duration, content_type, search_id, backtrace, sort_type, api_key } = req.body;
        if (!cursor) {
            cursor = 0
        }
        if (!sort_type) {
            sort_type = "0"
        }
        if (!keyword) {
            return res.send({ code: -1, msg: "搜索关键词不能为空" });
        }
        if (!publish_time) {
            publish_time = "0"
        }
        if (!filter_duration) {
            filter_duration = "0"
        }
        if (!content_type) {
            content_type = "0"
        }
        const data = {
            "keyword": keyword,
            "cursor": cursor,
            "sort_type": sort_type,
            "publish_time": publish_time,
            "filter_duration": filter_duration,
            "content_type": content_type,
            "search_id": search_id || "",
            "backtrace": backtrace || ""
        }
        try {
            const isValid = await commonUtils.valid_redis_key("dy_video_search_v2", unkey_api_id, api_key, req, res);
            if (!isValid) return;

            const url = `https://api.tikhub.io/api/v1/douyin/search/fetch_video_search_v2`;

            const response = await axios.post(url, data, {
                headers: { "Authorization": `Bearer ${tikhub_api_token}` }
            });

            if (response.data?.code !== 200) {
                return res.send({ code: -1, msg: "第三方接口获取视频搜索结果失败" });
            }

            const d = response.data.data;
            if (!d || (Array.isArray(d) && d.length === 0)) {
                return res.send({ code: -1, msg: "没有找到相关数据" });
            }
            const businessConfig = d.business_config || {};
            const nextPage = businessConfig.next_page || {};
            const list = d.business_data || d.data || d.aweme_list || [];
 
            const arr = list.map(item => {
                const info = item.data?.aweme_info || item.data || item.aweme_info || item;
                const author = info.author || {};
                const video = info.video || {};
                const statistics = info.statistics || {};
                const share_info = info.share_info || {};
                // console.log(share_info)
                return {
                    author_name: author.nickname || "",
                    signature: author.signature || "",
                    sec_uid: author.sec_uid || "",
                    author_avatar: author.avatar_larger?.url_list?.[0] || "",
                    share_url: info.share_url || "",
                    desc: info.desc || "",
                    caption: info.caption || "",
                    title: info.item_title || info.desc || "",
                    create_time: info.create_time || 0,
                    video_duration: video.duration || 0,
                    video_url: video.play_addr?.url_list?.[0] || "",
                    comment_count: statistics.comment_count || 0,
                    like_count: statistics.digg_count || 0,
                    collect_count: statistics.collect_count || 0,
                    share_count: statistics.share_count || 0,
                    aweme_id: info.aweme_id || "",
                };
            });

            let msg = "success";
            if (api_key) {
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1, { platform: 'douyin', action: 'video_search' });
                msg = `API Key 剩余积分：${remaining}`;
            }

            return res.send({
                code: 200,
                msg,
                data: {
                    info: arr,
                    cursor: nextPage.cursor,
                    has_more: businessConfig.has_more,
                    search_id: nextPage.search_id || d.log?.search_id,
                    backtrace: businessConfig.backtrace
                }
            });

        } catch (error) {
            console.error("DouYin Video Search Error:", error.message);
            return res.send({ code: -1, msg: commonUtils.MESSAGE.SERVER_ERROR });
        }
    },

    // 通过id获取一二级评论信息
    fetch_video_comments: async function (req, res) {
        let { aweme_id, api_key, cursor = "0", count = "20" } = req.body;
        if (!aweme_id) {
            return res.send({ code: -1, msg: "作品ID不能为空" });
        }
        try {
            // 重要：必须判断并 return。如果校验失败，commonUtils 内部会发出 res.send
            const isValid = await commonUtils.valid_redis_key("dy_fetch_video_comments", unkey_api_id, api_key, req, res);
            if (!isValid) return;
            const url = `https://api.tikhub.io/api/v1/douyin/app/v3/fetch_video_comments`;
            const response = await axios.get(url, {
                params: { "aweme_id": aweme_id, "cursor": cursor, "count": count },
                headers: { "Authorization": `Bearer ${tikhub_api_token}` }
            });
            // 修正判断逻辑：response.data.code !== 200
            if (response.data?.code !== 200) {
                return res.send({ code: -1, msg: "获取评论失败" });
            }
            const d = response.data.data;
            if (!d || (Array.isArray(d) && d.length === 0)) {
                return res.send({ code: -1, msg: "没有找到相关数据" });
            }
            const list = d.comments || [];
            const arr = list.map(item => {
                const reply_text = (item.reply_comment || []).map(r => {
                    return {
                        aweme_id: item.aweme_id || "", // 视频ID
                        text: r.text || "", // 回复评论内容
                        cid: r.cid || "", // 回复评论ID
                        cip: r.ip_label || "", // 回复IP地址
                        reply_time: r.create_time || 0, // 回复时间
                        nickname: r.user.nickname || "", // 回复用户昵称
                    };
                })
                return {
                    aweme_id: item.aweme_id || "", // 视频ID
                    text: item.text || "",     // 评论
                    cid: item.cid || "", // 评论ID
                    cip: item.ip_label || "",   // 评论IP地址
                    comment_time: item.create_time || 0, // 评论时间
                    reply_text: reply_text || [], // 回复评论
                    nickname: item.user.nickname || "", // 评论用户昵称
                };
            });
            let msg = "success";
            if (api_key) {
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1, { platform: 'douyin', action: 'video_comments' });
                msg = `API Key 剩余积分：${remaining}`;
            }
            return res.send({ code: 200, msg, data: { info: arr, has_more: d.has_more, cursor: d.cursor } });

        } catch (error) {
            console.error("DouYin Viedos Info Error:", error.message);
            return res.send({ code: -1, msg: commonUtils.MESSAGE.SERVER_ERROR });
        }
    }
}

export const th_tiktok = {
    // TikTok 通过 aweme_id 获取评论
    fetch_post_comment: async function (req, res) {
        let { aweme_id, cursor = "0", count = "20", current_region = "", api_key } = req.body;
        if (!aweme_id) {
            return res.send({ code: -1, msg: "作品ID不能为空" });
        }
        try {
            const isValid = await commonUtils.valid_redis_key("tt_fetch_post_comment", unkey_api_id, api_key, req, res);
            if (!isValid) return;

            const url = `https://api.tikhub.io/api/v1/tiktok/web/fetch_post_comment`;
            const response = await axios.get(url, {
                params: { aweme_id, cursor, count, current_region },
                headers: { "Authorization": `Bearer ${tikhub_api_token}` }
            });

            if (response.data?.code !== 200) {
                return res.send({ code: -1, msg: "获取评论失败" });
            }

            let msg = "success";
            if (api_key) {
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1, { platform: 'tiktok', action: 'post_comment' });
                msg = `API Key 剩余積分：${remaining}`;
            }

            return res.send({ code: 200, msg, data: response.data.data || {} });
        } catch (error) {
            console.error("TikTok Comments Error:", error.message);
            return res.send({ code: -1, msg: commonUtils.MESSAGE.SERVER_ERROR });
        }
    },

    // TikTok 获取指定用户信息
    handler_user_profile: async function (req, res) {
        const paramsFromReq = {
            ...(req.query || {}),
            ...(req.body || {})
        };

        const sec_user_id = String(paramsFromReq.sec_user_id || '').trim();
        const user_id = String(paramsFromReq.user_id || '').trim();
        const unique_id = String(paramsFromReq.unique_id || '').trim();
        const api_key = paramsFromReq.api_key;

        let selectedType = '';
        let selectedValue = '';

        if (sec_user_id) {
            selectedType = 'sec_user_id';
            selectedValue = sec_user_id;
        } else if (user_id) {
            selectedType = 'user_id';
            selectedValue = user_id;
        } else if (unique_id) {
            selectedType = 'unique_id';
            selectedValue = unique_id;
        }

        if (!selectedType) {
            return res.send({ code: -1, msg: 'sec_user_id、user_id、unique_id 至少填写一个' });
        }

        if (selectedType === 'user_id' && !/^\d+$/.test(selectedValue)) {
            return res.send({ code: -1, msg: 'user_id 必须为纯数字字符串' });
        }

        try {
            const isValid = await commonUtils.valid_redis_key('tt_handler_user_profile', unkey_api_id, api_key, req, res);
            if (!isValid) return;

            const response = await axios.get('https://api.tikhub.io/api/v1/tiktok/app/v3/handler_user_profile', {
                params: {
                    [selectedType]: selectedValue
                },
                headers: {
                    Authorization: `Bearer ${tikhub_api_token}`
                }
            });

            if (response.data?.code !== 200) {
                return res.send({
                    code: -1,
                    msg: response.data?.message_zh || response.data?.message || '获取用户信息失败'
                });
            }

            const rawData = response.data?.data || {};
            const profileRoot = rawData.user || rawData.user_info || rawData.userInfo || rawData || {};
            const statsRoot = rawData.stats || rawData.statistics || profileRoot.stats || profileRoot || {};
            const avatarUrl =
                profileRoot.avatar_url ||
                profileRoot.avatar_thumb?.url_list?.[0] ||
                profileRoot.avatar_medium?.url_list?.[0] ||
                profileRoot.avatar_larger?.url_list?.[0] ||
                '';

            const profile = {
                user_id: profileRoot.user_id || profileRoot.uid || '',
                sec_user_id: profileRoot.sec_uid || profileRoot.sec_user_id || '',
                unique_id: profileRoot.unique_id || profileRoot.username || '',
                nickname: profileRoot.nickname || '',
                signature: profileRoot.signature || '',
                region: profileRoot.region || '',
                avatar_url: avatarUrl,
                verified: Boolean(
                    profileRoot.verified ||
                    profileRoot.is_verified ||
                    Number(profileRoot.verification_type) > 0 ||
                    Number(profileRoot.verification_badge_type) > 0
                ),
                follower_count: Number(statsRoot.follower_count || statsRoot.followerCount || 0),
                following_count: Number(statsRoot.following_count || statsRoot.followingCount || 0),
                aweme_count: Number(statsRoot.aweme_count || statsRoot.video_count || 0),
                total_favorited: Number(statsRoot.total_favorited || statsRoot.totalLiked || 0),
                favoriting_count: Number(statsRoot.favoriting_count || 0),
                status_code: Number(rawData.status_code || 0)
            };

            let msg = 'success';
            if (api_key) {
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1, { platform: 'tiktok', action: 'handler_user_profile' });
                msg = `API Key 剩余积分：${remaining}`;
            }

            return res.send({
                code: 200,
                msg,
                params_used: {
                    type: selectedType,
                    value: selectedValue
                },
                profile,
                data: rawData
            });
        } catch (error) {
            console.error('TikTok Handler User Profile Error:', error.response ? error.response.data : error.message);
            return res.send({ code: -1, msg: commonUtils.MESSAGE.SERVER_ERROR });
        }
    },

    // TikTok 获取用户主页作品数据 V3（精简数据-更快速）
    fetch_user_post_videos_v3: async function (req, res) {
        const paramsFromReq = {
            ...(req.query || {}),
            ...(req.body || {})
        };

        const sec_user_id = String(paramsFromReq.sec_user_id || '').trim();
        const unique_id = String(paramsFromReq.unique_id || '').trim();
        const max_cursor = Number(paramsFromReq.max_cursor) || 0;
        const count = Number(paramsFromReq.count) || 20;
        const sort_type = Number(paramsFromReq.sort_type) || 0;
        const api_key = paramsFromReq.api_key;

        let selectedType = '';
        let selectedValue = '';

        if (sec_user_id) {
            selectedType = 'sec_user_id';
            selectedValue = sec_user_id;
        } else if (unique_id) {
            selectedType = 'unique_id';
            selectedValue = unique_id;
        }

        if (!selectedType) {
            return res.send({ code: -1, msg: 'sec_user_id 和 unique_id 至少填写一个' });
        }

        try {
            const isValid = await commonUtils.valid_redis_key('tt_fetch_user_post_videos_v3', unkey_api_id, api_key, req, res);
            if (!isValid) return;

            const queryParams = {
                [selectedType]: selectedValue,
                max_cursor,
                count,
                sort_type
            };

            const response = await axios.get('https://api.tikhub.io/api/v1/tiktok/app/v3/fetch_user_post_videos_v3', {
                params: queryParams,
                headers: {
                    Authorization: `Bearer ${tikhub_api_token}`
                }
            });

            if (response.data?.code !== 200) {
                return res.send({
                    code: -1,
                    msg: response.data?.message_zh || response.data?.message || '获取用户作品失败'
                });
            }

            const rawData = response.data?.data || {};
            const videoList = rawData.aweme_list || rawData.videos || [];

            const videoSummary = videoList.slice(0, 5).map(v => ({
                video_id: v.aweme_id || v.id || '',
                desc: (v.desc || v.title || '').substring(0, 100),
                create_time: v.create_time || v.timestamp || 0,
                statistics: {
                    digg_count: Number(v.statistics?.digg_count || v.digg_count || 0),
                    comment_count: Number(v.statistics?.comment_count || v.comment_count || 0),
                    share_count: Number(v.statistics?.share_count || v.share_count || 0),
                    play_count: Number(v.statistics?.play_count || v.play_count || 0)
                }
            }));

            let msg = 'success';
            if (api_key) {
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1, { platform: 'tiktok', action: 'fetch_user_post_videos_v3' });
                msg = `API Key 剩余积分：${remaining}`;
            }

            return res.send({
                code: 200,
                msg,
                params_used: {
                    type: selectedType,
                    value: selectedValue,
                    max_cursor,
                    count,
                    sort_type
                },
                video_summary: videoSummary,
                pagination: {
                    max_cursor: rawData.max_cursor || 0,
                    has_more: rawData.has_more || false,
                    total_count: videoList.length
                },
                data: rawData
            });
        } catch (error) {
            console.error('TikTok Fetch User Post Videos V3 Error:', error.response ? error.response.data : error.message);
            return res.send({ code: -1, msg: commonUtils.MESSAGE.SERVER_ERROR });
        }
    }
}

export const th_twitter = {
    fetch_tweet_detail: async function (req, res) {
        const paramsFromReq = {
            ...(req.query || {}),
            ...(req.body || {})
        };

        const { tweet_id, api_key } = paramsFromReq;

        if (!tweet_id) {
            return res.send({ code: -1, msg: 'tweet_id is required' });
        }

        try {
            const isValid = await commonUtils.valid_redis_key('twitter_fetch_tweet_detail', unkey_api_id, api_key, req, res);
            if (!isValid) return;

            const response = await axios.get('https://api.tikhub.io/api/v1/twitter/web/fetch_tweet_detail', {
                params: { tweet_id },
                headers: {
                    'Authorization': `Bearer ${tikhub_api_token}`
                }
            });

            if (response.data?.code !== 200) {
                return res.send({ code: -1, msg: response.data?.message_zh || response.data?.message || '获取推文详情失败' });
            }

            let msg = 'success';
            if (api_key) {
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1, { platform: 'twitter', action: 'fetch_tweet_detail' });
                msg = `API Key 剩余积分：${remaining}`;
            }

            return res.send({
                code: 200,
                msg,
                data: response.data.data || {}
            });
        } catch (error) {
            console.error('Twitter Fetch Tweet Detail Error:', error.response ? error.response.data : error.message);
            return res.send({ code: -1, msg: commonUtils.MESSAGE.SERVER_ERROR });
        }
    },
    fetch_search_timeline: async function (req, res) {
        const paramsFromReq = {
            ...(req.query || {}),
            ...(req.body || {})
        };

        const { keyword, search_type = 'Top', cursor, api_key } = paramsFromReq;

        if (!keyword) {
            return res.send({ code: -1, msg: 'keyword is required' });
        }

        try {
            const isValid = await commonUtils.valid_redis_key('twitter_fetch_search_timeline', unkey_api_id, api_key, req, res);
            if (!isValid) return;

            const queryParams = {
                keyword,
                search_type
            };
            if (cursor) {
                queryParams.cursor = cursor;
            }

            const response = await axios.get('https://api.tikhub.io/api/v1/twitter/web/fetch_search_timeline', {
                params: queryParams,
                headers: {
                    'Authorization': `Bearer ${tikhub_api_token}`
                }
            });

            if (response.data?.code !== 200) {
                return res.send({ code: -1, msg: response.data?.message_zh || response.data?.message || '获取搜索结果失败' });
            }

            let msg = 'success';
            if (api_key) {
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1, { platform: 'twitter', action: 'fetch_search_timeline' });
                msg = `API Key 剩余积分：${remaining}`;
            }

            return res.send({
                code: 200,
                msg,
                data: response.data.data || {}
            });
        } catch (error) {
            console.error('Twitter Fetch Search Timeline Error:', error.response ? error.response.data : error.message);
            return res.send({ code: -1, msg: commonUtils.MESSAGE.SERVER_ERROR });
        }
    }
}

// 抖音billboard创作者中心
export const th_douyin_billboard = {
    /**
     * 获取抖音上升热点榜
     * 参数说明：
     * page: 页码（必填）
     * page_size: 每页数量（必填）
     * order: 排序方式，可选值 rank（热度排序）、rank_diff（热度升序）
     * sentence_tag: 热点分类标签（可选）
     * keyword: 热点搜索词（可选）
     */
    fetch_hot_rise_list: async function (req, res) {
        const paramsFromReq = {
            ...(req.query || {}),
            ...(req.body || {})
        };

        const {
            page = 1,
            page_size = 10,
            order = "rank",
            sentence_tag = "",
            keyword = "",
            api_key
        } = paramsFromReq;

        try {
            const isValid = await commonUtils.valid_redis_key('douyin_billboard_hot_rise_list', unkey_api_id, api_key, req, res);
            if (!isValid) return;

            const queryParams = {
                page,
                page_size,
                order
            };

            // 可选参数
            if (sentence_tag) queryParams.sentence_tag = sentence_tag;
            if (keyword) queryParams.keyword = keyword;

            const response = await axios.get('https://api.tikhub.io/api/v1/douyin/billboard/fetch_hot_rise_list', {
                params: queryParams,
                headers: {
                    'Authorization': `Bearer ${tikhub_api_token}`
                }
            });

            if (response.data?.code !== 200) {
                return res.send({ code: -1, msg: response.data?.msg || '获取数据失败' });
            }

            let msg = 'success';
            if (api_key) {
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1, { platform: 'douyin', action: 'billboard_hot_rise_list' });
                msg = `success, 剩余点数: ${remaining}`;
            }

            return res.send({
                code: 200,
                msg,
                data: response.data.data || {}
            });
        } catch (error) {
            console.error('Douyin Billboard Hot Rise List Error:', error.response ? error.response.data : error.message);
            if (!res.headersSent) {
                return res.send({ code: -1, msg: '服务器错误，请重试' });
            }
        }
    },

    /**
     * 获取抖音同城热点榜
     * 参数说明：
     * page: 页码（必填）
     * page_size: 每页数量（必填）
     * order: 排序方式，可选值 rank（热度排序）、rank_diff（排名变化）
     * city_code: 城市编码，从城市列表获取，空为全部（可选）
     * sentence_tag: 热点分类标签，多个分类用逗号分隔，空为全部（可选）
     * keyword: 热点搜索词（可选）
     */
    fetch_hot_city_list: async function (req, res) {
        const paramsFromReq = {
            ...(req.query || {}),
            ...(req.body || {})
        };

        const {
            page = 1,
            page_size = 10,
            order = "rank",
            city_code = "",
            sentence_tag = "",
            keyword = "",
            api_key
        } = paramsFromReq;

        try {
            const isValid = await commonUtils.valid_redis_key('douyin_billboard_hot_city_list', unkey_api_id, api_key, req, res);
            if (!isValid) return;

            const queryParams = {
                page,
                page_size,
                order
            };

            // 可选参数
            if (city_code) queryParams.city_code = city_code;
            if (sentence_tag) queryParams.sentence_tag = sentence_tag;
            if (keyword) queryParams.keyword = keyword;

            const response = await axios.get('https://api.tikhub.io/api/v1/douyin/billboard/fetch_hot_city_list', {
                params: queryParams,
                headers: {
                    'Authorization': `Bearer ${tikhub_api_token}`
                }
            });

            if (response.data?.code !== 200) {
                return res.send({ code: -1, msg: response.data?.msg || '获取数据失败' });
            }

            let msg = 'success';
            if (api_key) {
                const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, 1, { platform: 'douyin', action: 'billboard_hot_city_list' });
                msg = `success, 剩余点数: ${remaining}`;
            }

            return res.send({
                code: 200,
                msg,
                data: response.data.data || {}
            });
        } catch (error) {
            console.error('Douyin Billboard Hot City List Error:', error.response ? error.response.data : error.message);
            if (!res.headersSent) {
                return res.send({ code: -1, msg: '服务器错误，请重试' });
            }
        }
    }
};

export default {
    th_youtube,
    th_bilibili,
    th_xiaohongshu,
    th_wechat_media,
    th_wechat_channels,
    th_douyin,
    th_tiktok,
    th_twitter,
    th_douyin_billboard
}