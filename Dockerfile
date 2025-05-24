# 基础镜像
FROM node:22.10.0

# 安装 Python、pip 和 pdf2image 所需的依赖（基于 Debian）
RUN apt-get update && \
    apt-get install -y \
        python3 \
        python3-pip \
        poppler-utils \
        && apt-get clean && rm -rf /var/lib/apt/lists/*

# 安装 Python 包
RUN pip3 install pdf2image

# 设置默认工作目录
WORKDIR /app
