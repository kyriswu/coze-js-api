# RELEASE

## Feature
2026-06-22 / add-evolink-image-generation-api

### Summary
新增 Evolink 图片生成第三方接口集成，支持提交图片生成任务、查询任务详情，并在本地图片生成接口中自动轮询上游 task 直到返回最终结果。

### What Changed
- 新增 `utils/ThirdParrtyApi/evolink.ai.js`
	- 封装 `image_generation`：提交 `POST /v1/images/generations` 后自动轮询任务结果。
	- 封装 `get_task_detail`：查询 `GET /v1/tasks/{task_id}`。
	- 封装 `wait_task_result`：统一轮询 `pending/processing/completed/failed` 状态并处理超时。
- 更新 `index.js`：新增本地 API 路由
	- `POST /evolink/images/generations`
	- `GET /evolink/tasks/:task_id`
- 安全调整：Evolink API Key 不写入仓库文件，改为通过标准 `.env` 文件读取 `EVOLINK_API_KEY`。
- 新增 `.env.example` 作为配置模板，并在启动时通过 `utils/loadEnv.js` 加载 `.env`。
- 更新 `start.sh`：每次启动先 `git pull`，再根据 `.env.example` 自动生成 `.env`，并用 `.env.local` 里的机器私有值覆盖，保证后续环境变量项新增/修改可自动同步。

### Impact
#### API/Behavior
- 新增可直接调用的 Evolink 图片生成接口。
- `POST /evolink/images/generations` 不再只返回上游 task 创建结果，而是默认等待最终任务完成后一次性返回。
- 返回结构已进一步收敛为：
	- `image`：最终生成图片地址
	- `credit_used`：上游实际消耗额度
	- `creditCost`：按 `ceil(credit_used * 0.12) * 0.05` 计算后的成本字段

#### Internal Modules
- 影响 `utils/ThirdParrtyApi/evolink.ai.js`、`index.js`。

### Breaking Changes
- none

### Rollback Notes
- 删除 `utils/ThirdParrtyApi/evolink.ai.js`。
- 回滚 `index.js` 中 `/evolink/images/generations` 与 `/evolink/tasks/:task_id` 路由。

## Enhancement
2026-06-18 / append-douyin-general-search-id-to-msg

### Summary
优化抖音综合搜索接口 `fetch_general_search_v1` 的提示文案：成功响应时将可用于翻页续搜的 `search_id` 提取并追加到 `msg`。

### What Changed
- 更新 `utils/tikhub.io.js`：`th_douyin.fetch_general_search_v1`
	- 新增 `search_id` 提取链路：`data.search_id -> data.log.search_id -> data.log_pb.impr_id -> data.extra.search_request_id -> data.extra.logid`。
	- 在原有 `msg` 基础上追加提示：`下次搜索search_id为：[search_id]`。

### Impact
#### API/Behavior
- 响应结构保持兼容：`code`、`data` 不变，仅增强 `msg` 文案。
- 用户可直接从 `msg` 获取下次搜索建议使用的 `search_id`。

#### Internal Modules
- 影响 `utils/tikhub.io.js`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `utils/tikhub.io.js` 中 `fetch_general_search_v1` 的 `search_id` 提取与 `msg` 拼接逻辑。

## Feature
2026-06-17 / add-tiktok-handler-user-profile-api

### Summary
新增 TikTok 指定用户信息接口封装，接入 TikHub `handler_user_profile`，并基于实测优化返回摘要字段。

### What Changed
- 更新 `utils/tikhub.io.js`：在 `th_tiktok` 中新增 `handler_user_profile`。
	- 支持 `sec_user_id > user_id > unique_id` 参数优先级。
	- 参数至少一个必填，且 `user_id` 必须为纯数字字符串。
	- 对接上游 `GET /api/v1/tiktok/app/v3/handler_user_profile`。
	- 成功响应新增 `params_used` 与 `profile` 摘要字段，保留原始 `data`。
- 更新 `index.js`：新增本地 API 路由
	- `POST /tiktok/handler_user_profile`
	- `GET /tiktok/handler_user_profile`

### Impact
#### API/Behavior
- 新增可直接调用的 TikTok 用户信息接口。
- 返回结构保持兼容：`data` 未破坏；新增 `params_used`、`profile` 提升可读性。
- `profile` 统计字段基于实测从 `data.user` 提取，避免错误默认值。

#### Internal Modules
- 影响 `utils/tikhub.io.js`、`index.js`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `utils/tikhub.io.js` 中 `handler_user_profile` 相关改动。
- 回滚 `index.js` 中 `/tiktok/handler_user_profile` 路由注册。

