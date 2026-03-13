# baibao-cli (百宝箱)

A lightweight CLI wrapper for calling Coze JS API endpoints.

## Install

### Use with npx

```bash
npx baibao-cli whisper --data '{"url":"https://coze-js-api.devtool.uk/downloads/file_1773295373374.m4a.mp3"}'
```

### Global install

```bash
npm i -g baibao-cli
```

## Commands

### 1) Whisper

Equivalent to:

```bash
curl --request POST \
  --url http://localhost:3000/cloudflare/run_whisper \
  --header 'content-type: application/json' \
  --data '{"url":"https://coze-js-api.devtool.uk/downloads/file_1773295373374.m4a.mp3"}'
```

CLI:

```bash
baibao-cli whisper --data '{"url":"https://coze-js-api.devtool.uk/downloads/file_1773295373374.m4a.mp3"}'
```

### 2) Redis get string

Equivalent to:

```bash
curl --request POST \
  --url http://localhost:3000/redis/get_string \
  --header 'content-type: application/json' \
  --data '{"key":"google_search_requests"}'
```

CLI:

```bash
baibao-cli redis-get-string --data '{"key":"google_search_requests"}'
# or
baibao-cli redis-get-string --key google_search_requests
```

## Options

- `--timeout` timeout in milliseconds, default `60000`

Examples:

```bash
baibao-cli whisper \
  --timeout 30000 \
  --data '{"url":"https://coze-js-api.devtool.uk/downloads/file_1773295373374.m4a.mp3"}'
```

## Publish to npm

```bash
cd baibao-cli
npm login
npm publish --access public
```

After publish, users can run:

```bash
npx baibao-cli whisper --data '{"url":"https://coze-js-api.devtool.uk/downloads/file_1773295373374.m4a.mp3"}'
```
