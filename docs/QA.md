# QA

## Iteration
2026-07-17 / seedance-media-url-validation

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-SMV-01 | `node --check utils/volcengine.io.js`、`node --check routes/navigationRoutes.js`、`git diff --check` | 素材 URL 校验和文档代码可解析，差异格式有效 | 成功 | pass |
| QA-SMV-02 | 自动化测试与真实素材 URL 联调 | 未执行，按已确认范围仅做语法检查 | 未执行 | not run |

## Manual Checks
- 仅 `content` 内的 `image_url`、`video_url`、`audio_url` 参考素材会在上游任务创建前被探测；纯文本请求不受影响。
- 校验限制为公开 HTTP(S) 地址，逐跳检查重定向地址，使用 HEAD 和受控 Range GET 回退；不下载完整媒体内容。
- 不可访问时返回 `content_index`、`content_type` 与安全原因，不返回或记录原始链接。

## Final QA Verdict
- [ ] pass
- [x] conditional pass
- [ ] fail


## Iteration
2026-07-17 / seedance-2-token-billing

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-STB-01 | `node --check utils/volcengine.io.js`、`node --check routes/navigationRoutes.js`、`git diff --check` | 任务归属、终态结算和文档代码均可解析，差异格式有效 | 成功 | pass |
| QA-STB-02 | 自动化测试与真实上游联调 | 未执行，按本次明确要求仅做语法检查 | 未执行 | not run |

## Manual Checks
- 成功终态只从上游 `data.usage.completion_tokens` 计算最终扣除积分；失败任务和未返回有效用量的任务不结算。
- 任务创建后仅保存 API Key 的 SHA-256 摘要；轮询必须提供同一 API Key，且重复轮询通过 Redis 结算状态避免重复扣款。
- 余额不足时，成功视频及上游数据保持返回，并在本地 `settlement` 中标记 `outstanding`。

## Final QA Verdict
- [ ] pass
- [x] conditional pass
- [ ] fail


## Iteration
2026-07-17 / seedance-2-video-api-documentation

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-SD-01 | `node --check routes/navigationRoutes.js`、`node --check index.js`、`git diff --check` | 文档路由、应用入口和差异格式有效 | 均成功 | pass |
| QA-SD-02 | `npm test` | 既有回归不受文档页影响 | 21 passed, 0 failed | pass |
| QA-SD-03 | `GET /docs/volcengine/seedance-2-0`、`/readyz` | 文档页可公开访问，active app 就绪 | HTTP 200 / `text/html; charset=utf-8`，页面包含接口路径；`/readyz` 为 200，blue healthy | pass |

## Manual Checks
- 文档页复用现有 API 文档模板，准确说明 `POST /volcengine/contents/generations/tasks` 与 `GET /volcengine/contents/generations/tasks/:task_id`；创建任务明确标注仅支持付费 API Key、无免费试用。
- 示例仅使用占位 API Key 和示例媒体 URL，不包含实际凭据或敏感载荷。

## Final QA Verdict
- [x] pass
- [ ] conditional pass
- [ ] fail


## Iteration
2026-07-17 / shared-lite-chat-redis-migration

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-RM-01 | `node --test test/redisConfig.test.js` | 显式共享 Redis 配置使用 `lite-chat-redis` 与 DB 1；默认值兼容 | 3 passed, 0 failed | pass |
| QA-RM-02 | `npm test`、语法检查、`docker compose config --quiet`、`git diff --check` | 全量回归、配置和语法有效 | 21 passed, 0 failed；其余命令成功 | pass |
| QA-RM-03 | 在线复制 Redis DB 0 → DB 1 | 复制保持 key 数与 TTL；允许并发写入缺口 | 复制完成时源/目标均为 8,069 keys、1,463 个带 TTL；切流前目标因自然过期为 8,065 keys | pass |
| QA-RM-04 | 启动 green、`/readyz`、两个 HTTPS vhost | green 使用共享 Redis 且公网不中断 | green env 为 `REDIS_HOST=lite-chat-redis`、`REDIS_DB=1`；green healthy；两个首页及 `/readyz` 均 HTTP 200 | pass |
| QA-RM-05 | 停止 blue 与旧 Redis | 不影响 green，旧 Redis保留回退材料 | green continued healthy；blue 和 `coze-js-api-my-redis-1` 均已 exited，旧 volume 未删除 | pass |

## Manual Checks
- `lite-chat-redis` 已在运行时接入 `coze-js-api_my-net`。该连接在容器重启后仍有效；若容器被重建，需要再次执行网络接入。
- 旧 Redis 通过 `MIGRATE ... COPY REPLACE` 在线复制到目标 DB 1，保留源数据和 TTL。复制期间的并发写入不回放，符合已确认的可接受窗口。
- `/redis/get_string`、`/redis/set_string`、`/redis/keys`、`/redis/del_keys` 与 `/redis/del` 已从应用路由移除。

## Final QA Verdict
- [x] pass
- [ ] conditional pass
- [ ] fail


## Iteration
2026-07-17 / gpt-image-2-atomic-credit-charge

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-GI-01 | `node --test test/apiAccess.test.js` | 原子扣减使用一次非零 cost 校验；余额不足被拒绝 | 3 passed, 0 failed | pass |
| QA-GI-02 | `node --check index.js`、`node --check utils/ThirdParrtyApi/aitoken.js`、`git diff --check` | 语法与差异格式有效 | 均成功 | pass |
| QA-GI-03 | `npm test` | 全量既有回归和新增扣费测试通过 | 18 passed, 0 failed | pass |

## Manual Checks
- `POST /gpt-image-2/generate` 在本地参数与余额预检通过后、下载参考图前执行一次 3 积分原子扣减；成功响应路径不再二次扣费。
- `POST /api/gpt-image-2/generate` 在构建 Base64 图片表单或调用上游前执行同样的 3 积分原子扣减；上游失败不退款，符合确认的计费规则。
- 余额预检仅用于维持原有错误语义；真正决定是否允许进入上游的操作是非零 cost 的 Unkey 调用。

## Final QA Verdict
- [x] pass
- [ ] conditional pass
- [ ] fail


