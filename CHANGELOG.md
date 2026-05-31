# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Introduced project harness structure under `harness/` and Copilot entry points under `.github/`.
- Refactored `index.js` to move shared helper logic into dedicated utility modules.
- Added new Twitter skill package for tweet detail and search timeline calls.
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
