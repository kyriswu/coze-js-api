# RELEASE

## Feature
2026-07-02 / enhance-file-transfer-delete-filter-sort-dashboard

### Summary
文件中转站增强为可管理视图：支持手动删除文件、按大小排序、按类型筛选、类型数量统计，以及最近 15 天创建数量日看板。

### What Changed
- 更新 `index.js`
	- 扩展 `GET /file-transfer/files`：支持 `fileType/sortBy/sortOrder`。
	- 列表返回新增：
		- `typeStats`（文件类型计数）
		- `recent15Days`（近 15 天每日创建数量）
		- `recent30Days`（兼容字段，当前与 `recent15Days` 保持一致）
	- 新增 `DELETE /file-transfer/file`，支持按文件名删除。
- 更新 `views/file-transfer.ejs`
	- 新增类型筛选和排序控件。
	- 新增每行删除按钮（带确认弹窗）。
	- 新增类型统计标签区域。
	- 新增近 15 天日看板（SVG 柱状图，支持 hover 显示日期和数量）。

### Impact
#### API/Behavior
- `GET /file-transfer/files` 返回结构扩展，兼容原有分页字段。
- 新增删除接口：`DELETE /file-transfer/file?filename=...`。

#### Internal Modules
- 影响 `index.js` 与 `views/file-transfer.ejs`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `index.js` 的删除接口与统计扩展。
- 回滚 `views/file-transfer.ejs` 的筛选/排序/删除/图表功能。

## Enhancement
2026-07-02 / add-file-transfer-pagination

### Summary
文件中转站页面新增分页展示，避免 `downloads/` 文件过多时一次性渲染过载。

### What Changed
- 更新 `index.js`
	- `GET /file-transfer/files` 新增查询参数 `page`、`pageSize`。
	- 返回新增分页元数据：`total/page/pageSize/totalPages`。
	- 默认每页 20 条，`pageSize` 最大限制 100。
- 更新 `views/file-transfer.ejs`
	- 新增分页控件：上一页/下一页。
	- 搜索和刷新会自动回到第 1 页。
	- 页面展示当前页信息。

### Impact
#### API/Behavior
- `GET /file-transfer/files` 向后兼容（不传分页参数时默认第 1 页、20 条）。

#### Internal Modules
- 影响 `index.js` 与 `views/file-transfer.ejs`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `index.js` 的分页参数与返回字段。
- 回滚 `views/file-transfer.ejs` 的分页控件与逻辑。

## Enhancement
2026-07-02 / isolate-network-logs-from-business-logs

### Summary
将 HTTP 与 axios 网络日志从主业务日志中独立出来，默认写入独立日志文件，减少控制台噪音并保留网络排障能力。

### What Changed
- 新增 `utils/networkLogger.js`
	- 提供统一网络日志输出入口：`logHttpRequest`、`logAxiosRequest`、`logAxiosError`、`logRateLimit`。
	- 支持环境变量控制输出模式：
		- `NETWORK_LOG_MODE=off|console|file|both`（默认 `file`）
		- `NETWORK_LOG_FILE`（默认 `downloads/network.log`）
		- `NETWORK_LOG_HTTP`、`NETWORK_LOG_AXIOS`（默认开启）
- 更新 `index.js`
	- 入站请求日志改为调用 `logHttpRequest`，不再直接 `console.log`。
- 更新 `utils/axiosInterceptors.js`
	- axios 成功/失败/429 日志改为调用独立 logger。

### Impact
#### API/Behavior
- API 行为与响应结构不变。
- 网络日志默认不再占用主控制台输出（除非设置 `NETWORK_LOG_MODE=console|both`）。

#### Internal Modules
- 影响 `utils/networkLogger.js`、`index.js`、`utils/axiosInterceptors.js`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `index.js` 与 `utils/axiosInterceptors.js` 的 logger 调用。
- 删除 `utils/networkLogger.js`。

## Feature
2026-07-02 / add-downloads-file-transfer-page

### Summary
新增基于 `downloads/` 目录的文件中转站页面，支持文件查看、搜索、上传任意格式文件，并返回可直接访问的 URL。

### What Changed
- 更新 `routes/navigationRoutes.js`
	- 新增页面路由 `GET /file-transfer`。
	- 首页服务列表新增“文件中转站”入口。
