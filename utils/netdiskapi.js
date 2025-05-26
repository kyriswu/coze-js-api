const axios = require('axios');
const redis = require('./redisClient');

const API_BASE_URL = process.env.NODE_ENV === 'online' ? 'http://netdisk-api' : 'http://localhost:8080';

const netdiskapi = {
    search: async function (req, res) {
        try {
            let {dir,key,page,access_token} = req.body
            if (!access_token || !key) {
                return res.send({
                    code: -1,
                    msg: 'access_token和key不能为空',
                })
            }
            if (!dir) {
                dir = '/';
            }
            if (!dir.startsWith('/')) {
                dir = '/' + dir;
            }
            if (!page || isNaN(page) || page < 1) {
                page = 1;
            }
            // 百度网盘API的分页是每500个结果一页，所以需要将page转换为百度网盘API的页码
            new_page = Math.floor(((page-1)*10) / 500) + 1
            const response = await axios.get(API_BASE_URL + "/xpan/search" + '?access_token=' + access_token + '&dir=' + encodeURIComponent(dir) + '&key=' + encodeURIComponent(key || '') + '&page=' + new_page);
            const data = response.data;
            if (data.message && data.message.includes('身份验证失败')) {
                return res.send({
                    code: -1,
                    msg: '身份验证失败，打开链接获取授权码：https://openapi.baidu.com/oauth/2.0/authorize?response_type=code&client_id=W3oykF2rUQgQa62s79DS2xUxKbp2SFFL&redirect_uri=oob&scope=basic,netdisk&device_id=26145626',
                });
            }
            // 计算当前页的起始和结束索引（基于0开始）
            const startIndex = (page - 1) * 10;
            const endIndex = page * 10; // 不包含此索引

            // 从原始数据中截取当前页的数据
            data = JSON.parse(data);
            const currentPageData = data.slice(startIndex, endIndex);
            return res.send(currentPageData);
        } catch (error) {
            console.error('xpan/search error:', error.message);
            return res.send({
                code: 500,
                msg: '搜索失败，请稍后再试'
            });
        }
        
    },
    get_access_token: async function (req, res) {
        try {
            let {code} = req.body
            if (!code) {
                return res.send({
                    code: -1,
                    msg: 'code不能为空,',
                })
            }

            const token = await redis.get('netdisk_code_' + code)
            if (token) {
                const data = JSON.parse(token);
                const ttl = await redis.ttl('netdisk_code_' + code);
                return res.send({
                    code: 0,
                    msg: '获取access_token成功，你可以使用它进行后续的API调用',
                    data: {
                        access_token: data.access_token,
                        expires_in: ttl
                    }
                });
            }

            const response = await axios.get(API_BASE_URL + "/xpan/access_token?code=" + code);
            const data = JSON.parse(response.data.data);
            
            if (data.access_token) {
                await redis.set('netdisk_code_' + code, JSON.stringify(data), 'EX', data.expires_in);
                return res.send({
                    code: 0,
                    msg: '获取access_token成功，你可以使用它进行后续的API调用',
                    data: {
                        access_token: data.access_token,
                        expires_in: data.expires_in
                    }
                });
            }else{
                return res.send({
                    code: -1,
                    msg: '获取access_token失败，请检查code是否正确，重新打开链接获取授权码：https://openapi.baidu.com/oauth/2.0/authorize?response_type=code&client_id=W3oykF2rUQgQa62s79DS2xUxKbp2SFFL&redirect_uri=oob&scope=basic,netdisk&device_id=26145626',
                });
            }
            return res.send(data);
        } catch (error) {
            console.error('xpan/get_access_token error:', error.message);
            console.error('xpan/get_access_token URL:', API_BASE_URL + "/xpan/access_token?code=");
            return res.send({
                code: 500,
                msg: '出现错误，请稍后再试'
            });
        }
        
    },
    get_dlink: async function (req, res) {
        try {
            let {fsid, access_token} = req.body
            if (!fsid || !access_token) {
                return res.send({
                    code: -1,
                    msg: 'fsid和access_token不能为空,',
                })
            }

            const response = await axios.get(API_BASE_URL + "/xpan/dlink?fsid=" + fsid + '&access_token=' + access_token);
            const data = response.data;
            
            return res.send({
                code: 0,
                msg: 'Success',
                data: data
            });
        } catch (error) {
            console.error('xpan/filemetainfo error:', error.message);
            return res.send({
                code: 500,
                msg: '出现错误，请稍后再试'
            });
        }
        
    },
    refresh_token: async function (req, res) {
        try {
            let {refresh_token} = req.body
            if (!refresh_token) {
                return res.send({
                    code: -1,
                    msg: 'refresh_token不能为空,',
                })
            }

            const response = await axios.get(API_BASE_URL + "/xpan/refresh_token?refresh_token=" + refresh_token);
            const data = response.data;
            
            return res.send({
                code: 0,
                msg: 'Success',
                data: data
            });
        } catch (error) {
            console.error('xpan/refresh_token error:', error.message);
            return res.send({
                code: 500,
                msg: '出现错误，请稍后再试'
            });
        }
        
    },
    filemetainfo: async function (req, res) {
        try {
            let {fsid,access_token} = req.body
            if(!fsid || !access_token) {
                return res.send({
                    code: -1,
                    msg: 'fsid和access_token不能为空,',
                })
            }

            const response = await axios.get(API_BASE_URL + "/xpan/filemetainfo?fsid=" + fsid + '&access_token=' + access_token);
            const data = response.data.data;
            
            return res.send({
                code: 0,
                msg: 'Success',
                data: data
            });
        } catch (error) {
            console.error('xpan/filemetainfo error:', error.message);
            return res.send({
                code: 500,
                msg: '出现错误，请稍后再试'
            });
        }
        
    }

    
};

module.exports = netdiskapi;