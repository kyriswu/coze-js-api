# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Added a new plugin services showcase homepage at `GET /` with category filtering, keyword search, service cards, stats, and documentation-oriented entry points.
- Added `/assets` static hosting and a homepage WeChat QR image slot at `/assets/wechat-qr.png`.
- Introduced project harness structure under `harness/` and Copilot entry points under `.github/`.
- Refactored `index.js` to move shared helper logic into dedicated utility modules.
- Added new Twitter skill package for tweet detail and search timeline calls.
- Added WeChat MP endpoint `POST /wx_gzh/fetch_search_article` backed by TikHub `fetch_search_article` API integration.
- Added reusable skills:
  - `spec-to-plan`
  - `implementation`
  - `verification`
  - `release`
- Added workflow docs templates in `docs/`:
  - `TASK.md`
  - `PLAN.md`
  - `QA.md`
  - `RELEASE.md`
- Added Twitter endpoint `POST /twitter/fetch_tweet_detail` backed by TikHub `fetch_tweet_detail` API integration.
- Added Twitter endpoint `POST /twitter/fetch_search_timeline` backed by TikHub `fetch_search_timeline` API integration.

### Changed
- Added a direct paid-plan prompt on the plugin services homepage with WeChat contact `xiaowu_azt` and the required purchase note.
- Updated `ve_seedream_5_0_lite.generate_image` to download generated images into local `downloads/` storage and return local `/downloads/...` URLs in `data.data[].url`.
- Updated `POST /wx_gzh/fetch_search_article` API key billing from 1 credit to 2 credits per request.
- Added 3-attempt retry with short randomized backoff for `POST /wx_gzh/fetch_search_article` on transient upstream failures.
- Improved `downloadImageUrlToTempFile` for `POST /gpt-image-2/generate` with a 30s timeout and one retry on transient download errors (timeout/network/429/5xx).
