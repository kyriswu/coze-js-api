# PLAN

## Title
Migrate WeChat MP article list upstream call

## Approved
yes

## Context Summary
用户反馈 `th_wechat_media.get_wechat_mp_article_list` 所依赖的第三方调用方式失效，需要切换到新版文档约定：`POST /api/v1/wechat_mp/v2/fetch_account_articles`，并通过 body 传参（`username/page_size/offset/item_show_type/raw`）。本轮重点是保证本地返回结构兼容，尤其保持 `res.send({ code, msg, data })` 中 `data` 仍为文章数组。

## Assumptions
- 保持项目现有风格：仅修改 `utils/tikhub.io.js` 目标方法，不做无关重构。
- 不引入新依赖。
- 本地入口继续使用 `/wx_gzh/get_user_articles`，并兼容历史请求参数 `gh_id`。

## Impacted Areas
- `utils/tikhub.io.js`
- `docs/QA.md`
- `docs/RELEASE.md`
- `CHANGELOG.md`

## Steps
1. 将 `get_wechat_mp_article_list` 上游请求从 `GET + params(ghid)` 改为 `POST + body(username...)`。
2. 兼容读取请求参数（`gh_id` 或 `username`），并透传可选分页/栏目参数。
3. 将上游响应统一映射为本地 `data` 数组（取 `response.data.data.articles`），保持返回结构兼容。
4. 执行最小可行校验并同步 QA 与发布记录。

## Verification Plan
- 命令：
	- `node --check utils/tikhub.io.js`
- 手工检查：
	- 传入 `gh_id` 时可正常请求新上游。
	- 成功返回保持 `code/msg/data` 结构，且 `data` 为文章数组。

## Risks & Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| 上游接口响应较慢 | 客户端可能超时 | 按文档建议将请求超时设置为 30 秒 |
| 上游 `data` 结构与旧逻辑不同 | 下游消费报错 | 在本地层固定提取 `data.articles` 作为返回数组 |

## Rollback Plan
- 回滚 `utils/tikhub.io.js` 中 `get_wechat_mp_article_list` 的请求方式与响应映射。