## Iteration
2026-07-17 / blue-green-deployment

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-BG-01 | `npm test` | 生命周期与既有回归均通过 | 14 passed, 0 failed（含 post-switch ordering 回归） | pass |
| QA-BG-02 | `node --check index.js utils/appLifecycle.js`、`bash -n start.sh`、`git diff --check` | 语法与 diff 有效 | 均成功 | pass |
| QA-BG-03 | `docker compose --profile bluegreen config --quiet`、`nginx -t` | Compose/Nginx 配置可加载 | 均成功（Nginx 仅有既存 `wenyan.devtool.uk` server-name 警告） | pass |
| QA-BG-04 | 执行首次 `./start.sh` | 候选 ready 后切换，失败不触碰旧 upstream | blue healthy 后切到 `127.0.0.1:3003`；首次 3001 占用失败时仍保留 legacy | pass |
| QA-BG-05 | 本地 `/readyz`、两个 HTTPS 入口 | active 实例就绪，公网不中断 | `/readyz` 返回 `{"status":"ready"}`；`coze-js-api.devtool.uk` 与 `coze-js-api-noproxy.devtool.uk` 均为 HTTP 200 | pass |
| QA-BG-06 | legacy 排空后清理 | 不再保留旧实例或 3000 监听 | 无活跃 TCP 连接后 legacy exit 143 / `restart=no`；3000 无监听，blue 仍 healthy | pass |
| QA-BG-07 | post-switch rollback guard + `blue → green` 真实切流 | 新 upstream 必须经 Nginx 验证后才 drain 旧色 | 回归测试先 RED 后 GREEN；green 切至 `127.0.0.1:3004` 后，连续 3 次本机 Nginx `/readyz` 通过；blue 优雅退出 exit 0；两个 HTTPS vhost 的 `/` 与 `/readyz` 均为 200 | pass |
| QA-BG-08 | stopped-container 自动清理 | 仅清理本项目超过 24 小时的 exited app 容器，不影响 Redis/运行中服务 | 新增行为测试；systemd timer 已 `enabled`/`active`，首次真实运行 exit 0 且删除 0 个（旧容器尚未满 24 小时） | pass |

## Command Evidence
```bash
cd /root/coze-js-api
npm test
node --check index.js && node --check utils/appLifecycle.js
bash -n start.sh && docker compose --profile bluegreen config --quiet && git diff --check
nginx -t
./start.sh
curl --noproxy '*' -sfS http://127.0.0.1:3003/readyz
curl --noproxy '*' -skso /dev/null -w '%{http_code}\n' --resolve coze-js-api.devtool.uk:443:127.0.0.1 https://coze-js-api.devtool.uk/
curl --noproxy '*' -skso /dev/null -w '%{http_code}\n' --resolve coze-js-api-noproxy.devtool.uk:443:127.0.0.1 https://coze-js-api-noproxy.devtool.uk/
```

## Manual Checks
- 原计划的 3001/3002 分别被无关的 `next-server` 与 `fc26` 进程占用，未停止它们；blue/green 改为仅 loopback 的 3003/3004。
- `active-backend.conf` 以临时文件 + `mv` 原子写入，Nginx 仅在候选 `/readyz` 成功和 `nginx -t` 成功后 reload。
- 2026-07-17 follow-up 修复：reload 成功后、状态落盘前即保护候选；状态写入或连续 3 次本机 Nginx `/readyz` 验证失败时，恢复先前 include 并保留旧色。只有验证成功才安排 prior color drain。
- 首次 legacy 镜像的 PID 1 为 shell，不能向 Node 转发停止信号；本轮在连接归零后向 idle Node 发送 SIGTERM 完成迁移。新镜像为 Node 直启并已具备 SIGTERM/SIGINT 优雅关闭逻辑。

## Final QA Verdict
- [x] pass
- [ ] conditional pass
- [ ] fail


## Iteration
2026-07-16 / public-static-deployment-no-quota

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | `node --test test/deploymentRoute.test.js test/staticZipDeployment.test.js` | 内容唯一的合格部署不读取配额或 API key，且保留 ZIP 校验 | 6 passed, 0 failed | pass |
| QA-02 | `node --check index.js && node --check utils/deploymentRoute.js` | 入口和路由处理器语法有效 | 两项均成功 | pass |
| QA-03 | 重启已挂载项目目录的 app 容器 | 新路由代码被加载且服务恢复 | container running；本机 `/` HTTP 200 | pass |
| QA-04 | 无 `X-API-Key` 对同一合格 ZIP 连续两次 POST `/deployment` | 两次均发布，绝不返回 IP 免费额度 429 | 两次均 HTTP 201 / `status=deployed` | pass |
| QA-05 | 请求两个返回的 immutable 公网 URL | HTTPS 页面可访问 | 两次均 HTTP 200 / `text/html` | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --test test/deploymentRoute.test.js test/staticZipDeployment.test.js
cd /root/coze-js-api && node --check index.js && node --check utils/deploymentRoute.js && git diff --check
docker restart coze-js-api-app-1
curl -X POST https://coze-js-api.devtool.uk/deployment -H 'Content-Type: application/json' --data '{"content":"https://coze-js-api.devtool.uk/downloads/current-release-1784192733280-472e4a13.zip"}'
```

## Manual Checks
- 未携带 `X-API-Key`，相同来源 ZIP 连续两次部署均成功：`release-1784193350437-0653be687c38`、`release-1784193350748-c07c7fa1e059`。
- 发布 URL 已经公网复验：HTTP `200`、`text/html`。
- 仍保留受信 HTTPS ZIP URL allowlist、ZIP/manifest/哈希、解压安全、静态类型与发布后 HTTP 校验；仅移除了 IP 年度免费额度和 API key 部署额度验证。

## Final QA Verdict
- [x] pass
- [ ] conditional pass
- [ ] fail

## Iteration
2026-07-16 / openai-hub-domain-cutover

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | Search executable configuration for retiring host | No active `api.openai-hub.com` reference remains; historical delivery records may mention it | No active reference found | pass |
| QA-02 | `node --check utils/ThirdParrtyApi/aitoken.js` | Client syntax is valid | Command completed successfully | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --check utils/ThirdParrtyApi/aitoken.js
cd /root/coze-js-api && ! rg -n -i --hidden --glob '!node_modules/**' --glob '!.git/**' --glob '!docs/**' --glob '!CHANGELOG.md' 'api\.openai-hub\.com' .
```

## Final QA Verdict
- [x] pass
- [ ] conditional pass
- [ ] fail

## Iteration
2026-07-15 / static-zip-deployment-executor

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | `node --check index.js && node --check utils/staticZipDeployment.js` | 路由与执行器语法正确 | host 与 app container 均通过 | pass |
| QA-02 | `node --test test/staticZipDeployment.test.js` | 受信静态 ZIP 发布为 immutable URL | 通过，返回 `status=deployed` | pass |
| QA-03 | 同测试：外部 ZIP URL | 不做远程抓取，返回 allowlist 拒绝 | 通过，`UNTRUSTED_ARTIFACT_URL` | pass |
| QA-04 | 同测试：manifest SHA 不匹配 | 不创建 release，结构化拒绝 | 通过，`STATIC_VALIDATION_FAILED` | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --check index.js && node --check utils/staticZipDeployment.js
cd /root/coze-js-api && node --test test/staticZipDeployment.test.js
docker exec coze-js-api-app-1 sh -lc 'node --check /app/index.js && node --check /app/utils/staticZipDeployment.js && node --test /app/test/staticZipDeployment.test.js'
```

## Manual Checks
- 已真实执行私有链路冒烟：上传生成的合格 ZIP，`POST /deployment` 返回 HTTP `201` 与 `status=deployed`；返回的唯一 immutable HTTPS release URL 经公网复验为 HTTP `200`、`text/html` 且包含预期页面标记。
- 已真实提交 `https://example.com/not-trusted.zip`：HTTP `422`，`reason=UNTRUSTED_ARTIFACT_URL`，未进行任意远程下载。
- 对坏 ZIP 的自动回归测试确认只产生结构化拒绝，且无 `release-*` 目录残留。

