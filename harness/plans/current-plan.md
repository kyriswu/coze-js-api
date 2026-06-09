# PLAN

## Title
Redesign homepage with liquid ripple visual style

## Approved
yes

## Context Summary
用户觉得当前首页太死板，希望页面背景呈现水波纹效果，整体更时尚、前卫、潮流。当前首页为 `views/home.ejs`，已具备插件服务展示、分类筛选、搜索、付费提示和二维码位。

## Assumptions
- 保持现有路由、服务卡片数据和筛选功能不变。
- 不新增依赖，不引入外部图片。
- 使用 CSS 实现水波纹与玻璃质感，避免影响 API 行为。
- 仍需保持文字可读和移动端布局稳定。

## Impacted Areas
- `views/home.ejs`
- `docs/QA.md`
- `docs/RELEASE.md`
- `CHANGELOG.md`

## Steps
1. 重设首页视觉变量，改为水波纹、玻璃质感、青蓝薄荷与珊瑚点缀。
2. 增加纯 CSS 水波背景层和流动动画。
3. 调整导航、搜索、分类、统计、付费提示、服务卡片、快捷入口的玻璃样式。
4. 保持首页筛选脚本、服务数据和 API 路由不变。
5. 运行语法和模板渲染检查。
6. 同步 QA / RELEASE / CHANGELOG。

## Verification Plan
- 命令：`node --check routes/navigationRoutes.js`
- 命令：EJS 模板渲染检查。
- 手工检查：
  - 首页有水波纹背景与流动视觉。
  - 卡片、搜索、分类、付费提示文字仍清晰。
  - 页面不出现登录/注册/控制台入口。
  - 移动端布局不溢出。

## Risks & Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| 动画过多影响性能 | 页面卡顿 | 仅用 CSS transform/background-position，且动画层固定在背景 |
| 背景过花影响阅读 | 服务信息难读 | 前景使用高透明白玻璃面板和深色文字 |
| 浏览器不支持 `backdrop-filter` | 玻璃效果减弱 | 保留半透明背景、边框和阴影作为 fallback |

## Rollback Plan
- 回滚 `views/home.ejs` 中本轮样式调整。
