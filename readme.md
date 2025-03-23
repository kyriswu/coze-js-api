本地启动redis
dockerun -d --name my-redis -p 6379:6379 redis:latest
服务器启动redis
dockerun -d --name my-redis -p 127.0.0.1:6379:6379 redis:latest