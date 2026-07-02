# PLAN

## Title
Set global request body limit default to 500MB

## Approved
yes

## Context Summary
上传 zip 文件出现 413，需统一提升服务默认请求体限制到 500MB，减少解析器限制不一致导致的失败。

## Assumptions
- 使用 Express 原生解析器配置能力。
- 默认值设为 500MB，并支持环境变量覆盖。
- API 路径和响应结构保持不变。

## Impacted Areas
- `index.js`
- `docs/QA.md`
- `docs/RELEASE.md`
- `CHANGELOG.md`

## Steps
1. 新增统一 body limit 常量（默认 `500mb`）。
2. `express.json`、`express.text` 与上传路由 `express.raw` 统一使用该限制。
3. 增加环境变量 `REQUEST_BODY_LIMIT` 以便部署环境覆盖。
4. 运行语法校验并更新文档。

## Verification Plan
- `node --check index.js`

## Risks & Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| 大请求占用内存 | 性能波动 | 可通过 `REQUEST_BODY_LIMIT` 按环境下调 |
| 代理层限制更小 | 仍可能 413 | 同步调整网关（如 Nginx `client_max_body_size`） |

## Rollback Plan
- 回滚 `index.js` 的 body limit 变更。
- 回滚文档更新。
