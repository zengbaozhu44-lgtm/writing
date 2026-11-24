# RF-01-DESIGN-GATE

**Date**: 2026-09-08  
**Mode**: DESIGN GATE · **READ-ONLY** · **NO CODE**  
**Failure**: `RF-01-BEAT-META-LEAK`  
**Upstream**: F-SERIES CLOSED · RF-02/RF-03 不进本轮 · F8.3 known limits NOT AUTHORIZED  

**Question**:

> RF-01 的正确责任边界，以及最小可行防线是什么？

---

## I. Failure Confirmation

**仍成立。**

生产证据（不变）：

```text
books/.../凌晨四点世界刷新/novel/_system/brain/ch_0003_scenes.json
scenes[2].text 开篇：

# Beat 1/6：Goal（主角目标）
凌晨3:59。病房的灯管开始闪烁。
…
**"4:00。刷新。只有你…
```

满足 Discovery 全部条件；非 F1–F8.3 已解问题；非品味偏好。

---

## II. Root Cause（真实 call chain）

### II.1 Scaffold 在哪里产生

| Source | Exact / near form | Role |
|--------|-------------------|------|
| `scene-execution.js` `STRUCTURAL_LABELS` | `Goal（主角目标）` 等 | Beat **label** 权威文案 |
| L3 `formatBeatPlan` / Narrative Task | `### Beat 1 · Goal（主角目标）` | Prompt scaffold |
| L4 `beat-slimmer.js` | ``## 当前 Beat ${order}/${total}：${label}`` | Prompt scaffold（Beat 指令头） |
| `BEAT_HARD_RULES` | 「只输出本 Beat 正文；不要标题、markdown、解释、JSON。」 | **已有软禁令** |

**注意**：成稿中的 `# Beat 1/6：Goal（主角目标）` **不是** assembler 把 label 拼进 `scene.text` 的字面拷贝；它是对 L3/L4 标题形态的 **模型回声 / 近形复写**（`## 当前 Beat 1/6：…` / `### Beat 1 · …` → `# Beat 1/6：…`）。

### II.2 进入 Writer context 的方式

```text
Director buildSceneExecutionPlan
  → beats[].label = STRUCTURAL_LABELS[structural]
  → compileStudioWriterPrompt (L3) 注入 Beat Plan 列表
  → executeBeatSequence
       → compileSlimBeatUserPrompt (L4)
            含：## 当前 Beat N/M：Goal（主角目标）
            + BEAT_HARD_RULES「不要标题、markdown」
       → LLM
       → result.text
       → parts join → accumulatedText
  → studio-llm-writer: scene.text = draftText
  → （hardFail 仅复读/身体等；scaffold 不在内）
  → persistScenes
```

### II.3 Writer 是否被要求区分 scaffold 与 prose

**是（软）**：`BEAT_HARD_RULES[1]` 已要求只输出正文、不要标题/markdown。  
**Ch3 S3 证明：软要求不足以防止 RF-01。**

### II.4 Normalization / sanitation / validation（现状）

| 环节 | 有无 scaffold 防线 |
|------|-------------------|
| Beat LLM 返回后 | Writer Runtime V2 / 复读 / 身体禁令硬闸 — **无 scaffold 检测** |
| `accumulatedText` join | 纯拼接 — **无** |
| `scene.text = draftText` | 先落盘 — **无 scaffold 闸**（hardFail 只拦复读类） |
| Review (`non-blocking-scene-pipeline`) | **analysisOnly**；有正文即 `pass: true` |
| Persist | 写盘 `ch_*_scenes.json` — **无** prose scrub |

### II.5 Review 为何没阻止

Studio Review **故意** analysisOnly：不因质量问题拒收正文。RF-01 不在其职责硬闸内。

### II.6 其它 path

| Path | RF-01 风险 |
|------|-----------|
| Studio **Beat**（主路径） | **已证实**（Ch3 S3） |
| Studio **Scene** 模式 | 无六拍头，风险不同；仍可能回声 L3 Beat Plan |
| CLI `llm-writer` | 无 L4 Beat 头；若吃 L3 Beat Plan 仍可能回声（未在本样本证实） |

### II.7 可复用边界机制

