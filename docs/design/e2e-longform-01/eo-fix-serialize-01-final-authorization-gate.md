# EO-FIX-SERIALIZE-01 — Final Authorization Gate Report

**Mode**: READ-ONLY ARCHAEOLOGY + AUTHORIZATION GATE · **Date**: 2026-10-30
**Code Changes**: NONE · **Named EO Execution**: NONE

---

## 1. AN-2 原始问题定义

| 项 | 内容 |
|---|---|
| 原始描述 | E2E 书 `01_world_bible.md` 含 **10 处** `[object Object]`（首次报告为 8，精确 grep 确认 10）——世界设定内容被 JS 默认 `toString()` 替代 |
| 首次发现 | E2E-LONGFORM-01 执行报告（2026-10-22）：世界 bible 全文仅「现代都市」4 字有效 |
| 受影响载体 | `novel/01_world_bible.md`（**唯一受影响载体**——`02_writing_bible.md` 实证 0 处损坏） |
| 受影响生产路径 | **仅向导建书路径**（`POST /api/books` → `createBookFromWizard` → `generateWizardContent` → `serializeWorldMd` → `writeModule`）；Runtime 生产链读取已损坏文件但不产生新损坏 |
| 影响范围 | **2 本书**实证受影响：`E2E-LONGFORM-01A`（10 处）、`二手书店老板的最后一周`（5 处）；其余 12 本书 bible 无损坏 |
| 错误归并检查 | AN-1 世界漂移≠AN-2（漂移=Beat 层结构性不可达，即使 bible 完好也漂移——统一契约考古 RC-1 已证）；AN-2 是独立的上游数据质量问题，非漂移根因 |

## 2. 真实生产路径与代码证据

### 数据流（序列化前后结构对照）

```
[LLM 返回 JSON]
  期望 schema: {"title","era","history","rules","powerSystem","map",
                "cities","dangerZones","socialStructure","factions","places"}
  实际返回:   LLM 按语义自由选择类型——
    history/rules/powerSystem/socialStructure → 可能返回 array of strings 或 object
    cities/dangerZones/places → 可能返回 array of objects
  证据: prompt 只声明字段名（ai-service.js:208），不声明字段类型

[extractJson]
  仅 JSON.parse（:20-24）——无 schema/类型校验
  输出: 原始 JS 对象（字段类型由 LLM 随机决定）

[serializeWorldMd]  ← 断点
  期望输入: 每字段为 string
  实际输入: 字段可能是 object/array（LLM 返回）
  表达式: `${f.history}`（ai-serializers.js:8-16）——JS 默认 toString()
  object → "[object Object]"
  array of objects → "[object Object],[object Object]"（二手书店实证）
  string → 正常（era=「现代都市」= 唯一幸存）

[writeModule]
  writeModule(targetDir, 'world', {content: markdown})（book-wizard.js:48）
  写入: novel/01_world_bible.md（已损坏 markdown）

[生产消费者]
  loader.js:258 readText → compiler.js:660-674 worldBible 模块
  读取: 已损坏内容进 basePrompt——但世界内容为 "[object Object]"
  下游: beat-slimmer slimLoreForBeat keys 命中裁剪 → 世界段结构性不可达（AN-1，独立问题）
```

### 受影响字段→行号精确映射（E2E 书 10 处）

| 行号 | bible 节 | 对应 schema 字段 | LLM 返回类型 |
|---|---|---|---|
| 6 | ## 2. 世界历史 | `history` | object/array |
| 8 | ## 3. 世界规则 | `rules` | object/array |
| 10 | ## 4. 超凡体系 | `powerSystem` | object/array |
| 12 | ## 5. 社会结构 | `socialStructure` | object/array |
| 14 | ## 6. 势力体系 | `factions` | object/array |
| 16 | ## 7. 地理/地图 | `map` | object/array |
| 17 | 危险区域 | `dangerZones` | object/array |
| 19 | ### 主要城市 | `cities` | object/array |
| 21 | ### 重要地点 | `places` | object/array |
| 24 | （残留） | 同上族 | 同上 |

### 其他序列化函数风险评估

| 函数 | 文件 | 损坏实证 | 原因 |
|---|---|---|---|
| `serializeWritingMd` | ai-serializers.js:22-39 | **0 处**（E2E 书 02 实证） | schema 字段（narrative/prose/chapterStructure 等）LLM 返回 string 概率高；且 `.split('\n')` 对 object 会 throw 而非静默产出 [object Object]（有隐式防护） |
| `serializeChapterTaskMd` | :41-48 | **0 处** | 同上 |
| `serializeCharacterMd` | :51-56 | **0 处**（E2E 书 5 个角色档全正常） | 同上 |

**结论**：`serializeWorldMd` 是唯一受影响函数——其 schema 字段（history/rules/powerSystem/map/cities/dangerZones/socialStructure/factions/places）语义上倾向结构化（LLM 返回 object/array 合理），而其余函数的字段语义倾向 string。

## 3. 根因及证据等级

| 项 | 判定 | 证据 |
|---|---|---|
| 根因 | `serializeWorldMd` 在模板插值前**无类型守卫**——LLM 返回的 object/array 直接经 JS 默认 toString() 变为 `[object Object]` | **PROVEN**（代码+2 本书产物双证） |
| 上游因素 | `extractJson` 无 schema/类型校验——LLM 返回类型不受约束 | **PROVEN**（代码实证） |
| 根因层级 | 直接断点=serialize（下游最后防线）；深层因素=extractJson 无校验（上游） | **PROVEN 双层** |
| 是否有其他独立根因 | 无——10 处 [object Object] 全部可归因于同一机制 | **PROVEN** |

## 4. 冻结契约一致性检查（八项逐检）

