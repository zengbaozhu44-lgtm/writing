# WL-01 — Authored World + Time Grounding: Named EO 草案

```text
MODE: DESIGN GATE / NAMED EO PREPARATION · READ-ONLY · ZERO CODE
上游: WL-00-baseline-freeze.md · world-life-input-design-gate.md
原则: 一次只改一个主要变量——本轮只做 authored time + world grounding
STATUS: DRAFT — 等待 Human Seal 后执行
```

---

## 一、目标

让现有系统第一次拥有「这个世界现在是什么时间、正在正常发生什么」——通过 **authored channel 填充已有 carrier**，零新 ontology。

## 二、五项 Seal 确认遵守

- Seal-1: 不新增 Truth Carrier / Ontology / Engine ✓
- Seal-2: 只利用已有 carrier（Time / State / Timeline / CW seed / Relationship / Faction） ✓
- Seal-3: 只修复 Producer / Pipeline（本轮仅 authored data，不改 producer 代码） ✓
- Seal-4: Writer 只消费，不发明 ✓
- Seal-5: 不开 Personality / Emotion / Life Sim / Random Event / Goal / T4 / L2-B / Choice ✓

## 三、最小安全修改面

### 3.1 Authored Plan time 字段

**现状**：ch1–ch10 authored plan 全部 `time: (none)` → `resolveStateTimeLabel` 返回 `未标注` → 08_current_state / Story Clock 空值。

**修改**：authored plan YAML 加 `time` 字段。已有 carrier 链路（无需改代码）：

```
authored plan .time
  → serializeAuthoredPlanToIntent（已映射：time: plan.time || priorAnchor?.current_date）
  → buildCurrentStateTable → 08_current_state '时间' 字段
  → resolveStoryClock → Story Clock canonical
  → Writer prompt Story Clock 模块
```

**结论：纯 authored data 填充，零代码修改。**

### 3.2 08_current_state 地点/任务

**现状**：`location: 未标注`（serializeAuthoredPlanToIntent 已映射 `location: plan.location || priorAnchor?.location || '未标注'`）。

**修改**：authored plan 加 `location` 字段。同样零代码。

### 3.3 07_state_board authored 填充

**现状**：空模板。carrier 存在（buildChapterAnchor 读取做 relationship_state）。

**修改**：authored 填入势力运转 + POV 当前状态。文件是 markdown（authored 编辑），零代码。

### 3.4 05_relationship_graph authored 填充

**现状**：文件不存在。`minimal-sr.js:307` 有读取逻辑（relationship → affect_relationship SR 槽）。

**修改**：authored 写入 YAML（格式参照已删除的 fixture——检查 `05_relationship_graph` schema）。零代码。

### 3.5 Character World seed 扩充（少量）

**现状**：林逸仅 3 seed 条目 + 1 T3；镜渊/老周零块。

**修改**：authored seed 增加生活/关系/经历条目（须过 epistemic basis）。

**注意**：这不是 WL-05（Character World Grounding 全量）——仅补 authored seed 少量基础，让 SR 在时间/世界 grounding 的同时有人物纵深供对比。

## 四、不改动的（严格排除）

| 排除项 | 理由 |
|---|---|
| T2 提取 prompt | WL-02（下一变量） |
| runNpcSimulation 接入 | WL-03 |
| Faction entity matching | WL-04 |
| Writer prompt / system | 不动 Writer |
| Character World contract | 只填 seed，不改 contract |
| Phase 1.3 / runtime / orchestrator | 零代码修改 |

## 五、试验批设计

### 章节：3 章 / 8–12 场

选用 **ch4 / ch7 / ch10**（分别代表：中段信息章 / 关系高潮章 / 终局章——可观察时间/世界输入对不同章型的影响）。

### Authored 补充内容（最小）

**ch4 authored plan 增补**：
```yaml
time: '22:30'          # 苏眠深夜出现
location: '林逸住处楼下'
```

