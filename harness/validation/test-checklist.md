# Test Checklist

## 2026-07-17 · Blue/Green Deployment

- [x] 生命周期单测：`/healthz`、Redis `/readyz` 和优雅关闭均已覆盖。
- [x] 全量 Node 测试：`npm test`，13 passed / 0 failed。
- [x] 语法与静态检查：Node、Bash、`git diff --check` 均通过。
- [x] 配置检查：`docker compose --profile bluegreen config --quiet` 与 `nginx -t` 均通过。
- [x] 真实切流：blue healthy 后，两个公网 HTTPS vhost 均复验 HTTP 200。
- [x] 旧实例清理：legacy 无活跃 TCP 连接后退出，3000 监听已移除。
- [x] 回滚路径已记录：候选失败不改 Nginx；必要时可原子恢复 legacy backend。