| Mechanism | Reuse? |
|-----------|--------|
| `BEAT_HARD_RULES` 软禁令 | 已有；**不足** |
| `SCENE_HARD_FAIL` / beat `hardFail` | **可复用为硬拒收通道**（拒 draft，不写 Canon） |
| `scrubDirectorSpeak` / `scrubOmniscientFromRaw` | 针对导演语/全知，**非** Beat 标题语法 |
| F4 whitelist | 实体卡，无关 |
| PROTECT_RE | 保护 prompt 块不被裁，**会保住** Beat 头进模型视野 |

### II.8 根因一句话

```text
Internal Beat headers are injected into Writer prompts (necessary).
Soft “don’t output titles/markdown” already exists.
Model still echoed scaffold into result.text.
No hard prose-boundary check before scene.text persistence.
Review cannot reject.
→ RF-01
```

---

## III. Responsibility Decision（A–F）

| Layer | 属职责？ | 能可靠阻止？ | 误伤风险 | 重复？ | 扩大 Authority？ | 撞 F-Series 冻结？ | 裁决 |
|-------|----------|--------------|----------|--------|------------------|-------------------|------|
| **A. Prompt Compiler** | 部分（产生头） | 删头会破坏 Beat 执行；仅加强措辞 **已失败** | 低 | 与 HARD_RULES 重复加强 | 否 | 否 | **不足 alone** |
| **B. Writer Prompt** | 部分 | 软约束 **已失败于真稿** | 低 | 已有规则 | 否 | 否 | **必要但不够** |
| **C. Writer Output Normalization** | **是**（输出→正文边界） | **是**（签名检测 + strip/reject） | 可控（高精度签名） | 补洞非重复 | 否（拒/洗 draft≠Canon） | 否 | **主责 ★** |
| **D. Scene Persistence** | 次责（最后关口） | 是，但宜在 C 更早（按拍） | 同 C | 与 C 同质 | 否 | 否 | **可与 C 同闸或兜底** |
| **E. Review / Validator** | 现 analysisOnly | 若改硬拒收需改产品语义 | 中 | 与 hardFail 重叠 | 风险：Review→Authority 感 | 需小心 | **不推荐主责**；可复用 hardFail 通道而非升 Review |
| **F. 新过滤器 Engine** | 否 | 过度 | — | 新系统 | 是倾向 | 违 Minimality | **拒绝** |

**Decision**：

> **主责 = C Writer Output Normalization（Beat 返回后、写入 `accumulatedText` / `scene.text` 前）**  
> **辅 = 保留 B 软规则**  
> **通道复用现有 hardFail（可选强化）**  
> **拒绝 F 新 Engine；不把 E Review 升格为 Reality/Canon 权威**

---

## IV. Minimal Design（只设计，不实现）

### IV.1 名称（候选契约，**未冻结**）

可称为：

```text
Prose Boundary Gate（成稿文本边界闸）
```

本 Design Gate **提议**其存在，**不**因 RF-01「好修」而自动升格为全局架构宪法；是否写入长期 invariant 由人工在 Implementation 批准后另裁。

### IV.2 如何区分 scaffold vs 故事内容

**不得**：「删所有 `#`」或「删所有 Goal/Beat 字样」。

**允许的判定依据（高精度，可组合）**：

1. **Known internal header grammar**（对白库）：  
   - `^#{1,3}\s*Beat\s*\d+\s*/\s*\d+\s*[:：]`  
   - `^#{1,3}\s*当前 Beat\s*\d+\s*/\s*\d+\s*[:：]`  
   - `^#{1,3}\s*Beat\s*\d+\s*[·•]\s*(Goal|Obstacle|Choice|Consequence|New Information|Hook)`  
   - 行内紧跟 `STRUCTURAL_LABELS` 中文标签：`Goal（主角目标）` 等  
2. **Prompt echo**：本拍 `userPrompt` 中已注入的 Beat 标题行，与输出首行 **精确或归一化后相等/前缀匹配**。  
3. **位置**：优先检查 **段首 / 拍首 1–3 行**（Ch3 S3 形态）；不对全文任意「目标」开火。

**明确不是 scaffold**：

- 对白：「你的目标是什么？」  
- 世界观系统 UI 文案（无 Beat N/M + 结构标签头）  
- 作者要求的 Markdown（无内部 Beat 序号头）  
- 合法章节标题（无 `Beat N/M` + STRUCTURAL_LABEL）

### IV.3 最小行为（两级，实现时择一或组合）

