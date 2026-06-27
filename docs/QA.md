# QA

## Iteration
2026-06-27 / migrate-wechat-mp-article-list-post-body

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | `node --check utils/tikhub.io.js` | 无语法错误 | 命令执行无输出 | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --check utils/tikhub.io.js
```

## Manual Checks
- 已确认 `th_wechat_media.get_wechat_mp_article_list` 已切换为 `POST /api/v1/wechat_mp/v2/fetch_account_articles`。
- 已确认上游请求参数改为 body：`username/page_size/offset/item_show_type/raw`，并兼容本地历史入参 `gh_id`。
- 已确认本地返回结构保持兼容：返回 `code/msg/data`，其中 `data` 为旧版结构 `{ list, offset }`。
- 已确认 `data.list` 项字段已映射为旧版命名（如 `ContentUrl`、`CoverImgUrl`、`ItemShowType` 等）。
- 已确认为保证 `data` 结构稳定，本地调用固定使用 `raw=false`（不再受外部入参 `raw` 影响）。
- 已增加空值兜底：当上游 `data.articles` 不是数组（如 `null`）时，本地强制返回 `data.list=[]` 且保留 `data.offset`。
- 已确认增加了 30 秒超时，贴合上游文档对慢响应的说明。
- 未执行真实上游联调；该步骤依赖可用的上游账号与网络。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | - | 本轮未发现语法问题；真实上游联调待执行 | open |

## Final QA Verdict
- [ ] pass
- [x] conditional pass
- [ ] fail

## Iteration
2026-06-22 / add-evolink-image-generation-api

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | `node --check utils/ThirdParrtyApi/evolink.ai.js` | 无语法错误 | 命令执行无输出 | pass |
| QA-02 | `node --check index.js` | 无语法错误 | 命令执行无输出 | pass |
| QA-03 | 导入 `evolink.ai.js` 并枚举导出方法 | 暴露 `image_generation/get_task_detail/wait_task_result` | 输出 `["image_generation","get_task_detail","wait_task_result"]` | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --check utils/ThirdParrtyApi/evolink.ai.js

cd /root/coze-js-api && node --check index.js

cd /root/coze-js-api && node --input-type=module -e "import evolink from './utils/ThirdParrtyApi/evolink.ai.js'; console.log(JSON.stringify(Object.keys(evolink)))"
```

## Manual Checks
- 已确认新增第三方封装文件 `utils/ThirdParrtyApi/evolink.ai.js`，包含创建任务、查询任务、自动轮询三个方法。
- 已确认新增 `utils/loadEnv.js` 与根目录 `.env.example`，Evolink API Key 统一从 `.env` 中的 `EVOLINK_API_KEY` 读取。
- 已确认使用方式为：参考根目录 `.env.example`，手动创建根目录 `.env`。
- 已确认新增本地 API 路由：
  - `POST /evolink/images/generations`
  - `GET /evolink/tasks/:task_id`
  - `GET /evolink/credits`
- 已确认图片生成接口默认会在服务端轮询上游 task，直到 `completed`、`failed` 或超时后返回。
- 已确认 `POST /evolink/images/generations` 成功响应已收敛为 `image`、`credit_used`、`creditCost` 三个字段；其中 `creditCost = ceil(credit_used * 0.12) * 0.05`。
- 已确认 `POST /evolink/images/generations` 现已接入项目内 Unkey 计费：请求体需提供 `api_key`，成功后按 `creditCost` 扣费；上游失败不扣费。
- 已确认 `GET /evolink/credits` 为只读查询接口，不需要传项目 `api_key`，也不接入 Unkey 扣费。
- 未执行真实上游联调；该步骤依赖根目录 `.env` 中填写 `EVOLINK_API_KEY` 和外网访问。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | - | 本轮未发现语法或模块装配缺陷；真实上游联调待执行 | open |

## Final QA Verdict
- [ ] pass
- [x] conditional pass
- [ ] fail

## Iteration
2026-06-18 / append-douyin-general-search-id-to-msg

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | node --check utils/tikhub.io.js | 无语法错误 | 命令执行无输出 | pass |
| QA-02 | 模拟调用 `fetch_general_search_v1`（keyword=猫咪） | `msg` 包含“下次搜索search_id为：[search_id]” | 返回 `msg=success，下次搜索search_id为：20260618124430FA6C641531467C7E6D88` | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --check utils/tikhub.io.js

