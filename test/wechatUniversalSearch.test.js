import assert from 'node:assert/strict';
import test from 'node:test';
import axios from 'axios';
import { th_wechat_media } from '../utils/tikhub.io.js';
import redis from '../utils/redisClient.js';

function createResponse() {
    return {
        headersSent: false,
        statusCode: null,
        contentType: null,
        payload: undefined,
        status(code) {
            this.statusCode = code;
            return this;
        },
        type(value) {
            this.contentType = value;
            return this;
        },
        send(payload) {
            this.payload = payload;
            this.headersSent = true;
            return payload;
        }
    };
}

test.after(() => {
    redis.disconnect();
});

test('rejects a missing universal-search keyword before accessing upstream services', async () => {
    const res = createResponse();

    await th_wechat_media.fetch_universal_search({ query: {}, body: {}, headers: {}, hostname: 'localhost' }, res);

    assert.deepEqual(res.payload, { code: -1, msg: 'keyword 必须是去除空白后的 1-100 个字符' });
});

test('rejects an unsupported universal-search business type', async () => {
    const res = createResponse();

    await th_wechat_media.fetch_universal_search({
        query: {},
        body: { keyword: '人民日报', business_type: 'unsupported' },
        headers: {},
        hostname: 'localhost'
    }, res);

    assert.deepEqual(res.payload, { code: -1, msg: 'business_type 参数无效' });
});

test('forwards accepted parameters and preserves upstream JSON text', async () => {
    const originalPost = axios.post;
    const res = createResponse();
    const upstreamPayload = '{"code":200,"data":{"items":[{"docID":9223372036854775807}]}}';
    let request;
    axios.post = async (...args) => {
        request = args;
        return { status: 200, data: upstreamPayload };
    };

    try {
        await th_wechat_media.fetch_universal_search({
            query: { cursor: 'next-cursor' },
            body: { keyword: ' 人民日报 ', business_type: 'article', sort: 'latest', publish_time: 1, raw: false },
            headers: {},
            hostname: 'localhost'
        }, res);
    } finally {
        axios.post = originalPost;
    }

    assert.equal(request[0], 'https://api.tikhub.io/api/v1/wechat_search/v2/fetch_search');
    assert.deepEqual(request[1], {
        keyword: '人民日报',
        business_type: 'article',
        sort: 'latest',
        publish_time: 1,
        offset: 0,
        raw: false,
        cursor: 'next-cursor'
    });
    assert.equal(request[2].timeout, 30000);
    assert.equal(request[2].responseType, 'text');
    assert.equal(res.statusCode, 200);
    assert.equal(res.contentType, 'application/json');
    assert.equal(res.payload, upstreamPayload);
});
