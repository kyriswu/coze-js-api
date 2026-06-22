import axios from 'axios';
import '../loadEnv.js';
import commonUtils from '../commonUtils.js';
import redis from '../redisClient.js';
import unkey from '../unkey.js';
import tool from '../tool.js';
import { createApiAccessHelpers } from '../apiAccess.js';

const EVOLINK_BASE_URL = 'https://api.evolink.ai';
const DEFAULT_MODEL = 'gpt-image-2';
const DEFAULT_POLL_INTERVAL_MS = 3000;
const DEFAULT_TIMEOUT_MS = 120000;
const FINAL_STATUSES = new Set(['completed', 'failed']);
const UNKEY_API_ID = 'api_413Kmmitqy3qaDo4';

const { verifyApiAccess, consumeApiCredits } = createApiAccessHelpers({
    redis,
    unkey,
    commonUtils,
    environment: process.env.NODE_ENV || 'development',
    tool,
    unkeyApiId: UNKEY_API_ID,
});

function ensureApiKey() {
    const apiKey = process.env.EVOLINK_API_KEY;

    if (!apiKey || !apiKey.trim()) {
        throw new Error('缺少 Evolink API Key，请在 .env 中填写 EVOLINK_API_KEY');
    }

    return apiKey.trim();
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function getAxiosConfig() {
    const apiKey = ensureApiKey();
    return {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        }
    };
}

function normalizePositiveNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildRequestError(error, fallbackMessage) {
    const upstreamMessage =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        fallbackMessage;
    const wrappedError = new Error(upstreamMessage);
    wrappedError.status = error?.response?.status || 500;
    wrappedError.data = error?.response?.data || null;
    return wrappedError;
}

function buildClientError(message, status = 400, data = null) {
    const error = new Error(message);
    error.status = status;
    error.data = data;
    return error;
}

function getFinalImageUrl(taskDetail) {
    return (
        taskDetail?.results?.[0] ||
        taskDetail?.result_data?.[0]?.url ||
        null
    );
}

function getCreditUsed(taskDetail) {
    const value = Number(taskDetail?.usage?.credits_used);
    return Number.isFinite(value) ? value : 0;
}

function calculateCreditCost(creditUsed) {
         const credit = Number(creditUsed || 0);

        const yuanCost = credit * 0.16;
        const centCost = Math.ceil(yuanCost * 100);

        const pointValueInCent = 5;
        const requiredPoints = Math.ceil(centCost / pointValueInCent);

        return requiredPoints + 2;// 额外加 2 个积分作为手续费
}

