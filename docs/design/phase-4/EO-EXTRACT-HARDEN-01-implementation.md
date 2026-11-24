# EO-EXTRACT-HARDEN-01 — Implementation Record

**Status**: IMPLEMENTED + REGRESSED (12/12 EO + 20/20 全量) + PRODUCTION VALIDATED (10/10, 0 extraction failures)
**Date**: 2026-09-21
**Scope**: R1 + R3 only（R2 明确排除，保留 SEMANTIC FRONTIER — HUMAN SEAL REQUIRED）

## 1. R1 — `event-validator.js::actionGroundedInText`

最终算法（严格确定性、零相似度容忍）：
1. 保留：excerpt 前缀包含（原有）
2. 新增：有界剥前缀（他/她/它 + 2/3/4 字）后再做 excerpt 包含——修 LLM「他→角色名」改写破坏包含的假阴性
3. 保留：标点 token 路径（原有）
4. 新增：**剥 ≤4 字 actor/代词前缀后的完整谓语核心逐字 ∈ 正文**——修中文无标点单 token 假阴性

开发中弃用方案：尾部子串 ≥3 匹配（P3a 假阳性——宾语名词单独命中，如未发生的「砸碎」靠「录音带」过关）；按女王指示未采用字符占比类模糊匹配。假阳性防护：动作核心必须**整段逐字**出现；相似但未出现的动作（动词不同/宾语残缺）仍拒（测试 P3a/P3b 钉死）。

## 2. R3 — `event-extractor.js`

presence 兜底从「有候选即抑制」（`!candidates.length`）改为「**零有效候选才触发**」（`!passed.length`，验证循环后）。presence 仍完整过 `validateStoryEvent`；consequence 公式不变；外层 double-fallback 未动。

## 3. Regression

- EO 测试 `test:eo-extract-harden-01` **12/12**（含 ch10_s4 法医文本回放：确定性提取 0→1 有效事件）
- 全量 20 项：phase13 23 / bridge 47 / consumption 29 / seam 24 / cade 26+21 / correspondence 29 / eligibility 18 / access 38 / l1-eval 23 / l1-audit 22 / cw 32+20+27+22 / p32 17 / wl03 21 / wl04 18 / **reality-golden OK / story-route ALL PASS**

## 4. Production Validation（§E）

**Provider 矩阵**：deepseek 402 欠费 · zhipu glm-4.6 429 欠费 · moonshot 账户被封 · solar-pro-4(OpenRouter) 401 · **zhipu glm-4-flash 可用（200）**。
driver 加 `STRESS_PROVIDER` 切换（测试层配置，非生产代码）。

**Batch（zhipu glm-4-flash，WL01+CW_SEED+EXTRACTION+WL03+WL04 全开）：10/10 章、40 scenes、零提取失败。**

| §E 观察项 | 结果 |
|-----------|------|
| chapter completion | 10/10 |
| extraction failure count | **0**（修复前频率：4 run 3 次命中） |
| R1 signature（action_not_grounded 假阴性杀章） | 消失 |
| R3 signature（坏候选抑制 presence） | 消失；presence 仅 2/40 scenes 触发（修正后只在真零有效时兜底，无滥用） |
| T2 production | 101 条，多类共存（action 55/speech 21/informational 9/environmental 6/social 4/daily 4/presence 2）——WL-02 体验多样性保持 |
| SR production | character_sr 10/10 章产出 |
| L1 Access carrier | access_truth.json 持续产出 ✓ |
| Character World trace | world.json 持续追加 ✓ |

声明：glm-4-flash 用于**管道验证**；文学质量基线验证须待 deepseek 充值后补一个 deepseek 干净 batch（本 EO 不宣称文学层结论）。

## 5. FIRST REAL BLOCKER — RESCAN 结论

代码层无新 FIRST REAL BLOCKER。剩余阻塞均为非代码：
1. **高质量 writer LLM 容量**（deepseek 402——充值即解，文学质量生产验证前置条件）
2. **R2 Semantic Frontier**（consequence 必填 vs 体验型候选——独立 Design Gate，Human Seal i/ii/iii 三选一；当前由 R3 presence 保章，内心高潮场景 T2 质量降级为 presence，属质量损失非管道损失）

## 6. 下一步建议

1. DeepSeek 充值 → 补 deepseek 干净 batch（文学层确认）
2. **R2 Semantic Design Gate**（Human Seal）
3. 之后决定 WL-05 Character World Grounding 是否为下一站
