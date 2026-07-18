import axios from 'axios';

const HERMES_CHAT_COMPLETIONS_URL = 'https://hermes.devtool.uk/v1/chat/completions';
const HERMES_DEFAULT_MODEL = 'hermes-agent';
const HERMES_DEFAULT_TIMEOUT_MS = Number.parseInt(process.env.HERMES_TIMEOUT_MS || '30000', 10);
const HERMES_FIXED_AUTHORIZATION = 'Bearer 4f3f1c7d9b2a6e8c5d0f9a1b3e7c2d4f6';

function normalizePayload(body = {}) {
    const payload = typeof body === 'string'
        ? (() => {
            try {
                return JSON.parse(body);
            } catch {
                return {};
            }
        })()
        : { ...body };

    payload.model = String(payload.model || HERMES_DEFAULT_MODEL).trim() || HERMES_DEFAULT_MODEL;
    payload.messages = Array.isArray(payload.messages) ? payload.messages : [];
    payload.stream = Boolean(payload.stream);

    return payload;
}

const hermesAgent = {
    chatCompletions: async function ({ body, authorization } = {}) {
        const payload = normalizePayload(body);
        const response = await axios.post(HERMES_CHAT_COMPLETIONS_URL, payload, {
            timeout: Number.isFinite(HERMES_DEFAULT_TIMEOUT_MS) ? HERMES_DEFAULT_TIMEOUT_MS : 30000,
            headers: {
                Authorization: HERMES_FIXED_AUTHORIZATION,
                'Content-Type': 'application/json'
            },
            validateStatus: () => true
        });

        return {
            status: response.status,
            data: response.data
        };
    }
};

export default hermesAgent;