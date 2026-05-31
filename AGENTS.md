# AGENTS

本仓库把 `harness/` 作为 AI Coding Agent 的项目控制台，把 `docs/` 作为人类可读的交付记录。

## 工作原则

- 任何代码修改前，先读 `harness/README.md` 和对应 workflow。
- 新任务的工作计划优先落到 `harness/plans/current-plan.md`，不要只依赖临时会话记忆。
- 保持改动小而可验证，不做无关重构。
- 保持现有 API 兼容，除非任务明确要求破坏性变更。
- 不要记录或输出密钥、token、敏感载荷。
- 完成后同步检查 `docs/QA.md`、`docs/RELEASE.md` 和 `CHANGELOG.md` 是否需要更新。

## 推荐入口

- `harness/README.md`
- `harness/project/overview.md`
- `harness/project/architecture.md`
- `harness/rules/coding-rules.md`
- `harness/workflows/plan-before-code.md`
- `harness/plans/current-plan.md`
