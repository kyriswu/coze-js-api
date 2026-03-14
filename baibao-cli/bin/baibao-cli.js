#!/usr/bin/env node

function printHelp() {
  const helpText = `baibao-cli (百宝箱)

Usage:
  BAIBAO_API_KEY=sk_xxx baibao-cli whisper-speech-to-text --url https://www.douyin.com/video/xxx [--language zh]
  baibao-cli whisper --data '{"url":"https://example.com/audio.mp3"}'
  baibao-cli transcribe-douyin --data '{"url":"https://v.douyin.com/xxxx/"}'
  baibao-cli redis-get-string --data '{"key":"google_search_requests"}'
  baibao-cli redis-get-string --key google_search_requests

Options:
  --data       JSON string request body
  --key        Shortcut for redis-get-string key field
  --url        URL for whisper-speech-to-text
  --language   Optional language for whisper-speech-to-text
  --timeout    Request timeout in ms (default: 60000)
  -h, --help   Show help
`;
  process.stdout.write(helpText);
}

function parseArgs(argv) {
  const args = argv.slice(2);

  if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
    return { help: true };
  }

  const command = args[0];
  const options = {
    baseUrl: "https://coze-js-api.devtool.uk",
    timeout: 60000,
  };

  for (let i = 1; i < args.length; i += 1) {
    const token = args[i];

    if (token === "--data") {
      options.data = args[i + 1];
      i += 1;
      continue;
    }

    if (token === "--key") {
      options.key = args[i + 1];
      i += 1;
      continue;
    }

    if (token === "--base-url") {
      options.baseUrl = args[i + 1];
      i += 1;
      continue;
    }

    if (token === "--url") {
      options.url = args[i + 1];
      i += 1;
      continue;
    }

    if (token === "--language") {
      options.language = args[i + 1];
      i += 1;
      continue;
    }

    if (token === "--timeout") {
      options.timeout = Number(args[i + 1]);
      i += 1;
      continue;
    }

    throw new Error(`Unknown option: ${token}`);
  }

  return { command, options };
}

function parseJsonOrThrow(raw) {
  if (!raw) {
    throw new Error("Missing --data JSON string");
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON in --data: ${error.message}`);
  }
}

function withBaibaoApiKey(body) {
  if (!body || typeof body !== "object") {
    return body;
  }

  if (Object.prototype.hasOwnProperty.call(body, "api_key")) {
    throw new Error("transcribe-douyin does not accept api_key in --data; use BAIBAO_API_KEY env var");
  }

  if (process.env.BAIBAO_API_KEY) {
    return {
      ...body,
      api_key: process.env.BAIBAO_API_KEY,
    };
  }

  return body;
}

async function postJson(baseUrl, path, body, timeout) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await response.text();
    let parsed = text;

    try {
      parsed = JSON.parse(text);
    } catch {
      // Keep raw text for non-JSON responses.
    }

    if (!response.ok) {
      const error = new Error(`Request failed with status ${response.status}`);
      error.responseBody = parsed;
      throw error;
    }

    return {
      status: response.status,
      data: parsed,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function run() {
  const parsed = parseArgs(process.argv);

  if (parsed.help) {
    printHelp();
    return;
  }

  const { command, options } = parsed;

  if (!options.baseUrl) {
    throw new Error("--base-url must not be empty");
  }

  if (!Number.isFinite(options.timeout) || options.timeout <= 0) {
    throw new Error("--timeout must be a positive number");
  }

  let endpoint;
  let body;

  if (command === "whisper-speech-to-text") {
    endpoint = "/whisper/speech-to-text";

    if (!process.env.BAIBAO_API_KEY) {
      throw new Error("whisper-speech-to-text requires BAIBAO_API_KEY env var");
    }

    if (!options.url) {
      throw new Error("whisper-speech-to-text requires --url");
    }

    body = {
      url: options.url,
      api_key: process.env.BAIBAO_API_KEY,
    };

    if (options.language) {
      body.language = options.language;
    }
  } else if (command === "whisper") {
    endpoint = "/cloudflare/run_whisper";
    body = parseJsonOrThrow(options.data);
  } else if (command === "transcribe-douyin") {
    endpoint = "/transcribe-douyin";
    body = withBaibaoApiKey(parseJsonOrThrow(options.data));
    if (!process.env.BAIBAO_API_KEY) {
      process.stderr.write("Warning: BAIBAO_API_KEY is not set; request will be sent without api_key\n");
    }
  } else if (command === "redis-get-string") {
    endpoint = "/redis/get_string";

    if (options.data) {
      body = parseJsonOrThrow(options.data);
    } else if (options.key) {
      body = { key: options.key };
    } else {
      throw new Error("redis-get-string requires --data or --key");
    }
  } else {
    throw new Error(`Unknown command: ${command}`);
  }

  const result = await postJson(options.baseUrl, endpoint, body, options.timeout);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

run().catch((error) => {
  process.stderr.write(`Error: ${error.message}\n`);

  if (error.responseBody !== undefined) {
    process.stderr.write(`${JSON.stringify(error.responseBody, null, 2)}\n`);
  }

  process.exitCode = 1;
});
