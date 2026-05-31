# RELEASE

## Summary
本次交付新增了一个合并 Twitter skill，并继续保持 `index.js` 结构收缩后的组织方式。

## What Changed
- 新增 `skills/twitterwebapi/SKILL.md`，同时覆盖推文详情和搜索时间线两个接口。
- 新增 `skills/twitterwebapi/scripts/twitter_api.py`，通过 `detail/search` 子命令调用对应接口。
- 保留现有路由行为和响应结构，仅新增技能包装层。

## Impact
### API/Behavior
- 对外 API 无变化；仅新增可复用 skill。

### Internal Modules
- 新增 Twitter skill 目录和脚本。

## Breaking Changes
- none / 详细描述

## Migration Notes
- 无需迁移；可直接使用新 skill。

## Rollback Notes
- 删除 `skills/twitterwebapi/` 即可回滚本次新增 skill。

## Deployment Notes
- 环境变量：
- 启动命令：
- 验证命令：
