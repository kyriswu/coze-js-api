FROM node:22.10.0

RUN apt-get update && \
    apt-get install -y python3 python3-venv poppler-utils ffmpeg && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# 创建虚拟环境
RUN python3 -m venv /opt/venv

# 激活虚拟环境并用它的 pip 安装 pdf2image
RUN /opt/venv/bin/pip install --upgrade pip && \
    /opt/venv/bin/pip install pdf2image

WORKDIR /app

# 将虚拟环境路径加入环境变量，方便后续使用
ENV PATH="/opt/venv/bin:$PATH"