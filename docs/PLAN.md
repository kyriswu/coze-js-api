# PLAN

## 2026-07-03 / revamp-file-transfer-core-panel-multi-upload

### Objective
完成文件中转站核心界面改版，优先交付现代化管理面板与批量上传体验，不做详情抽屉。

### Context
当前后端 API 已具备文件列表、上传、删除、分页、筛选、排序、统计和近 15 天趋势数据能力。主要缺口在前端交互体验与信息架构。

### Scope
- `views/file-transfer.ejs`：核心页面重构。
- 后端保持兼容，不引入新依赖与破坏性变更。

### Plan
1. 重构布局为上传侧栏 + 管理主区。
2. 新增拖拽上传、多文件队列、逐文件进度。
3. 保留并重组搜索/筛选/排序/分页控制。
4. 将文件操作统一为按钮交互（打开、复制链接、删除）。
5. 保留统计卡片、类型分布和近 15 天图表。
6. 执行最小可行验证并记录到 `docs/QA.md`。

### Risks
- UI 重构可能引入浏览器端交互回归。
- 多文件上传在弱网络下可能出现部分成功场景，需要明确反馈。

### Validation
- `node --input-type=module -e "import ejs from 'ejs'; await ejs.renderFile('views/file-transfer.ejs',{seo:{}}); console.log('file-transfer.ejs render ok');"`
- `node --check index.js`
