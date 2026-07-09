# PLAN

## 2026-07-07 / build-google-friendly-sitemap-for-service-crawling

### Objective
建立适合 Google 收录与后续爬虫采集的站点地图体系，覆盖核心页面、服务分类入口和机器可读服务目录。

### Context
现有 `GET /sitemap.xml` 仅包含极少量 URL，无法有效表达站点可抓取范围，也不利于服务目录自动化采集。

### Scope
- `routes/navigationRoutes.js`：重构 sitemap 输出并新增服务目录路由。
- `robots.txt` 保持通过 `Sitemap: /sitemap.xml` 暴露入口。
- 不改动现有业务 API 返回结构。

### Plan
1. 将 `GET /sitemap.xml` 升级为 sitemap index。
2. 新增 `GET /sitemap-pages.xml`，收录核心页面与分类查询入口。
3. 新增 `GET /sitemap-services.xml`，收录服务目录采集入口。
4. 新增 `GET /services/catalog.json`（机器可读）与 `GET /services/catalog.txt`（纯文本）供爬虫直接采集。
5. 执行最小语法验证并同步 QA/RELEASE/CHANGELOG。

### Risks
- 若后续新增页面未同步到 sitemap 生成列表，可能导致收录滞后。
- 第三方跳转页（如 `/plugin`）可收录但不承载站内正文，需与内容页搭配使用。

### Validation
- `node --check routes/navigationRoutes.js`
- `node --check index.js`

## 2026-07-06 / reduce-restart-downtime-in-start-script

### Objective
将部署重启从“全量停机再拉起”改为“仅重建并重启 app 服务”，尽量缩短中断窗口。

### Context
旧脚本使用 `compose down` 会先停掉全部容器，再重新启动，导致服务与 Redis 均出现可感知中断。

### Scope
- `start.sh`：重启流程改造。
- 不修改 API、路由和业务逻辑。

### Plan
1. 使用 `git pull --ff-only` 保证部署拉取行为可预测。
2. 统一抽象 `podman/docker compose` 调用。
3. 先 `compose build app`，再 `compose up -d --no-deps app`。
4. 删除强制 `compose down` 与 `rmi` 操作，避免全局停机。
5. 增加悬空镜像清理，控制磁盘增长。

### Risks
- 单实例 compose 仍会在容器切换时产生短暂抖动，不是严格零停机。
- `--ff-only` 在存在分叉提交时会失败并中断部署。

### Validation
- `bash -n start.sh`

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
