# PLAN

## Title
Fix Unkey required credits pre-check for paid APIs

## Approved
yes

## Context Summary
用户反馈在 `remaining=1` 时，`/gpt-image-2/generate`（单次成本 3 积分）仍可成功调用。排查发现统一访问校验 `verifyApiAccess` 仅按 `remaining === 0` 拦截，未根据接口实际 cost 做前置积分门槛判断。

## Assumptions
- 保持现有 API 返回结构不变。
- 不引入新依赖。
- 最小改动：优先修复统一校验函数，并在 `gpt-image-2` 显式传入 required credits。

## Impacted Areas
- `utils/apiAccess.js`
- `index.js`
- `docs/PLAN.md`
- `docs/QA.md`
- `docs/RELEASE.md`
- `CHANGELOG.md`

## Steps
1. 在 `verifyApiAccess` 增加可选 `requiredCredits` 入参（默认 1）。
2. 调整付费 key 校验：当 `remaining < requiredCredits` 时直接拦截为积分不足。
3. 在 `/gpt-image-2/generate` 的校验调用中传入 `requiredCredits: cost`。
4. 运行最小语法校验命令。
5. 同步 `docs/PLAN.md`、`docs/QA.md`、`docs/RELEASE.md`、`CHANGELOG.md`。

## Verification Plan
- 命令：`node --check utils/apiAccess.js`
- 命令：`node --check index.js`
- 手工检查：
  - `remaining=1` 且调用 `gpt-image-2` 时，在外部服务调用前返回积分不足。
  - `remaining>=3` 时行为保持不变。

## Risks & Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| 修改统一校验影响其他 1 积分接口 | 潜在误拦截 | `requiredCredits` 默认值设为 1，保持现有接口行为 |
| `remaining` 类型异常（非数字） | 校验不稳定 | 使用 `Number(remaining)` 做显式数值比较 |

## Rollback Plan
- 回滚 `utils/apiAccess.js` 的 `requiredCredits` 校验逻辑。
- 回滚 `index.js` 中 `/gpt-image-2/generate` 传参改动。
