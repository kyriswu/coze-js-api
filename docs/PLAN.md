# PLAN

## Title
Fix Unkey required credits pre-check for paid APIs

## Approved
yes

## Context Summary
用户反馈 `remaining=1` 时仍可调用 `POST /gpt-image-2/generate` 成功。该接口单次消耗 3 积分，说明调用前的积分校验门槛有缺陷。

## Assumptions
- 保持现有 API 响应结构 `{code,msg,data}` 不变。
- 不引入新依赖。
- 仅做最小修复，不调整其他业务路由。

## Impacted Areas
- `utils/apiAccess.js`
- `index.js`
- `docs/QA.md`
- `docs/RELEASE.md`
- `CHANGELOG.md`

## Steps
1. 在统一校验函数 `verifyApiAccess` 增加 `requiredCredits` 参数（默认 1）。
2. 对付费 key 校验改为 `remaining < requiredCredits` 则拦截。
3. 在 `POST /gpt-image-2/generate` 传入 `requiredCredits: 3`。
4. 运行 `node --check utils/apiAccess.js && node --check index.js` 并记录 QA。

## Verification Plan
- 命令：`node --check utils/apiAccess.js && node --check index.js`
- 手工检查：
	- `remaining=1` 调用 `gpt-image-2` 会被前置拦截为积分不足。
	- `remaining>=3` 调用路径与原行为一致。

## Risks & Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| 统一校验改动影响其他接口 | 潜在误拦截 | `requiredCredits` 默认值为 1，保持既有默认行为 |
| `remaining` 返回异常值 | 误判 | 显式转为 Number 并做有限值判断 |

## Rollback Plan
- 回滚 `utils/apiAccess.js` 中 `requiredCredits` 校验逻辑。
- 回滚 `index.js` 中 `/gpt-image-2/generate` 的 `requiredCredits` 传参。