## Final QA Verdict
- [x] pass
- [ ] conditional pass
- [ ] fail

## Iteration
2026-07-15 / file-transfer-upload-https-url

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | `node --check index.js` | HTTPS 链接生成逻辑所在入口文件语法正确 | 命令执行无输出 | pass |
| QA-02 | 静态检查 `getFilePublicUrl` 调用点 | 普通上传与分片合并完成均返回 HTTPS `data.url` | helper 固定返回 `https://${req.get('host')}`；两个接口均复用 helper | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --check index.js
cd /root/coze-js-api && rg -n 'return `https://\$\{req\.get\('"'"'host'"'"'\)\}' index.js
cd /root/coze-js-api && rg -n 'url: getFilePublicUrl\(req, fileName, storage\)' index.js
```

## Manual Checks
- 未启动服务或发起真实上传请求；本轮完成语法与静态调用链核查。

## Final QA Verdict
- [ ] pass
- [x] conditional pass
- [ ] fail

## Iteration
2026-07-17 / add-wechat-universal-search

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | `node --check utils/commonUtils.js && node --check utils/tikhub.io.js && node --check index.js` | 修改后的服务文件无语法错误 | 命令无输出 | pass |
| QA-02 | `node --test test/wechatUniversalSearch.test.js` | 缺少关键字、非法垂类和正常参数转发均通过 | 1 个测试文件通过 | pass |
| QA-03 | 上游真实请求 | 30 秒超时、原始 JSON 直通且 64 位 ID 不失真 | 需要外部 TikHub 服务与有效凭据，未执行 | block |

## Command Evidence
```bash
cd /root/coze-js-api && node --check utils/commonUtils.js && node --check utils/tikhub.io.js && node --check index.js
cd /root/coze-js-api && node --test test/wechatUniversalSearch.test.js
```

## Manual Checks
- 确认路由为 `POST /wechat_search/v2/fetch_search`。
- 确认请求接受 body/query 参数、校验 TikHub 枚举值，并将上游响应作为文本发送。
- 确认无 `api_key` 时使用端点专属 Redis key 限制为每天一次；有 `api_key` 时余额门槛和成功扣费均为 3 积分。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | - | 未发现本地语法或离线测试缺陷；上游联调待有效凭据环境执行 | open |

## Final QA Verdict
- [ ] pass
- [x] conditional pass
- [ ] fail

## Iteration
2026-07-15 / file-transfer-upload-full-url

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | `node --check index.js` | file-transfer 上传完整链接逻辑所在入口文件语法正确 | 命令执行无输出 | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --check index.js
```

## Manual Checks
- 静态确认 `getFilePublicUrl` 使用当前请求的 `protocol` 与 `Host` 生成完整链接。
- 静态确认 `POST /file-transfer/upload` 与 `POST /file-transfer/upload/complete` 均通过该逻辑返回 `data.url`。
- 静态确认临时文件与永久文件分别使用 `/downloads/`、`/downloads/persistent/` 公开路径，文件名经 URL 编码。
- 按需求未运行测试、未启动服务、未发起真实上传请求。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | low | 未执行真实上传联调；本轮仅完成静态核查与语法检查 | open |

## Final QA Verdict
- [ ] pass
- [x] conditional pass
- [ ] fail

## Iteration
2026-07-14 / add-hermes-deployment-proxy

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | `node --check utils/ThirdParrtyApi/hermes-agent.js` | 新增 Hermes 客户端语法正确 | 命令执行无输出 | pass |
| QA-02 | `node --check index.js` | 新增 `/deployment` 路由后主入口语法正确 | 命令执行无输出 | pass |
| QA-03 | 带 `X-Forwarded-For` 的 `/deployment` 冒烟请求 | 通过最终 IP 限制并返回 Hermes 响应 | 返回 `{"code":-1,"msg":"timeout of 30000ms exceeded"}` | conditional |
| QA-04 | 同一 IP 的第二次 `/deployment` 请求且不带 unkey | 命中免费次数限制 | 返回 429 且提示输入 unkey | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --check utils/ThirdParrtyApi/hermes-agent.js && node --check index.js
cd /root/coze-js-api && curl -s -o /tmp/hermes_deployment_test.out -w '%{http_code}\n' -X POST http://localhost:3000/deployment -H 'Content-Type: application/json' -H 'X-Forwarded-For: 203.0.113.10, 10.0.0.2' -d '{"model":"hermes-agent","messages":[{"role":"system","content":"你是一个能使用终端和文件工具的 Hermes Agent。"},{"role":"user","content":"你好"}],"stream":false}'
```

## Manual Checks
- 已静态确认 Hermes 封装会固定使用约定的 Authorization 值，不再读取请求头或环境变量。
- 已静态确认 `/deployment` 会优先从 `X-Forwarded-For`、`Forwarded`、`X-Real-IP` 中解析最终客户端 IP，并对同一 IP 仅允许一次成功调用。
- 已静态确认同一 IP 在免费次数耗尽后，若未提供 unkey，会被拒绝并提示输入 unkey。
- 已静态确认 `/deployment` 会把上游返回的状态码与 JSON 直接回传，不再额外包装。
- 已执行一次本地冒烟请求，Hermes 上游返回超时错误 `timeout of 30000ms exceeded`。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | low | Hermes 上游在本地冒烟中返回超时，尚未完成成功联调 | open |

## Final QA Verdict
- [ ] pass
- [x] conditional pass
- [ ] fail

## Iteration
2026-07-12 / add-file-transfer-promote-temp-to-persistent

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | `node --check index.js` | 新增 promote 路由后主入口语法正确 | 命令执行无输出 | pass |
| QA-02 | 渲染 `views/file-transfer.ejs` | 页面模板可渲染，新增“转为永久”按钮逻辑不报错 | `file-transfer.ejs render ok` | pass |
| QA-03 | 编辑器错误检查 `index.js` + `views/file-transfer.ejs` | 无新增静态错误 | `No errors found` | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --check index.js && node --input-type=module -e "import ejs from 'ejs'; await ejs.renderFile('views/file-transfer.ejs',{seo:{}}); console.log('file-transfer.ejs render ok');"
```

