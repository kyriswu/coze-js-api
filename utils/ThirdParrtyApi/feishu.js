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
    },

    /**
     * 多维表格查询记录
     * @param {*} access_token 飞书通行证
     * @param {*} bitable_token 多维表格id
     * @param {*} table_token 需要查询的数据表id
     * @param {*} filter 查询条件
     */
    bitable_search: async function (access_token,bitable_token,table_token,filter) {
        const headers = {
            'Authorization': `Bearer ${access_token}`,
        }
        try{
            const response = await axios.post(`https://open.feishu.cn/open-apis/bitable/v1/apps/${bitable_token}/tables/${table_token}/records/search`,filter,{
                headers: {
                    Authorization: `Bearer ${access_token}`
                }
            })
            return response.data
        }catch(error){
            throw new Error(`多维表格查询失败: ${error.message}`);
        }
    }
    
};

export default feishu;