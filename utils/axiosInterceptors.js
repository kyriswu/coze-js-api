export function attachAxiosRateLimitLogger(axiosInstance) {
    axiosInstance.interceptors.response.use(
        (response) => response,
        (error) => {
            if (error.response?.status === 429) {
                const config = error.config || {};
                console.error('[429 Rate Limit]', {
                    url: config.url,
                    method: (config.method || 'GET').toUpperCase(),
                    baseURL: config.baseURL,
                    fullURL: config.baseURL ? `${config.baseURL}${config.url}` : config.url,
                    headers: config.headers,
                    params: config.params,
                    responseBody: error.response.data,
                });
            }
            return Promise.reject(error);
        }
    );
}
