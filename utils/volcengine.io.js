import axios from 'axios';
import unkey from './unkey.js';
import commonUtils from './commonUtils.js';
import tool from './tool.js';

const unkey_api_id = 'api_413Kmmitqy3qaDo4';
const ark_base_url = process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com';
const ARK_API_KEY = 'f76941d3-dda6-4455-89bd-484276d6465a';
const seedream_5_0_lite_model = 'doubao-seedream-5-0-260128';
const web_search_url = process.env.VOLCENGINE_WEB_SEARCH_URL || 'https://open.feedcoopapi.com/search_api/web_search';
const WEB_SEARCH_API_KEY = process.env.VOLCENGINE_WEB_SEARCH_API_KEY || 'jkiqnoKdvFKU0EFAkhdIEjdUioA5qyEn';

function toBoolean(value) {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true' || normalized === '1') {
            return true;
        }
        if (normalized === 'false' || normalized === '0') {
            return false;
        }
    }
    return undefined;
}

function toNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string' && value.trim() !== '') {
        const n = Number(value);
        return Number.isFinite(n) ? n : undefined;
    }
    return undefined;
}

function safeJsonParse(value) {
    if (typeof value !== 'string') {
        return value;
    }

    try {
        return JSON.parse(value);
    } catch (error) {
        return value;
    }
}

function decodeWebSearchResponse(value) {
    if (typeof value !== 'string') {
        return value;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return value;
    }

    const directParsed = safeJsonParse(trimmed);
    if (directParsed !== trimmed) {
        return directParsed;
    }

    const dataLines = trimmed
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && line !== '[DONE]');

    const ssePayloads = dataLines
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim())
        .filter(Boolean);

    if (ssePayloads.length === 1) {
        const parsed = safeJsonParse(ssePayloads[0]);
        if (parsed !== ssePayloads[0]) {
            return parsed;
        }
    }

    if (ssePayloads.length > 1) {
        return ssePayloads
            .map((item) => safeJsonParse(item))
            .filter((item) => item !== '[DONE]');
    }

    if (trimmed.startsWith('data:')) {
        const withoutPrefix = trimmed.slice(5).trim();
        const parsed = safeJsonParse(withoutPrefix);
        if (parsed !== withoutPrefix) {
            return parsed;
        }
    }

    return value;
}

function normalizeWebSearchEventFrames(events) {
    const textParts = [];
    let requestId = null;
    let responseMetadata = null;
    let resultCount = 0;
    let webResults = [];
    let imageResults = [];
    let cardResults = [];
    let searchContext = null;
    let timeCost = null;
    let logId = null;
    let usage = null;
    let choices = [];
    let finishReason = null;

    for (const event of events) {
        const parsedEvent = typeof event === 'string' ? safeJsonParse(event) : event;
        if (!parsedEvent || typeof parsedEvent !== 'object') {
            continue;
        }

        const root = parsedEvent.data && typeof parsedEvent.data === 'object' ? parsedEvent.data : parsedEvent;
        const metadata = root.ResponseMetadata && typeof root.ResponseMetadata === 'object' ? root.ResponseMetadata : null;
        const result = root.Result && typeof root.Result === 'object' ? root.Result : null;

        if (metadata) {
            responseMetadata = metadata;
            requestId = metadata.RequestId || requestId;
        }
        if (!result) {
            continue;
        }

        if (Number.isFinite(result.ResultCount)) {
            resultCount = result.ResultCount;
        }
        if (Array.isArray(result.WebResults)) {
            webResults = result.WebResults;
        }
        if (Array.isArray(result.ImageResults)) {
            imageResults = result.ImageResults;
        }
        if (Array.isArray(result.CardResults)) {
            cardResults = result.CardResults;
        }
        if (result.SearchContext && typeof result.SearchContext === 'object') {
            searchContext = result.SearchContext;
        }
        if (typeof result.TimeCost === 'number') {
            timeCost = result.TimeCost;
        }
        if (result.LogId) {
            logId = result.LogId;
        }
        if (result.Usage && typeof result.Usage === 'object') {
            usage = result.Usage;
        }
        if (Array.isArray(result.Choices)) {
            choices = result.Choices;

            for (const choice of result.Choices) {
                if (!choice || typeof choice !== 'object') {
                    continue;
                }

                if (typeof choice.FinishReason === 'string' && choice.FinishReason) {
                    finishReason = choice.FinishReason;
                }

                const deltaContent = choice.Delta && typeof choice.Delta === 'object' ? choice.Delta.Content : null;
                if (typeof deltaContent === 'string' && deltaContent) {
                    textParts.push(deltaContent);
                    continue;
                }

                const messageContent = choice.Message && typeof choice.Message === 'object' ? choice.Message.Content : null;
                if (typeof messageContent === 'string' && messageContent) {
                    textParts.push(messageContent);
                }
            }
        }
    }

    const summaryText = textParts.join('');

    return {
        result_count: resultCount,
        web_results: webResults,
        image_results: imageResults,
        choices,
        usage,
        search_context: searchContext,
        time_cost: timeCost,
        log_id: logId,
        card_results: cardResults,
        response_metadata: responseMetadata,
        request_id: requestId,
        summary_text: summaryText,
        summary_finish_reason: finishReason,
        summary_chunks: textParts.length,
        response_type: 'event_frames'
    };
}