## Manual Checks
- 已确认新增后端动作仅允许 `temp -> persistent`，不暴露通用文件移动能力。
- 已确认列表卡片与详情抽屉仅对临时文件显示“转为永久”按钮。
- 已确认提升动作完成后会刷新当前列表，避免临时区过滤下展示过期数据。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | low | 本轮未执行浏览器端真实“转为永久”点击手测，仅完成语法、模板渲染和编辑器错误检查 | open |

## Final QA Verdict
- [ ] pass
- [x] conditional pass
- [ ] fail

## Iteration
2026-07-12 / add-file-transfer-persistent-storage-first-slice

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | `node --check index.js` | file-transfer storage 改造后主入口语法正确 | 命令执行无输出 | pass |
| QA-02 | 渲染 `views/file-transfer.ejs` | 页面模板可渲染，新增 storage 选择与筛选脚本不报错 | `file-transfer.ejs render ok` | pass |
| QA-03 | 编辑器错误检查 `index.js` + `views/file-transfer.ejs` | 无新增静态错误 | `No errors found` | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --check index.js && node --input-type=module -e "import ejs from 'ejs'; await ejs.renderFile('views/file-transfer.ejs',{seo:{}}); console.log('file-transfer.ejs render ok');"
```

## Manual Checks
- 已确认第一版仅新增 `downloads/persistent` 白名单存储，不改动其他业务下载接口的默认落盘位置。
- 已确认 file-transfer 页面支持选择“临时文件 / 永久文件”上传目标。
- 已确认列表筛选支持按“全部目录 / 临时区 / 永久区”查看。
- 已确认文件详情和删除动作带 storage 语义，避免同名跨目录文件操作混淆。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | low | 本轮未执行浏览器端真实上传/删除手测，仅完成语法、模板渲染和编辑器错误检查 | open |

## Final QA Verdict
- [ ] pass
- [x] conditional pass
- [ ] fail

## Iteration
2026-07-11 / simplify-api-doc-template-display-for-xiaohongshu-page

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | `node --check routes/navigationRoutes.js` | 文档路由模块语法正确 | 命令执行无输出 | pass |
| QA-02 | 渲染 `views/api-doc-template.ejs` | 模板可渲染且不再显示“上游信息/模板说明”区块 | `api-doc-template.ejs render ok` | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --check routes/navigationRoutes.js
cd /root/coze-js-api && node --input-type=module -e "import ejs from 'ejs'; await ejs.renderFile('views/api-doc-template.ejs',{doc:{name:'demo',method:'POST',path:'/x',requestParams:[],examples:[],responseFields:[]}}); console.log('api-doc-template.ejs render ok');"
```

## Manual Checks
- 已确认模板 Hero 区域不再渲染 `doc.upstream`。
- 已确认页面底部不再显示“模板说明”文案区块。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | low | 本轮未执行浏览器端视觉手测，仅完成语法与模板渲染验证 | open |

## Final QA Verdict
- [ ] pass
- [x] conditional pass
- [ ] fail

## Iteration
2026-07-11 / add-reusable-api-doc-page-for-xiaohongshu-search-notes-v2

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | `node --check routes/navigationRoutes.js` | 新增文档路由后语法正确 | 命令执行无输出 | pass |
| QA-02 | 渲染 `views/api-doc-template.ejs` | 通用模板可渲染 | `api-doc-template.ejs render ok` | pass |
| QA-03 | 渲染 `views/api-doc-xiaohongshu-search-notes-v2.ejs` | 接口实例页可渲染 | `api-doc-xiaohongshu-search-notes-v2.ejs render ok` | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --check routes/navigationRoutes.js
cd /root/coze-js-api && node --input-type=module -e "import ejs from 'ejs'; await ejs.renderFile('views/api-doc-template.ejs',{doc:{name:'demo',method:'POST',path:'/x',requestParams:[],examples:[],responseFields:[]}}); console.log('api-doc-template.ejs render ok');"
cd /root/coze-js-api && node --input-type=module -e "import ejs from 'ejs'; await ejs.renderFile('views/api-doc-xiaohongshu-search-notes-v2.ejs',{doc:{name:'demo',method:'POST',path:'/x',requestParams:[],examples:[],responseFields:[]}}); console.log('api-doc-xiaohongshu-search-notes-v2.ejs render ok');"
```

## Manual Checks
- 已确认新增独立文档页 `GET /docs/xiaohongshu/search_notes_v2`。
- 已确认页面包含调用示例、请求参数、返回参数、返回示例与翻页说明。
- 已确认模板说明可复用于后续其他接口，仅需替换路由中的 `doc` 数据对象。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | low | 本轮未执行浏览器可视化手测，仅完成语法与模板渲染验证 | open |

## Final QA Verdict
- [ ] pass
- [x] conditional pass
- [ ] fail

## Iteration
2026-07-11 / migrate-xiaohongshu-search-notes-v2-upstream

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | `node --check utils/tikhub.io.js` | 迁移后语法正确 | 命令执行无输出 | pass |
| QA-02 | 代码核查参数映射 | 旧参数可兼容映射到新上游参数 | 已实现 `sort/type/publish_time` 到 `sort_type/note_type/time_filter` 的兼容映射 | pass |
| QA-03 | 上游真实调用结构核查 | 确认帖子与分页关键字段路径 | 已确认帖子在 `data.data.items[*].note`，分页在 `data.search_id/search_session_id/page/next_page` | pass |
| QA-04 | 代码核查扣费与返回规整 | 扣费 2 分，返回聚焦帖子与分页 | 已改为 `verifyKey(..., 2, ...)`，返回 `data.posts + data.pagination` | pass |
| QA-05 | 图片字段映射核查 | 每篇帖子 `images` 不漏图 | 已确认上游图片主要字段为 `url/url_size_large`，修复后 `empty_posts=0` | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --check utils/tikhub.io.js
cd /root/coze-js-api && TOKEN=$(grep -m1 '^const tikhub_api_token' utils/tikhub.io.js | sed -E 's/.*"([^"]+)".*/\1/') && TOKEN="$TOKEN" node --input-type=module -e "import axios from 'axios'; const r=await axios.get('https://api.tikhub.io/api/v1/xiaohongshu/app_v2/search_notes',{params:{keyword:'美食推荐',page:1,sort_type:'general',note_type:'不限',time_filter:'不限',source:'explore_feed',ai_mode:0},headers:{Authorization:'Bearer '+process.env.TOKEN}}); console.log(JSON.stringify({code:r.data?.code,data_keys:Object.keys(r.data?.data||{})},null,2));"
cd /root/coze-js-api && TOKEN=$(grep -m1 '^const tikhub_api_token' utils/tikhub.io.js | sed -E 's/.*"([^"]+)".*/\1/') && TOKEN="$TOKEN" node --input-type=module -e "import axios from 'axios'; const r=await axios.get('https://api.tikhub.io/api/v1/xiaohongshu/app_v2/search_notes',{params:{keyword:'美食推荐',page:1,sort_type:'general',note_type:'不限',time_filter:'不限',source:'explore_feed',ai_mode:0},headers:{Authorization:'Bearer '+process.env.TOKEN}}); const d=r.data?.data||{}; const b=d?.data||d||{}; const items=Array.isArray(b?.items)?b.items:[]; const posts=items.map(i=>i?.note||i).map(n=>({images:(Array.isArray(n?.images_list)?n.images_list:[]).map(img=>img?.url||img?.url_size_large||img?.url_default||img?.url_pre||img?.original||'').filter(Boolean)})); console.log(JSON.stringify({post_count:posts.length,empty_posts:posts.filter(p=>p.images.length===0).length},null,2));"
```

