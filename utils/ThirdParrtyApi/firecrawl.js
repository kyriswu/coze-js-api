import axios from 'axios';
import fs from 'fs';
import path from 'path';

var base_url = 'http://172.245.84.92:3002';
if (process.env.NODE_ENV === 'online') {
    base_url = 'http://172.17.0.1:3002';
}

const firecrawlTool = {
    
    batch_scrape: async function (urls) {

        const url = base_url + '/v1/batch/scrape';
        
        const headers = {
            'Content-Type': 'application/json',
        };

        const data = {
            skipTlsVerification: false,
            urls: urls,
        };

        console.log('Batch scrape request:', data);

        try {
            const response = await axios.post(url, data, { headers });
            return response.data.url
        } catch (error) {
            console.error('Error:', error.response ? error.response.data : error.message);
            throw error;
        }
    },
    scrape: async function (url) {

        const api_url = base_url + '/v1/scrape';
        const headers = {
            'Content-Type': 'application/json',
        };

        const data = {
            url: url
        };

        try {
            const response = await axios.post(api_url, data, { headers });
            return response.data
        } catch (error) {
            console.error('Error:', error.response ? error.response.data : error.message);
            throw error;
        }
    }
};

export default firecrawlTool;