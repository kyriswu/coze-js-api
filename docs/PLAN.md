# PLAN

## 2026-07-06 / support-file-transfer-clipboard-paste-upload

### Objective
让文件中转站支持在页面内通过 `Ctrl+V` 直接粘贴剪贴板中的图片或文件，并沿用现有上传队列流程。

### Context
当前页面已支持拖拽和选择文件，但用户在截图或复制文件后仍需额外操作。补齐粘贴能力可降低上传路径成本。

### Scope
- `views/file-transfer.ejs`：新增粘贴解析与入队逻辑，补充交互提示文案。
- 后端接口不变，继续复用 `POST /file-transfer/upload` 与分片上传接口。

### Plan
1. 增加剪贴板文件提取逻辑（优先读取 `clipboardData.items` 中 `kind=file`，回退 `clipboardData.files`）。
2. 监听全局 `paste` 事件，仅在检测到文件时拦截并将文件加入上传队列。
3. 保持现有行为：粘贴后仅入队，不自动上传。
4. 更新页面提示文案，明确支持拖拽/选择/粘贴三种入队方式。
5. 执行最小可行验证并记录到 `docs/QA.md`。

### Risks
- 粘贴事件可能与普通文本粘贴冲突；已通过“仅检测到文件时拦截”降低影响。
- 某些浏览器对剪贴板文件支持有限，可能出现兼容性差异。

### Validation
- `node --input-type=module -e "import ejs from 'ejs'; await ejs.renderFile('views/file-transfer.ejs',{seo:{}}); console.log('file-transfer.ejs render ok');"`
- `node --check index.js`

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
