# Current Plan

## Goal

- 排查并确认 `/gpt-image-2/generate` 在编辑模式下最终发送到 openai-hub 的图片数量，补充可追踪日志。

## Context

- 用户反馈前端传 3 张图时只生效后 2 张，怀疑首图未进入最终请求。
- 代码入口在 `index.js`，实际请求构造在 `utils/ThirdParrtyApi/aitoken.js` 的 `gpt_image_2_edit`。

## Files In Scope

- index.js
- utils/ThirdParrtyApi/aitoken.js
- docs/QA.md

## Implementation Steps

1. 确认 `gpt_image_2_edit` 中图片数组到 multipart 表单的映射逻辑。
2. 在发起 `fetch(${OPENAI_HUB_BASE}/v1/images/edits)` 前新增日志，打印最终图片数量、字段名与文件名。
3. 运行最小可行验证并将结果记录到 `docs/QA.md`。

## Risks

- 日志包含文件路径或文件名，需避免输出敏感信息（仅输出文件 basename）。

## Validation

- [x] Relevant checks run
- [x] Behavior verified
- [x] Documentation synced if needed

## Status

- [x] Planned
- [x] Implementing
- [x] Testing
- [x] Done
