# PLAN

## Title
Migrate WeChat MP article-list upstream call (keep response-compatible)

## Approved
yes

## Context Summary
用户要求修复 `th_wechat_media.get_wechat_mp_article_list`：旧的第三方调用方式已失效，需要按新版文档切换到 `POST /api/v1/wechat_mp/v2/fetch_account_articles`（body 参数 `username/page_size/offset/item_show_type/raw`）。同时必须保持本地接口现有响应结构兼容，最终输出对齐旧版结构 `res.send({ code, msg, data: { list, offset } })`。

## Assumptions
- 本地入口仍为 `POST /wx_gzh/get_user_articles`，请求体主要沿用历史参数 `gh_id/offset/api_key`。
- 新上游要求 body 参数名为 `username`，且推荐 POST body 传递分页游标。
- 为保持兼容，本地输出旧版对象结构：`data.list`（文章数组）+ `data.offset`（分页游标）。
- 不新增依赖，沿用现有 `axios`。

## Impacted Areas
- `utils/tikhub.io.js`
- `harness/plans/current-plan.md`
- `docs/QA.md`
- `docs/RELEASE.md`
- `CHANGELOG.md`

## Steps
1. 调整 `get_wechat_mp_article_list` 参数读取与上游请求方式：由 `axios.get + ghid` 改为 `axios.post + username`。
2. 保持本地响应结构兼容：继续返回 `code/msg/data`，并将上游 `data.articles` 映射为本地 `data.list`，将 `is_end/next_offset` 映射为 `data.offset`。
3. 保持现有鉴权与扣费逻辑不变（`valid_redis_key` + `unkey.verifyKey`）。
4. 运行最小验证命令并记录到 `docs/QA.md`；同步 `docs/RELEASE.md` 与 `CHANGELOG.md`。

## Verification Plan
- `node --check utils/tikhub.io.js`

## Risks & Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| 上游 `raw` 返回结构与旧接口差异 | 下游依赖解析异常 | 在本地层统一提取 `response.data.data.articles` 作为 `data` 输出 |
| 新接口响应较慢 | 客户端超时 | 在 axios 调用中配置较长超时（30s）以贴合上游文档建议 |
| 旧参数名与新参数名不一致 | 请求失败 | 兼容读取 `gh_id`，内部映射为 `username` 后再请求上游 |

## Rollback Plan
- 回滚 `utils/tikhub.io.js` 中 `get_wechat_mp_article_list` 的请求方式与参数映射。
- 回滚本轮文档更新。
