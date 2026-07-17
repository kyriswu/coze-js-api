import assert from 'node:assert/strict';
import test from 'node:test';
import { getRedisConnectionOptions } from '../utils/redisConfig.js';

test('uses isolated shared Redis settings when explicitly configured', () => {
    assert.deepEqual(getRedisConnectionOptions({
        NODE_ENV: 'online',
        REDIS_HOST: 'lite-chat-redis',
        REDIS_PORT: '6379',
        REDIS_DB: '1',
    }), {
        host: 'lite-chat-redis',
        port: 6379,
        db: 1,
    });
});

test('keeps development and legacy online defaults when Redis is not configured', () => {
    assert.deepEqual(getRedisConnectionOptions({ NODE_ENV: 'development' }), {
        host: 'localhost',
        port: 6379,
        db: 0,
    });
    assert.deepEqual(getRedisConnectionOptions({ NODE_ENV: 'online' }), {
        host: 'my-redis',
        port: 6379,
        db: 0,
    });
});

test('includes configured Redis credentials without requiring them', () => {
    assert.deepEqual(getRedisConnectionOptions({
        REDIS_HOST: 'shared-redis',
        REDIS_USERNAME: 'coze-js-api',
        REDIS_PASSWORD: 'not-a-real-secret',
    }), {
        host: 'shared-redis',
        port: 6379,
        db: 0,
        username: 'coze-js-api',
        password: 'not-a-real-secret',
    });
});