const evolink = {
    image_generation_with_billing: async function ({
        prompt,
        api_key,
        ...rest
    } = {}) {
        if (!prompt || !prompt.toString().trim()) {
            throw buildClientError('prompt 不能为空');
        }

        if (!api_key || !api_key.toString().trim()) {
            throw buildClientError(commonUtils.MESSAGE.TOKEN_EMPTY || 'api_key 不能为空');
        }

        const normalizedApiKey = api_key.toString().trim();
        const access = await verifyApiAccess({
            apiKey: normalizedApiKey,
            freeKey: null,
            freeCheck: async () => false,
            requiredCredits: 1,
            freeDeniedResponse: {
                code: -1,
                msg: commonUtils.MESSAGE.TOKEN_EXPIRED || 'API Key 无效或已过期'
            }
        });

        if (!access.ok) {
            throw buildClientError(
                access.response?.msg || commonUtils.MESSAGE.TOKEN_EXPIRED || 'API Key 无效或已过期',
                403
            );
        }

        const data = await this.image_generation({
            prompt: prompt.toString().trim(),
            ...rest
        });

        const remaining = await consumeApiCredits({
            apiKey: normalizedApiKey,
            cost: data.creditCost,
            metadata: {
                action: 'evolink_image_generation',
                model: rest?.model || DEFAULT_MODEL
            }
        });

        return {
            code: 0,
            msg: `Success，本次消耗积分${data.creditCost}个，API Key 剩余积分：${remaining}`,
            data
        };
    },

    generate_image: async function (req, res) {
        try {
            const payload = await this.image_generation_with_billing(req.body || {});
            return res.send(payload);
        } catch (error) {
            console.error('Error in /evolink/images/generations:', error.message);
            return res.status(error.status || 500).send({
                code: -1,
                msg: error.message,
                data: error.data || null
            });
        }
    },

    image_generation: async function ({
        poll_interval_ms = DEFAULT_POLL_INTERVAL_MS,
        timeout_ms = DEFAULT_TIMEOUT_MS,
        ...payload
    } = {}) {
        const body = {
            model: payload.model || DEFAULT_MODEL,
            ...payload
        };

        if (!body.prompt || !body.prompt.toString().trim()) {
            throw new Error('prompt 不能为空');
        }

        let createdTask;
        try {
            const response = await axios.post(
                `${EVOLINK_BASE_URL}/v1/images/generations`,
                body,
                getAxiosConfig()
            );
            createdTask = response.data;
        } catch (error) {
            throw buildRequestError(error, '创建 Evolink 图片任务失败');
        }

        const taskId = createdTask?.id;
        if (!taskId) {
            const error = new Error('Evolink 未返回 task id');
            error.status = 502;
            error.data = createdTask;
            throw error;
        }

        const finalTask = await this.wait_task_result(taskId, {
            poll_interval_ms,
            timeout_ms
        });

        const creditUsed = getCreditUsed(finalTask);

        return {
            image: getFinalImageUrl(finalTask),
            credit_used: creditUsed,
            creditCost: calculateCreditCost(creditUsed)
        };
    },

    get_task_detail: async function (task_id) {
        if (!task_id || !task_id.toString().trim()) {
            throw new Error('task_id 不能为空');
        }

        try {
            const response = await axios.get(
                `${EVOLINK_BASE_URL}/v1/tasks/${encodeURIComponent(task_id)}`,
                getAxiosConfig()
            );
            return response.data;
        } catch (error) {
            throw buildRequestError(error, '查询 Evolink 任务失败');
        }
    },

    get_task_detail_handler: async function (req, res) {
        const taskId = req.params.task_id;

        if (!taskId) {
            return res.status(400).send({
                code: -1,
                msg: 'task_id 不能为空',
                data: null
            });
        }

        try {
            const data = await this.get_task_detail(taskId);
            return res.send({
                code: 0,
                msg: 'Success',
                data
            });
        } catch (error) {
            console.error(`Error in /evolink/tasks/${taskId}:`, error.message);
            return res.status(error.status || 500).send({
                code: -1,
                msg: error.message,
                data: error.data || null
            });
        }
    },

    wait_task_result: async function (
        task_id,
        {
            poll_interval_ms = DEFAULT_POLL_INTERVAL_MS,
            timeout_ms = DEFAULT_TIMEOUT_MS
        } = {}
    ) {
        const pollInterval = normalizePositiveNumber(poll_interval_ms, DEFAULT_POLL_INTERVAL_MS);
        const timeoutMs = normalizePositiveNumber(timeout_ms, DEFAULT_TIMEOUT_MS);
        const startedAt = Date.now();

        while (Date.now() - startedAt <= timeoutMs) {
            const detail = await this.get_task_detail(task_id);
            const status = detail?.status;

            if (FINAL_STATUSES.has(status)) {
                if (status === 'failed') {
                    const taskErrorMessage =
                        detail?.error?.message ||
                        detail?.error?.code ||
                        'Evolink 任务执行失败';
                    const error = new Error(taskErrorMessage);
                    error.status = 502;
                    error.data = detail;
                    throw error;
                }
                return detail;
            }

            await sleep(pollInterval);
        }

        const error = new Error(`Evolink 任务轮询超时，task_id=${task_id}`);
        error.status = 504;
        error.data = { task_id };
        throw error;
    }
};

export default evolink;
