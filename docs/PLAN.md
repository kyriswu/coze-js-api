# PLAN

## Title
Fix gpt-image-2 reference image download timeout with single retry

## Approved
yes

## Context Summary
`POST /gpt-image-2/generate` 在下载参考图时，出现 `AxiosError: timeout of 20000ms exceeded`，导致整次生成失败。当前下载逻辑为单次请求，无自动重试。

## Assumptions
- 保持现有路由、响应结构和业务语义不变。
- 不引入新依赖。
- 仅在可恢复错误下重试 1 次，避免对输入类错误误重试。

## Impacted Areas
- `utils/tool.js`
- `docs/QA.md`
- `docs/RELEASE.md`
- `CHANGELOG.md`

## Steps
1. 在 `downloadImageUrlToTempFile` 增加可恢复错误判断函数。
2. 将下载流程改为最多 2 次尝试（首次 + 1 次重试）。
3. 仅对 `ECONNABORTED`/网络类错误及 `429/5xx` 执行重试，重试前短暂退避。
4. 单次下载超时从 20s 调整到 30s。
5. 运行 `node --check utils/tool.js` 并记录 QA。

## Verification Plan
- 命令：`node --check utils/tool.js`
- 手工检查：
	- 构造慢链路或瞬时抖动场景，确认会自动重试 1 次。
	- 非图片响应（非 `image/*`）保持原有失败行为。
	- 成功下载场景返回本地临时文件路径。

## Risks & Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| 重试增加失败路径耗时 | 请求尾延迟上升 | 限制为仅 1 次重试且短延迟 |
| 错误分类不当导致无意义重试 | 无效等待 | 仅允许超时/网络临时错误/429/5xx 重试 |

## Rollback Plan
- 回滚 `utils/tool.js` 中 `downloadImageUrlToTempFile` 与新增错误判断方法。