| # | 冻结边界 | 检查 | 结果 |
|---|---|---|---|
| 1 | Reality/Actual Authority 不变 | 修复仅影响向导建书时 markdown 渲染——不触 Actual 门/提取器/validator | ✓ 兼容 |
| 2 | Plan/Outline/Required Event 不升为 Actual | 不涉 | ✓ |
| 3 | Writer/Planner 不获 Reality Authority | 不涉 | ✓ |
| 4 | Prose 仍为 Evidence Source | 不涉 | ✓ |
| 5 | Truth/Control/Realization 边界不变 | 不涉 | ✓ |
| 6 | 不引入新 Canon Admission 或 Plan→Fact | 不涉 | ✓ |
| 7 | 不改唯一生产路径/不引入旁路 | 修复仅改 `serializeWorldMd` 函数内部实现——向导路径不变 | ✓ |
| 8 | 不需新语义解释 | object→string 归一是纯实现层格式转换，无 Truth 语义变化 | ✓ |

**结论：全部兼容，无需 Human Adjudication。**

## 5. 最小修复提案审查

### 精确修改

**仅一个文件一个函数**：`packages/inkos-studio-server/src/ai-serializers.js::serializeWorldMd`

### 修改前后数据流

```
Before:
  f.history (object) → `${f.history}` → "[object Object]"
  f.history (array of strings) → `${f.history}` → "item1,item2"（碰巧可读）
  f.history (string) → `${f.history}` → 正常

After (类型归一 helper):
  f.history (object) → JSON.stringify → '{"key":"value"}'（可读结构化文本）
  f.history (array of objects) → 逐项 JSON.stringify → '{"k":"v"},{"k2":"v2"}'
  f.history (array of strings) → join('；') → "item1；item2"
  f.history (string) → 原样 → 正常
  null/undefined → '' → 正常（已有 || '' 兜底）
```

### 保持不变

| 项 | 理由 |
|---|---|
| `serializeWritingMd` / `serializeChapterTaskMd` / `serializeCharacterMd` | 实证 0 损坏，无修改必要 |
| `extractJson` | 上游校验加固=扩范围（本 EO 不含）；作为独立后续项记录 |
| `writeModule` / `book-wizard.js` | 写入路径不变 |
| `01_world_bible.md` 既有损坏文件 | 本 EO 不含数据迁移（修复只影响新建书）；旧书修复属后续独立操作 |
| loader/compiler/beat-slimmer | 消费端不变 |

### 禁止修改

`ai-service.js`（extractJson/LLM 调用）、`book-wizard.js`（向导流程）、`module-service.js`、`loader.js`、`compiler.js`、`beat-slimmer.js`、所有测试书数据、所有冻结文档。

### 兼容性与回滚

- 旧数据兼容：已损坏文件保持原样（无迁移）；新函数对已正常的 string 字段零行为变化
- 回滚：还原 `ai-serializers.js` 单文件即可（git revert 范围=1 文件 1 函数）
- 掩盖上游风险：**不掩盖**——上游 extractJson 无校验作为独立观察记录（§9），本修复是下游最后防线加固

## 6. 回归验证计划（可执行但不执行）

| # | 测试 | 验证目标 |
|---|---|---|
| R1 | serializeWorldMd 输入 object → 输出 JSON 字符串（非 [object Object]） | 类型归一正确 |
| R2 | 输入 array of strings → join 输出 | 数组字符串处理 |
| R3 | 输入 array of objects → 逐项 JSON.stringify | 嵌套对象处理 |
| R4 | 输入 string → 原样不变 | 幂等 |
| R5 | 输入 null/undefined → 空串 | 边界 |
| R6 | 输入嵌套 object（含 null/number/boolean 值）| 深层结构 |
| R7 | E2E 书 bible 已损坏样本 → 新函数渲染前后对照 | 已知样本 |
| R8 | 全量 27 套回归 | 零副作用 |
| R9 | 二手书店 bible 5 处 → 同 R7 | 第二本书验证 |
| R10 | 生产消费者读取验证：新建书 → 01 无 [object Object] → loader 读到结构化文本 | 端到端 |

## 7. A/B/C 分类

### 判定：**A — READY FOR NAMED EO**

| A 类必要条件 | 满足 | 依据 |
|---|---|---|
| 根因有直接证据 | ✓ | 代码（:8-16 无守卫）+ 2 本书产物（10+5 处 [object Object]）双证 |
| 生产路径明确 | ✓ | 向导建书单一路径（POST /api/books → serializeWorldMd → writeModule） |
| 冻结契约唯一支持拟议修复 | ✓ | 八项检查全兼容；序列化格式转换=纯实现层 |
| 不需 Human Adjudication | ✓ | 无语义权威/数据含义/边界问题 |
| 修改范围最小且明确 | ✓ | 1 文件 1 函数（serializeWorldMd 内部类型归一 helper） |
| 回归标准可验证 | ✓ | R1-R10 十项 |
| 无未解决迁移/兼容风险 | ✓ | 不含迁移（旧文件不动）；string 幂等；单文件回滚 |

## 8. 独立观察（不扩展本轮范围）

| 观察 | 分类 |
|---|---|
| `extractJson` 无 schema/类型校验——上游因素，可独立加固（LLM 返回类型约束/schema 验证） | 独立后续项（非本 EO） |
| 既有 2 本书损坏 bible 的修复/重建——属数据操作非代码修复 | 独立后续项 |
| `serializeWritingMd` 的 `.split('\n')` 对 object 输入会 throw——隐式防护但非设计意图 | 观察（实证 0 损坏，不修改） |

## 9. 工作区变更检查

本轮**零代码修改、零测试修改、零配置修改、零数据修改**。仅读取代码/文件/日志。

---

> **AN-2 — A / READY FOR NAMED EO — STOP**
