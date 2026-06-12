# PLAN

## Title
Align douyin-transcribe-api API key messaging (no free key)

## Approved
yes

## Context Summary
用户反馈 `skills/douyin-transcribe-api` 的缺 key 指引容易让人误解为可拿免费 API Key，导致频繁被问“有没有免费 key”。本次需要参照 `skills/zimujun` 的规则，将提示统一为“仅自备/购买 key，不提供免费 key”。

## Assumptions
- 不改动接口与返回结构，仅调整技能和脚本文案。
- 不引入新依赖。
- 保持最小修改范围。

## Impacted Areas
- `skills/douyin-transcribe-api/SKILL.md`
- `skills/douyin-transcribe-api/scripts/transcribe_douyin.sh`
- `docs/QA.md`
- `docs/RELEASE.md`
- `CHANGELOG.md`

## Steps
1. 在 `skills/douyin-transcribe-api/SKILL.md` 中补充缺 key 强制规则：明确“不提供免费 API Key”。
2. 替换缺 key 示例回复文案，统一为“购买或续费”路径。
3. 更新 `scripts/transcribe_douyin.sh` 缺 key 提示，避免“申请或反馈”歧义。
4. 运行 `bash -n skills/douyin-transcribe-api/scripts/transcribe_douyin.sh` 并记录 QA。

## Verification Plan
- 命令：`bash -n skills/douyin-transcribe-api/scripts/transcribe_douyin.sh`
- 手工检查：
	- `SKILL.md` 缺 key 指引中包含“本服务不提供免费 API Key”。
	- 缺 key 时文档与脚本提示一致。

## Risks & Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| 文案提示仍被误解 | 继续收到免费 key 咨询 | 强制加入“无免费 key”措辞并保留购买入口 |
| 文档与脚本不一致 | 用户执行体验不一致 | 同步修改两个文件并做语法检查 |

## Rollback Plan
- 回滚 `skills/douyin-transcribe-api/SKILL.md` 文案。
- 回滚 `skills/douyin-transcribe-api/scripts/transcribe_douyin.sh` 文案。
