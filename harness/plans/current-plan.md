# Current Plan

## Goal

- 修复 `/gpt-image-2/generate` 下载参考图超时失败问题，并为图片下载增加 1 次重试机制。

## Context

- 现有 `tool.downloadImageUrlToTempFile` 对图片 URL 仅请求一次，超时时间固定 20s。
- 线上报错为 `AxiosError: timeout of 20000ms exceeded`，属于瞬时网络抖动高发场景。

## Files In Scope

- utils/tool.js
- docs/PLAN.md
- docs/QA.md
- docs/RELEASE.md
- CHANGELOG.md

## Implementation Steps

1. 在 `downloadImageUrlToTempFile` 中实现最多 2 次尝试（首次 + 1 次重试）。
2. 仅对可恢复错误（超时、网络临时错误、429/5xx）执行重试。
3. 增加短延迟退避，避免立即重试造成重复失败。
4. 适度放宽单次下载超时阈值，降低慢链路误判。
5. 运行最小可行语法校验并同步文档记录。

## Risks

- 重试会增加极端失败请求的等待时间。
- 需要确保非可恢复错误不重试，避免掩盖真实输入问题。

## Validation

- [x] Relevant checks run
- [x] Behavior verified
- [x] Documentation synced if needed

## Status

- [x] Planned
- [x] Implementing
- [x] Testing
- [x] Done
