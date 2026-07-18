import assert from 'node:assert/strict';
import test from 'node:test';
import { chargeApiCredits, createApiAccessHelpers } from '../utils/apiAccess.js';

test('chargeApiCredits performs one non-zero-cost verification and reports success', async () => {
    const calls = [];
    const unkey = {
        async verifyKey(...args) {
            calls.push(args);
            return { valid: true, remaining: 4 };
        },
    };

    const result = await chargeApiCredits({
        unkey,
        unkeyApiId: 'api_test',
        apiKey: 'user-key',
        cost: 3,
        metadata: { action: 'gpt_image_2_generate' },
    });

    assert.deepEqual(result, { ok: true, remaining: 4 });
    assert.deepEqual(calls, [[
        'api_test',
        'user-key',
        3,
        { action: 'gpt_image_2_generate' },
    ]]);
});

test('chargeApiCredits rejects an insufficient atomic debit', async () => {
    const result = await chargeApiCredits({
        unkey: { async verifyKey() { return { valid: false, remaining: 2 }; } },
        unkeyApiId: 'api_test',
        apiKey: 'user-key',
        cost: 3,
    });

    assert.deepEqual(result, { ok: false, remaining: 2 });
});

test('factory exposes the strict atomic charging helper', async () => {
    const helpers = createApiAccessHelpers({
        redis: {},
        unkey: { async verifyKey() { return { valid: true, remaining: 1 }; } },
        commonUtils: {},
        environment: 'test',
        tool: {},
        unkeyApiId: 'api_test',
    });

    assert.deepEqual(await helpers.chargeApiCreditsAtomically({ apiKey: 'user-key', cost: 3 }), {
        ok: true,
        remaining: 1,
    });
});
