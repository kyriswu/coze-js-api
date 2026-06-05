# Current Plan

## Goal

- 调整 `ve_seedream_5_0_lite.generate_image`，将上游返回的远程图片下载到本地 `downloads/`，并在响应中返回本地可访问链接。

## Context

- 当前接口直接透传 Volcengine 返回的远程图片 URL。
- 项目已通过 `/downloads` 静态暴露本地下载目录，适合复用。
- `utils/tool.js` 已有保存 base64 图片到 `downloads/` 的能力，可补充 URL 图片落盘辅助方法。

## Files In Scope

- utils/volcengine.io.js
- utils/tool.js
- harness/plans/current-plan.md
- docs/PLAN.md
- docs/QA.md
- docs/RELEASE.md
- CHANGELOG.md

## Implementation Steps

1. 在 `utils/tool.js` 中新增远程图片下载到 `downloads/` 的复用 helper。
2. 在 `ve_seedream_5_0_lite.generate_image` 成功路径中逐张下载生成图。
3. 保持原响应结构，仅将 `data.data[].url` 改写为本地 `/downloads/...` 地址。
4. 运行最小语法校验并同步 QA / release 文档。

## Risks

- 若上游图片下载失败，生成接口成功后仍可能在本地落盘阶段报错。
- 需要保持现有 `code/msg/data` 结构不变，避免影响调用方解析。

## Validation

- [x] Relevant checks run
- [x] Behavior verified
- [x] Documentation synced if needed

## Status

- [x] Planned
- [x] Implementing
- [x] Testing
- [x] Done
