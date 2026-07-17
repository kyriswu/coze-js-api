# Acceptance Criteria

## 2026-07-17 · Shared Lite-Chat Redis Migration

- [x] 应用通过环境变量连接 `lite-chat-redis` 的隔离 DB 1，不再依赖 Compose `my-redis` 服务。
- [x] 旧 DB 0 数据已在线复制到 DB 1 并保留 TTL；迁移期间的并发写入缺口已明确接受。
- [x] 公共 Redis 管理路由已删除，不能借本应用读写或枚举共享 Redis。
- [x] green 已切为公网 active 且 `/readyz`、两个 HTTPS 首页均通过；旧 Redis 已停止并保留回退 volume。

## 2026-07-17 · Blue/Green Deployment

- [x] 应用镜像包含生产依赖与源码；运行时未挂载宿主源码或依赖目录。
- [x] blue/green 服务仅 loopback 暴露，使用可用的 3003/3004（不扰动已占用的 3001/3002）。
- [x] `/healthz` 不依赖 Redis，`/readyz` 必须通过 Redis PING；SIGTERM/SIGINT 停止新连接并等待排空。
- [x] Nginx 只在候选 readiness 与 `nginx -t` 成功后原子切换；reload 后候选会先受到保护，连续 3 次经本机 Nginx `/readyz` 通过后才排空旧色；验证失败会原子恢复先前 backend。
- [x] 已完成两次真实切流：首次 blue healthy、legacy 已退出；后续 green healthy、blue 已以 exit 0 优雅退出；两个 HTTPS vhost 的 `/` 与 `/readyz` 均为 HTTP 200。
- [x] 测试、配置检查、部署证据与回滚步骤已同步至 QA/Release。
- [x] 已启用每小时 systemd cleanup timer：只依据 Compose project/service 标签处理本项目的 exited app 容器，保留至少 24 小时；实际首次执行成功且未删除尚未到期的 blue/legacy。
