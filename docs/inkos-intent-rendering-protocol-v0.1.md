# InkOS 意图渲染协议 v0.1（Intent Rendering Protocol）

> 状态：草案 v0.1 · 2026-08-13
> 定位：把「缺口感知 / 节拍功能 / 支线调度 / 角色状态」编码进 Runtime 已认识的字面字段，
> 让 DeepSeek 写正文时脑子里有缺口、有节拍、有角色——**零 LOCKED 改动**。

---

## 1. 架构位置：四层中的「意图渲染层」

```
Studio UI → Studio Server → 【意图渲染层 Intent Renderer】 → Runtime/Orchestrator → DeepSeek
                                  ↑
                   认知缺口引擎 + 支线调度器 + 状态快照 + 套路变体
```

- **Runtime 2.0 LOCKED 不动**：`packages/inkos-runtime`、Orchestrator、白名单 serializer、compiler、scene prompt 一律不改。
- **渲染层是纯文本处理器**：输入结构化配置（gaps/threads/state/story-map），输出 `chapter_NNNN.yaml`——格式和现在一样，只是 goal / scenes[i] / hook / cost / foreshadow 的**语义密度**变高。
- **参考实现**：`books/我的小说/books/二手书店老板的最后一周/_tools/generate-chapter-plan.mjs`（P1 生成器）已是渲染层第一版骨架，协议把它从「叙事化渲染」升级为「协议化渲染」。

## 2. 协议基础：为什么前缀能进模型

`serializeAuthoredPlanToIntent` 的白名单字段**全部送进 Writer 的 scene prompt**（实证，见 memory/inkos-authored-plan-serializer）：

| plan 字段 | 进 Writer 的通道 | serializer 自带前缀 |
|---|---|---|
| `goal` | intent.mainGoal（全量） | — |
| `scenes[i]` | scene.goal | `承接上章推进：` |
| `conflict` | scene.conflict + obstacles[0] | `推进冲突：` |
| `cost` | intent.mustLose | — |
| `hook`/`ending` | intent.ending + hook 场景 | `章末钩子·余波：` |
| `foreshadow` | intent.newForeshadow | — |

模型已经熟悉「冒号指令」模式（`承接上章推进：`、`推进冲突：`、`转折：`、`必须失去：`——ch1 已验证能正确消费不泄漏）。协议把结构化意图编码成**同类前缀，套进同一插槽**，即可零代码进模型。

**唯一的 prompt 侧声明**（可选）：在 `novel/_system/style_dna.yaml`（被注入的 Style DNA）加一条「方括号标记是写作指令，消费后不写入正文」。待验证该文件确实被 compiler 注入后生效；在此之前，协议默认模型按既有冒号指令模式处理。

## 3. 词汇表（v0.1 前缀标准）

| 字段 | 前缀 | 编码内容 | 示例 |
|---|---|---|---|
| `goal` | `【主线推进】` / `【缺口管理】` / `【支线交汇】` | 本章主导功能 | `【缺口管理】推进 gap_002（等你纸片），不闭合` |
| `scenes[i]` | `【节拍功能: setup\|advance\|escalate\|reveal\|resolve\|hook】` | narrative_function | `【节拍功能: advance】小满进门…` |
| `scenes[i]` | `【认知缺口: 推进 gap_001\|闭合 gap_007\|打开 gap_015】` | cognitive_gap_impact | `【认知缺口: 推进 gap_001】门槛内侧，那片叶子的位置空着` |
| `scenes[i]` | `【对话功能: 信息+关系+节奏+展示】` | dialogue_functions | `【对话功能: 信息（点破谎）+关系（护体面）】…` |
| `hook` | `【钩子类型: 认知缺口\|情绪悬念\|反转】` | 钩子功能 | `【钩子类型: 认知缺口】卡缘卷着，像被压在某本书里很多年` |
| `cost` | `【角色代价: 信任破裂\|身份暴露\|失去之物\|咽回的话】` | 代价绑定角色弧光 | `【角色代价: 咽回的话】他按原价收书，接住一个不愿点破的谎` |
| `foreshadow` | `【伏笔回收: H007】` / `【新伏笔: 名称→预计 ch_NNN】` | 伏笔状态 | `【新伏笔: 借阅卡→预计 ch_007】借阅卡「小满 2015.6」被夹进收书单` |

## 4. 卫生规则（写协议时强制执行）

