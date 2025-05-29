const axios = require('axios');

const faceplusplus = {
    face_detect: async function (req, res) {
        const {api_key, api_secret, image_url} = req.body
         if (!api_key || !api_secret || !image_url) {
            return res.send({
                'code':-1,
                'msg':'参数不能为空'
            });
        }

        // 初始化请求参数
        const formData = new FormData();
        formData.append('api_key', api_key);
        formData.append('api_secret', api_secret);
        // 处理图片URL
        formData.append('image_url', req.body.image_url);
        // 调用Face++ API
        try{
            const faceppResponse = await axios.post(
            'https://api-cn.faceplusplus.com/facepp/v3/detect',
            formData,
            {
                timeout: 30000 // 设置超时时间为30秒
            }
        );

        // 返回Face++ API的响应
        return res.send({
            'code':0,
            'data':faceppResponse.data
        })
        }catch(error){
            return res.send({
                'code':-1,
                "msg":error.message
            })
        }
    }
};

module.exports = faceplusplus;