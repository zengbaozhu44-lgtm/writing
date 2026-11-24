# G1-A — IDENTITY AUTHORITY & RESOLUTION — Named EO Preparation（READ-ONLY）

**Date**: 2026-10-08 · **Mode**: POST-SEAL EO PREPARATION（本轮零实现）
**来源**: Gate 1 Human Seal（八问已 Seal，语义不得反向修改）

---

## 1. Design Audit（Sealed 语义 → 实施契约）

### A. Identity Authority Contract

- **authoritative identity source（物理分载，逻辑统一）**：
  - class=character：`03_character_bible/*.md`（canonical=文件名去 .md，排除 `_template`）**∪ CW seeds `characters` 键**（authored-only 原则的必然推论：seeds 是 authored 录取；同名同类=同一实体，无冲突）
  - class=faction：`04_faction_bible/*.md`；class=location：`04b_location_bible/*.md`（仅注册身份，不建 runtime）
- **alias ownership**：别名声明归属**声明它的载体文件**——md 文件内标记行 `> identity-alias: 别名1, 别名2`（实现级选择，非语义；载体不变、无新 Carrier）
- **canonical identity**：载体文件名（seeds=键名）；alias → canonical 单射
- **collision = fail-closed**：同一 alias 命中多 Entity → `UNRESOLVED(alias_collision)`，禁止猜测
- **authored admission boundary**：Runtime **只能 resolve、不能 create/delete**（API 无写函数——结构保证）；extraction/roster/plan/mention 出名永不录取

### B. Resolution Contract

```
resolveEntityName(bookDir, surface)
→ { status:'RESOLVED', class, canonical, ref }   // ref = class+canonical 派生
→ { status:'UNRESOLVED', reason }                // not_in_registry | alias_collision
```
- 输入=任意 surface string；输出=RESOLVED/UNRESOLVED 二值（Q3：UNRESOLVED 是 status，不物化）
- fail-closed 条件：未命中 / 别名碰撞 / 空串
- provenance：RESOLVED 携带 source 载体（bible|seed|faction|location）；可观测=各咽喉记录 resolved/unresolved 计数（进现有日志与 meta，不建新 Truth 载体）
- **resolution-aware participant matching**（Seal 推论）：事件 actors/affected 的 surface 串先 resolve 再与 Subject canonical 比对——别名提及的经历归属 canonical 角色（否则有别名的角色丢失自己的事件）

### C. Subject Admission Contract

```
RESOLVED EntityRef →（consumer 各自 eligibility）→ Subject
```
- **Attribution Subject**：`candidatesFromScene` 的 actors 逐个 resolve；RESOLVED(class=character) 才成归因候选；pov 兜底同样 resolve，UNRESOLVED→跳过（fail-closed，S6）
- **T2 Subject**：`appendT2Experiences` 的 candidateNames 逐个 resolve；仅 RESOLVED(character) 进主体循环；UNRESOLVED 计数上报
- **CW Subject**：运行时建块唯一口=appendT2:347（已确认单点）——resolution 前置即封死；seeds 同步建块=authored 合法通道不动
- **Relationship Endpoint**：loader 读取 05 时逐边 resolve 两端；任一 UNRESOLVED→该边不入 `ctx.relationships`（fail-closed+warn），全图其余边不受累
- **不扩**：SR 更新器/L1/minimal-sr 不接（SR=View、主体名 Control 域；记入观察项待 rescan）；RESOLVED ≠ Character（class 判别在 consumer eligibility）

### D. Historical Quarantine Contract（接口级，本 EO 只建只读分类器+清单）

- **preserve**：world.json 逐字节不动（S9 测试钉死）
- **classify**：现存 characters 键 × registry → invalid（证据上不可能实体：标点开头/助词/物件的既往清单规则）| unknown（代词类/单 run 残留）| valid
- **quarantine**：`_system/brain/identity_quarantine.json` sidecar manifest（generatedAt/eo/entries[{name,reason,firstSeen}]）——**旁路清单，不改存量 schema**；CW 投影跳过 quarantined 名（新 admission 已被 resolution 封死，投影跳过只影响 legacy 块）
- **migration deferred**：独立 Named EO，须保 provenance

## 2. Current Identity / Reification 考古图（现行流）

```
surface string（prose 正则捕获 / LLM 白名单产出 / plan 字段 / 05 端点 / seeds）
→ candidate（actors[]/affectedEntities[]/candidateNames/knownNames/endpoint）
→ 【无 resolution 层】
→ subject admission：
   ① ensureCharacterBlock（appendT2:347 唯一运行时建块——任意字符串成 CW Subject）★
   ② candidatesFromScene（actors∪pov 兜底直接成 Attribution Subject）★
   ③ projectAffectRelationship（全局边按名直投 SR affect——G1-B 域，本 EO 不动）
   ④ loader 05 端点零校验入 ctx ★
→ consumers：world.json blocks / attribution records / T2 / SR affect
（seeds 同步=authored 合法；WL-03 npc collect 已 bible 门控=先例；L1 knownNames=枚举≠证据，不动）
```
★=G1-A 四接线点（①②④+appendT2 主体循环③'）。

