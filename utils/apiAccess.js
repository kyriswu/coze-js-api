export function createApiAccessHelpers({ redis, unkey, commonUtils, environment, tool, unkeyApiId }) {
    async function canSearchGoogle(key) {
        const value = await redis.get(key);
        if (value === null) {
            const now = new Date();
            const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            const secondsUntilMidnight = Math.floor((nextMidnight - now) / 1000);
            console.log('创建key:', key, '初始值为0，过期时间为', secondsUntilMidnight);
            await redis.set(key, 0, 'EX', secondsUntilMidnight);
            return true;
        }
        return false;
    }

    async function canUseHtmlParse(key) {
        if (environment === 'online') {
            const usage = await tool.getUsage(key);
            if (usage >= 3) {
                return false;
            }
        }
        return true;
    }

    async function dailyUse(key) {
        const value = await redis.get(key);
        if (value === null) {
            await redis.set(key, 0, 'EX', 60 * 60);
            return true;
        }
        return false;
    }

    async function verifyApiAccess({ apiKey, freeKey, freeCheck, freeDeniedResponse, requiredCredits = 1 }) {
        if (apiKey) {
            const { valid, remaining } = await unkey.verifyKey(unkeyApiId, apiKey, 0);
            if (!valid) {
                return {
                    ok: false,
                    response: {
                        code: -1,
                        msg: commonUtils.MESSAGE.TOKEN_EXPIRED,
                    },
                };
            }
            const remainingCredits = Number(remaining);
            if (!Number.isFinite(remainingCredits) || remainingCredits < Number(requiredCredits)) {
                return {
                    ok: false,
                    response: {
                        code: -1,
                        msg: commonUtils.MESSAGE.TOKEN_NO_TIMES,
                    },
                };
            }
            return { ok: true, paid: true };
        }

        const canUse = await freeCheck(freeKey);
        if (!canUse) {
            return { ok: false, response: freeDeniedResponse };
        }

        return { ok: true, paid: false };
    }

    async function consumeApiCredits({ apiKey, cost = 1, metadata }) {
        if (!apiKey) return null;
        const { remaining } = await unkey.verifyKey(unkeyApiId, apiKey, cost, metadata);
        return remaining;
    }

    return {
        canSearchGoogle,
        canUseHtmlParse,
        dailyUse,
        verifyApiAccess,
        consumeApiCredits,
    };
}
