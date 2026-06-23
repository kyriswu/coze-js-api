# PLAN

## Title
Add Evolink image generation integration

## Approved
yes

## Context Summary
用户要求参考现有第三方接口集成方式，将提供的 Evolink markdown 文档中的接口封装到新的 `utils/ThirdParrtyApi/evolink.ai.js` 中，并在 `index.js` 暴露本地 API。当前已实现图片生成与任务查询；本轮补充账号额度查询接口 `GET /v1/credits`，本地暴露为 `/evolink/credits`。图片生成接口不直接返回异步 task 创建结果，而是在服务端自动轮询任务状态，直至完成、失败或超时后一次性返回结果。

## Assumptions
- 当前已知需要接入的 Evolink 接口包括：`POST /v1/images/generations`、`GET /v1/tasks/{task_id}`、`GET /v1/credits`。
- 保持现有项目风格：第三方能力封装在 `utils/ThirdParrtyApi/`，HTTP 路由注册在 `index.js`。
- 不新增依赖，沿用现有 `axios`。
- 出于仓库安全规则，不将 Evolink API Key 硬编码入仓库，改为通过标准 `.env` 文件加载 `EVOLINK_API_KEY`。

## Impacted Areas
- `utils/ThirdParrtyApi/evolink.ai.js`
- `index.js`
- `harness/plans/current-plan.md`
- `docs/QA.md`
- `docs/RELEASE.md`
- `CHANGELOG.md`

## Steps
1. 新增 `utils/ThirdParrtyApi/evolink.ai.js`，封装 task 创建、task 查询与自动轮询逻辑。
2. 在 `index.js` 中引入 Evolink 模块并暴露本地路由：
   - `POST /evolink/images/generations`
   - `GET /evolink/tasks/:task_id`
   - `GET /evolink/credits`
3. 为图片生成路由增加基础参数校验与统一错误返回，默认同步等待任务完成；为额度查询接口增加无计费的只读 handler。
4. 执行最小可行验证并补充 QA / Release / Changelog 记录。

## Verification Plan
- `node --check utils/ThirdParrtyApi/evolink.ai.js`
- `node --check index.js`
- `node --input-type=module -e "import evolink from './utils/ThirdParrtyApi/evolink.ai.js'; console.log(Object.keys(evolink))"`

## Risks & Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| 上游为异步任务，轮询过久 | 请求挂起过长 | 增加默认超时与轮询间隔参数，超时后返回明确错误 |
| 上游 task 返回结构变化 | 结果解析不稳定 | 保持原始创建响应与最终 task 详情一并返回 |
| 用户未配置 API Key | 接口无法调用 | 启动调用时显式返回缺少 `EVOLINK_API_KEY`，并提供 `.env.example` 模板 |

## Rollback Plan
- 删除 `utils/ThirdParrtyApi/evolink.ai.js`。
- 回滚 `index.js` 中 Evolink import 与 `/evolink/...` 路由注册。
- 回滚文档记录。