function normalizeWebSearchResult(decodedData) {
    if (Array.isArray(decodedData)) {
        return normalizeWebSearchEventFrames(decodedData);
    }

    const topLevel = decodedData && typeof decodedData === 'object' ? decodedData : {};
    const root = topLevel.data && typeof topLevel.data === 'object' ? topLevel.data : topLevel;
    const result = root.Result && typeof root.Result === 'object' ? root.Result : {};

    return {
        result_count: Number.isFinite(result.ResultCount) ? result.ResultCount : 0,
        web_results: Array.isArray(result.WebResults) ? result.WebResults : [],
        image_results: Array.isArray(result.ImageResults) ? result.ImageResults : [],
        choices: Array.isArray(result.Choices) ? result.Choices : [],
        usage: result.Usage || null,
        search_context: result.SearchContext || null,
        time_cost: typeof result.TimeCost === 'number' ? result.TimeCost : null,
        log_id: result.LogId || null,
        card_results: Array.isArray(result.CardResults) ? result.CardResults : [],
        response_metadata: root.ResponseMetadata || null
    };
}

function normalizeWebSearchPayload(paramsFromReq = {}) {
    if (paramsFromReq.payload && typeof paramsFromReq.payload === 'object' && !Array.isArray(paramsFromReq.payload)) {
        const payload = { ...paramsFromReq.payload };
        const payloadCount = toNumber(payload.Count ?? payload.count);
        delete payload.Stream;
        delete payload.stream;
        delete payload.count;
        payload.Count = typeof payloadCount !== 'undefined' ? payloadCount : 20;
        return payload;
    }

    const payload = {};
    const query = paramsFromReq.Query || paramsFromReq.query;
    const searchType = paramsFromReq.SearchType || paramsFromReq.search_type;
    const count = toNumber(paramsFromReq.Count ?? paramsFromReq.count) ?? 20;
    const needSummary = toBoolean(paramsFromReq.NeedSummary ?? paramsFromReq.need_summary);
    const filter = paramsFromReq.Filter ?? paramsFromReq.filter;
    const queryControl = paramsFromReq.QueryControl ?? paramsFromReq.query_control;
    const timeRange = paramsFromReq.TimeRange ?? paramsFromReq.time_range;
    const contentFormats = paramsFromReq.ContentFormats ?? paramsFromReq.content_formats;
    const industry = paramsFromReq.Industry ?? paramsFromReq.industry;

    if (typeof query !== 'undefined') {
        payload.Query = query;
    }
    if (typeof searchType !== 'undefined') {
        payload.SearchType = searchType;
    }
    payload.Count = count;
    if (typeof filter !== 'undefined') {
        payload.Filter = filter;
    }
    if (typeof needSummary !== 'undefined') {
        payload.NeedSummary = needSummary;
    }
    if (typeof timeRange !== 'undefined') {
        payload.TimeRange = timeRange;
    }
    if (typeof queryControl !== 'undefined') {
        payload.QueryControl = queryControl;
    }
    if (typeof contentFormats !== 'undefined') {
        payload.ContentFormats = contentFormats;
    }
    if (typeof industry !== 'undefined') {
        payload.Industry = industry;
    }
    return payload;
}

