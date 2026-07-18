import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeploymentHandler } from '../utils/deploymentRoute.js';

function createResponse() {
    return {
        statusCode: null,
        payload: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.payload = payload;
            return this;
        },
    };
}

test('deploys a valid static artifact without reading quota state or validating an API key', async () => {
    let receivedArgs;
    const handler = createDeploymentHandler({
        deployStaticZip: async (args) => {
            receivedArgs = args;
            return {
                status: 'deployed',
                releaseId: 'release-public',
                url: 'https://static.devtool.uk/static-releases/release-public/',
                zipSha256: 'a'.repeat(64),
                httpVerification: { status: 200, contentType: 'text/html' },
            };
        },
        downloadsDir: '/app/downloads',
        publicBaseUrl: 'https://static.devtool.uk/static-releases',
    });
    const res = createResponse();

    await handler({
        body: { content: 'https://coze-js-api.devtool.uk/downloads/site.zip' },
        headers: { 'x-api-key': 'intentionally-ignored' },
    }, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.payload.status, 'deployed');
    assert.deepEqual(receivedArgs, {
        content: 'https://coze-js-api.devtool.uk/downloads/site.zip',
        downloadsDir: '/app/downloads',
        publicBaseUrl: 'https://static.devtool.uk/static-releases',
    });
});
