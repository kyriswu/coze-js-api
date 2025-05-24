# 基础镜像
FROM node:22.10.0

# 安装 Python 和 pip（基于 Debian）
RUN apt-get update && \
    apt-get install -y python3 python3-pip && \
    apt-get clean && rm -rf /var/lib/apt/lists/* && \
    pip install pdf2image

# 设置默认工作目录
WORKDIR /app