- 更新 `index.js`
	- 新增 `GET /file-transfer/files`：读取 `downloads/` 文件列表并支持 `search` 过滤。
	- 新增 `POST /file-transfer/upload`：接收二进制上传并写入 `downloads/`。
	- 返回统一结构 `code/msg/data`，包含文件名、大小、更新时间、访问 URL。
- 新增 `views/file-transfer.ejs`
	- 提供上传控件、搜索框、文件列表和 URL 展示。
	- 上传成功后自动刷新列表。

### Impact
#### API/Behavior
- 新增页面入口：`GET /file-transfer`。
- 新增接口：`GET /file-transfer/files`、`POST /file-transfer/upload`。
- 复用已有静态托管：`/downloads/<filename>` 直接访问文件。

#### Internal Modules
- 影响 `routes/navigationRoutes.js`、`index.js`、`views/file-transfer.ejs`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `routes/navigationRoutes.js` 的新页面路由与服务入口。
- 回滚 `index.js` 的列表/上传接口。
- 删除 `views/file-transfer.ejs`。

## Enhancement
2026-07-02 / add-unified-request-and-axios-latency-logging

### Summary
为排查网络问题，新增 Node 入站请求统一日志与 axios 出站请求耗时日志，便于快速定位慢请求和失败请求。

### What Changed
- 更新 `index.js`
	- 新增全局请求日志中间件。
	- 在请求完成时记录 `method/path/status/durationMs/ip`。
- 更新 `utils/axiosInterceptors.js`
	- 新增 axios request 拦截器，记录请求起始时间。
	- 新增 axios response 拦截器日志：成功/失败均记录 `method/url/status/durationMs`。
	- 保留现有 429 详细日志，并补充 `durationMs`。
	- 增加幂等保护，避免拦截器重复挂载导致重复日志。

### Impact
#### API/Behavior
- 不改变任何 API 路由、参数或响应结构。
- 仅增加服务端观测日志输出。

#### Internal Modules
- 影响 `index.js` 与 `utils/axiosInterceptors.js`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `index.js` 中新增的请求日志中间件。
- 回滚 `utils/axiosInterceptors.js` 中新增的耗时日志与幂等保护逻辑。

## Hotfix
2026-07-01 / add-volcengine-video-generation-task-wrapper

### Summary
新增火山方舟视频生成任务接口封装，并通过本地路由暴露 `POST /volcengine/contents/generations/tasks`。

### What Changed
- 更新 `utils/volcengine.io.js`
	- 新增 `ve_contents_generations_tasks.create_task`，向上游 `POST /api/v3/contents/generations/tasks` 发起请求。
	- 请求体默认去掉本地 `api_key`，其余业务参数按原样转发。
	- 兼容将字符串形式的 `content` / `tools` 尝试解析为 JSON。
	- 请求超时设置为 30 秒。
- 更新 `index.js`
	- 新增本地路由 `POST /volcengine/contents/generations/tasks`。
	- 路由保持与现有 Volcengine 封装一致的挂载方式。

### Reference Example
```json
{
	"api_key": "your_project_api_key",
	"model": "doubao-seedance-2-0-260128",
	"content": [
		{
			"type": "text",
			"text": "一只猫在雨夜的霓虹街道上缓慢行走，镜头轻微跟随，氛围电影感。"
		},
		{
			"type": "image_url",
			"image_url": {
				"url": "https://example.com/reference-first-frame.png"
			},
			"role": "first_frame"
		},
		{
			"type": "video_url",
			"video_url": {
				"url": "https://example.com/reference-video.mp4"
			},
			"role": "reference_video"
		},
		{
			"type": "audio_url",
			"audio_url": {
				"url": "https://example.com/reference-audio.mp3"
			},
			"role": "reference_audio"
		}
	],
	"generate_audio": true,
	"resolution": "720p",
	"ratio": "16:9",
	"duration": 5,
	"watermark": false
}
```

