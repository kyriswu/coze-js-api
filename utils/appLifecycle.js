export function createHealthHandler() {
    return (_req, res) => {
        res.status(200).json({ status: 'ok' });
    };
}

export function createReadinessHandler({ redis, logger = console }) {
    return async (_req, res) => {
        try {
            await redis.ping();
            res.status(200).json({ status: 'ready' });
        } catch (error) {
            logger.error('Readiness check failed:', error.message);
            res.status(503).json({ status: 'not_ready' });
        }
    };
}

export function createGracefulShutdown({
    server,
    timeoutMs = Number(process.env.GRACEFUL_SHUTDOWN_TIMEOUT_MS || 1_800_000),
    exit = process.exit,
    logger = console,
}) {
    let draining = false;

    return () => {
        if (draining) {
            return;
        }

        draining = true;
        logger.log('Shutdown signal received; draining existing connections.');

        const forceExitTimer = setTimeout(() => {
            logger.error(`Graceful shutdown timed out after ${timeoutMs}ms.`);
            exit(1);
        }, timeoutMs);
        forceExitTimer.unref?.();

        server.close(() => {
            clearTimeout(forceExitTimer);
            logger.log('All connections drained; shutting down.');
            exit(0);
        });
    };
}
