# PLAN

## Title
Enhance file-transfer with delete/filter/sort/stats/dashboard

## Approved
yes

## Context Summary
用户希望 `/file-transfer` 提供更完整的文件管理体验：支持手动删除文件、按文件大小排序、按文件类型筛选、文件类型统计，以及最近 30 天创建数量日看板。

## Assumptions
- 不引入新依赖，继续使用原生前端 + EJS。
- 保持现有接口路径，兼容历史调用。
- 图表采用轻量 SVG 渲染。

## Impacted Areas
- `index.js`
- `views/file-transfer.ejs`
- `docs/QA.md`
- `docs/RELEASE.md`
- `CHANGELOG.md`

## Steps
1. 扩展 `GET /file-transfer/files`：
   - 支持 `fileType/sortBy/sortOrder`。
   - 返回 `typeStats` 与 `recent30Days`。
2. 新增 `DELETE /file-transfer/file` 删除接口。
3. 更新页面控件与展示：
   - 类型筛选、排序下拉。
   - 每行删除按钮。
   - 类型统计标签。
   - 最近 30 天创建数量图表。
4. 运行最小验证并同步文档。

## Verification Plan
- `node --check index.js`
- `node --input-type=module -e "import ejs from 'ejs'; await ejs.renderFile('views/file-transfer.ejs',{seo:{}}); console.log('file-transfer.ejs render ok');"`

## Risks & Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| 删除误操作 | 文件丢失 | 删除前前端确认弹窗 |
| 数据量大导致渲染慢 | 页面卡顿 | 分页 + 服务端过滤排序 |
| 统计口径差异 | 认知偏差 | 使用创建时间（birthtime 不可用时回退 mtime） |

## Rollback Plan
- 回滚 `index.js` 的删除、筛选排序和统计扩展。
- 回滚 `views/file-transfer.ejs` 的新 UI 与交互。
- 回滚文档更新。
