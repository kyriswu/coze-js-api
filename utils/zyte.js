const zyte = {
    extract: async function (url,actions) {
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
    gen_waitForSelector_code: function (type,value,delay) {
        return {
            "action": "waitForSelector",
            "selector": {
                "type": type,
                "value": value,
            },
            "delay": delay
        }
    },
    gen_click_code: function (type,value) {
        return {
            "action": "click",
            "selector": {
                "type": type,
                "value": value,
            },
        }
    },
};

module.exports = zyte;