# PLAN

## Title
Return local download URLs for Volcengine generated images

## Approved
yes

## Context Summary
`ve_seedream_5_0_lite.generate_image` 当前直接返回上游 Volcengine 图片 URL。用户需要接口在成功生成后把图片下载到本地 `downloads/`，并在响应中返回本地静态地址。

## Assumptions
- 保持现有外层响应结构 `{code,msg,data}` 不变。
- 不引入新依赖。
- 复用现有 `/downloads` 静态目录暴露方式。

## Impacted Areas
- `utils/volcengine.io.js`
- `utils/tool.js`
- `docs/QA.md`
- `docs/RELEASE.md`
- `CHANGELOG.md`

## Steps
1. 为远程图片新增落盘到 `downloads/` 的通用 helper。
2. 在图片生成成功后，遍历 `response.data.data` 中的远程 URL 并下载到本地。
3. 将返回结果中的图片 URL 改写为 `${req.protocol}://${req.get('host')}/downloads/<file>`。
4. 运行 `node --check utils/tool.js utils/volcengine.io.js` 并记录 QA。

## Verification Plan
- 命令：`node --check utils/tool.js && node --check utils/volcengine.io.js`
- 手工检查：
	- 正常生成一张图片时，`data.data[0].url` 返回本地 `/downloads/...` 地址。
	- 多图生成时，每张图片的 `url` 都被本地地址替换。
	- 外层 `code`、`msg`、`data.model`、`data.usage` 结构保持不变。

## Risks & Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| 上游生成成功但本地下载失败 | 接口返回失败 | 复用已有图片下载逻辑并保留错误透传 |
| 直接改写响应对象导致结构偏差 | 调用方兼容性问题 | 仅替换 `data.data[].url` 字段，其他字段保持原样 |

## Rollback Plan
- 回滚 `utils/tool.js` 新增 helper。
- 回滚 `utils/volcengine.io.js` 中的本地下载与 URL 改写逻辑。
