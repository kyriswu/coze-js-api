FROM node:22.10.0

RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 python3-venv poppler-utils ffmpeg && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Create an isolated Python environment used by the PDF conversion helpers.
RUN python3 -m venv /opt/venv && \
    /opt/venv/bin/pip install --no-cache-dir --upgrade pip && \
    /opt/venv/bin/pip install --no-cache-dir pdf2image

WORKDIR /app

# Install production Node dependencies before copying source so dependency layers are cached.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Application source is immutable at runtime. Persistent downloads are mounted separately.
COPY . ./

ENV PATH="/opt/venv/bin:$PATH"

CMD ["node", "index.js"]
