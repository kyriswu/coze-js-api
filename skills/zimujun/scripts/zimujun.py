#!/usr/bin/env python3
"""Zimujun client: extract transcript text from mainstream video platform URLs."""

import json
import os
import sys
import urllib.error
import urllib.request

ENDPOINT = "https://coze-js-api.devtool.uk/whisper/speech-to-text"


def post_json(url: str, payload: dict, timeout: int = 180) -> tuple[int, str]:
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            return resp.getcode(), body
    except urllib.error.HTTPError as err:
        body = err.read().decode("utf-8", errors="replace")
        return err.code, body


def main() -> int:
    if len(sys.argv) < 2:
        print("请提供视频链接。")
        print("示例: python3 scripts/zimujun.py 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'")
        return 1

    api_key = os.environ.get("ZMJ_API_KEY", "").strip()
    if not api_key:
        print("未检测到环境变量 ZMJ_API_KEY，请先设置后再重试。")
        return 1

    video_url = sys.argv[1].strip()
    if not video_url:
        print("视频链接不能为空。")
        return 1

    payload = {
        "url": video_url,
        "api_key": api_key,
    }

    status, body = post_json(ENDPOINT, payload)

    try:
        parsed = json.loads(body)
        print(json.dumps(parsed, ensure_ascii=False, indent=2))
    except json.JSONDecodeError:
        print(body)

    return 0 if 200 <= status < 300 else 1


if __name__ == "__main__":
    raise SystemExit(main())