## Manual Checks
- 已确认上游地址切换为 `https://api.tikhub.io/api/v1/xiaohongshu/app_v2/search_notes`。
- 已确认兼容接收 `sort_type/note_type/time_filter` 以及历史字段 `sort/type/publish_time`。
- 已确认扣费从 1 分调整为 2 分。
- 已确认返回从原始列表规整为 `posts`（帖子核心信息）和 `pagination`（翻页关键参数）。
- 已确认图片数组映射补齐 `url/url_size_large`，解决原先 `images` 漏图问题。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | low | 本轮未做真实上游联调，仅完成语法与映射逻辑核查 | open |

## Final QA Verdict
- [ ] pass
- [x] conditional pass
- [ ] fail

## Iteration
2026-07-10 / enhance-network-dashboard-visual-and-auto-refresh

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | 渲染 `views/network-dashboard.ejs` | 新增交互不影响模板渲染 | `network-dashboard.ejs render ok` | pass |
| QA-02 | 查看看板脚本逻辑 | 自动刷新开关可配置且默认开启 | 已实现 `autoBtn + autoSeconds`，默认 30s 自动刷新 | pass |
| QA-03 | 查看状态分布渲染逻辑 | 状态码按类别颜色映射并有图例 | 已实现 `STATUS_CLASS_COLOR` 与 `statusLegend` | pass |
| QA-04 | 查看 Top 路径渲染逻辑 | 显示占比与进度条 | 已实现 `pathShareList` 百分比条形展示 | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --input-type=module -e "import ejs from 'ejs'; await ejs.renderFile('views/network-dashboard.ejs',{seo:{}}); console.log('network-dashboard.ejs render ok');"
```

## Manual Checks
- 已确认工具栏新增自动刷新周期选择（10/20/30/60 秒）与开关按钮。
- 已确认状态码分布图采用 1xx-5xx/unknown 分色展示，并在图下方显示占比图例。
- 已确认 Top 路径面板新增“占比进度条 + 百分比”展示，便于识别热点集中度。
- 已确认窗口 resize 时图表会重绘，保持响应式布局。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | low | 本轮未执行真实浏览器点击回归（仅模板渲染与代码路径核查） | open |

## Final QA Verdict
- [ ] pass
- [x] conditional pass
- [ ] fail

## Iteration
2026-07-10 / implement-network-log-dashboard-mvp

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | `node --check utils/networkLogger.js` | 日志双写模块语法正确 | 命令执行无输出 | pass |
| QA-02 | `node --check utils/networkAnalytics.js` | 分析模块语法正确 | 命令执行无输出 | pass |
| QA-03 | `node --check index.js` | 主入口语法不受影响 | 命令执行无输出 | pass |
| QA-04 | `node --check routes/navigationRoutes.js` | 路由模块语法正确 | 命令执行无输出 | pass |
| QA-05 | 渲染 `views/network-dashboard.ejs` | 模板可渲染 | `network-dashboard.ejs render ok` | pass |
| QA-06 | 运行 `getNetworkDashboardMetrics` 冒烟 | 能返回聚合结果 | 首次空 Redis 返回 0；回填后 `parsed=10, raw=20, slow=5` | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --check utils/networkLogger.js && node --check utils/networkAnalytics.js && node --check index.js && node --check routes/navigationRoutes.js && node --input-type=module -e "import ejs from 'ejs'; await ejs.renderFile('views/network-dashboard.ejs',{seo:{}}); console.log('network-dashboard.ejs render ok');"
cd /root/coze-js-api && node --input-type=module -e "import { getNetworkDashboardMetrics } from './utils/networkAnalytics.js'; const data = await getNetworkDashboardMetrics({ windowMinutes: 7*24*60, topN: 5, slowN: 5, scanLimit: 5000 }); console.log(JSON.stringify({parsed:data.summary.parsedLines, raw:data.summary.totalRawLines, slow:data.stats.slowRequests.length, topPath:data.stats.topPaths[0]?.key||null}, null, 2));"
```

## Manual Checks
- 已确认新增页面路由 `GET /network-dashboard` 可作为日志看板入口。
- 已确认新增接口 `GET /network-dashboard/metrics` 返回结构为 `code/msg/data`。
- 已确认 Redis 为空时可从 `downloads/network.log` 自动回填最近日志用于首屏展示。
- 已确认 `utils/networkLogger.js` 在写日志时会尝试同步写入 Redis，且异常仅记录错误不阻断主流程。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | low | 本轮未做浏览器端视觉交互全量手测（仅模板渲染与后端冒烟） | open |

## Final QA Verdict
- [ ] pass
- [x] conditional pass
- [ ] fail

## Iteration
2026-07-10 / retry-gpt-image-2-edit-on-transient-fetch-timeout

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | `node --check utils/ThirdParrtyApi/aitoken.js` | 编辑接口模块语法正确 | 命令执行无输出 | pass |
| QA-02 | `node --check index.js` | 主入口语法不受影响 | 命令执行无输出 | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --check utils/ThirdParrtyApi/aitoken.js && node --check index.js
```

## Manual Checks
- 已确认 `gpt_image_2_edit` 在每次尝试时重建 `FormData`，避免请求体被消费后无法重发。
- 已确认仅对瞬时错误启用重试（`UND_ERR_HEADERS_TIMEOUT`、超时/网络类、408/429/5xx）。
- 已确认最终错误输出仍保持 `编辑图像失败: ...` 风格，兼容现有上层错误处理。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | - | 本轮仅做语法与代码路径核查，未在真实第三方超时场景做端到端回放 | open |

## Final QA Verdict
- [ ] pass
- [x] conditional pass
- [ ] fail

## Iteration
2026-07-07 / build-google-friendly-sitemap-for-service-crawling

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | `node --check routes/navigationRoutes.js` | sitemap 与新路由语法正确 | 命令执行无输出 | pass |
| QA-02 | `node --check index.js` | 主服务入口语法不受影响 | 命令执行无输出 | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --check routes/navigationRoutes.js
cd /root/coze-js-api && node --check index.js
```

