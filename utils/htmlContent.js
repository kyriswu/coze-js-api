import { JSDOM } from 'jsdom';

export function htmlToQuerySelector(htmlString) {
    const dom = new JSDOM(`<body>${htmlString}</body>`);
    const body = dom.window.document.body;

    const selectorParts = [];
    let element = body.firstElementChild;

    while (element) {
        let part = element.tagName.toLowerCase();

        if (element.className) {
            const classes = element.className.trim().split(/\s+/);
            classes.forEach((cls) => {
                part += `.${cls}`;
            });
        }

        Array.from(element.attributes).forEach((attr) => {
            if (attr.name === 'class') return;
            part += `[${attr.name}="${attr.value}"]`;
        });

        selectorParts.push(part);
        element = element.firstElementChild;
    }

    return selectorParts.join(' ');
}

export function extract_html_conent(HtmlContent, xpath, selector) {
    const dom = new JSDOM(HtmlContent);
    const { document, window } = dom.window;

    let result_list = [];

    if (xpath) {
        const result = document.evaluate(
            xpath,
            document,
            null,
            window.XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
        );
        for (let i = 0; i < result.snapshotLength; i++) {
            const element = result.snapshotItem(i);
            result_list.push({ htmlContent: element.outerHTML });
        }
    } else if (selector) {
        const parserSelector = htmlToQuerySelector(selector);
        console.log(parserSelector);
        result_list = Array.from(document.querySelectorAll(parserSelector)).map((element) => {
            return { htmlContent: element.outerHTML };
        });
    }

    console.log(`提取到的内容数量: ${result_list.length}`);

    return result_list;
}

export function extract_html_conent_standard(HtmlContent, xpath, selector) {
    const dom = new JSDOM(HtmlContent);
    const { document, window } = dom.window;

    let result_list = [];

    if (xpath) {
        const result = document.evaluate(
            xpath,
            document,
            null,
            window.XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
        );
        for (let i = 0; i < result.snapshotLength; i++) {
            const element = result.snapshotItem(i);
            result_list.push({ htmlContent: element.outerHTML });
        }
    } else if (selector) {
        result_list = Array.from(document.querySelectorAll(selector)).map((element) => {
            return { htmlContent: element.outerHTML };
        });
    } else {
        result_list.push({ htmlContent: HtmlContent });
    }

    console.log(`提取到的内容数量: ${result_list.length}`);

    return result_list;
}