cd /root/coze-js-api && node --input-type=module -e "import { th_douyin } from './utils/tikhub.io.js'; const req={body:{keyword:'猫咪',cursor:0,sort_type:'0',publish_time:'0',filter_duration:'0',content_type:'0'},query:{},headers:{},hostname:'localhost'}; const res={send:(payload)=>{console.log(JSON.stringify({code:payload.code,msg:payload.msg},null,2)); return payload;}}; await th_douyin.fetch_general_search_v1(req,res);"
```

## Manual Checks
- 已确认 `search_id` 从上游返回中按优先级提取：`data.search_id -> data.log.search_id -> data.log_pb.impr_id -> data.extra.search_request_id -> data.extra.logid`。
- 已确认仅追加文案，不改变现有 `code` 与 `data` 返回结构。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | - | 本轮未发现语法或功能缺陷 | closed |

## Final QA Verdict
- [x] pass
- [ ] conditional pass
- [ ] fail

## Iteration
2026-06-17 / add-tiktok-handler-user-profile-api

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | node --check utils/tikhub.io.js | 无语法错误 | 命令执行无输出 | pass |
| QA-02 | node --check index.js | 无语法错误 | 命令执行无输出 | pass |
| QA-03 | 调用 handler（sec_user_id 示例） | 返回 code=200 且包含用户信息 | 返回 code=200，`profile.user_id=107955`，`profile.unique_id=tiktok` | pass |
| QA-04 | 参数优先级测试（sec_user_id+user_id+unique_id 同传） | 优先使用 sec_user_id | `params_used.type=sec_user_id` | pass |
| QA-05 | 参数缺失校验 | 返回参数错误 | 返回 `sec_user_id、user_id、unique_id 至少填写一个` | pass |
| QA-06 | user_id 非纯数字校验 | 返回参数错误 | 返回 `user_id 必须为纯数字字符串` | pass |
| QA-07 | 输出字段优化验证 | `profile` 计数字段不为错误默认值 | `follower_count=94428589`、`aweme_count=1533`（从 `data.user` 正确提取） | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --check utils/tikhub.io.js && node --check index.js

cd /root/coze-js-api && node --input-type=module -e "import { th_tiktok } from './utils/tikhub.io.js'; const req={query:{},body:{sec_user_id:'MS4wLjABAAAAv7iSuuXDJGDvJkmH_vz1qkDZYo1apxgzaxdBSeIuPiM'},hostname:'localhost',headers:{}}; const res={send:(payload)=>{console.log(JSON.stringify({code:payload.code,params_used:payload.params_used,profile:payload.profile},null,2)); return payload;}}; await th_tiktok.handler_user_profile(req,res);"

cd /root/coze-js-api && node --input-type=module -e "import { th_tiktok } from './utils/tikhub.io.js'; const cases=[{name:'priority',req:{query:{user_id:'12345',unique_id:'abc',sec_user_id:'MS4wLjABAAAAv7iSuuXDJGDvJkmH_vz1qkDZYo1apxgzaxdBSeIuPiM'},body:{},hostname:'localhost',headers:{}}},{name:'missing_all',req:{query:{},body:{},hostname:'localhost',headers:{}}},{name:'invalid_user_id',req:{query:{},body:{user_id:'abc123'},hostname:'localhost',headers:{}}}]; for(const c of cases){const res={send:(p)=>{console.log(c.name, JSON.stringify({code:p.code,msg:p.msg,params_used:p.params_used||null}));return p;}}; await th_tiktok.handler_user_profile(c.req,res);}"
```

## Manual Checks
- 已确认新增本地 API 路由：`POST /tiktok/handler_user_profile` 与 `GET /tiktok/handler_user_profile`。
- 已确认保持兼容返回结构：`data` 仍为上游原始结构，同时新增 `params_used` 与 `profile`。
- 已确认根据实测将统计字段映射从 `data.stats` 修正为 `data.user`，避免粉丝数等错误为 0。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | medium | 初版 `profile` 计数字段从 `data.stats` 读取，实测该接口统计字段在 `data.user`，导致默认值为 0 | fixed |

## Final QA Verdict
- [x] pass
- [ ] conditional pass
- [ ] fail

## Iteration
2026-06-12 / align-douyin-transcribe-api-key-messaging

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | bash -n skills/douyin-transcribe-api/scripts/transcribe_douyin.sh | 无语法错误 | 命令执行无输出 | pass |
| QA-02 | 检查 `SKILL.md` 缺 key 提示 | 明确“不提供免费 API Key”并给出购买入口 | 文案已更新为购买/续费指引并声明无免费 key | pass |
| QA-03 | 检查脚本文案一致性 | 与技能文档缺 key 提示语义一致 | 脚本已改为“本服务不提供免费 API Key” | pass |

## Command Evidence
```bash
cd /root/coze-js-api && bash -n skills/douyin-transcribe-api/scripts/transcribe_douyin.sh
```

## Manual Checks
- 已确认本轮仅调整技能文案和脚本提示，不涉及 API 逻辑变更。
- 已确认缺 key 场景下不再使用“申请或反馈”表述，统一为购买/续费路径。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | - | 本轮未发现语法或文案一致性缺陷 | closed |

## Final QA Verdict
- [x] pass
- [ ] conditional pass
- [ ] fail

