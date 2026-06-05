# QA

## Iteration
2026-06-05 / return-local-download-urls-for-volcengine-generated-images

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | node --check utils/tool.js | 无语法错误 | 命令执行无输出 | pass |
| QA-02 | node --check utils/volcengine.io.js | 无语法错误 | 命令执行无输出 | pass |
| QA-03 | 检查图片返回改写逻辑 | 成功路径将 `data.data[].url` 改为本地 `/downloads/...` 地址 | 代码路径已实现 | pass |
| QA-04 | 检查响应兼容性 | 外层 `{code,msg,data}` 结构保持不变 | 代码路径已实现 | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --check utils/tool.js && node --check utils/volcengine.io.js
```

## Manual Checks
- 待联调：调用 Volcengine 图片生成接口，确认响应中的 `data.data[].url` 为当前服务的 `/downloads/...` 地址。
- 待联调：确认本地静态链接可直接访问下载后的图片文件。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | - | 本轮未发现语法缺陷；外部服务联调待执行 | open |

## Final QA Verdict
- [ ] pass
- [x] conditional pass
- [ ] fail

## Iteration
2026-06-02 / fix-gpt-image-2-image-download-timeout-retry

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | node --check utils/tool.js | 无语法错误 | 命令执行无输出 | pass |
| QA-02 | 检查下载重试次数 | 最大 2 次尝试（首次 + 1 次重试） | 代码路径已实现 | pass |
| QA-03 | 检查重试边界 | 仅 `ECONNABORTED`/网络临时错误/429/5xx 重试 | 代码路径已实现 | pass |
| QA-04 | 检查下载超时参数 | 超时从 20s 提升到 30s | 代码路径已实现 | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --check utils/tool.js
```

## Manual Checks
- 待联调：模拟慢链路或瞬时网络抖动，确认首失败后会自动重试一次。
- 待联调：返回非 `image/*` 资源时应直接失败，不触发无意义重试。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | - | 本轮未发现语法缺陷；运行时联调待执行 | open |

## Final QA Verdict
- [ ] pass
- [x] conditional pass
- [ ] fail

## Iteration
2026-06-02 / implement-wechat-mp-search-article-retry-backoff

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | node --check utils/tikhub.io.js | 无语法错误 | 命令执行无输出 | pass |
| QA-02 | 检查重试策略实现 | 默认 3 次尝试，重试间随机退避（300-1200ms） | 代码路径已实现 | pass |
| QA-03 | 检查重试边界 | 仅瞬时错误（NETWORK/429/5xx）重试 | 代码路径已实现 | pass |
| QA-04 | 检查计费语义 | 成功路径扣 2 分，重试过程不重复扣费 | 代码路径已实现 | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --check utils/tikhub.io.js
```

## Manual Checks
- 待联调：通过临时网络抖动或上游 429/5xx 场景，确认出现重试日志并在 3 次后结束。
- 待联调：正常请求场景返回结构 `{code,msg,data}` 保持不变。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | - | 本轮未发现语法缺陷；外部服务联调待执行 | open |

## Final QA Verdict
- [ ] pass
- [x] conditional pass
- [ ] fail

## Iteration
2026-06-02 / update-wechat-mp-search-article-cost-to-2

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | node --check utils/tikhub.io.js | 无语法错误 | 命令执行无输出 | pass |
| QA-02 | 检查 `fetch_search_article` 扣费参数 | `unkey.verifyKey(..., 2, ...)` | 代码已改为 2 | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --check utils/tikhub.io.js
```

## Manual Checks
- 已确认：`/wx_gzh/fetch_search_article` 的 API Key 扣费值为 2 分。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | - | 本轮未发现语法缺陷 | closed |

## Final QA Verdict
- [x] pass
- [ ] conditional pass
- [ ] fail

## Iteration
2026-06-02 / add-wechat-mp-fetch-search-article

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | node --check utils/tikhub.io.js | 无语法错误 | 命令执行无输出 | pass |
| QA-02 | node --check index.js | 无语法错误 | 命令执行无输出 | pass |
| QA-03 | 缺少 `keyword` 调用 `/wx_gzh/fetch_search_article` | 返回 `code=-1` 且提示 `keyword is required` | 已在代码路径实现，待联调确认 | block |
| QA-04 | 传入非法 `sort_type` | 返回 `code=-1` 且提示取值范围错误 | 已在代码路径实现，待联调确认 | block |
| QA-05 | 正常调用 `/wx_gzh/fetch_search_article` | 返回统一结构 `{code,msg,data}` | 需依赖外部 TikHub 服务与可用凭据，当前未执行在线联调 | block |

## Command Evidence
```bash
cd /root/coze-js-api && node --check utils/tikhub.io.js && node --check index.js
```

## Manual Checks
- 待执行：`POST /wx_gzh/fetch_search_article`，Body 示例：`{"keyword":"人工智能","offset":0,"sort_type":"_0","api_key":"<optional>"}`。
- 待执行：不传 `keyword` 触发参数校验分支。
- 待执行：`sort_type` 传 `_9` 触发参数校验分支。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | - | 本轮未发现代码级语法缺陷；尚未完成外部依赖联调 | open |

## Final QA Verdict
- [ ] pass
- [x] conditional pass
- [ ] fail

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
