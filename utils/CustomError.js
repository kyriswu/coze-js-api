// 基础错误类
class BaseError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
    }
}

// 配额超限错误
export class QuotaExceededError extends BaseError {
    constructor(message) {
        super(message, 429); // HTTP 429 Too Many Requests
        this.name = 'QuotaExceededError';
    }
}

// API密钥无效错误
export class InvalidApiKeyError extends BaseError {
    constructor(message = 'API Key 无效或已过期') {
        super(message, 401); // HTTP 401 Unauthorized
        this.name = 'InvalidApiKeyError';
    }
}

// 请求参数错误
export class ValidationError extends BaseError {
    constructor(message) {
        super(message, 400); // HTTP 400 Bad Request
        this.name = 'ValidationError';
    }
}

// 资源未找到错误
export class NotFoundError extends BaseError {
    constructor(message) {
        super(message, 404); // HTTP 404 Not Found
        this.name = 'NotFoundError';
    }
}

// 服务限流错误
export class RateLimitError extends BaseError {
    constructor(message, retryAfter = 60) {
        super(message, 429); // HTTP 429 Too Many Requests
        this.name = 'RateLimitError';
        this.retryAfter = retryAfter;
    }
}

// 文件操作错误
export class FileOperationError extends BaseError {
    constructor(message, operation = 'unknown') {
        super(message, 500);
        this.name = 'FileOperationError';
        this.operation = operation;
    }
}