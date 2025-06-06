class QuotaExceededError extends Error {
    constructor(message) {
        super(message);
        this.name = 'QuotaExceededError';
        this.statusCode = 429; // HTTP 429 Too Many Requests
    }
}

module.exports = {
    QuotaExceededError
};