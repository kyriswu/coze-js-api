依赖：安装好docker环境
### 本地部署流程
1. docker run -d --name my-redis -p 6379:6379 redis:latest
### 服务器部署流程
1. docker network create my-net 
1. docker run -d --name my-redis --network my-net redis:latest

### 启动项目
本地：node index.js
远程：sh start.sh