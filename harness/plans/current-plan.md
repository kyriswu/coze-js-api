# PLAN

## Title
Add local network log analysis tool to reduce LLM token usage

## Approved
yes

## Context Summary
用户担心 `downloads/network.log` 在大规模行数下会导致 LLM token 消耗过快，希望有便于长期分析的本地工具。

## Assumptions
- 不引入新依赖，使用 Node.js 标准库流式读取日志。
- 工具优先输出摘要与 TOP 列表，避免全量打印。
- 保持现有日志格式（JSON Lines）兼容。

## Impact Scope
- `scripts/network-log-analyze.mjs` (new)
- `package.json`
- `docs/PLAN.md`
- `docs/QA.md`
- `docs/RELEASE.md`
- `CHANGELOG.md`

## Steps
1. 新增流式分析脚本，支持大文件处理。
2. 提供摘要统计：总行数、解析成功数、level/tag 统计、状态码分布、TOP 路径、慢请求 TOP。
3. 在 `package.json` 增加 npm 快捷命令。
4. 运行脚本做最小可行验证并同步文档。

## Risks & Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| 日志行格式异常 | 部分统计失真 | 统计 parseError 并跳过坏行 |
| 超大日志 I/O 开销 | 命令执行慢 | 使用 readline 流式读取，避免整文件加载 |
| 输出仍然过长 | 阅读成本高 | 默认限制 TOP 条数，可通过参数调节 |

## Validation
- `node --check scripts/network-log-analyze.mjs`
- `node scripts/network-log-analyze.mjs --file downloads/network.log --limit 5`

## Rollback
- 删除 `scripts/network-log-analyze.mjs`。
- 回滚 `package.json` 新增脚本。
- 回滚文档更新。
