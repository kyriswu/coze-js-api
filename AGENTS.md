# AGENTS

本仓库把 `harness/` 作为 AI Coding Agent 的项目控制台，把 `docs/` 作为人类可读的交付记录。

## 工作原则

- 任何代码修改前，先读 `harness/README.md` 和对应 workflow。
- 新任务的工作计划优先落到 `harness/plans/current-plan.md`，不要只依赖临时会话记忆。
- 保持改动小而可验证，不做无关重构。
- 保持现有 API 兼容，除非任务明确要求破坏性变更。
- 不要记录或输出密钥、token、敏感载荷。
- 完成后同步检查 `docs/QA.md`、`docs/RELEASE.md` 和 `CHANGELOG.md` 是否需要更新。

## Graphify

- 回答代码结构、架构或文件关系问题前，如 `graphify-out/graph.json` 存在，先执行 `graphify query "<问题>"` 查询现有图谱。
- 完成代码、文档或其他受图谱追踪文件的修改后，执行 `graphify . --update` 更新知识图谱；若图谱不存在，则执行 `graphify .` 完整重建。
- 更新后确认 `graphify-out/graph.json` 与 `graphify-out/GRAPH_REPORT.md` 已生成；不要将密钥、token 或敏感载荷纳入图谱。

## 推荐入口

- `harness/README.md`
- `harness/project/overview.md`
- `harness/project/architecture.md`
- `harness/rules/coding-rules.md`
- `harness/workflows/plan-before-code.md`
- `harness/plans/current-plan.md`
