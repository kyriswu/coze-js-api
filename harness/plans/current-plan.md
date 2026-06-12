# PLAN

## Title
Align douyin-transcribe-api key messaging with zimujun (no free key)

## Approved
yes

## Context Summary
用户反馈 `skills/douyin-transcribe-api` 对 API Key 缺失提示不够强，导致用户误以为可领取免费 key，频繁来咨询“免费 API”。需要参考 `skills/zimujun` 的表达方式，明确该能力不提供免费 key，必须自备/购买 key 后再用。

## Assumptions
- 不改接口实现逻辑，只调整技能文档与脚本提示文案。
- 不引入新依赖。
- 最小改动：只改 `douyin-transcribe-api` 相关文件与交付记录。

## Impacted Areas
- `skills/douyin-transcribe-api/SKILL.md`
- `skills/douyin-transcribe-api/scripts/transcribe_douyin.sh`
- `docs/PLAN.md`
- `docs/QA.md`
- `docs/RELEASE.md`
- `CHANGELOG.md`

## Steps
1. 对齐 `douyin-transcribe-api` 与 `zimujun` 的 API Key 缺失提示语气。
2. 在 `SKILL.md` 中新增明确规则：缺 key 时必须提示“无免费 key”，并给出购买入口。
3. 更新脚本 `transcribe_douyin.sh` 缺 key 输出，避免“申请/反馈”造成歧义。
4. 运行最小可行验证（bash 语法检查）。
5. 同步 `docs/PLAN.md`、`docs/QA.md`、`docs/RELEASE.md`、`CHANGELOG.md`。

## Verification Plan
- 命令：`bash -n skills/douyin-transcribe-api/scripts/transcribe_douyin.sh`
- 手工检查：
  - `skills/douyin-transcribe-api/SKILL.md` 中缺 key 指引明确包含“本服务不提供免费 API Key”。
  - 脚本缺 key 提示与文档保持一致，不再使用“申请或反馈”表述。

## Risks & Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| 文案过于强硬导致体验下降 | 用户感知不友好 | 保留简洁指引与购买入口，避免情绪化措辞 |
| 文档与脚本提示不一致 | 使用时产生困惑 | 同时更新 `SKILL.md` 与脚本并做检查 |

## Rollback Plan
- 回滚 `skills/douyin-transcribe-api/SKILL.md` 的文案改动。
- 回滚 `skills/douyin-transcribe-api/scripts/transcribe_douyin.sh` 的提示文案。
