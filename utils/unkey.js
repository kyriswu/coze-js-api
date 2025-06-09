const https = require('https');

const unkey = {
    verifyKey: async function (apiId, key, cost) {
        const data = JSON.stringify({
            apiId: apiId,
            key: key,
            remaining: {cost: cost}
        });

        const options = {
            hostname: 'api.unkey.dev',
            path: '/v1/keys.verifyKey',
            method: 'POST',
            headers: {
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
                        console.log('Parsed data:', JSON.stringify(parsedData));
                        resolve(parsedData);
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

module.exports = unkey;