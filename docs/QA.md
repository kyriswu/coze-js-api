# QA

## Iteration
2026-05-31 / add-twitter-fetch-tweet-detail

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | node --check utils/tikhub.io.js | 无语法错误 | 命令执行无输出 | pass |
| QA-02 | node --check index.js | 无语法错误 | 命令执行无输出 | pass |
| QA-03 | 参数校验（缺少 tweet_id） | 返回 `code=-1` 且提示 `tweet_id is required` | 已在代码路径实现，待运行时联调确认 | block |
| QA-04 | 正常调用 `/twitter/fetch_tweet_detail` | 返回统一结构 `{code,msg,data}` | 需依赖外部 TikHub 服务与可用凭据，当前未执行在线联调 | block |

## Command Evidence
```bash
cd /root/coze-js-api && node --check utils/tikhub.io.js
cd /root/coze-js-api && node --check index.js
```

## Manual Checks
- 待执行：`POST /twitter/fetch_tweet_detail`，Body 示例：`{"tweet_id":"1808168603721650364","api_key":"<optional>"}`。
- 待执行：不传 `tweet_id`，确认错误分支。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | - | 本轮未发现代码级缺陷；尚未完成外部依赖联调 | open |

## Final QA Verdict
- [ ] pass
- [x] conditional pass
- [ ] fail
