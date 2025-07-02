import axios from 'axios';
import fs from 'fs';
import path from 'path';

const feishu = {
    
    getAccessToken: async function (app_id, app_secret) {
        try {
            const response = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
            app_id: app_id,
            app_secret: app_secret
            });
            
            return response.data.tenant_access_token;
        } catch (error) {
            throw new Error(`获取访问凭证失败: ${error.message}`);
        }
    },
    readDoc: async function (accessToken, docToken) {
        try {
            const response = await axios.get(`https://open.feishu.cn/open-apis/docx/v1/documents/${docToken}/blocks`, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
            });
            for (const item of response.data.data.items) {
                // 在这里可以处理每个 item，例如打印或收集信息
                if(item.block_type === 2){
                    console.log(item.text.elements)
                }
            }
            return response.data.data.content;
        } catch (error) {
            throw new Error(`读取文档失败: ${error.message}`);
        }
    }
    
};

export default feishu;