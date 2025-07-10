### 日志监控服务
Dozzle
启动虚拟浏览器：docker run -d -p 8123:3000 -e "ALLOW_FILE_PROTOCOL=true" -e "CONCURRENT=30" -e "QUEUED=30" ghcr.io/browserless/chromium
### 服务器环境准备
```bash
yum install epel-release
yum install certbot python3-certbot-nginx
# 为域名申请证书，Certbot 会自动检测你的网站配置，自动生成证书并配置好 HTTPS。
certbot --nginx
# Let's Encrypt 的证书有效期是 90天，推荐使用自动续期：
crontab -e
0 3 * * * /usr/bin/certbot renew --quiet

```

依赖：安装好docker环境
### 本地部署流程
1. docker run -d --name my-redis --restart=always -p 6379:6379 redis:latest
### 服务器部署流程
(无操作)
以上都只需要运行一次，之后每次都是启动项目了
### 启动项目
本地：node index.js
远程：sh start.sh
