import { logAxiosError, logAxiosRequest, logRateLimit } from './networkLogger.js';

export function attachAxiosRateLimitLogger(axiosInstance) {
    if (!axiosInstance || axiosInstance.__devtoolAxiosLoggerAttached) {
        return;
    }

    axiosInstance.__devtoolAxiosLoggerAttached = true;

    axiosInstance.interceptors.request.use(
        (config) => {
            config.metadata = {
                startTime: Date.now(),
            };
            return config;
        },
        (error) => Promise.reject(error)
    );

    axiosInstance.interceptors.response.use(
        (response) => {
            const config = response.config || {};
            const startedAt = config.metadata?.startTime || Date.now();
            const durationMs = Date.now() - startedAt;
            const method = (config.method || 'GET').toUpperCase();
            const fullURL = config.baseURL ? `${config.baseURL}${config.url}` : config.url;

            logAxiosRequest({
                method,
                url: fullURL,
                status: response.status,
                durationMs,
            });

            return response;
        },
        (error) => {
            const config = error.config || {};
            const startedAt = config.metadata?.startTime || Date.now();
            const durationMs = Date.now() - startedAt;
            const method = (config.method || 'GET').toUpperCase();
            const fullURL = config.baseURL ? `${config.baseURL}${config.url}` : config.url;

            logAxiosError({
                method,
                url: fullURL,
                status: error.response?.status || null,
                durationMs,
                message: error.message,
            });

            if (error.response?.status === 429) {
                logRateLimit({
                    url: config.url,
                    method,
                    baseURL: config.baseURL,
                    fullURL,
                    headers: config.headers,
                    params: config.params,
                    responseBody: error.response.data,
                    durationMs,
                });
            }
            return Promise.reject(error);
        }
    );
}
