# Protocol v0.1 协议化 Pilot — A/B 报告

> 日期：2026-08-13 · 书：《二手书店老板的最后一周》ch2（scene 1/2）
> 目的：验证 IRP v0.1 验收 4 项（见 `inkos-intent-rendering-protocol-v0.1.md` §7）
> 工具：`books/我的小说/books/二手书店老板的最后一周/_tools/pilot-protocol-ab.mjs`
> 隔离：整书拷入临时目录再跑，不污染真实书运行状态

## 方法

| 变体 | plan 来源 |
|---|---|
| 纯文本(plain) | committed `chapter_0002.yaml`（场景带「场景N（标签）：」标签） |
| 协议化(prefixed) | P1 生成器 IRP v0.1 渲染（`【节拍功能: setup】`/`【认知缺口: 推进 gap_002】`/`【钩子类型】`/`【角色代价】`/`【新伏笔】` 前缀进 serializer 白名单） |

两变体共用同一 scene 叙事文本（唯一差异 = 前缀 + 标签换前缀）。
走**真实生产 writer**：`serializeAuthoredPlanToIntent → applyStoryMapToIntent → buildScenePlan → loadBrainContext → buildDynamicPrompt → buildSceneWritePrompt → createStudioLlmWriter（6 beat）→ DeepSeek`。
采样：scene 1 × 多轮（率实验 + 重试采样），scene 2 × 1。

## 验收结果

### 1. 泄漏检查 ✅ PASS
正文（最终文本 + 每 beat 文本）grep `【】/gap_\d+/节拍功能/认知缺口/钩子类型/角色代价/伏笔回收/新伏笔/IRP/v0.1`
→ **36 beats × 2 变体 = 0 泄漏**。模型把前缀消费得干净，括号指令不进正文。

### 2. 前缀到模型 ✅ PASS
每 beat 的 userPrompt 都含前缀：
- beat 1 `Before` 块、`时空锚定` 块：`承接上章推进：【节拍功能: setup】【认知缺口: 推进 gap_002】…`
- beat 2-6：`sceneGoal`（180 字 slim）继续携带 `【节拍功能: setup】【认知缺口: 推进 gap_002】`
- `intent.mainGoal` 全量进 beat 1 `chapterGoal`：`【主线推进】 【缺口管理】承接 gap_002…`

即协议要求的前缀-优先排序（截断生存）成立，channel map 预判兑现。

### 3. 防复读硬失败闸 ❌ 触发率高（非协议之过，但前缀疑似加重）
scene 1 硬失败率：

| 变体 | scene-1 硬失败 / 总尝试 |
|---|---|
| 纯文本(plain) | 2/5（其中 1 次是完整成功） |
| 协议化(prefixed) | 7/8 |

**根因**：模型（DeepSeek）在该「入场场景」上逐 beat 重开场景——每个 beat 都新写一个「小满把书…」开场，而不是续写。所有 beat 2-6 的 prompt 都明写「只写本 Beat。紧接上文末句的下一动作，不要重新开场，不要重演已发生事件」，模型无视。
- 逐字复读 ≥7 字 → 闸拦下（SCENE_HARD_FAIL）
- **意译重开**（每 beat 换措辞的「小满把书」）→ 闸漏过，被拼进正文 → 「成功」文本实际是 4-6 个平行开场堆叠的弗兰肯文本
- 软检测 `isReopenDraft`（continuity issues 的 ACTION_REPLAY/EVENT_LOOP/场景跳跃）**36 beats 全 0 命中**——这个失败模式绕过了软闸，只剩逐字闸兜底

**前缀与重开的关系（方向性，非定论，n 小）**：
| 变体 | 每 beat 以「入场式」开场的平均比例 |
|---|---|
| 纯文本(plain) | 4/6、4/6、2/6 |
| 协议化(prefixed) | 6/6、5/6、5/6 |

prefixed 的重开**更同质**（全是「小满把书摞在柜台上」家族），plain 有更离散的开场（林守常推开店门 / 纸片对折 / 小满推门进来）。方向性提示：`【节拍功能: setup】` 随 sceneGoal 每 beat 重复注入，等于每个 beat 都重申一次「setup 入场」锚，把模型按回场景入口。

### 4. 正文差异 A/B ⚠️ 无法评估
两变体「成功」样本均为重开堆叠文本，无可用的连续正文可对比。**验收第 1 项被既有模型/闸问题阻塞，与协议无关。**

## 独立于协议的关键发现（生产级）

1. **模型重开倾向**：DeepSeek 在带「入场/到达」节拍的场景上无视「不要重新开场」指令。ch2 scene1（小满入场）触发率极高；这是**已有问题**，plain 同样中招。
2. **防复读闸盲区**：软检测（continuity issues）对「意译重开」0 命中；只有逐字 ≥7 字闸有效 → 意译重开漏进正文拼成弗兰肯文本。硬闸本身虽拦了逐字复读，但误判「通过」的文本质量同样崩坏。

## 协议层建议（v0.1 卫生规则补丁）

- 前缀渲染本身安全（无泄漏、能到模型、截断生存成立）。**保留。**
- `【节拍功能: X】` 是 beat-1 指令，不应随 sceneGoal 每 beat 重复注入。建议：
  - **改渲染**：`【节拍功能】` 前缀只放 scene 1（或只在 goal 出现一次），后续 scene 的 `sceneGoal` 只保留 `【认知缺口】` 等过程指令；或
  - **改注入**：beat-slimmer 对 beat>1 的 sceneGoal 剥掉 `【节拍功能】`。
  - 该改法属「改 Prompt / 配置」层，不碰 Runtime/Brain 核心，符合既定约束。
- 防复读闸的意译重开盲区另立问题单（与协议无关，但阻塞所有 prose 级验收）。

## 结论

- 协议通道验证 **通过**：前缀干净地渲染进 serializer 白名单字段 → 到达每 beat 模型视野 → 正文零泄漏。
- 验收 3/4 项中：泄漏 ✅、前缀到模型 ✅；硬失败闸 ❌（触发源为既有模型重开行为，非协议；前缀疑似使重开更同质化，需按上文补丁验证）；正文差异 ⚠️ 阻塞（同因）。
- 下一步最小实验：按「节拍功能只注入一次」重新渲染 ch2 plan，复跑 scene 1 A/B，看硬失败率与正文可读性是否改善——一步即可区分「前缀重锚定」假设与纯模型噪声。
