import Redis from 'ioredis';
import { getRedisConnectionOptions } from './redisConfig.js';

const redisOptions = getRedisConnectionOptions();

// 创建 Redis 客户端
const redis = new Redis(redisOptions);

// 监听 Redis 连接事件
redis.on('connect', () => {
    console.log(`Connected to Redis on ${redisOptions.host}:${redisOptions.port}, db ${redisOptions.db}`);
});

redis.on('error', (err) => {
    console.error('Redis connection error:', err);
});

// 导出 Redis 客户端
export default redis