## Hotfix
2026-06-12 / align-douyin-transcribe-api-key-messaging

### Summary
统一 `douyin-transcribe-api` 缺少 API Key 场景提示，明确该服务不提供免费 key，避免用户误解。

### What Changed
- 更新 `skills/douyin-transcribe-api/SKILL.md`：
	- 缺 key 提示改为“本服务不提供免费 API Key”。
	- 新增缺 key 强制规则与标准回复模板。
	- 无效 key 指引改为“购买/续费”语义。
- 更新 `skills/douyin-transcribe-api/scripts/transcribe_douyin.sh`：
	- 缺 key 输出改为购买/续费指引，不再使用“申请或反馈”。

### Impact
#### API/Behavior
- 仅影响技能文案和脚本提示语，不影响接口调用协议与返回结构。
- 缺少 `DOUYIN_TRANSCRIBE_API_KEY` 时，用户将明确获知“不提供免费 key”。

#### Internal Modules
- 影响 `skills/douyin-transcribe-api/SKILL.md` 与 `skills/douyin-transcribe-api/scripts/transcribe_douyin.sh`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `skills/douyin-transcribe-api/SKILL.md` 文案改动。
- 回滚 `skills/douyin-transcribe-api/scripts/transcribe_douyin.sh` 文案改动。

## Hotfix
2026-06-12 / fix-unkey-required-credits-precheck

### Summary
修复付费接口积分前置校验门槛：当接口成本大于 1 时，调用前会按所需积分校验，避免 `remaining=1` 仍可调用 `gpt-image-2`（成本 3）成功。

### What Changed
- 更新 `utils/apiAccess.js`：`verifyApiAccess` 新增 `requiredCredits` 参数（默认 1）。
- 调整付费校验逻辑：`remaining < requiredCredits` 时返回积分不足。
- 更新 `index.js`：`POST /gpt-image-2/generate` 在校验时传入 `requiredCredits: 3`。

### Impact
#### API/Behavior
- `POST /gpt-image-2/generate` 现在会在调用上游生图服务前拦截余额不足（<3 积分）的请求。
- 其他基于 `verifyApiAccess` 且单次 1 积分的接口行为保持不变。

#### Internal Modules
- 影响 `utils/apiAccess.js`、`index.js`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `utils/apiAccess.js` 中 `requiredCredits` 校验改动。
- 回滚 `index.js` 中 `gpt-image-2` 的 `requiredCredits` 传参。

## Feature
2026-06-09 / redesign-homepage-liquid-ripple-style

### Summary
重设插件服务首页视觉风格，将原本偏规整的服务目录升级为水波纹背景和玻璃质感的潮流展示页。

### What Changed
- 更新 `views/home.ejs` CSS：新增水波纹背景层、流动高光动画和液态视觉变量。
- 调整导航、搜索、分类、统计、付费提示、服务卡片和底部快捷入口为玻璃拟态样式。
- 保持现有服务数据、筛选脚本、二维码位和 API 路由不变。

### Impact
#### UI/Behavior
- 首页视觉更时尚、前卫、潮流。
- 用户仍可按分类和关键词浏览插件服务。

#### Internal Modules
- 仅影响 `views/home.ejs`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `views/home.ejs` 中本轮 CSS 样式调整。

## Feature
2026-06-09 / build-plugin-services-showcase-homepage

### Summary
新增 DevTool 插件服务首页，将原 `/` 的 `Hello World!` 替换为插件服务展示页。

### What Changed
- 新增 `views/home.ejs`：提供分类筛选、关键词搜索、服务统计、插件卡片网格和快捷入口。
- 更新 `routes/navigationRoutes.js`：为 `/` 路由传入插件分类、服务卡片、统计和 SEO 信息。
- 首页移除登录、注册、控制台主入口，定位为纯插件服务展示页。
- 首页新增付费购买提示，直接展示微信 `xiaowu_azt` 和备注“购买插件额度”。
- 新增 `/assets` 静态目录，并在付费提示中预留 `/assets/wechat-qr.png` 二维码图片位。

### Impact
#### API/Behavior
- `GET /` 现在返回插件服务 HTML 页面。
- 现有 API 路由和响应结构不变。

#### Internal Modules
- 影响 `index.js`、`routes/navigationRoutes.js`、`views/home.ejs` 与 `assets/`。

### Breaking Changes
- none

### Rollback Notes
- 将 `/` 路由恢复为 `res.send('Hello World!')`。
- 删除 `views/home.ejs`。

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