**ch7 authored plan 增补**：
```yaml
time: '06:15'          # 等了一夜后清晨
location: '苏眠住处楼下'
```

**ch10 authored plan 增补**：
```yaml
time: '03:40'          # 深夜地下
location: '封存区最深处实验室'
```

**07_state_board authored**（全批共用）：
```markdown
## 都市守夜人
- 正在调查/执行：追踪非法进入封存区的异能者
- 下一步：增加封存区外围巡逻

## 林逸
- 目前计划：查清母亲真相
- 不知道：镜渊与母亲的完整关系
```

**05_relationship_graph authored**：
```yaml
edges:
  - from: 林逸
    to: 苏眠
    relation: 被迫同盟
    trust: low
  - from: 林逸
    to: 老周
    relation: 临时信任
    trust: medium
  - from: 镜渊
    to: 林逸
    relation: 观察对象
    trust: none
```

**Character World seed 增补（林逸 +1 条）**：
```yaml
knowledge:
  - info: 老周在档案馆干了十几年夜班，从不多问
    basis: past_experience
    basisRef: exp_a1
```

## 六、验证计划

### Runtime 验证

| 检查 | 方法 |
|---|---|
| time != null | 08_current_state '时间' 字段非'未标注' |
| Story Clock canonical 非空 | ch4/7/10 prompt Story Clock 含具体时间 |
| state_board 非空 | 07 文件含势力运转 |
| relationship 非空 | 05 文件存在且有 edges |
| CW seed 新条目 | world.json 林逸 knowledge+1 |

### Story Truth 验证

- Story Clock = Presentation（Plan/State 层），非 SR / 非 Canon
- 05_relationship → affect_relationship SR 槽（projection 命中）
- CW seed 过 epistemic basis

### Literary Validation

| 观察 | 判断标准 |
|---|---|
| 时间流动 | prose 是否自然体现时刻（深夜/清晨氛围差异） |
| 世界存在感 | 守夜人/势力是否被提及（非主线信息自然出现） |
| 人物差异 | 林逸/苏眠/镜渊是否因 state_board/relationship 产生行为差异 |
| Plot Density | 主线是否仍紧凑（不因生活信息而稀释） |

### 对照判定（§六 STOP 条件）

- **A** (Truth 进 SR + 文学改善) → 继续 WL-02
- **B** (Truth 有但 SR 无变化) → 检查 Character Access / Projection
- **C** (SR 有但 prose 不用) → 重开 Writer Realization
- **D** (World/Time 无法进入) → 找 pipeline blocker

## 七、Regression 计划

全部 19 个 npm test scripts 串行 + Batch #1 基线指标对比（T2/T3/SR 数量不应减少）。

## 八、安全边界确认

| 冻结项 | 是否触碰 |
|---|---|
| Character World contract | ❌（只填 seed，不改 contract） |
| T3 contract | ❌（不改 formation） |
| L1 / L2-B / Choice | ❌ |
| Phase 5+ | ❌ |
| Phase 3.2 SR semantics | ❌（只加 authored 输入） |
| 4.4.1d-R | ❌ |
| Writer authority | ❌（Writer 仍只消费） |

```text
WL-01 DESIGN GATE: COMPLETE — AWAITING HUMAN SEAL
最小修改面: 4 个 authored 文件 + 3 个 plan YAML 字段
代码修改: 0 文件
```

---

# WL-01 HUMAN SEAL — 2026-09-20

```
A. 不新增 Truth Carrier          SEALED ✓（只填已有 carrier）
B. 允许 authored input 填充       SEALED ✓（time/location/state/relationship/CW seed）
C. 允许修复 producer/pipeline     SEALED ✓（本轮零 producer 修改）
D. Writer ≠ Truth source          SEALED ✓（Writer 仍只消费）
E. 不开 Engine 清单               SEALED ✓（Personality/Emotion/Life/Random/Goal/T4/L2/Choice 全禁）

STATUS: APPROVED FOR EXECUTION
```
