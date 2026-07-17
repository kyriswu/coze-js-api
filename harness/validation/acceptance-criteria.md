# Acceptance Criteria

## 2026-07-17 · Blue/Green Deployment

- [x] 应用镜像包含生产依赖与源码；运行时未挂载宿主源码或依赖目录。
- [x] blue/green 服务仅 loopback 暴露，使用可用的 3003/3004（不扰动已占用的 3001/3002）。
- [x] `/healthz` 不依赖 Redis，`/readyz` 必须通过 Redis PING；SIGTERM/SIGINT 停止新连接并等待排空。
- [x] Nginx 只在候选 readiness 与 `nginx -t` 成功后原子切换；失败候选不会改变 current backend。
- [x] 真实切流后，blue healthy，两个 HTTPS vhost HTTP 200，legacy 已退出。
- [x] 测试、配置检查、部署证据与回滚步骤已同步至 QA/Release。
