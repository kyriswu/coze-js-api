依赖：安装好docker环境
1.先启动redis
本地启动redis
docker run -d --name my-redis -p 6379:6379 redis:latest
服务器启动redis
docker run -d --name my-redis -p 127.0.0.1:6379:6379 redis:latest
2.启动项目
sh start.sh
zVkEr8T67iCJ2sc9N5