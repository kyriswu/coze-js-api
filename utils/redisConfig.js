const parseInteger = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
};

export function getRedisConnectionOptions(env = process.env) {
    const options = {
        host: env.REDIS_HOST || (env.NODE_ENV === 'online' ? 'my-redis' : 'localhost'),
        port: parseInteger(env.REDIS_PORT, 6379),
        db: parseInteger(env.REDIS_DB, 0),
    };

    if (env.REDIS_USERNAME) options.username = env.REDIS_USERNAME;
    if (env.REDIS_PASSWORD) options.password = env.REDIS_PASSWORD;

    return options;
}
