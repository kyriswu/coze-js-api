# Harness

`harness/` 是本仓库的 AI Coding Agent 工作台，不是面向人类的普通文档目录。

## 目录职责

- `project/`：项目概览和架构。
- `rules/`：不可变或高优先级的编码与安全规则。
- `workflows/`：做事流程，告诉 Agent 先做什么、后做什么。
- `plans/`：当前计划。
- `validation/`：验收标准、测试清单与发布检查。

## 默认工作方式

1. 先读 `project/` 和 `rules/`。
2. 按任务类型选择 `workflows/`。
3. 新任务先写入 `plans/current-plan.md`。
4. 修改后补充 `validation/`。
5. 需要交付说明时，再同步 `docs/`。
