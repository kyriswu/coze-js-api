import assert from 'node:assert/strict';
import test from 'node:test';

import {
    createGracefulShutdown,
    createHealthHandler,
    createReadinessHandler,
} from '../utils/appLifecycle.js';

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

test('health handler reports a live process without depending on Redis', () => {
    const res = createResponse();

    createHealthHandler()({}, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.payload, { status: 'ok' });
});

test('readiness handler reports ready only after Redis responds to PING', async () => {
    const res = createResponse();
    const pingCalls = [];
    const handler = createReadinessHandler({
        redis: {
            async ping() {
                pingCalls.push(true);
                return 'PONG';
            },
        },
    });

    await handler({}, res);

    assert.equal(pingCalls.length, 1);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.payload, { status: 'ready' });
});

test('readiness handler reports unavailable when Redis PING fails', async () => {
    const res = createResponse();
    const handler = createReadinessHandler({
        redis: {
            async ping() {
                throw new Error('Redis unavailable');
            },
        },
        logger: { error() {} },
    });

    await handler({}, res);

    assert.equal(res.statusCode, 503);
    assert.deepEqual(res.payload, { status: 'not_ready' });
});

test('graceful shutdown closes the server once and exits after active work drains', () => {
    let closeCalls = 0;
    const exits = [];
    let closeCallback;
    const shutdown = createGracefulShutdown({
        server: {
            close(callback) {
                closeCalls += 1;
                closeCallback = callback;
            },
        },
        timeoutMs: 10_000,
        exit: (code) => exits.push(code),
        logger: { log() {}, error() {} },
    });

    shutdown();
    shutdown();

    assert.equal(closeCalls, 1);
    assert.deepEqual(exits, []);

    closeCallback();

    assert.deepEqual(exits, [0]);
});
