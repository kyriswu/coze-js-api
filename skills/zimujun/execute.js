import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROGRESS_INTERVAL_MS = 20_000;
const DEFAULT_TASK_TIMEOUT_MS = 10 * 60 * 1000;
const PREFERRED_VIDEO_DOMAINS = [
  "v.douyin.com",
  "douyin.com",
  "tiktok.com",
  "youtube.com",
  "youtu.be",
  "xiaohongshu.com",
  "xhslink.com",
  "bilibili.com",
  "b23.tv",
];

function normalizeInput(inputs) {
  if (typeof inputs === "string") {
    return inputs.trim();
  }
  if (inputs && typeof inputs === "object") {
    const raw = inputs.url ?? inputs.text ?? inputs.input ?? "";
    return String(raw).trim();
  }
  return "";
}

function extractCandidateUrls(text) {
  if (!text) {
    return [];
  }
  const matched = text.match(/https?:\/\/[^\s"'<>，。！？、；：））】]+/g) ?? [];
  return matched.map((item) => item.trim());
}

function pickBestUrl(candidates) {
  if (!candidates.length) {
    return "";
  }

  for (const candidate of candidates) {
    try {
      const host = new URL(candidate).hostname.toLowerCase();
      if (PREFERRED_VIDEO_DOMAINS.some((domain) => host.includes(domain))) {
        return candidate;
      }
    } catch {
      // Ignore parse failures and continue trying other candidates.
    }
  }

  return candidates[0];
}

function parseOutput(raw) {
  const text = String(raw ?? "").trim();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function execute(inputs, context) {
  context?.setLongRunning?.(true);
  context?.sendProgressUpdate?.("任务已启动，预计需要 5-10 分钟处理...");

  const rawInput = normalizeInput(inputs);
  const candidates = extractCandidateUrls(rawInput);
  const videoUrl = pickBestUrl(candidates);

  if (!videoUrl) {
    const message = "未检测到可用视频链接，请提供完整视频链接或分享文本。";
    context?.sendProgressUpdate?.(message);
    return {
      status: "failed",
      usedUrl: "",
      error: message,
      completedAt: new Date().toISOString(),
    };
  }

  const apiKey =
    (inputs && typeof inputs === "object" && String(inputs.api_key ?? "").trim()) ||
    process.env.ZMJ_API_KEY ||
    "";

  if (!apiKey) {
    const message = "未检测到 ZMJ_API_KEY（可通过 inputs.api_key 或环境变量传入）。";
    context?.sendProgressUpdate?.(message);
    return {
      status: "failed",
      usedUrl: videoUrl,
      error: message,
      completedAt: new Date().toISOString(),
    };
  }

  context?.sendProgressUpdate?.(`已识别链接：${videoUrl}`);

  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = dirname(currentFile);
  const scriptPath = resolve(currentDir, "scripts", "zimujun.py");

  const startedAtMs = Date.now();
  const timeoutMs =
    (inputs && typeof inputs === "object" && Number(inputs.timeout_ms)) ||
    DEFAULT_TASK_TIMEOUT_MS;

  return await new Promise((resolvePromise) => {
    const child = spawn("python3", [scriptPath, videoUrl], {
      env: {
        ...process.env,
        ZMJ_API_KEY: apiKey,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    const progressTicker = setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - startedAtMs) / 1000);
      context?.sendProgressUpdate?.(
        `处理中，已运行 ${elapsedSec}s（任务可能需要 5-10 分钟）...`
      );
    }, PROGRESS_INTERVAL_MS);

    const killTimer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      context?.sendProgressUpdate?.("任务超时，正在终止进程...");
    }, timeoutMs);

    const done = (payload) => {
      clearInterval(progressTicker);
      clearTimeout(killTimer);
      resolvePromise(payload);
    };

    child.on("error", (error) => {
      context?.sendProgressUpdate?.(`任务失败：${error.message}`);
      done({
        status: "failed",
        usedUrl: videoUrl,
        error: error.message,
        completedAt: new Date().toISOString(),
      });
    });

    child.on("close", (code) => {
      const parsed = parseOutput(stdout);
      const completedAt = new Date().toISOString();

      if (timedOut) {
        done({
          status: "failed",
          usedUrl: videoUrl,
          error: `任务超时（>${Math.floor(timeoutMs / 1000)} 秒）`,
          stdout: parsed,
          stderr: stderr.trim() || null,
          completedAt,
        });
        return;
      }

      if (code === 0) {
        context?.sendProgressUpdate?.("任务处理完成，正在整理结果...");
        done({
          status: "completed",
          usedUrl: videoUrl,
          result: parsed,
          stderr: stderr.trim() || null,
          completedAt,
        });
        return;
      }

      const errorText = stderr.trim() || "调用脚本失败";
      context?.sendProgressUpdate?.(`任务失败：${errorText}`);
      done({
        status: "failed",
        usedUrl: videoUrl,
        error: errorText,
        stdout: parsed,
        completedAt,
      });
    });
  });
}
