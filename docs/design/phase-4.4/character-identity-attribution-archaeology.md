# Character Identity / Actor Attribution Root-Cause Archaeology

**Mode**: READ-ONLY（零代码/零 schema/零 EO 设计）· **Date**: 2026-10-08
**Question**: Character Identity Boundary 在 InkOS 中是否真实存在？为什么它不是 T2 Experience 的不可绕过前提？

---

## 0. Executive Verdict（先答决断问题）

**InkOS 不存在统一、权威的 Character Identity 定义。** "谁是角色"在系统里只是一组分散的 **Control 层枚举**（scene.characters / pov / present / intent.cast / knownNames）加若干 **authored 工件**（03_character_bible 档案、CW seeds characters、knowledge_matrix.characters、05_relationship 端点）——各自服务本地用途，无一被 Sealed 为身份边界，且多数属于 Story Control 而非 Story Truth。

因此按冻结工作方式的判定规则：**根因不是「Identity Boundary 已存在但被绕过」，而是「该边界从未作为契约存在」。** ⇒ **绝不能偷偷加 whitelist**（那等于用新语义补架构缺口）⇒ 正确下一步是 **Character Identity Boundary Design Gate + Human Seal**，不是小 EO。

---

## 1. 七个根问题

### Q1 — actors[] 的冻结/实际语义到底是什么？

**冻结语义：无。** schema jsdoc 只有 `@property {string[]}`，无任何文字定义 actor 是什么。实际存在**三套互不一致的 de-facto 语义**：

| Producer | de-facto 语义 | 层 |
|---|---|---|
| LLM 路径 | 「从人物名单选出的经历者」（名单=Control 枚举） | Control 锚定 |
| 确定性路径 | 「动词前的 1–8 字名词短语**表面形式**」——任意非标点中文串 | 无语义（正则捕获） |
| affectedEntities（对照） | 物件/受影响实体（车门、录音带在这里**合法**） | 实体，非角色 |

相邻域已有一条契约：**Frozen #10（EO-L1-Subject-Eligibility-01）——枚举≠证据，禁 roster 作 eligibility 证据**。即系统曾明确裁定「名单不是 Truth」——但从未裁定「什么使一个名字成为角色」。

### Q2 — 谁第一次把文本 span 定义成 actor？

**Phase 1 确定性提取器的两个正则捕获组**（event-extractor.js）：
- `SPEECH_RE` group(1)：`说/道/问` 前的 1–8 字串 = speaker
- `ACTION_RE` group(1)：动作动词前的 1–8 字串 = actor

**"actor" 的第一个定义就是正则捕获组**——零语义权威。第二个铸造者是 LLM proposer（受名单约束）；第三个是 authored 通道。`车门`、`又`、`苏眠已经` 正是 group(1) 捕获的表面形式直接成为 actors[]。

### Q3 — actor 是否天然意味着 Character Identity？

**否。** schema/validator/消费者都把 actors[] 成员当**不透明字符串**。而 T2 侧 `ensureCharacterBlock(world, name)` 对任何名字**无条件创建角色块**——身份靠「被累积」被追认（reification by accumulation），不靠「被定义」。生产实证：`车门`/`又`/`”她忽然` 成为 world.characters（POST-R2 rescan，10 个伪实体，苏眠本人 T2=0 而她的体验挂在 `苏眠已经`/`”苏眠` 名下）。

### Q4 — LLM whitelist 为什么存在？保护什么语义？

`gateCandidate` 的 `actor_not_in_knownNames` + prompt「只能从人物名单选」。knownNames = `resolveKnown(scene.characters + pov + extra)` = **Control 层在场枚举**。它保护的是：**不可信 producer（LLM）不得虚构/引入名单外的名字**——anti-hallucination 锚，**不是身份权威**。注意其名单源头本身是 Control（plan 字段），所以连 LLM 路径的 actors 也是「计划声明在场者」，非 Truth 身份。

### Q5 — deterministic path 为什么没有同等语义保障？

**历史偶然，非裁决设计。** Phase 1 确定性提取器是 bootstrap——代码即 producer，没有「不可信第三方」需要约束，validator 只拿到非空检查（`missing_actors`）。「正则捕获非角色 span」这一失败模式从未被任何设计文档考虑，直到生产规模累积 T2 才显形（POST-R2 rescan 首次实测）。遗留气味：`inferActorsFromText` 硬编码 golden 时代默认名 `['苏晚','林夜','陈默']`。

