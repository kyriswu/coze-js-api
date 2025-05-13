
const search1api = {
    search: async function (query) {
        const response = await fetch('https://api.search1api.com/search', {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer 91E80D9E-9C0A-4BFF-861A-913A339A2489'
            },
            body: JSON.stringify({
            "query": query,
            "search_service": "google",
            "max_results": 10,
            "crawl_results": 0,
            "image": false,
            "include_sites": [],
            "exclude_sites": [],
            "language": "auto"
            })
        });

        const data = await response.json();
        return data
    },
    sitemap: async function (url) {
        const response = await fetch('https://api.search1api.com/sitemap', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer 91E80D9E-9C0A-4BFF-861A-913A339A2489'
            },
            body: JSON.stringify({
            "url": url
            })
        });

        const data = await response.json();
        return data
    }
};

module.exports = search1api;