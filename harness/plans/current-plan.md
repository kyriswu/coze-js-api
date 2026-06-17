# PLAN

## Title
Add TikTok handler_user_profile API

## Approved
yes

## Context Summary
用户要求新增 TikHub OpenAPI 接口 `/api/v1/tiktok/app/v3/handler_user_profile` 到项目中，并创建可调用的本地 API。接口需支持参数优先级 `sec_user_id > user_id > unique_id`，至少一个参数必填。实现后需要进行实际测试，并基于测试结果优化对外返回字段。

## Assumptions
- 保持现有项目风格：在 `utils/tikhub.io.js` 增加能力，在 `index.js` 暴露路由。
- 不新增依赖，沿用现有 `axios + commonUtils.valid_redis_key + unkey.verifyKey` 模式。
- 输出字段优化以“保留兼容 + 增加可读摘要”为原则，避免破坏现有调用方。

## Impacted Areas
- `utils/tikhub.io.js`
- `index.js`
- `docs/PLAN.md`
- `docs/QA.md`
- `docs/RELEASE.md`
- `CHANGELOG.md`

## Steps
1. 在 `th_tiktok` 中新增 `handler_user_profile` 方法，兼容 body/query 取参并做优先级与必填校验。
2. 调用 TikHub 上游 `GET /api/v1/tiktok/app/v3/handler_user_profile`，接入现有鉴权与计费流程。
3. 在 `index.js` 新增本地路由（优先 `POST /tiktok/handler_user_profile`，补充 `GET` 兼容）。
4. 实测接口，记录真实返回结构，补充优化字段（例如标准化输入参数回显与核心用户信息摘要）。
5. 执行最小可行语法验证并同步文档记录。

## Verification Plan
- `node --check utils/tikhub.io.js`
- `node --check index.js`
- 运行本地服务并调用 `/tiktok/handler_user_profile`，验证：
  - 参数优先级生效。
  - 至少一个参数缺失时返回明确错误。
  - 成功返回包含 `code/msg/data`，并具备优化后的摘要字段。

## Risks & Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| 上游返回结构不稳定 | 摘要字段提取失败 | 对多种路径兜底提取，失败时仍返回原始 `data` |
| 新增字段影响旧调用方 | 兼容风险 | 保持 `data` 原样，新增独立 `profile`/`params_used` 字段 |
| GET/POST参数来源差异 | 参数缺失误判 | 统一 `query + body` 合并取参 |

## Rollback Plan
- 回滚 `utils/tikhub.io.js` 中 `th_tiktok.handler_user_profile` 相关改动。
- 回滚 `index.js` 中 `/tiktok/handler_user_profile` 路由注册。
