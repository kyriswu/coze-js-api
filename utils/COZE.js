const axios = require('axios');
// Our official coze sdk for JavaScript [coze-js](https://github.com/coze-dev/coze-js)
import { CozeAPI } from '@coze/api';

const COZE = {
    API_generate_video_caption: async function (req, res) {

        const apiClient = new CozeAPI({
        token: {token},
        baseURL: 'https://api.coze.cn'
        });
        const res = await apiClient.workflows.runs.stream({
        workflow_id: {workflow_id},
        parameters: {},
        })
    }
};

module.exports = faceplusplus;