export const ve_seedream_5_0_lite = {
    // Seedream 5.0 Lite 图片生成（文生图 / 图生图 / 多图融合）
    generate_image: async function (req, res) {
        const paramsFromReq = {
            ...(req.query || {}),
            ...(req.body || {})
        };

        const {
            prompt,
            image,
            model = seedream_5_0_lite_model,
            size = '2K',
            output_format = 'png',
            watermark = false,
            sequential_image_generation,
            api_key
        } = paramsFromReq;

        if (!prompt) {
            return res.send({ code: -1, msg: 'prompt is required' });
        }
        if (!api_key) {
            return res.send({ code: -1, msg: commonUtils.MESSAGE.TOKEN_EMPTY });
        }

        try {
            const { valid, remaining: currentRemaining } = await unkey.verifyKey(unkey_api_id, api_key, 0, { platform: 'volcengine', action: 'seedream_5_0_lite_generate_image' });
            if (!valid) {
                return res.send({ code: -1, msg: commonUtils.MESSAGE.TOKEN_EXPIRED });
            }
            if (currentRemaining < 5) {
                return res.send({ code: -1, msg: commonUtils.MESSAGE.TOKEN_NO_TIMES });
            }

            const payload = {
                model,
                prompt,
                size,
                output_format,
                watermark
            };

            if (typeof image !== 'undefined') {
                payload.image = image;
            }
            if (typeof sequential_image_generation !== 'undefined') {
                payload.sequential_image_generation = sequential_image_generation;
            }

            const response = await axios.post(
                `${ark_base_url}/api/v3/images/generations`,
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${ARK_API_KEY}`
                    }
                }
            );

            // 根据生成的图片数量扣费，每张图片扣 5 积分
            const generatedImages = response.data?.data || [];
            const cost = generatedImages.length * 5;
            const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, cost, { platform: 'volcengine', action: 'seedream_5_0_lite_generate_image' });
            const responseData = response.data && typeof response.data === 'object' ? { ...response.data } : {};
            const responseImages = Array.isArray(responseData.data) ? responseData.data : [];
            const localizedImages = await Promise.all(
                responseImages.map(async (item, index) => {
                    if (!item || typeof item !== 'object' || !item.url) {
                        return item;
                    }

                    const savedImage = await tool.saveImageUrlToDownloads(item.url, 've-seedream-5-0-lite', index);
                    return {
                        ...item,
                        url: `${req.protocol}://${req.get('host')}/downloads/${savedImage.fileName}`,
                        remote_url: item.url
                    };
                })
            );
            responseData.data = localizedImages;

            return res.send({
                code: 200,
                msg: `生成 ${generatedImages.length} 张图片，扣费 ${cost} 积分，剩余 ${remaining} 积分`,
                data: responseData
            });
        } catch (error) {
            const detail = error.response ? error.response.data : error.message;
            console.error('Seedream Generate Image Error:', detail);
            if (!res.headersSent) {
                return res.send({
                    code: -1,
                    msg: commonUtils.MESSAGE.SERVER_ERROR,
                    data: detail
                });
            }
        }
    }
};

export const ve_web_search = {
    // 联网搜索（web / web_summary / image）
    web_search: async function (req, res) {
        const paramsFromReq = {
            ...(req.query || {}),
            ...(req.body || {})
        };

        const api_key = paramsFromReq.api_key;
        const searchApiKey = paramsFromReq.search_api_key || paramsFromReq.volcengine_api_key || WEB_SEARCH_API_KEY;
        const payload = normalizeWebSearchPayload(paramsFromReq);

        if (!api_key) {
            return res.send({ code: -1, msg: commonUtils.MESSAGE.TOKEN_EMPTY });
        }
        if (!searchApiKey) {
            return res.send({ code: -1, msg: 'VOLCENGINE_WEB_SEARCH_API_KEY is required' });
        }
        if (!payload.Query) {
            return res.send({ code: -1, msg: 'Query/query is required' });
        }
        if (!payload.SearchType) {
            return res.send({ code: -1, msg: 'SearchType/search_type is required' });
        }

        if (String(payload.SearchType).toLowerCase() === 'web_summary' && payload.NeedSummary !== true) {
            payload.NeedSummary = true;
        }

        try {
            const { valid, remaining: currentRemaining } = await unkey.verifyKey(unkey_api_id, api_key, 0, { platform: 'volcengine', action: 'web_search' });
            if (!valid) {
                return res.send({ code: -1, msg: commonUtils.MESSAGE.TOKEN_EXPIRED });
            }
            if (currentRemaining <= 0) {
                return res.send({ code: -1, msg: commonUtils.MESSAGE.TOKEN_NO_TIMES });
            }

            const response = await axios.post(web_search_url, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${searchApiKey}`
                }
            });

            const decodedData = decodeWebSearchResponse(response.data);
            const normalizedData = normalizeWebSearchResult(decodedData);
            const resultCount = normalizedData.result_count;
            const cost = 1;
            const { remaining } = await unkey.verifyKey(unkey_api_id, api_key, cost, { platform: 'volcengine', action: 'web_search' });

            return res.send({
                code: 200,
                msg: `联网搜索成功，返回 ${resultCount} 条结果，扣费 ${cost} 积分，剩余 ${remaining} 积分`,
                data: normalizedData
            });
        } catch (error) {
            const detail = error.response ? decodeWebSearchResponse(error.response.data) : error.message;
            console.error('Volcengine Web Search Error:', detail);
            if (!res.headersSent) {
                return res.send({
                    code: -1,
                    msg: commonUtils.MESSAGE.SERVER_ERROR,
                    data: detail
                });
            }
        }
    }
};

export default {
    ve_seedream_5_0_lite,
    ve_web_search
};
