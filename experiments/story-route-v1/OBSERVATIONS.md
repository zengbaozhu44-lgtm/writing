# Story Route V1 — 实验观察（非 Contract 冻结）

## 2026-08-29 · Projection 修复后

### G 类问题已定性

C06 证明：**「LLM 偷偷当编剧」在输入边界修正前，主因是 Projection 泄漏未来章 timeline，而非模型本性。**

修复后行为模式从「复述未来剧情」变为「基于当前已知处境打开方向」。

---

## 待观察边界：AUTHOR_INITIAL_TRAJECTORY vs POV

**暂不扩 Contract**（无 `trajectory_subject` 字段）。仅记录实验中发现。

### 两个概念不应合并

| 概念 | 含义 |
|------|------|
| **POV** | 我们从哪里**观察**（Route Reality(N) 的视点） |
| **Initial Trajectory** | 作者希望哪条人生方向成为故事的**可能空间** |

### 案例

| 案例 | Route Reality POV | 作者走向 | 现象 |
|------|-------------------|----------|------|
| C06 | 张北（ch1 timeline） | 林晓保住岗位 | 选中路线写「供水系统岗位」— 走向 subject 与 POV 错配（D 类观察，非 G） |
| C04 | 林小雅（ch1 `characters_present` metadata） | 林异找妹妹 | R2：选中路线主体仍为**林异**（未偷换为 POV）；但内容偏 ch1 事件复述（C 类），非 POV 数据层叙事 |

### 倾向（未冻结）

当 POV ≠ trajectory 隐含主体时，LLM **不应**简单偷换为 POV 人物的人生；更合理的是 **C**：

> 以 POV 所在现实为入口，向作者指定的 focal life-direction 打开可能空间。

若第二轮大量出现「作者指定 A，POV=B，Route 却把 A 偷换成 B」，再正式定义 Trajectory Subject 与 POV 的关系。

---

## 2026-08-30 · `P0-EXPERIMENT-BASELINE-FROZEN`

基线冻结。新样本：七行表（`SAMPLES-MINIMAL.md`）· 只答两问（显影结构跨案重复？B2 稳定聚类？）· C04/C07 锚点。

**不引入**：新字段 · 评分 · prompt tuning · Hard Filter 扩 · trajectory_subject · P1 · 改 A 判定标准。

> **宁可让 Route 暴露能力不足，也不要替 Route 证明它有能力。**

**最重要成果**（甚至不只是 Route）：把易被 LLM 项目混淆的问题拆开了 —

> 系统没有生成未来的资格，只有从真实过去中打开可能性的资格。

**实验环**：Reality 固定 → Route 固定 → 样本增加 → 人工判读 → 等模式出现。不加设计层。

**判 A 纪律**：开放方向不因深刻/哲学/文学好听而给 A；须能指认从 Reality 哪几个具体条件长出，否则降 B。

**B/C 不急着修**；看 B1/B2 聚类、C04 稳定负锚、A-strict 结构跨案复现。

**第三轮看点**：显影结构跨案重复 · B2 偶发→稳定（非 A 个数）。

---

## P0 实验基线冻结（2026-08-30）

`P0-EXPERIMENT-BASELINE-FROZEN` — 完整清单见 `P0-STATUS.md`。

> **宁可让 Route 暴露能力不足，也不要替 Route 证明它有能力。**

**官方基线**：A-strict 4/10 · A-weak 2/10 · B 3/10 · C 1/10（**4/10 非 KPI**）

**可说**：具备产生「发现人生」候选的能力；**不可说**：能稳定发现人生。

**永久锚点**（`ANCHORS.md`）：

- **C04** 负锚：Projection/Contract PASS 仍 C — 改动须「开放可能 ↑、编剧化 ↓」
- **C07** 正边界：母亲陷阱 — Trajectory 作观察方向，非事件生成器（A-weak，防过拟合）

**B/C 矩阵**（不可混谈）：B1=C09 · B2=C10 · B4=C06 · C=C04

**纪律**：不要优化 Route，让 Route 暴露自己。

**核心研究问题**：发现 vs 显影 — 靠样本区分。Route 不创造缺失信息；Reality 薄→平庸 ≠ 失败。

**C04**：不编剧 ≠ 会发现 — 稳定 negative control。

---

## 实验纪律（冻结提醒）

- 不为「见众生」增加人物
- 不为「七宗罪完整」制造欲望
- 不为「见天地」安排哲学事件
- 不为文学性增加不可逆悲剧

> 作者给方向，世界给约束，人物给可能性，Reality 给事实，Choice 给主体性，LLM 负责寻找值得继续经历的人生。