## Manual Checks
- 已确认 `GET /sitemap.xml` 输出 sitemap index，并指向 `GET /sitemap-pages.xml` 与 `GET /sitemap-services.xml`。
- 已确认 `GET /services/catalog.json` 返回机器可读服务清单，支持按 `category` 过滤。
- 已确认 `GET /services/catalog.txt` 可用于轻量文本采集。
- 已确认 `GET /robots.txt` 继续声明 sitemap 入口。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | - | 本轮未发现语法问题；建议上线后用 Search Console 复核 sitemap 抓取状态 | open |

## Final QA Verdict
- [ ] pass
- [x] conditional pass
- [ ] fail

## Iteration
2026-07-06 / reduce-restart-downtime-in-start-script

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | `bash -n start.sh` | 脚本语法合法 | 本轮命令执行被用户跳过 | blocked |

## Command Evidence
```bash
cd /root/coze-js-api && bash -n start.sh
```

## Manual Checks
- 已确认脚本不再执行 `compose down`，避免全量停机。
- 已确认脚本改为先 `compose build app` 再 `compose up -d --no-deps app`。
- 已确认脚本保留 Podman 优先、Docker 回退的兼容逻辑。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | low | 最小语法验证命令本轮被用户跳过，建议在目标机器执行一次 `bash -n start.sh` | open |

## Final QA Verdict
- [ ] pass
- [x] conditional pass
- [ ] fail

## Iteration
2026-07-06 / support-file-transfer-clipboard-paste-upload

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | 渲染 `views/file-transfer.ejs` | 模板可正常渲染 | `file-transfer.ejs render ok` | pass |
| QA-02 | `node --check index.js` | 无语法错误 | 命令执行无输出 | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --input-type=module -e "import ejs from 'ejs'; await ejs.renderFile('views/file-transfer.ejs',{seo:{}}); console.log('file-transfer.ejs render ok');" && node --check index.js
```

## Manual Checks
- 已确认页面文案提示支持拖拽/选择/粘贴（Ctrl+V）三种入队方式。
- 已确认新增全局 `paste` 监听仅在剪贴板包含文件时触发入队。
- 已确认粘贴后保持既有上传策略：仅加入队列，不自动上传。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | - | 本轮未发现语法问题；浏览器端粘贴文件兼容性建议在 Chrome/Safari 各抽样一次 | open |

## Final QA Verdict
- [ ] pass
- [x] conditional pass
- [ ] fail

## Iteration
2026-07-04 / broaden-file-access-tracking-beyond-download-route

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | `node --check index.js` | 无语法错误 | 命令执行无输出 | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --check index.js
```

## Manual Checks
- 已确认访问计数从单一 `GET /downloads/:filename` 改为静态服务前置中间件。
- 已确认 `/downloads/*` 与 `/audio/*` 的成功响应均会计入访问行为。
- 已确认该逻辑可覆盖浏览器直链、命令行 `wget/curl`、`HEAD` 和分段请求等访问场景。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | - | 本轮未发现语法问题；建议在线上抽样验证 `curl -I` 与 Range 请求计数 | open |

## Final QA Verdict
- [ ] pass
- [x] conditional pass
- [ ] fail

## Iteration
2026-07-04 / compact-overview-to-prioritize-file-list

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | 渲染 `views/file-transfer.ejs` | 模板可正常渲染 | `file-transfer.ejs render ok` | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --input-type=module -e "import ejs from 'ejs'; await ejs.renderFile('views/file-transfer.ejs',{seo:{}}); console.log('file-transfer.ejs render ok');"
```

## Manual Checks
- 已确认统计/图表/热门榜单被收拢为“数据概览（可展开）”区域。
- 已确认概览区默认折叠，页面首屏更早看到文件列表。
- 已确认不影响文件列表、筛选、分页与详情抽屉功能。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | - | 本轮未发现模板问题；建议浏览器端再做一次折叠/展开手测 | open |

## Final QA Verdict
- [ ] pass
- [x] conditional pass
- [ ] fail

## Iteration
2026-07-04 / add-24h-access-stats-and-topn-hot-files

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | `node --check index.js` | 无语法错误 | 命令执行无输出 | pass |
| QA-02 | 渲染 `views/file-transfer.ejs` | 模板可正常渲染 | `file-transfer.ejs render ok` | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --check index.js && node --input-type=module -e "import ejs from 'ejs'; await ejs.renderFile('views/file-transfer.ejs',{seo:{}}); console.log('file-transfer.ejs render ok');"
```

## Manual Checks
- 已确认 `GET /file-transfer/files` 返回新增：
  - `accessStats.totalAccess24h`
  - `hotTopN`（按访问总数排序，包含 `accessCount/access24h`）
- 已确认页面新增“最近 24h 访问量”统计卡片。
- 已确认页面新增“Top N 热门文件”榜单。
- 已确认下载计数逻辑补充了小时维度键（48h 过期）用于 24h 聚合。
- 未执行真实下载流量回放；建议上线后抽样核对 Redis 聚合值。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | - | 本轮未发现语法或模板问题；线上访问流量聚合值待抽样验证 | open |

## Final QA Verdict
- [ ] pass
- [x] conditional pass
- [ ] fail

## Iteration
2026-07-04 / add-file-access-count-with-redis

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | `node --check index.js` | 无语法错误 | 命令执行无输出 | pass |
| QA-02 | 渲染 `views/file-transfer.ejs` | 模板可正常渲染 | `file-transfer.ejs render ok` | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --check index.js && node --input-type=module -e "import ejs from 'ejs'; await ejs.renderFile('views/file-transfer.ejs',{seo:{}}); console.log('file-transfer.ejs render ok');"
```

## Manual Checks
- 已确认新增下载访问埋点：`GET /downloads/:filename` 成功响应后 Redis 自增。
- 已确认 `/file-transfer/files` 返回项新增 `accessCount` 字段。
- 已确认文件卡片与详情抽屉展示访问次数。
- 未执行真实下载链路压测；建议上线前做一次高并发访问计数抽样校验。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | - | 本轮未发现语法或模板问题；下载高并发计数一致性待线上抽样验证 | open |

## Final QA Verdict
- [ ] pass
- [x] conditional pass
- [ ] fail

## Iteration
2026-07-04 / harden-chunk-complete-and-searchable-filename

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | `node --check index.js` | 无语法错误 | 命令执行无输出 | pass |
| QA-02 | 渲染 `views/file-transfer.ejs` | 模板可正常渲染 | `file-transfer.ejs render ok` | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --check index.js && node --input-type=module -e "import ejs from 'ejs'; await ejs.renderFile('views/file-transfer.ejs',{seo:{}}); console.log('file-transfer.ejs render ok');"
```

