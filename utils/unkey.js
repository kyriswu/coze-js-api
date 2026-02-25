import https from 'node:https';

const token = "unkey_3ZitUkc7AjAzfTDJZhpDMHPP"

const unkey = {
    verifyKey: async function (apiId, key, cost, tags) {
        const data = JSON.stringify({
            // apiId: apiId,
            key: key,
            tags: tags ? Object.values(tags).map(String) : [],
            credits: { cost: cost }
        });
        const options = {
            hostname: 'api.unkey.com',
            path: '/v2/keys.verifyKey',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    try {
                        const parsedData = JSON.parse(responseData);
                        let result = parsedData.data;
                        // --- 格式化核心逻辑开始 ---
                        if (result && typeof result === 'object' && 'credits' in result) {
                            const { credits, ...rest } = result;
                            result = {
                                ...rest,
                                remaining: credits // 将 credits 转化为 remaining
                            };
                        }
                        console.log('Formatted data:', JSON.stringify(result));
                        resolve(result);
                    } catch (error) {
                        reject(error);
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.write(data);
            req.end();
        });
    },
    getVerifications: async function (token) {
        const options = {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`
            }
        };

        try {
            const response = await fetch('https://api.unkey.dev/v1/analytics.getVerifications', options);
            const data = await response.json();
            return data;
        } catch (err) {
            console.error(err);
            throw err;
        }
    }
};

export default unkey;