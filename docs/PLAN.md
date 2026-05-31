# PLAN

## Title
Refactor index.js structure

## Approved
yes

## Context Summary
Shrink `index.js` so it keeps bootstrap and route mounting, while shared helper logic moves into focused utility modules.

## Assumptions
- Keep route behavior and response shapes unchanged.
- Prefer small extraction modules over a broad routing rewrite.
- Preserve current startup flow and middleware order.

## Impacted Areas
- `index.js`
- `utils/apiAccess.js`
- `utils/htmlContent.js`
- `utils/axiosInterceptors.js`

## Steps
1. Extract API access helper logic from `index.js` into a dedicated utility module.
2. Extract HTML parsing helpers from `index.js` into a dedicated utility module.
3. Move the axios 429 logger into a small shared interceptor module.
4. Keep `index.js` focused on startup, middleware, and route wiring.
5. Run syntax checks and a lightweight startup smoke test.

## Verification Plan
- 命令：`node --check index.js`，`node --check utils/apiAccess.js`，`node --check utils/htmlContent.js`，`node --check utils/axiosInterceptors.js`
- 手工检查：启动应用并确认服务可加载
- 手工检查：`/parse_html` 等依赖抽出的工具逻辑的路由仍可响应

## Risks & Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| 抽取过度导致 import 循环 | 启动失败 | 只提取无状态 helper，不引入跨层依赖 |
| 工具逻辑签名变化 | 路由报错 | 先保留原函数名和调用方式 |
| 结构变化引入遗漏 | 行为回归 | 用 `node --check` 和启动烟测验证 |

## Rollback Plan
- 回滚新增的 `utils/apiAccess.js`、`utils/htmlContent.js`、`utils/axiosInterceptors.js`。
- 回滚 `index.js` 中对应的 import 和 helper 调用替换。