### Q6 — T2 的 Character Subject 到底在哪里被定义和验证？

- **定义：无处。** 操作上 = `candidateNames`（orchestrator `rosterNames2` = collectKnownNames ∪ **event.actors**）→ `ensureCharacterBlock` 无条件建块。
- **验证：只有 Experience 级，没有 Identity 级。** `characterCanAccessActualEvent`（character-sr-updater.js:51）验证「该名字能否经历该事件」：participant（在 actors**或 affectedEntities** 中——actors/affected 在此合流，物件一旦混入 actors 即获 participant）或 present-witness（在场集=scene.pov/present/characters，又是 Control 枚举）。
- CW 存储的 characters = **seed 主体 ∪ T2 准入名字（无界并集）**。「反洗白」注释只保证语义槽（knowledge/belief）来自 seed——subjects 映射本身是开放的。

### Q7 — 如果今天删掉所有 whitelist，系统凭什么知道「谁是角色」？

**答：不能，从来不能。** 不存在任何机制回答这个问题。现有的全部「角色名单」：

| 来源 | 性质 | 用途 | 是否身份权威 |
|---|---|---|---|
| scene.characters / pov / present / intent.cast | Control（plan 字段） | prompt/枚举 | 否 |
| knownNames（上述聚合） | Control | LLM 白名单/eligibility 枚举 | 否 |
| 03_character_bible/*.md | authored 工件 | loader putCharacter、（我 WL-03 的 npc roster 门——**实现推断，非契约**） | **未被任何 EO/Seal 声明为权威** |
| character_world_seeds.characters | authored | CW 语义槽初始化 | 仅 seed 主体，非全集 |
| knowledge_matrix.characters / 05 端点 | authored | 各自消费 | 否 |

Frozen #10 的方向甚至相反：名单不得作 Truth 证据。

---

## 2. Attribution Flow 全链（现状 vs 目标）

**现状**：Prose → Extraction（正则=无身份 / LLM=Control 名单锚）→ Grounding（excerpt/action 逐字——**只验事件真实，不验主体资格**）→ ~~Character Attribution Boundary~~（**不存在**）→ ~~Authoritative Identity~~（**不存在**）→ Access Boundary（Experience 级：participant/witness，输入是不透明字符串）→ T2（无界建块）→ CW（身份靠累积追认）。

**目标形态**（女王给出）：Attribution Boundary + Authoritative Identity 位于 Grounding 与 Access 之间——`车门` 不是被黑名单挡掉，而是**语义上从未有资格成为 Experience Subject**。

**差距**：缺的正是这两层。这不是 implementation gap（接线遗漏），是 **Semantic Gap（架构层身份契约缺失）**。

## 3. 结论与裁定建议

1. **根因**：Character Identity Boundary 在 InkOS **不存在**——actors 语义自 Phase 1 起由正则捕获组默认承担，从未被契约化；T2/CW 的 Subject 准入从未要求身份资格。
2. **按冻结规则**：不得以局部 whitelist 补架构缺口（那是「用一个新语义打补丁」）。正确路径：**Character Identity Boundary Design Gate → Human Seal**，须裁决（非穷举）：
   - Authoritative Character Identity 的载体是什么（03_character_bible 升格为 authored 身份注册表？seeds 扩展？新显式 registry？——注意新 registry 可能构成新 Truth Carrier，须按规矩审）
   - 身份边界的层位（Truth 层 vs Control 层枚举的用法边界；与 Frozen #10 的关系）
   - admission 位置（T2 准入之前，作为不可绕过前提——按目标管线）
   - 代词/未具名实体（`他`→林逸 的共指消解是否入界，还是默认拒绝）
   - 既有污染存量如何处置（world.json 伪实体的清洗通道）
3. **FIRST REAL BLOCKER 重申**：不是「伪角色过滤」。当前定性：**SEMANTIC FRONTIER（Character Identity 契约缺失）**，生产影响为 QUALITY（CW 污染/误归属），不构成执行阻塞。

**STOP——考古完毕，未改任何代码，未设计 EO，等待裁决是否召开 Character Identity Boundary Design Gate。**
