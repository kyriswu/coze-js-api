# PLAN

## Title
Add TikTok handler_user_profile API

## Approved
yes

## Context Summary
用户要求接入 TikHub OpenAPI `/api/v1/tiktok/app/v3/handler_user_profile`，并在本项目创建对应 API。接口需支持 `sec_user_id > user_id > unique_id` 参数优先级，且至少填写一个参数。完成后要实测并根据真实返回优化输出字段。

## Assumptions
- 保持项目现有风格：在 `utils/tikhub.io.js` 增加能力，在 `index.js` 注册路由。
- 不引入新依赖。
- 返回结构保持兼容，新增摘要字段提升可读性。

## Impacted Areas
- `utils/tikhub.io.js`
- `index.js`
- `docs/QA.md`
- `docs/RELEASE.md`
- `CHANGELOG.md`

## Steps
1. 在 `th_tiktok` 中新增 `handler_user_profile` 方法，统一从 query/body 取参并实现参数优先级。
2. 调用上游 `GET /api/v1/tiktok/app/v3/handler_user_profile` 并复用现有鉴权/计费流程。
3. 在 `index.js` 新增本地 API：`POST /tiktok/handler_user_profile` 与 `GET /tiktok/handler_user_profile`。
4. 实测接口并根据真实返回结构优化字段映射（用户统计字段取自 `data.user`）。
5. 执行最小可行校验并同步 QA 与发布记录。

## Verification Plan
- 命令：
	- `node --check utils/tikhub.io.js`
	- `node --check index.js`
- 手工检查：
	- 参数优先级生效：当同时传入多个参数时优先使用 `sec_user_id`。
	- 缺少三个参数时返回明确错误。
	- 成功返回包含 `code/msg/data`，并新增 `params_used/profile` 优化字段。

## Risks & Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| 上游返回结构不稳定 | 摘要字段提取失败 | 采用多路径兜底，保留原始 `data` |
| 新增摘要字段引发兼容担忧 | 调用方适配成本增加 | 保持原有 `data` 不变，仅新增可选字段 |

## Rollback Plan
- 回滚 `utils/tikhub.io.js` 中 `handler_user_profile` 改动。
- 回滚 `index.js` 中 `/tiktok/handler_user_profile` 路由。
