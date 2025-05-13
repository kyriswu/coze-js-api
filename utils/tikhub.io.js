const axios = require('axios');
const e = require('express');

const api_token = "k500F2ou70UEuXsHzWKAolU82AYOsIfGsK5N5ivGrXNC+VY2TN8qyjynJg=="

const th_youtube = {
    get_video_info: async function (url, actions) {
        var config = {
            method: 'get',
            url: 'https://api.tikhub.io/api/v1/youtube/web/get_video_info?video_id=LuIL5JATZsc',
            headers: {
                "Authorization": "Bearer k500F2ou70UEuXsHzWKAolU82AYOsIfGsK5N5ivGrXNC+VY2TN8qyjynJg=="
            }
        };

        const response = await axios(config)
        if (response.data.code == 200) {}
    },
    
};

const th_bilibili = {
    fetch_one_video_v2: async function (req, res) {
        var video_id = req.body.video_id
        if (!video_id) {
            return res.status(400).send({msg: "video_id is required"})
        }

        // 2. 调用 B 站接口获取信息
        const apiUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${video_id}`;
        const response = await fetch(apiUrl, { 
            headers: { 'Accept': 'application/json' }
        });
        // if (!response.ok) {
        //     throw new Error(`接口请求失败：${response.status}`);
        // }
        const json = await response.json();
        if (json.code != 0) {
            return res.status(400).send({msg: "视频不存在或已被删除"})
        }
        // 3. 解析 aid 和 cid
        const aid = json.data.aid;
        const cid = json.data.pages[0].cid;

        var config = {
            method: 'get',
            url: `https://api.tikhub.io/api/v1/bilibili/web/fetch_one_video_v2?a_id=${aid}&c_id=${cid}`,
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + api_token
            }
        };
        try {
            const response = await axios(config)
            const videoInfo = response.data.data.data
            if (videoInfo.subtitle.subtitles.length == 0) {
                return res.status(400).send({msg: "该视频没有字幕"})
            }else{
                const subtitleUrl = "https:" + videoInfo.subtitle.subtitles[0].subtitle_url;
                const subtitleResponse = await fetch(subtitleUrl, { 
                    headers: { 'Accept': 'application/json' }
                });
                if (!subtitleResponse.ok) {
                    return res.status(400).send({msg: "字幕内容获取失败"});
                }
                const subtitleContent = await subtitleResponse.json();
                return res.send({
                    data: subtitleContent,
                })
            }
        } catch (error) {
            console.log(error)
            return res.status(500).send({msg: "服务器错误，请重试"})
        }
    },
}

module.exports = {
    th_youtube: th_youtube,
    th_bilibili: th_bilibili
}