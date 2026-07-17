# Test Checklist

## 2026-07-17 · Shared Lite-Chat Redis Migration

- [x] Redis 配置单测：显式 host/DB、默认兼容和可选凭据均已覆盖。
- [x] 已移除公开 Redis 管理路由，避免共享服务的任意读写/枚举/删除暴露。
- [x] 在线复制完成：源 DB 0 与目标 DB 1 在复制完成时均为 8,069 keys，TTL 聚合一致；并发写入窗口已接受。
- [x] green 已使用共享 DB 1 启动并通过 health/readiness；两个公网 HTTPS 入口与 `/readyz` 均为 HTTP 200。
- [x] blue 和旧项目 Redis 已停止；旧 Redis volume 未删除，保留回退能力。

## 2026-07-17 · GPT-Image-2 Atomic Credit Charge

- [x] 原子扣减单测：非零 cost、余额不足拒绝和工厂封装均已覆盖。
- [x] 语法检查：`index.js` 与 `utils/ThirdParrtyApi/aitoken.js` 均通过。
- [x] 全量 Node 测试：`npm test`，18 passed / 0 failed。

## 2026-07-17 · Blue/Green Deployment

- [x] 生命周期单测：`/healthz`、Redis `/readyz` 和优雅关闭均已覆盖。
- [x] 全量 Node 测试：`npm test`，15 passed / 0 failed（含 post-switch ordering 与 stopped-container cleanup 回归）。
- [x] post-switch 安全路径：reload 后立即保护候选，连续 3 次经本机 Nginx `/readyz` 成功后才 drain prior color；验证失败自动回切先前 include。
- [x] 第二次真实切流：green healthy 后，active backend 切至 3004；blue 优雅退出 exit 0，两个公网 HTTPS vhost 的 `/` 与 `/readyz` 均复验 HTTP 200。
- [x] 旧实例清理：legacy 无活跃 TCP 连接后退出，3000 监听已移除；`coze-js-api-container-cleanup.timer` 每小时运行，仅在 exited app 容器超过 24 小时后删除。首次真实运行成功，因尚未到期删除 0 个。
- [x] 回滚路径已记录：候选失败不改 Nginx；必要时可原子恢复 legacy backend。