| Mode | Behavior | Pros | Cons |
|------|----------|------|------|
| **C1 Strip** | 去掉匹配的首部 scaffold 行后接受 | 文学可续；低成本 | 残留污染需二次规则 |
| **C2 Reject** | 命中 → `hardFail`（复用 SCENE_HARD_FAIL 通道）拒收该拍/场 | 与现有硬失败一致；不落脏稿 | 触发重规划成本 |

**推荐最小默认**：

```text
拍级：检测 → Strip 已知首部 scaffold 行
若 strip 后仍以 scaffold 语法开头或整段像元数据 → hardFail
永不写 Canon / SR / Reality；只决定 draft 是否进入 scene.text
```

### IV.4 插入点

```text
LLM beat text
  → [Prose Boundary Gate]     ★ NEW minimal
  → reopen / 复读 / 身体 hardFail（现有）
  → accumulate
  → scene.text
  → Review analysisOnly（不变）
  → persist
```

### IV.5 明确不做

- 不新建 Beat/Prose/Narrative Engine  
- 不改 F6/F8、不修 RF-02/RF-03  
- 不让 sanitizer 写 11/13/SR  
- 不自动 Regenerate 全章  
- 不把 Review 改成 Reality Authority  

---

## V. False Positive Matrix

| Case | Input | Gate must |
|------|-------|-----------|
| 1 Beat header accidental | `# Beat 1/6：Goal（主角目标）\n凌晨…` | **Strip/Reject** |
| 2 Character says goal | `「你的目标是什么？」她问。` | **Keep** |
| 3 In-world system message | `效率助手：请于四点前登记。` | **Keep** |
| 4 Author Markdown | `他看见镜面上写着：**刷新**` | **Keep**（无 Beat N/M 头） |
| 5 Chapter title | `# 第三章 四点整` | **Keep**（无 Beat 结构标签） |
| 6 Legitimate prose heading | `## 急诊大厅` 作为场景描写标题（若产品允许） | **Keep** unless matches Beat N/M+label grammar |
| 7 Beat metadata outside text | `executionPlan` / L4 prompt / `beatArtifacts.prompt` | **Out of scope**（不进 `scene.text` 即可） |

---

## VI. Regression Requirements（未来实现必须）

1. **Unit**：注入 Ch3 S3 污染首行 → strip 后无 Beat 头；正文「凌晨3:59」保留。  
2. **FP suite**：上表 Case 2–6 全文不变。  
3. **Echo**：LLM stub 返回「拷贝 L4 标题 + 正文」→ 不得进入 `scene.text` 未清洗态。  
4. **Authority**：门控后 `writesCanon/SR/Reality` 仍为 false；不改 11/13。  
5. **F-Series regression**：f8.3 / f6.2 / f7.1 / f5…f1 / phase1 / eo-d1 保持 PASS。  
6. **hardFail 路径**：Reject 模式不得绕过「坏稿不落盘」既有契约。

---

## VII. Literary Validation（真实小说）

实现批准后必须证明：

| Check | Pass criteria |
|-------|----------------|
| Ch3 S3（或等价重跑样本） | `scene.text` **不以** Beat scaffold 语法开头 |
| 全文检索 | 无 `# Beat N/M：` / `## 当前 Beat N/M：` / `### Beat N · Goal（主角目标）` 作为独立元行 |
| 对照 | 合法系统文案 / 对白「目标」仍可出现 |
| 不只 unit | 至少一次真实 Writer 路径产物或生产书回写抽检 |

```text
Literary success ≠ “regex unit green”
Literary success = Ch3-class prose no longer exposes Beat metadata to readers
```

---

## VIII. Scope Decision

```text
AUTHORIZED FOR MINIMAL IMPLEMENTATION
```

**条件（人工批准后才可写代码）**：

1. 范围锁死：**Prose Boundary Gate @ Writer output**（C），高精度 scaffold 签名。  
2. 默认 Strip + 残留 Reject；复用 hardFail 通道可选。  
3. 禁止新 Engine；禁止借机修 RF-02/RF-03/F8.3 limitations。  
4. 必须带 FP matrix + F-Series regression + **真实文学抽检**。  
5. 「Prose Boundary 是否升格为永久架构契约」**另议**，本门只授权 RF-01 最小实现。

---

## IX. STOP

```text
DESIGN GATE COMPLETE
NO CODE THIS ROUND
WAIT FOR HUMAN IMPLEMENTATION APPROVAL
```

**不自动实施。**  
**不进入 F8.4 / F9 / RF-02。**
