# RELEASE

## Hotfix
2026-06-05 / return-local-download-urls-for-volcengine-generated-images

### Summary
调整 `ve_seedream_5_0_lite.generate_image` 返回结果：将上游生成图片下载到本地 `downloads/`，并返回当前服务可访问的本地图片链接。

### What Changed
- 更新 `utils/tool.js`：新增远程图片保存到 `downloads/` 的复用 helper。
- 更新 `utils/volcengine.io.js`：在图片生成成功后逐张下载远程图片。
- 保持外层响应结构不变，仅将 `data.data[].url` 改写为本地 `/downloads/...` 地址，并补充 `remote_url` 便于追踪原始链接。

### Impact
#### API/Behavior
- `ve_seedream_5_0_lite.generate_image` 返回的图片地址从上游临时 URL 改为当前服务的本地静态链接。
- 原有 `code`、`msg`、`data.model`、`data.usage` 等字段保持兼容。

#### Internal Modules
- 影响 `utils/tool.js` 与 `utils/volcengine.io.js`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `utils/tool.js` 中新增的图片落盘 helper。
- 回滚 `utils/volcengine.io.js` 中的本地下载和 URL 改写逻辑。

## Hotfix
2026-06-02 / fix-gpt-image-2-image-download-timeout-retry

### Summary
修复 `/gpt-image-2/generate` 在下载参考图阶段因 20 秒超时导致的失败问题，增加 1 次可恢复错误重试，提高成功率。

### What Changed
- 更新 `utils/tool.js`：`downloadImageUrlToTempFile` 改为最多 2 次尝试（首次 + 1 次重试）。
- 新增可恢复错误判定：仅对超时/网络临时错误及 `429/5xx` 重试。
- 重试前增加短延迟（600ms）退避。
- 单次下载超时从 20 秒提升到 30 秒。

### Impact
#### API/Behavior
- `POST /gpt-image-2/generate` 下载参考图阶段对瞬时网络问题更稳健。
- 非可恢复错误仍按原逻辑直接失败，避免掩盖输入问题。

#### Internal Modules
- 仅影响 `utils/tool.js` 中图片下载辅助方法。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `utils/tool.js` 中 `downloadImageUrlToTempFile` 与 `isRetryableImageDownloadError` 相关改动。

## Summary
本次交付新增了微信公众号文章搜索接口，基于 TikHub `fetch_search_article` 能力对外提供统一路由。

## What Changed
- 在 `utils/tikhub.io.js` 的 `th_wechat_media` 中新增 `fetch_search_article`。
- 在 `index.js` 新增路由：`POST /wx_gzh/fetch_search_article`。
- 新增参数校验与默认值：
	- `keyword` 必填
	- `offset` 默认 `0`
	- `sort_type` 默认 `_0`，限制 `_0/_2/_4`
- 积分计费调整：`/wx_gzh/fetch_search_article` 使用 API Key 调用时每次扣 2 分。
- 稳健性增强：在该接口内新增默认 3 次请求尝试与短随机退避（300-1200ms），用于缓解上游瞬时失败。
- 对接上游：`GET /api/v1/wechat_mp/web/fetch_search_article`。

## Impact
### API/Behavior
- 新增对外接口：`POST /wx_gzh/fetch_search_article`。
- 维持项目统一响应结构 `{code,msg,data}`。

### Internal Modules
- 更新 `th_wechat_media` 模块，扩展微信公众号能力。

## Breaking Changes
- none / 详细描述

## Migration Notes
- 无需迁移；新接口可直接调用。

## API Usage Notes
- OpenAPI 建议：客户端实现 3-5 次重试并加入短暂随机退避，以提高成功率。

## Rollback Notes
- 回滚 `utils/tikhub.io.js` 中 `fetch_search_article` 方法。
- 回滚 `index.js` 中 `/wx_gzh/fetch_search_article` 路由。

## Deployment Notes
- 环境变量：
- 启动命令：
- 验证命令：