1. **前缀置字段开头**，紧跟 serializer 自带前缀之后（`承接上章推进：【节拍功能: advance】…`）。
2. **括号标记 = 指令词，不是正文**。模型消费后不得写入正文（写后校验 grep 括号标记）。
3. **gap 引用用真实 `gap_0XX` ID**，渲染器从 `cognitive-gaps.yaml` 取，禁止自造编号。
4. **闭合 gap 仅限 `expected_reveal_ch` 指向本章**；否则只允许「推进」，不允许「闭合」。
5. **每字段前缀 ≤ 2 个**，防标记噪音淹没叙事（前缀是方向盘，正文才是路）。
6. **前缀后必须有叙事文本**，不允许只有标记没有正文的字段。
7. **POV 合法性**：渲染前校验 `pov` 的入场章 ≤ 当前章（entrance_chapter），不满足则拒绝渲染并报警。

## 5. 渲染器契约

**输入**（全部只读）：
- `story-map/cognitive-gaps.yaml`（缺口三态：open/touched/resolved/cut）
- `story-map/plot-threads.yaml`（chapters 结构 + 扩展的 trigger_next / beats.cognitive_gaps）
- `07_state_board.md`（局势 + 缺口板）+ `03_character_bible/*.md` 顶部「当前状态快照」块
- `story-map/pov-grid.yaml` / `milestones.yaml` / `chapter-functions.yaml`（派生节拍功能）
- `10_volume_outline/vol_01.md`（章事件种子）+ 上一章 `chapter_NNNN.yaml`（承接）
- `_system/volume_tones.yaml`（卷级基调：`cost_prefix` 默认值 / `emotion_baseline`，换卷只改配置不改代码）

**输出**：符合本协议的 `chapter_NNNN.yaml` + `_plan_note`（结构化状态，serializer 不读，供下一章取「承接」）。

**渲染时校验**（渲染层内，Orchestrator 永远只收到合法 plan）：
- POV entrance_chapter 检查
- gap 闭合资格检查（第 4 条）
- serializer 白名单字段覆盖检查（goal/conflict/climax/cost/hook/ending/scenes/pov/wordTarget 非空）

## 6. 与现有系统的映射（修正版）

| 方案条目 | 修正后的落法 |
|---|---|
| 伏笔库激活（12_foreshadow_db.yaml） | **渲染器直接读**它，把 `foreshadowing_ref` 渲染进 plan 的 foreshadow 字段；渲染器产出【新伏笔】时**同步追加**一条 hook 进 12 库（从「只写不读」变「写入即跟踪」）。**不 merge 进 06**（会污染信息差 TopK） |
| 角色状态快照 | 维护在**角色卡顶部**「当前状态快照」块（已注入、truncateByTokens 保头、零 compiler 改动）。**不做 07 character_state 区块** |
| 06_knowledge_matrix.yaml 扩展 | 加 `reader_knows / urgency / expected_reveal` 字段（书级 bookkeeping，compiler 只读行内角色 level，忽略额外字段） |
| plot-threads.yaml 扩展 | 加 `trigger_next`（类型/条件）+ `beats[].cognitive_gaps`（closes/opens）——story-map 只消费 chapters 结构，额外字段安全 |
| POV 合法性校验 | 角色卡/角色名册加 `entrance_chapter`，渲染器渲染前校验（对应第 4.7 条） |
| 情境化评分器（Phase 3） | `POST /api/scenes/:id/review-contextual` 新增端点，不碰 LOCKED，评分写 `adaptive_state.json` 供后续调权 |

## 7. 验收标准与已知边界（pilot 实证 · 2026-08-14 更新）

完整实验数据见 `docs/pilot-protocol-ab-report.md`。以下为结论性摘要。

### 7.1 已验证（Task #14/15 生产化渲染器 + ch2 pilot，36+ beats）

1. **前缀零泄漏** ✅：正文 grep 不到任何 `【】`/`gap_0XX`/指令词。前缀只出现在 prompt，模型消费干净。
2. **指令可感知** ✅：前缀到达**每 beat** 的 prompt（`Before`/`时空锚定`/`最高优先` 槽位均含）。
   > 注意计量口径：实测**注入密度 = 4-5 次/beat**（每 beat prompt 内重复），不是模型「响应次数」。这是渲染器「sceneGoal 每 beat 携带」的既定行为，协议不把注入密度当「模型显式响应」的证据。
