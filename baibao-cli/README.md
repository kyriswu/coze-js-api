# baibao-cli (百宝箱)

A lightweight CLI wrapper for calling Coze JS API endpoints.

## Install

### Use with npx

```bash
npx baibao-cli whisper --data '{"url":"https://coze-js-api.devtool.uk/downloads/file_1773295373374.m4a.mp3"}'
```

```bash
BAIBAO_API_KEY=sk_xxx npx baibao-cli transcribe-douyin --data '{"url":"https://v.douyin.com/xxxx/"}'
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

### 3) Transcribe Douyin

Equivalent to:

```bash
curl --request POST \
  --url http://localhost:3000/transcribe-douyin \
  --header 'content-type: application/json' \
  --data '{"url":"https://v.douyin.com/xxxx/","api_key":"sk_xxx"}'
```

CLI:

```bash
BAIBAO_API_KEY=sk_xxx baibao-cli transcribe-douyin --data '{"url":"https://v.douyin.com/xxxx/"}'
```

说明：
- `transcribe-douyin` 不支持在 `--data` 里传 `api_key`。
- 必须通过环境变量 `BAIBAO_API_KEY` 提供密钥。

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
