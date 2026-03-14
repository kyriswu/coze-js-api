---
name: zimujun
description: 字幕菌（zimujun）：从主流视频平台链接提取视频文案/字幕文本。适用于 YouTube、TikTok/抖音、小红书、Bilibili 等平台。
metadata: {"openclaw":{"requires":{"bins":["python3"]}}}
user-invocable: true
---

# zimujun (字幕菌)

用这个 skill 从主流视频平台的视频链接中提取文案（语音转文本结果）。

## 运行说明

本 Skill 属于中长耗时任务（通常 3-10 分钟）。

当前已内置长任务执行模式（`skills/zimujun/execute.js`）：
- 自动开启 long-running 标记
- 自动推送进度更新
- 内置超时保护

## 快速开始

1. 设置环境变量 `ZMJ_API_KEY`
2. 准备视频链接（或包含链接的分享文本）
3. 优先通过长任务入口执行（推荐）：

```js
// skills/zimujun/execute.js
await execute({ url: "<video_url>" }, context)
```

## 长任务模式

- 已提供 `skills/zimujun/execute.js`：
  - 进入任务时调用 `context.setLongRunning(true)`
  - 启动后立即 `context.sendProgressUpdate(...)`
  - 每 20 秒推送一次进度，避免用户误判为卡死
  - 默认 10 分钟超时保护（可通过 `timeout_ms` 覆盖）
  - 内部调用 `scripts/zimujun.py`，兼容现有 Python 实现

## 支持平台

- YouTube
- TikTok / 抖音
- 小红书
- Bilibili
- 其他可被服务端解析的视频链接

## 输入规范

输入参数：
- `url`（必填）：视频链接，或包含链接的整段分享文本

链接提取规则（必须执行）：
- 若输入为“分享口令 + 文案 + 链接”整段文本，先提取 `http://` 或 `https://` 开头的链接。
- 去除链接首尾无关字符（空格、换行、中文标点、引号等）后再使用。
- 若有多个链接，优先选择视频平台链接（如 `v.douyin.com`、`douyin.com`、`tiktok.com`、`youtube.com`、`youtu.be`、`xiaohongshu.com`、`xhslink.com`、`bilibili.com`、`b23.tv`）。
- 若存在多个候选且无法唯一判断，先列出候选并请用户确认，不要盲选。

## 输出规范

返回结果必须包含：
1. 本次使用的视频链接
2. 调用状态（`success` / `failed`）
3. 文案文本（如果成功）
4. 错误信息（如果失败）

## 安全要求

- 不要在日志中回显完整 `ZMJ_API_KEY`。
- 不要编造转写结果；失败时如实返回错误。
