export const createDeploymentHandler = ({ deployStaticZip, downloadsDir, publicBaseUrl }) => async (req, res) => {
    try {
        const requestKeys = Object.keys(req.body || {});
        if (requestKeys.length !== 1 || requestKeys[0] !== 'content') {
            return res.status(400).json({
                status: 'rejected',
                reason: 'INVALID_REQUEST',
                checks: ['请求体必须且只能包含 content'],
            });
        }

        const result = await deployStaticZip({
            content: req.body.content,
            downloadsDir,
            publicBaseUrl,
        });
        if (result.status !== 'deployed') {
            return res.status(422).json(result);
        }

        return res.status(201).json(result);
    } catch (error) {
        console.error('[deployment] static ZIP deployment failed:', error);
        return res.status(500).json({
            status: 'rejected',
            reason: 'DEPLOYMENT_INTERNAL_ERROR',
            checks: ['部署端发生未预期错误'],
        });
    }
};
