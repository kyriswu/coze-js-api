# Test Checklist

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
