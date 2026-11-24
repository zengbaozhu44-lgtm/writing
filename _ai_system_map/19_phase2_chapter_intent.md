# 19. Phase 2.4 — Chapter Intent Contract（恢复语义，而非新增结构）

> 日期：2026-08-19 ｜ 状态：**✅ 已通过（用户拍板）** ｜ 性质：契约文档（先文档后代码）
> **方向修正（用户拍板）**：旧理解「Chapter Director 从 prompt 块工厂升级为 Chapter Intent Authoring Layer」是错的。
> 正确事实：**Chapter Intent 本来已经存在，问题不是缺少 Authoring Layer，而是 Intent 在进入模型前被 serializer 压扁，导致作者意图损失。**
> 因此 2.4 方向 = **恢复语义，而不是新增结构**。
> 拍板（16 §5 补充）：**Chapter Intent Contract = 全系统概念；Chapter Director = Studio 侧 Authoring Helper（不是 authority）。**

---

## 0. 一句话定位

> 作者输入（goal/conflict/climax/cost/hook/scene/pov/time）本身就是最有价值的信息。系统应该**保护它，不是重新解释它**。

---

## 1. 现状证据（保留）

### 1.1 作者的真实输入（authored plan YAML，`chapter_0002.yaml` 实测）

```yaml
chapter: 2
goal: 让主角林夜经历第一次世界刷新，确认其真实性，并让他意识到自己成为唯一保留记忆的'清醒者'…
conflict: 林夜连续记忆与整个世界（所有人、所有记录显示昨天是普通一天）的根本矛盾…
climax: 凌晨4:00 林夜在病床醒来，目睹世界从'昨天'瞬间'更新'为'今天'…血写的标记确认重置…
cost: 林夜失去对'现实'的信任基础…前24小时积累的所有物理证据（录像、日记）全部消失…
hook: 手机屏幕亮起，'效率助手'推送空白消息…
scenes:
  - 场景1：孤独的证明。…
  - 场景2：重置的见证。…
emotional_beat: 从困惑与否认，到焦虑与孤独，最终被恐惧与警觉取代…
pov: 苏晚
time: Day 1
```

### 1.2 serializer 压扁作者意图（`serializeAuthoredPlanToIntent`，planner.js:330-380）

| authored plan | → intent 字段 | 模型可见性 |
|---|---|---|
| `goal` | `mainGoal` + `chapterIntent` | ✅ Narrative Task「章目标」（prompt-compiler.js:188） |
| `conflict` / `obstacle1` | `obstacles[]` + 每 scene `conflict` | ✅「冲突」 |
| `climax` | `turningPoint` | ✅ climax 块 |
| `cost` | `mustLose` | ⚠️ **只被 director 启发式块间接消费，无显式行** |
| `hook` / `ending` | `ending` | ✅ 章末钩子块 |
| `pov` / `time` | `pov` / `currentDate` | ✅ Narrative Task 头部 |

### 1.3 模型实际看到的意图核心（Narrative Task）

```
Chapter N · Scene i · POV X
- **章目标**：{mainGoal}
- **Scene 目标**：{scene.goal}
- **冲突**：{scene.conflict}
+ director 装饰块
```

---

## 2. 核心发现 + 方向修正（本次最有价值的更正）

```
Authored Plan
    │  ← 已经包含作者意图
serializeAuthoredPlanToIntent()
    │  ← 压缩过度，作者意图损失
Writer Context
```

- **四问不是不存在，是被压扁**：`goal/conflict/climax/cost` → `mainGoal/obstacles/turningPoint/mustLose`，每个被不同 director 块用不同措辞消费。模型永远看不到完整「本章四问」。
- **`what_cannot_rollback`（cost）最弱**：不直接渲染进 Narrative Task，只靠 writer-first/hook-ladder/writer-scene-arc 启发式翻译。
- **旧理解的危险**：把「缺少 Authoring Layer」当问题 → 会去新增 Chapter Intent 模块/Schema/字段 → 又制造一层。
- **正确方向**：**恢复语义，而不是新增结构。**

---

## 3. Chapter Intent Minimum Contract（四问固定）

```yaml
chapterIntent:          # 核心四问（最小值契约）
  goal:                 谁想得到什么
  conflict:             谁阻止谁
  turningPoint:         什么事件改变方向
  irreversibleChange:   什么东西无法恢复
```

> 其他字段（`hook` / `pov` / `rhythm` / `climax` / cost detail）属**增强信息**，不在最小契约内。

### 为什么第四问叫 `irreversibleChange`（D4 拍板，不叫 mustLose）

- `mustLose` 是作者内部术语，偏「失去东西」；`irreversibleChange` 覆盖更广：关系改变 / 身份暴露 / 秘密公开 / 信任破裂 / 资源消耗 / 选择不可撤销。
- 示例：弱 = 「角色必须失去钥匙」；强 = 「角色无法回到不知道真相之前」——后者才是章节推动力。

---

## 4. 四问 → 现有字段映射（收敛契约，不新建引擎）

| Minimum Contract | 现状填充字段（serializer 后） | 模型可见 | 收敛动作 |
|---|---|---|---|
| `goal` | `mainGoal` / `chapterIntent` | ✅ | 保留 |
| `conflict` | `obstacles[]` + scene `conflict` | ✅ | 保留 |
| `turningPoint` | `turningPoint` → climax 块 | ✅ | 保留 |
| `irreversibleChange` | `mustLose`（= `plan.cost`） | ⚠️ 仅启发式 | **提升一等公民**（见 §6 D4） |