```bash
curl --request POST \
	--url http://127.0.0.1:3000/volcengine/contents/generations/tasks \
	--header 'Content-Type: application/json' \
	--data '{
		"api_key": "your_project_api_key",
		"model": "doubao-seedance-2-0-260128",
		"content": [
			{
				"type": "text",
				"text": "一只猫在雨夜的霓虹街道上缓慢行走，镜头轻微跟随，氛围电影感。"
			},
			{
				"type": "image_url",
				"image_url": {
					"url": "https://example.com/reference-first-frame.png"
				},
				"role": "first_frame"
			},
			{
				"type": "video_url",
				"video_url": {
					"url": "https://example.com/reference-video.mp4"
				},
				"role": "reference_video"
			},
			{
				"type": "audio_url",
				"audio_url": {
					"url": "https://example.com/reference-audio.mp3"
				},
				"role": "reference_audio"
			}
		],
		"generate_audio": true,
		"resolution": "720p",
		"ratio": "16:9",
		"duration": 5,
		"watermark": false
	}'
```

	### Multi-Reference-Image Example
	```json
	{
		"api_key": "your_project_api_key",
		"model": "doubao-seedance-2-0-260128",
		"content": [
			{
				"type": "text",
				"text": "根据多张参考图生成一段统一风格的城市漫步视频，保持人物服装和色调一致。"
			},
			{
				"type": "image_url",
				"image_url": {
					"url": "https://example.com/reference-1.png"
				},
				"role": "reference_image"
			},
			{
				"type": "image_url",
				"image_url": {
					"url": "https://example.com/reference-2.png"
				},
				"role": "reference_image"
			},
			{
				"type": "image_url",
				"image_url": {
					"url": "https://example.com/reference-3.png"
				},
				"role": "reference_image"
			}
		],
		"generate_audio": true,
		"resolution": "720p",
		"ratio": "adaptive",
		"duration": 5,
		"watermark": false
	}
	```

### Impact
#### API/Behavior
- 新增本地视频生成任务创建入口。
- 响应结构保持 `code/msg/data`，其中 `data` 直接透传上游返回。

#### Internal Modules
- 影响 `utils/volcengine.io.js` 与 `index.js`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `utils/volcengine.io.js` 中新增的视频生成任务封装。
- 回滚 `index.js` 中新增的路由。

## Hotfix
2026-06-27 / migrate-wechat-mp-article-list-post-body

### Summary
修复微信公众号文章列表接口上游调用失效问题，切换到新版 body 传参调用方式，并保持本地响应结构兼容。

### What Changed
- 更新 `utils/tikhub.io.js`：`th_wechat_media.get_wechat_mp_article_list`
	- 上游调用从 `GET` 改为 `POST /api/v1/wechat_mp/v2/fetch_account_articles`。
	- 请求参数从 `ghid` 查询参数改为 body `username`，并支持 `page_size/offset/item_show_type/raw`。
	- 本地兼容历史参数：若传入 `gh_id`，内部自动映射为 `username`。
	- 为保持历史 `data` 数组结构一致性，内部固定使用 `raw=false` 请求上游精简结果。
	- 增加 `timeout: 30000` 以适配上游慢响应场景。
	- 返回结构保持兼容：`data` 统一映射为旧版结构 `{ list, offset }`，其中 `list` 来源于上游 `data.articles`。

### Impact
#### API/Behavior
- 本地入口 `POST /wx_gzh/get_user_articles` 不变。
- 成功响应仍为 `code/msg/data`，其中 `data` 为 `{ list, offset }`。
- 计费与鉴权逻辑不变（`valid_redis_key` + `unkey.verifyKey`）。

#### Internal Modules
- 影响 `utils/tikhub.io.js`。

### Breaking Changes
- none

### Rollback Notes
- 回滚 `utils/tikhub.io.js` 中 `get_wechat_mp_article_list` 的本轮改动。

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
	- `GET /evolink/credits`
- 安全调整：Evolink API Key 不写入仓库文件，改为通过标准 `.env` 文件读取 `EVOLINK_API_KEY`。
- 新增 `.env.example` 作为配置模板，并在启动时通过 `utils/loadEnv.js` 加载 `.env`。
- 使用方式：参考 `.env.example` 手动创建根目录 `.env`；`start.sh` 不负责生成或同步环境文件。

### Impact
#### API/Behavior
- 新增可直接调用的 Evolink 图片生成接口。
- `POST /evolink/images/generations` 不再只返回上游 task 创建结果，而是默认等待最终任务完成后一次性返回。
- `POST /evolink/images/generations` 请求体现在要求提供项目内 `api_key`，并在成功后按 `creditCost` 扣除对应积分。
- `GET /evolink/credits` 为无计费的账号额度查询接口，仅依赖服务端配置的 Evolink 上游 key。
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
