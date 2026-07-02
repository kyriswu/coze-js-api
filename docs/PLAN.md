# PLAN

## Title
Isolate network logs from business logs

## Approved
yes

## Context Summary
当前 HTTP/axios 日志直接输出到控制台，会干扰正常业务日志阅读。目标是将网络日志独立输出，同时保留排障信息与可配置能力。

## Assumptions
- 不引入新依赖。
- 保持日志字段基本一致，主要调整输出通道。
- 默认写入独立日志文件，减少控制台干扰。

## Impacted Areas
- `utils/networkLogger.js` (new)
- `index.js`
- `utils/axiosInterceptors.js`
- `docs/QA.md`
- `docs/RELEASE.md`
- `CHANGELOG.md`

## Steps
1. 新增 `utils/networkLogger.js`，支持 `NETWORK_LOG_MODE=off|console|file|both`。
2. 将 `index.js` 中 HTTP 请求日志接入 `logHttpRequest`。
3. 将 `utils/axiosInterceptors.js` 中 axios 日志接入独立 logger。
4. 提供环境变量：
   - `NETWORK_LOG_FILE`（默认 `downloads/network.log`）
   - `NETWORK_LOG_HTTP`（默认开启）
   - `NETWORK_LOG_AXIOS`（默认开启）
5. 运行语法校验并记录 QA。

## Verification Plan
- `node --check utils/networkLogger.js`
- `node --check utils/axiosInterceptors.js`
- `node --check index.js`

## Risks & Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| 默认不再刷控制台 | 运维误判日志缺失 | 文档明确可切 `NETWORK_LOG_MODE=both` |
| 文件写入失败 | 丢失网络日志 | logger 内部捕获写入异常并打印错误 |
| 长期运行日志增长 | 磁盘占用 | 后续加日志轮转或定时清理 |

## Rollback Plan
- 回滚 `index.js` 与 `utils/axiosInterceptors.js` 的 logger 接入。
- 删除 `utils/networkLogger.js`。
- 回滚文档更新。
