---
name: zimujun
description: 字幕菌（zimujun）：从主流视频平台链接提取视频文案/字幕文本。适用于 YouTube、TikTok/抖音、小红书、Bilibili 等平台。
metadata: {"openclaw":{"requires":{"bins":["python3"]}}}
user-invocable: true
---

# zimujun (字幕菌)

用这个 skill 从主流视频平台的视频链接中提取文案（语音转文本结果）。

## 能力范围

适用于主流平台视频链接，例如：
- YouTube
- TikTok / 抖音
- 小红书
- Bilibili
- 其他可被服务端解析的视频链接

## 输入

只需要 1 个输入：
- `url`（必填）：视频链接，或包含视频链接的整段分享文本

链接提取规则（必须执行）：
- 当用户输入不是纯链接，而是“分享口令 + 文案 + 链接”的整段文本时，先从原文中提取 `http://` 或 `https://` 开头的链接。
- 提取后去除链接首尾无关字符（如空格、换行、中文标点 `，。；！`、引号等），再作为最终 `url`。
- 若文本中有多个链接，优先选择视频平台链接（如 `v.douyin.com`、`douyin.com`、`tiktok.com`、`youtube.com`、`youtu.be`、`xiaohongshu.com`、`xhslink.com`、`bilibili.com`、`b23.tv`）。
- 若存在多个“可能的视频链接”且无法唯一判断，先列出候选并请用户确认，不要盲选。

示例输入（可识别）：
- `0.56 Mws:/ 02/09 C@H.iP ... https://v.douyin.com/WDqpcbK3nIw/ 复制此链接，打开Dou音搜索，直接观看视频！`

示例提取结果：
- `https://v.douyin.com/WDqpcbK3nIw/`

## API Key 规则

调用前必须从环境变量读取：
- `ZMJ_API_KEY`

若 `ZMJ_API_KEY` 缺失，停止调用并提示用户先设置环境变量。

## 调用方式

优先执行本 skill 自带 Python 脚本，不要在回复里直接拼接原始 curl。

命令：

```bash
export ZMJ_API_KEY="<your_api_key>"
python3 scripts/zimujun.py "<video_url>"
```

请求目标：
- `POST https://coze-js-api.devtool.uk/whisper/speech-to-text`

请求体字段：
- `url`（使用上一步提取/清洗后的最终链接）
- `api_key`（来自环境变量 `ZMJ_API_KEY`）

## 输出要求

结果里要明确：
1. 本次使用的视频链接
2. 调用是否成功（success/failed）
3. 关键返回信息（例如 code、msg、data.text）

若失败，给出可执行的下一步建议（例如检查链接可访问性、检查 API_KEY 是否有效）。

## 示例

输入：
- `url`: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`

执行：

```bash
export ZMJ_API_KEY="<your_api_key>"
python3 scripts/zimujun.py "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

## 安全

- 不要在日志中回显完整 ZMJ_API_KEY。
- 不要编造转写结果；失败时如实返回错误。
