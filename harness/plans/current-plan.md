# PLAN

## Title
Set global request body limit default to 500MB

## Approved
yes

## Context Summary
用户上传 zip 时遇到 413，希望将全局默认请求体大小提升到 500MB，避免不同解析器限制不一致导致上传失败。

## Assumptions
- 继续使用现有 Express 解析器，不引入新依赖。
- 默认 500MB，同时支持环境变量覆盖。
- 保持现有 API 结构不变。

## Impact Scope
- `index.js`
- `docs/PLAN.md`
- `docs/QA.md`
- `docs/RELEASE.md`
- `CHANGELOG.md`

## Steps
1. 在 `index.js` 增加统一的全局 body limit 常量（默认 `500mb`）。
2. 将 `express.json`、`express.text`、`/file-transfer/upload` 的 `express.raw` 统一改为该限制。
3. 支持通过环境变量 `REQUEST_BODY_LIMIT` 覆盖默认值。
4. 运行语法校验并同步文档。

## Risks & Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| 请求体过大占用内存 | 服务压力升高 | 保留环境变量可按部署环境下调 |
| 反向代理限制未同步 | 仍返回 413 | 文档提示同时调整 Nginx `client_max_body_size` |
| 非上传接口接收大请求 | 风险增大 | 后续可按路由细分更严格限制 |

## Validation
- `node --check index.js`

## Rollback
- 回滚 `index.js` body limit 改动。
- 回滚文档更新。
