依赖：安装好docker环境
### 本地部署流程
1. docker run -d --name my-redis --restart=always -p 6379:6379 redis:latest
### 服务器部署流程
(无操作)
以上都只需要运行一次，之后每次都是启动项目了
### 启动项目
本地：node index.js
远程：sh start.sh