## Manual Checks
- 已确认分片合并请求改为 query 参数方式，减少 body 解析依赖。
- 已确认分片合并增加超时与重试逻辑（前端）。
- 已确认大文件分片成功后队列状态会正确标记“上传成功”。
- 已确认服务端落盘文件名改为“原文件名前缀 + 时间戳 + 随机后缀”，便于搜索定位。
- 未执行线上网关链路实测；建议使用同一失败样本再次回归。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | - | 本轮未发现语法或模板问题；线上链路需再次回归确认 | open |

## Final QA Verdict
- [ ] pass
- [x] conditional pass
- [ ] fail

## Iteration
2026-07-03 / fix-file-transfer-upload-http2-interruption-with-chunking

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | `node --check index.js` | 无语法错误 | 命令执行无输出 | pass |
| QA-02 | 渲染 `views/file-transfer.ejs` | 模板可正常渲染 | `file-transfer.ejs render ok` | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --check index.js && node --input-type=module -e "import ejs from 'ejs'; await ejs.renderFile('views/file-transfer.ejs',{seo:{}}); console.log('file-transfer.ejs render ok');"
```

## Manual Checks
- 已确认新增分片上传接口：`POST /file-transfer/upload/chunk` 与 `POST /file-transfer/upload/complete`。
- 已确认前端对大文件自动走分片上传（默认阈值 16MB，分片大小 8MB）。
- 已确认小文件仍沿用原 `POST /file-transfer/upload`，兼容现有行为。
- 已确认上传进度在分片模式下按分片阶段推进。
- 未执行真实线上链路复测（HTTP/2 网关环境）；建议使用同一 124MB+ 文件在生产入口做一次回归。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | - | 本轮未发现语法或模板问题；线上网关链路回归验证待执行 | open |

## Final QA Verdict
- [ ] pass
- [x] conditional pass
- [ ] fail

## Iteration
2026-07-03 / add-file-transfer-detail-drawer

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | 渲染 `views/file-transfer.ejs` | 模板可正常渲染 | `file-transfer.ejs render ok` | pass |
| QA-02 | `node --check index.js` | 无语法错误 | 命令执行无输出 | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --input-type=module -e "import ejs from 'ejs'; await ejs.renderFile('views/file-transfer.ejs',{seo:{}}); console.log('file-transfer.ejs render ok');" && node --check index.js
```

## Manual Checks
- 已确认文件列表新增“查看详情”动作，点击后打开右侧详情抽屉。
- 已确认抽屉展示 richer metadata（类型、体积、创建/更新时间、访问链接、相对路径）和预览区域。
- 已确认抽屉底部提供快捷操作：打开、复制链接、删除。
- 已确认支持遮罩点击与 `Esc` 关闭抽屉。
- 未执行真实浏览器端交互联调；建议上线前补充一次端到端手测。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | - | 本轮未发现模板或语法问题；浏览器端详情抽屉交互联调待执行 | open |

## Final QA Verdict
- [ ] pass
- [x] conditional pass
- [ ] fail

## Iteration
2026-07-03 / revamp-file-transfer-core-panel-multi-upload

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | 渲染 `views/file-transfer.ejs` | 模板可正常渲染 | `file-transfer.ejs render ok` | pass |
| QA-02 | `node --check index.js` | 无语法错误 | 命令执行无输出 | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --input-type=module -e "import ejs from 'ejs'; await ejs.renderFile('views/file-transfer.ejs',{seo:{}}); console.log('file-transfer.ejs render ok');" && node --check index.js
```

## Manual Checks
- 已确认文件中转页改为现代化管理面板布局（上传侧栏 + 文件管理主区）。
- 已确认支持拖拽与多文件队列上传，并显示逐文件上传进度。
- 已确认文件列表改为动作式操作（打开/复制链接/删除），默认不直接展示原始 URL 文本。
- 已确认原有搜索、类型筛选、排序、分页、统计和 15 天图表能力保留。
- 未执行真实浏览器端拖拽与大文件并发联调；上线前建议补充端到端手测。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | - | 本轮未发现模板或语法问题；浏览器端端到端上传联调待执行 | open |

## Final QA Verdict
- [ ] pass
- [x] conditional pass
- [ ] fail

## Iteration
2026-07-02 / add-volcengine-task-query-endpoint-without-local-apikey

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | `node --check utils/volcengine.io.js` | 无语法错误 | 命令执行无输出 | pass |
| QA-02 | `node --check index.js` | 无语法错误 | 命令执行无输出 | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --check utils/volcengine.io.js && node --check index.js
```

## Manual Checks
- 已确认新增 `ve_contents_generations_tasks.get_task`，调用上游任务查询接口。
- 已确认新增本地路由 `GET /volcengine/contents/generations/tasks/:task_id`。
- 已确认查询接口不依赖本地 `api_key`。
- 未执行真实上游联调；需在可用方舟环境下验证运行态和终态响应。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | - | 本轮未发现语法问题；上游联调待执行 | open |

## Final QA Verdict
- [ ] pass
- [x] conditional pass
- [ ] fail

## Iteration
2026-07-02 / set-global-request-body-limit-500mb

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | `node --check index.js` | 无语法错误 | 命令执行无输出 | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --check index.js
```

## Manual Checks
- 已确认全局默认请求体限制设置为 `500mb`。
- 已确认 `express.json`、`express.text`、`/file-transfer/upload` 的 `express.raw` 统一使用同一限制。
- 已确认支持环境变量 `REQUEST_BODY_LIMIT` 覆盖默认值。
- 代理层（如 Nginx）限制未在本仓库内修改，需部署侧同步配置以避免 413。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | - | 本轮未发现语法问题；部署侧代理配置待同步确认 | open |

## Final QA Verdict
- [ ] pass
- [x] conditional pass
- [ ] fail

## Iteration
2026-07-03 / add-file-transfer-inline-rich-media-preview

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | 渲染 `views/file-transfer.ejs` | 模板可正常渲染 | `file-transfer.ejs render ok` | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --input-type=module -e "import ejs from 'ejs'; await ejs.renderFile('views/file-transfer.ejs',{seo:{}}); console.log('file-transfer.ejs render ok');"
```

## Manual Checks
- 已确认文件列表新增“预览”列。
- 已确认图片、音频、视频、PDF 支持行内预览。
- 已确认其他类型保持原有 URL 链接并显示“不可预览”。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | - | 本轮未发现模板问题；浏览器端多媒体格式兼容性待实际文件联调 | open |