3. **目标导航正确** ✅：章目标（mainGoal）只进 beat1 的「章目标（导航）」槽（`beat.order ≤ 1`），后续 beat 只带节拍级前缀 —— 章目标不扩散、不污染后续 beat。
4. **serializer 白名单全通** ✅：goal / scenes[i] / cost / hook / foreshadow 前缀均被 `serializeAuthoredPlanToIntent` 完整接受（mainGoal 全量；sceneGoal 150 字截断生存，前缀-优先排序成立）。
5. **三字段联动覆盖** ✅（`--plant`）：`cost` / `foreshadow` / `mustGain` 随作者覆盖的埋物证联动（ch3 实测：`--plant "铜钥匙"` → cost 收 `收进抽屉的铜钥匙`、foreshadow 收 `铜钥匙在本章留下`、mustGain 收 `新埋物证：铜钥匙`）。
6. **POV 校验生效 + 硬编码 bug 修复** ✅：渲染前校验 `entrance_chapter ≤ 当前章`，非法 POV 拒绝渲染；compose 函数改为章节感知（extractPlant 启发式），ch3 不再泄漏 ch2 材料（借阅卡橘子）。
7. **前缀与叙事对齐 + 按卷配置** ✅：`costTypePrefix` 默认值改为「咽回的话」（与 goal/cost 的「被咽回去的句子」常量一致）；卷级默认移入 `novel/_system/volume_tones.yaml`（卷1 压抑/咽回的话、卷2 爆发/撕破的脸、卷3 虚无/无声的叹息），换卷只改配置不改代码（multi-volume 负向测试通过）。

### 7.2 未验证 / 已知边界（留待后续）

- 长篇章节（>5 beats）的前缀累积效应。
- 极端情绪指令对生成稳定性的影响。
- 多 POV 切换时的前缀上下文传递。
- **Studio UI「预审-确认-执行」工作流**：MVP 已接入 IDE 诊断抽屉（2026-08-14，goal + scenes + plant 可编辑；「确认执行」由渲染器 spawn `--json --force` 写盘，绕过 persistChapterPlan 白名单——foreshadow/_plan_note/wordTarget/bargain/mustGain/obstacle2/location 全保留，已 curl 实证；无 `_tools/` 的书返回 404）。完整闭环（cost/hook/foreshadow 可编辑 + 抽屉内覆盖确认）留 P2，见 [studio-preview-drawer-schema.md](studio-preview-drawer-schema.md)。
- **「重开场景 × 【节拍功能】重复注入」已定案为密度规则**（见 §7.4），不再跑消歧实验：pilot 实测两变体都高频「逐 beat 重开场景」——这是 DeepSeek 行为，非协议回归；前缀仅使重开更同质（方向性，n 小）。原 `_tools/pilot-protocol-ab.mjs --disambig` 暂停不再续跑。

### 7.3 卫生规则（强制执行，与 §4 一致）

1. 前缀只出现在 prompt，绝不出现在正文（写后校验 grep 括号标记）。
2. 前缀格式统一为 `【中文指令: 值】`，禁止混用 XML / JSON / 注释。
3. 单字段前缀 ≤ 2（§4 第 5 条）；**每 beat 总前缀 ≤ 3**，防注入过载（重开边界与密度正相关，宁可少不可多）。
4. 章目标（mainGoal）只进 beat1（当前行为已满足）；后续 beat 只带节拍级前缀。
5. 前缀必须指代真实实体：gap id 必须存在于 `cognitive-gaps.yaml` / 06 矩阵，角色必须存在于 `character-roster.yaml`；渲染器对伪前缀拒绝渲染。

### 7.4 前缀密度规则（设计约束，非经验发现）

> 依据：pilot 已验证 36 beats 零泄漏、前缀到达每 beat。消歧实验不再续跑——密度是**设计约束**，不是待测假设。若未来长篇章节（>5 beats）出现前缀疲劳，再调整密度上限。

- **必注**：`【节拍功能】`（每 beat 都有）。
- **选注**：`【认知缺口】`、`【角色状态】`、`【伏笔回收】`（只在相关 beat 注入）。
- **禁注**：章级目标（mainGoal 只进 beat1，beat2+ 不带章级前缀）。
- 上限：每 beat 总前缀 ≤ 3（§7.3 第 3 条）。

## 8. 演进路线

- **v0.1（本版）**：静态前缀渲染，验证「模型能读懂前缀并产出差异」。
- **v0.2（近期）**：动态缺口调度 + 套路-变体矩阵，渲染器按读者反馈自调权。
- **v0.3（远期）**：Studio 预审-确认-执行工作流完整闭环（MVP：goal/scenes/plant 已接入 IDE），见 [studio-preview-drawer-schema.md](studio-preview-drawer-schema.md)。

---

**一句话**：Runtime 是地板不是天花板；白名单是接口不是限制。协议把「好看」的逻辑放进字段的语义密度里，让 DeepSeek 写正文时，脑子里有缺口、有节拍、有角色。
