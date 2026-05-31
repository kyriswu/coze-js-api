# PLAN

## Title
Add Twitter single tweet detail endpoint

## Approved
yes

## Context Summary
Add one new TikHub-based endpoint for fetching single tweet detail while preserving existing project routing style (`POST` local route, upstream `GET`).

## Assumptions
- Reuse existing TikHub token and unkey verification logic already implemented in `utils/tikhub.io.js`.
- Keep response shape aligned with existing social endpoint wrappers.

## Impacted Areas
- `index.js`
- `utils/tikhub.io.js`

## Steps
1. [done] Add `th_twitter.fetch_tweet_detail` implementation in `utils/tikhub.io.js`.
2. [done] Wire `th_twitter` import and route `POST /twitter/fetch_tweet_detail` in `index.js`.
3. [done] Run syntax checks and record QA/changelog updates.

## Verification Plan
- 命令：`node --check utils/tikhub.io.js`，`node --check index.js`
- 手工检查：POST 调用 `/twitter/fetch_tweet_detail`（含合法 `tweet_id`）
- 边界/错误路径：缺少 `tweet_id`、上游非 200 返回

## Risks & Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| 上游 TikHub API 波动 | 接口失败 | 统一错误返回 `commonUtils.MESSAGE.SERVER_ERROR` |
| 调用方未传 `tweet_id` | 请求无效 | 参数前置校验并返回 `tweet_id is required` |

## Rollback Plan
- 回滚 `utils/tikhub.io.js` 新增的 `th_twitter` 对象与 default export 变更。
- 回滚 `index.js` 的 `th_twitter` import 与 `/twitter/fetch_tweet_detail` 路由注册。
