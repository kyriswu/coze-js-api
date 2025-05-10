const axios = require('axios')

const zyte = {
    extract: async function (url, actions) {
        const response = await axios.post(
            "https://api.zyte.com/v1/extract",
            {
                "url": url,
                "browserHtml": true,
                "actions": actions
            },
            {
                auth: { username: 'e902926b10234494aceec622c90ba286' }
            }
        );
        const browserHtml = response.data.browserHtml
        return browserHtml
    },
    gen_waitForSelector_code: function (type, value) {
        return {
            "action": "waitForSelector",
            "selector": {
                "type": type,
                "value": value,
            },
        }
    },
    gen_click_code: function (type, value) {
        return {
            "action": "click",
            "selector": {
                "type": type,
                "value": value,
            },
        }
    },
    gen_waitForTimeout_code: function (timeout) {
        return {
            "action": "waitForTimeout",
            "timeout": timeout
        }
    },
};

module.exports = zyte;