## Iteration
2026-06-12 / fix-unkey-required-credits-precheck

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | node --check utils/apiAccess.js | 无语法错误 | 命令执行无输出 | pass |
| QA-02 | node --check index.js | 无语法错误 | 命令执行无输出 | pass |
| QA-03 | 检查 `verifyApiAccess` 付费门槛 | 当 `remaining < requiredCredits` 时拦截 | 代码路径已实现，使用 `Number(remaining) < Number(requiredCredits)` 判定 | pass |
| QA-04 | 检查 `gpt-image-2` 接入 | 生成接口按 3 积分做前置校验 | 路由已传入 `requiredCredits: cost`，`cost=3` | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --check utils/apiAccess.js
cd /root/coze-js-api && node --check index.js
```

## Manual Checks
- 已确认本轮为逻辑修复，不涉及响应结构变更。
- 待联调：使用 `remaining=1` 的 key 调用 `POST /gpt-image-2/generate`，应返回积分不足并不进入上游生图流程。
- 待联调：使用 `remaining>=3` 的 key 调用同接口应正常成功。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | - | 本轮未发现语法缺陷；真实 key 联调待执行 | open |

## Final QA Verdict
- [ ] pass
- [x] conditional pass
- [ ] fail

## Iteration
2026-06-09 / redesign-homepage-liquid-ripple-style

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | node --check index.js | 无语法错误 | 命令执行无输出 | pass |
| QA-02 | node --check routes/navigationRoutes.js | 无语法错误 | 命令执行无输出 | pass |
| QA-03 | 渲染 `views/home.ejs` | 模板变量可正常渲染 | `home.ejs render ok` | pass |
| QA-04 | 检查视觉样式 | 首页包含水波纹背景、流动高光和玻璃质感卡片 | CSS 已新增 `rippleDrift`、`shimmerSlide`、`backdrop-filter` 等样式 | pass |
| QA-05 | 检查行为兼容 | 服务数据、分类筛选和搜索脚本不变 | 未改动筛选脚本和路由数据结构 | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --check index.js
cd /root/coze-js-api && node --check routes/navigationRoutes.js
cd /root/coze-js-api && node --input-type=module -e "import ejs from 'ejs'; const categories=[{id:'all',name:'全部',accent:'#2f5bff'}]; const services=[{title:'测试服务',category:'all',icon:'T',description:'测试',endpoint:'POST /test',badge:'测试',price:'免费'}]; const stats=[]; await ejs.renderFile('views/home.ejs',{categories,services,stats,seo:{}}); console.log('home.ejs render ok');"
```

## Manual Checks
- 已确认首页样式改为水波纹背景和玻璃拟态卡片。
- 已确认本轮只调整展示层，未改动 API 行为。
- 未执行浏览器截图级视觉回归；当前以模板渲染和代码检查为主。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | - | 本轮未发现语法或模板渲染缺陷 | closed |

## Final QA Verdict
- [x] pass
- [ ] conditional pass
- [ ] fail

## Iteration
2026-06-09 / build-plugin-services-showcase-homepage

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | node --check routes/navigationRoutes.js | 无语法错误 | 命令执行无输出 | pass |
| QA-02 | 渲染 `views/home.ejs` | 模板变量可正常渲染 | `home.ejs render ok` | pass |
| QA-03 | 请求 `/` 首页 | 返回 HTML 页面 | `HTTP/1.1 200 OK`，`Content-Type: text/html; charset=utf-8` | pass |
| QA-04 | 检查首页入口 | 不展示登录/注册/控制台主入口 | 页面仅保留文档、价格、额度查询、服务落地页入口 | pass |
| QA-05 | 检查底部快捷入口布局 | 与主体内容同宽并水平居中 | `.quick-panel` 保持左右 `auto` 外边距 | pass |
| QA-06 | 检查付费购买提示 | 用户可直接看到微信联系方式和备注要求 | 首页展示 `VX：xiaowu_azt` 与“备注：购买插件额度” | pass |
| QA-07 | 检查二维码静态资源接入 | 首页引用本地 `/assets/wechat-qr.png`，且静态目录已暴露 | `/assets` 已配置；原图文件待用户放入 `assets/wechat-qr.png` | conditional pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --check routes/navigationRoutes.js
cd /root/coze-js-api && node --input-type=module -e "import ejs from 'ejs'; const categories=[{id:'all',name:'全部',accent:'#2f5bff'}]; const services=[]; const stats=[]; await ejs.renderFile('views/home.ejs',{categories,services,stats,seo:{}}); console.log('home.ejs render ok');"
cd /root/coze-js-api && curl -I http://127.0.0.1:3000/
```

## Manual Checks
- 已确认 `/` 返回首页 HTML。
- 已确认首页为插件展示页，包含分类、搜索、统计、卡片网格和快捷入口。
- 已确认首页包含付费购买引导：微信 `xiaowu_azt`，备注“购买插件额度”。
- 已确认首页二维码位引用 `/assets/wechat-qr.png`；当前会话无法访问截图原始二进制，需用户提供图片文件后才可扫码。
- 未执行浏览器截图级视觉回归；当前以服务响应和模板渲染验证为主。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | - | 本轮未发现语法或渲染缺陷 | closed |

## Final QA Verdict
- [x] pass
- [ ] conditional pass
- [ ] fail

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
