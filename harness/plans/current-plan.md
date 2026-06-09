# PLAN

## Title
Add WeChat QR code asset to homepage payment prompt

## Approved
yes

## Context Summary
用户希望把微信二维码放到首页付费提示处，并将图片保存到项目根目录的 `assets/` 文件夹。当前会话里能看到二维码截图，但工具无法访问原始图片文件；工作区和 `/tmp` 下也未找到可复用图片文件。

## Assumptions
- 不重绘或伪造二维码，避免生成不可扫码或错误二维码。
- 先接入本地静态资源路径 `/assets/wechat-qr.png`。
- 图片文件需要用户以文件形式放到 `assets/wechat-qr.png` 或重新上传可访问文件。

## Impacted Areas
- `index.js`
- `views/home.ejs`
- `assets/`
- `docs/QA.md`
- `docs/RELEASE.md`
- `CHANGELOG.md`

## Steps
1. 新增 `assets/` 目录占位文件。
2. 在 Express 中暴露 `/assets` 静态目录。
3. 在首页付费提示卡片中加入二维码图片位置，引用 `/assets/wechat-qr.png`。
4. 加入图片加载失败 fallback，避免图片未放入时页面破损。
5. 运行语法和模板渲染检查。
6. 同步 QA / RELEASE / CHANGELOG。

## Verification Plan
- 命令：`node --check index.js && node --check routes/navigationRoutes.js`
- 命令：EJS 模板渲染检查。
- 手工检查：
  - 首页付费提示中存在二维码图片位。
  - 图片地址为 `/assets/wechat-qr.png`。
  - 未放入图片时保留文字联系方式 fallback。

## Risks & Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| 无法从聊天截图提取原始二维码文件 | 二维码暂不能扫码 | 不伪造二维码，等待用户提供文件 |
| 图片路径未暴露 | 浏览器无法加载图片 | 新增 `/assets` 静态目录 |

## Rollback Plan
- 移除 `/assets` 静态目录配置。
- 移除首页二维码图片展示块。