## Final QA Verdict
- [ ] pass
- [x] conditional pass
- [ ] fail

## Iteration
2026-07-02 / enhance-file-transfer-delete-filter-sort-dashboard

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | `node --check index.js` | 无语法错误 | 命令执行无输出 | pass |
| QA-02 | 渲染 `views/file-transfer.ejs` | 模板可正常渲染 | `file-transfer.ejs render ok` | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --check index.js && node --input-type=module -e "import ejs from 'ejs'; await ejs.renderFile('views/file-transfer.ejs',{seo:{}}); console.log('file-transfer.ejs render ok');"
```

## Manual Checks
- 已确认新增删除接口 `DELETE /file-transfer/file`，支持按文件名删除。
- 已确认列表接口支持 `fileType/sortBy/sortOrder`。
- 已确认返回新增统计字段：`typeStats` 与 `recent15Days`（兼容保留 `recent30Days`）。
- 已确认页面新增类型筛选、排序、删除按钮、类型统计和近 15 天创建图表。
- 未执行真实浏览器联调删除与筛选组合场景；建议上线前执行一次端到端手测。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | - | 本轮未发现语法问题；浏览器端端到端联调待执行 | open |

## Final QA Verdict
- [ ] pass
- [x] conditional pass
- [ ] fail

## Iteration
2026-07-02 / add-file-transfer-pagination

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | `node --check index.js` | 无语法错误 | 命令执行无输出 | pass |
| QA-02 | 渲染 `views/file-transfer.ejs` | 模板可正常渲染 | `file-transfer.ejs render ok` | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --check index.js && node --input-type=module -e "import ejs from 'ejs'; await ejs.renderFile('views/file-transfer.ejs',{seo:{}}); console.log('file-transfer.ejs render ok');"
```

## Manual Checks
- 已确认 `GET /file-transfer/files` 支持 `page/pageSize` 参数。
- 已确认接口返回 `total/page/pageSize/totalPages` 分页元数据。
- 已确认页面新增上一页/下一页按钮，并在搜索时回到第 1 页。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | - | 本轮未发现语法问题；真实页面翻页交互待浏览器端联调 | open |

## Final QA Verdict
- [ ] pass
- [x] conditional pass
- [ ] fail

## Iteration
2026-07-02 / isolate-network-logs-from-business-logs

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | `node --check utils/networkLogger.js` | 无语法错误 | 命令执行无输出 | pass |
| QA-02 | `node --check utils/axiosInterceptors.js` | 无语法错误 | 命令执行无输出 | pass |
| QA-03 | `node --check index.js` | 无语法错误 | 命令执行无输出 | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --check utils/networkLogger.js && node --check utils/axiosInterceptors.js && node --check index.js
```

## Manual Checks
- 已确认网络日志从业务 `console.log` 中抽离到 `utils/networkLogger.js`。
- 已确认支持环境变量切换输出模式：`off/console/file/both`。
- 已确认默认写入 `downloads/network.log`，不干扰主业务日志。
- 未执行长时运行验证；日志文件增长和轮转策略待后续补充。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | - | 本轮未发现语法问题；长时运行日志轮转待后续补充 | open |

## Final QA Verdict
- [ ] pass
- [x] conditional pass
- [ ] fail

## Iteration
2026-07-02 / add-downloads-file-transfer-page

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | `node --check routes/navigationRoutes.js` | 无语法错误 | 命令执行无输出 | pass |
| QA-02 | `node --check index.js` | 无语法错误 | 命令执行无输出 | pass |
| QA-03 | 渲染 `views/file-transfer.ejs` | 模板可正常渲染 | `file-transfer.ejs render ok` | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --check routes/navigationRoutes.js && node --check index.js && node --input-type=module -e "import ejs from 'ejs'; await ejs.renderFile('views/file-transfer.ejs',{seo:{}}); console.log('file-transfer.ejs render ok');"
```

## Manual Checks
- 已确认新增页面路由：`GET /file-transfer`。
- 已确认新增文件列表接口：`GET /file-transfer/files?search=`，返回 `name/size/updatedAt/url`。
- 已确认新增上传接口：`POST /file-transfer/upload`（二进制 body + 文件名），支持任意格式。
- 已确认文件访问 URL 使用现有静态目录规则 `/downloads/<filename>`。
- 未执行真实浏览器端上传联调；建议启动服务后用页面实际上传一次进行端到端确认。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | - | 本轮未发现语法问题；浏览器端端到端联调待执行 | open |

## Final QA Verdict
- [ ] pass
- [x] conditional pass
- [ ] fail

## Iteration
2026-07-02 / add-unified-request-and-axios-latency-logging

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | `node --check utils/axiosInterceptors.js` | 无语法错误 | 命令执行无输出 | pass |
| QA-02 | `node --check index.js` | 无语法错误 | 命令执行无输出 | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --check utils/axiosInterceptors.js && node --check index.js
```

## Manual Checks
- 已确认 `index.js` 新增统一入站请求日志中间件，记录 `method/path/status/durationMs/ip`。
- 已确认 `utils/axiosInterceptors.js` 新增 axios 请求耗时日志，成功/失败均记录 `method/url/status/durationMs`。
- 已确认保留并增强 429 日志（新增 `durationMs`），便于定位限流与慢请求。
- 未执行真实上游联调；耗时日志准确性需在线上真实流量下进一步观察。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | - | 本轮未发现语法问题；真实链路观测待执行 | open |

## Final QA Verdict
- [ ] pass
- [x] conditional pass
- [ ] fail

## Iteration
2026-07-01 / add-volcengine-video-generation-task-wrapper

## Test Matrix
| Case ID | Step | Expected | Actual | Status |
|---|---|---|---|---|
| QA-01 | `node --check utils/volcengine.io.js` | 无语法错误 | 命令执行无输出 | pass |
| QA-02 | `node --check index.js` | 无语法错误 | 命令执行无输出 | pass |

## Command Evidence
```bash
cd /root/coze-js-api && node --check utils/volcengine.io.js && node --check index.js
```

## Manual Checks
- 已确认 `utils/volcengine.io.js` 新增 `ve_contents_generations_tasks.create_task`，直接转发到 `POST /api/v3/contents/generations/tasks`。
- 已确认 `index.js` 新增本地路由 `POST /volcengine/contents/generations/tasks`。
- 已确认新接口沿用 `api_key` 校验，并返回 `code/msg/data` 结构。
- 未执行真实上游联调；该步骤依赖可用的火山账号和业务参数。

## Defects Found
| ID | Severity | Description | Status |
|---|---|---|---|
| BUG-01 | - | 本轮未发现语法问题；真实上游联调待执行 | open |

## Final QA Verdict
- [ ] pass
- [x] conditional pass
- [ ] fail

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