## 3. Sealed Contract → Implementation Mapping

| Seal 条款 | 实施落点 |
|---|---|
| Q1 统一 Authority/分载/统一 API | 新 `entity-identity.js`（core/lib）：loadRegistry+resolve，纯读 |
| Q2 authored-only | resolution 前置于 ①②；API 无写路径 |
| Q3 RESOLVED/UNRESOLVED | resolve 二值返回+计数观测；UNRESOLVED 不物化 |
| Q4 无共指 | 代词 surface 自然走 not_in_registry→UNRESOLVED |
| Q7 quarantine | 只读分类器+sidecar manifest+投影跳过 |
| Q6/Q5/Q8 | **不在本 EO**（G1-C/G1-B/边界已立） |

## 4. 涉及文件/函数（预计）

| 文件 | 变更 |
|---|---|
| `inkos-core/src/lib/entity-identity.js` | NEW（registry 加载+resolve+别名解析+碰撞 fail-closed） |
| `inkos-brain/src/character/character-world.js` | appendT2：candidateNames resolve 前置+resolution-aware participant 匹配+unresolved 计数；projectWorldToSRScene：跳过 quarantined |
| `inkos-brain/src/attribution/attribution-wiring.js` | candidatesFromScene：resolve 化（pov 兜底同） |
| `inkos-brain/src/loader.js` | 05 边端点 resolve 过滤（一处） |
| `scripts/test-eo-g1a-identity-resolution-01.js` | NEW |
| stress driver | 无必改（现书角色均 authored） |
| **不改** | ensureCharacterBlock 本体/seeds 同步/SR 更新器/L1/L2/Choice/WCT/extractor/validator/npc collect |

## 5. Minimal Implementation Boundary

只做：resolution API + 四接线点前置 + quarantine 分类器/清单/投影跳过 + 计数观测。不做：共指、affect 修正、Event id、Location/Faction runtime、历史迁移、任何 L1/L2/Choice/SR 语义、bible 文件格式强制改造（别名标记行=可选 opt-in）。

## 6. Regression Test Matrix（新套件 S1–S10 全映射）

S1 actor 串不造 Character（'车门' actor→无块无 T2 计数+1）· S2 mention 同径 · S3=T2 通道同 S1 · S4 endpoint（05 含 '幽灵' 边→不入 ctx、他边保留）· S5 pov/roster（pov='陌生'→appendT2 跳过；collectKnownNames 枚举原样）· S6 UNRESOLVED 零物化（world/attribution 无记录）· S7 别名碰撞 fail-closed（两载体同别名→UNRESOLVED(alias_collision) 不猜）· S8 API 只读无写（结构断言）· S9 world.json 字节不动+quarantine sidecar 生成 · S10 语义不变（L1/L2/attribution-gate/全量 23 套绿）。
附加：别名归属（'周国栋'→老周 canonical，事件归 canonical 块）· seed 无 bible=合法录取 · 既有 WL-03 npc 门控行为不变。

## 7. Production Validation Matrix

DeepSeek batch 全配置：10/10；**world.json 零新增伪块**；**苏眠 T2>0（误归属修复预期）**；attribution 全 RESOLVED 主体；05 无效边零入 ctx；quarantine manifest 列出既有伪名而 world.json 未动；L1/SR/WCT/提取失败率与基线持平。

## 8. Literary Validation

prose 指标噪声内持平（身份层不进 prompt 新内容）；苏眠相关 SR/经历纹理修复性改善（记录不设阈值）；关系链（方向保真）不受影响。

## 9. Historical Migration Boundary

本 EO：零删除/零改写/零回填；仅 sidecar 清单+投影跳过。迁移=独立 EO（保 provenance、按 manifest 分类执行）。

## 10. Unresolved Implementation Questions

均为实现级、非语义（不触发 §14 STOP）：①别名标记行语法（提案 `> identity-alias: …`，EO 时确认）②resolution 结果缓存策略（per-book 单次加载）③quarantine 分类规则阈值（沿用既往伪名清单特征：标点开头/单字助词/含「他」起头）。**无语义歧义、无新 Authority Gap、无需新 Truth Carrier、无需改动 Seal。**

---

## 判定

> **IMPLEMENTATION AUTHORIZED**（等待您的 G1-A Named EO 执行令；本 turns 零代码）

**STOP。**
