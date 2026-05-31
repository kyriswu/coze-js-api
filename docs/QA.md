# QA

## Iteration
2026-05-31 / gpt-image-2-entry-vs-outbound-log

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | node --check index.js | 无语法错误 | 命令执行无输出 | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --check index.js
```

## Manual Checks
- 在 `/gpt-image-2/generate` 增加入口日志：`imageCount` 与 `images[{index,host,fileName}]`。
- 可与 `gpt_image_2_edit` 的 openai-hub 发包日志对比，定位丢图发生层级。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | - | 本轮未发现语法缺陷 | closed |

## Final QA Verdict
- [x] pass
- [ ] conditional pass
- [ ] fail

## Iteration
2026-05-31 / gpt-image-2-edit-payload-log

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | node --check utils/ThirdParrtyApi/aitoken.js | 无语法错误 | 命令执行无输出 | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --check utils/ThirdParrtyApi/aitoken.js
```

## Manual Checks
- 在 `gpt_image_2_edit` 中新增发请求前日志：输出 `imageCount`、`images[{index,field,fileName}]`、`hasMask`、`endpoint`。
- 日志位于 `fetch(${OPENAI_HUB_BASE}/v1/images/edits)` 之前，可用于确认最终发送到 openai-hub 的图片数量。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | - | 本轮未发现语法缺陷 | closed |

## Final QA Verdict
- [x] pass
- [ ] conditional pass
- [ ] fail

## Iteration
2026-05-31 / create-twitterwebapi-skill

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | /root/miniconda3/bin/python -m py_compile skills/twitterwebapi/scripts/twitter_api.py | Python 语法通过 | 命令执行无输出 | pass |

## Command Evidence
```bash
cd /root/coze-js-api && /root/miniconda3/bin/python -m py_compile skills/twitterwebapi/scripts/twitter_api.py
```

## Manual Checks
- 新增 skill：`skills/twitterwebapi/SKILL.md`
- 新增脚本：`skills/twitterwebapi/scripts/twitter_api.py`

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | - | 本轮未发现语法缺陷 | closed |

## Final QA Verdict
- [x] pass
- [ ] conditional pass
- [ ] fail

## Iteration
2026-05-31 / refactor-index-structure

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | node --check index.js | 无语法错误 | 命令执行无输出 | pass |
| QA-02 | node --check utils/apiAccess.js | 无语法错误 | 命令执行无输出 | pass |
| QA-03 | node --check utils/htmlContent.js | 无语法错误 | 命令执行无输出 | pass |
| QA-04 | node --check utils/axiosInterceptors.js | 无语法错误 | 命令执行无输出 | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --check index.js && node --check utils/apiAccess.js && node --check utils/htmlContent.js && node --check utils/axiosInterceptors.js
```

## Manual Checks
- 结构验证：`index.js` 已下沉 API access helper、HTML parsing helper 和 axios 429 日志器到独立模块。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | - | 本轮未发现语法或模块引用缺陷 | closed |

## Final QA Verdict
- [x] pass
- [ ] conditional pass
- [ ] fail

## Iteration
2026-05-31 / add-twitter-fetch-search-timeline

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | node --check utils/tikhub.io.js | 无语法错误 | 命令执行无输出 | pass |
| QA-02 | node --check index.js | 无语法错误 | 命令执行无输出 | pass |
| QA-03 | 参数校验（缺少 keyword） | 返回 `code=-1` 且提示 `keyword is required` | 已在代码路径实现，待运行时联调确认 | block |
| QA-04 | 正常调用 `/twitter/fetch_search_timeline` | 返回统一结构 `{code,msg,data}` | 需依赖外部 TikHub 服务与可用凭据，当前未执行在线联调 | block |

## Command Evidence
```bash
cd /root/coze-js-api && node --check utils/tikhub.io.js
cd /root/coze-js-api && node --check index.js
```

## Manual Checks
- 待执行：`POST /twitter/fetch_search_timeline`，Body 示例：`{"keyword":"Elon Musk","search_type":"Top","cursor":"","api_key":"<optional>"}`。
- 待执行：不传 `keyword`，确认错误分支。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | - | 本轮未发现代码级缺陷；尚未完成外部依赖联调 | open |

## Final QA Verdict
- [ ] pass
- [x] conditional pass
- [ ] fail
