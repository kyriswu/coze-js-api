# PLAN

## Title
Enhance file-transfer with delete/filter/sort/stats/dashboard

## Approved
yes

## Context Summary
用户希望 `/file-transfer` 支持更完整的文件管理能力：手动删除文件、按文件大小排序、按文件类型筛选、展示文件类型数量统计，并提供最近 30 天创建数量日看板（柱状图或折线图）。

## Assumptions
- 不引入新依赖，继续使用 Node + EJS + 原生前端脚本。
- 保持现有路由不变，在现有接口上做向后兼容扩展。
- 图表使用轻量原生 SVG 渲染。

## Impact Scope
- `index.js`
- `views/file-transfer.ejs`
- `docs/PLAN.md`
- `docs/QA.md`
- `docs/RELEASE.md`
- `CHANGELOG.md`

## Steps
1. 扩展 `GET /file-transfer/files`：支持 `fileType/sortBy/sortOrder`，并返回类型统计和近 30 天日统计。
2. 新增 `DELETE /file-transfer/file`：按文件名删除文件。
3. 更新页面：增加类型筛选、排序控件、删除按钮、类型统计展示、30 天趋势图。
4. 运行最小验证并同步文档记录。

## Risks & Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| 删除误操作 | 文件丢失 | 增加前端二次确认 |
| 查询参数组合复杂 | 结果异常 | 后端统一兜底与参数白名单 |
| 图表渲染复杂 | 前端报错 | 使用简单 SVG，空数据兜底 |

## Validation
- `node --check index.js`
- `node --input-type=module -e "import ejs from 'ejs'; await ejs.renderFile('views/file-transfer.ejs',{seo:{}}); console.log('file-transfer.ejs render ok');"`

## Rollback
- 回滚 `index.js` 的文件删除与统计扩展。
- 回滚 `views/file-transfer.ejs` 的新交互与图表模块。
- 回滚文档更新。