---

## 5. 责任边界（D6 定位修正）

```
Chapter Intent Contract = 全系统概念（Studio + CLI 都指向它）
    │
    ├─ Studio 侧：作者输入 → Authored Plan → Director enrich（Authoring Helper）
    └─ CLI 侧：Planner → Intent（未来也应指向同一契约）

Chapter Director（Studio Authoring Helper）：
  ✅ 负责： 这一章应该发生什么变化（装饰 / 保护四问）
  ❌ 无资格： 是否符合世界规则      → Gate（consistency，2.3）
  ❌ 无资格： 本章是否推动故事      → Gate（validation，2.3）
  ❌ 无资格： 最终正文写得如何      → Soft Review（2.3）
  ❌ 无资格： 是否恢复 / 何时停     → Runtime Recovery（2.2）
```

---

## 6. 拍板记录（2026-08-19，三项全定 + 一条新原则）

### D4：`mustLose` → `irreversibleChange`，提升一等公民 —— ✅

- **提升**：进入 Narrative Task 显式行（目标形态见 §7）。
- **命名**：`irreversibleChange`（非 mustLose、非 unavoidableCost；覆盖广：关系/身份/秘密/信任/资源/选择）。
- 意义：模型缺「为什么这一章之后不能恢复原状」，容易写「事件发生→问题解决→恢复平静」；有了它才写「事件发生→选择→付出代价→新的世界状态」——**直接影响连载感**。

### D5：输入方式 —— ✅ 保持「压扁即渲染」，不新增中间 Intent 层

```
不要：authored plan → chapter intent object → writer context（多加一层）
要：  authored plan → serialize → 完整 Intent Context（保护作者输入）
```

- 作者输入本身就是最有价值的信息：**保护它，不是重新解释它**。
- 配套：修 serializer 让它**完整携带**核心四问（尤其 cost → irreversibleChange），而非丢弃/只靠 director 启发式补。

### D6：Studio-only 定位修正 —— ✅ 确认

- **不是**「Chapter Director = Studio only」，**而是**：
  - **Chapter Intent Contract = 全系统概念**（未来 CLI 也应指向它，只是来源不同：Studio=作者→plan→director enrich；CLI=planner→intent）。
  - **Chapter Director = Studio 侧 Authoring Helper**，不是 Runtime authority。
- 现状证据：`runDirectorPhase` 只在 Studio scene-lifecycle-bridge 挂点被调（:214/:418/:421）；Runtime 对 `_chapterDirector` 只回填不生成（orchestrator.js:436）。

### 新原则（用户拍板，指导后续 2.5/2.6/3）

> **Phase 2 不是创建新的故事抽象，而是恢复已经存在但被系统压扁的故事语义。**

这条原则直接指导后面的 Beat、State、Prompt 减法——Phase 2 已从「模块设计」进入「**故事语义保护**」阶段。

---

## 7. Narrative Task 目标形态（D4 落地目标）

```
Narrative Task
Chapter N · Scene i · POV X

本章目标:      {goal}
核心冲突:      {conflict}
关键转折:      {climax}
不可逆变化:    {irreversibleChange}   ← 新增显式行（来自 plan.cost）
```

> ⚠️ 实现阶段注意：新增渲染行会改 golden baseline 的 promptFingerprint，需同步；`irreversibleChange` 若作为独立字段，必须渲染进此文本才会被模型看到（memory：inkos-authored-plan-serializer 教训）。

---

## 8. 明确不做（2.4 边界）

- **不新增 Chapter Intent 模块/Schema/字段**——四问压扁在现有字段即达标；D4 只加一个渲染行。
- **不改 director 的 prompt 块工厂**——`buildChapterDirectorBrief` 照旧，职责契约定为「保护/装饰四问」。
- **不进 Runtime authority**——CLI/兜底保持现状；未来 CLI 指向同一契约是概念层，不是本步代码。
- **Character Intent（人物为什么行动）不在此步**——属 2.5 Beat 的输入契约，不是本章范围。
- **不写 Gate 实现**——validation/critic/metrics 归位已在 2.3 契约定，代码实现属后续。

---

## 9. 审核对照

1. **恢复语义不是新增结构** —— §2 修正旧理解；§3 最小契约四问全是现有字段的规范命名，唯一新物 = 一个渲染行（§7）。
2. **Chapter Intent = 全系统概念，Director = Studio Helper** —— §5/§6 D6 定位修正，不等同于「升权模块」。
3. **不超出现有代码事实** —— 每个映射附 planner.js / prompt-compiler.js / director.js 位置（§1）；「未来态」= D4 渲染行 + 未来 CLI 指向契约（均标注）。

---

## 10. 变更记录

- 2026-08-19 起草 v1（现状四问压扁证据 + 四问契约 + 映射表 + 责任边界 + D4/D5/D6 决策点）。
- 2026-08-19 v2 通过：方向修正（恢复语义非新增结构）；D4 提升 irreversibleChange（进 Narrative Task，非 mustLose）；D5 保持压扁即渲染 + 修 serializer 保护作者输入；D6 定位修正（Contract 全系统 / Director Studio Helper）；新增「故事语义保护」原则。
