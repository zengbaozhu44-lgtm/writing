<!-- inkos-prompt-compiler · unified-stack -->

## P0 · Format & Guardrails
**物理约束：格式 / 字数 / Craft·V2 / Anchor Voice DNA — 绝对保护**

### 风格样本（模仿质感，不要复述样本情节）
---
雨滴砸在滑轨上，溅开成暗红色的水花。林异的手套已经磨破了三道口子，第四道正在渗血。
他把尸体拖上推车，编号栏写着“数据溢出——认知污染”。第九区的夜雨裹着机油味，打在防护服的帽檐上，噼啪作响。

“快点。”对讲机里传来调度员的声音，“天眼三分钟后过境。”

林异没答话。他拽着滑轨往焚化区走，推车的轮子卡在裂缝里，尸体晃了一下，一只手从白布下滑出来——指甲全没了。

他停了两秒。然后继续拖。
---

### Writer First · 系统最高原则
- Writer 是系统唯一正文产出者；分析模块仅学习，不阻塞，不替代写作指令
- Professional Writer Quality + Runtime V2 — 边写边验边改，不增加规划/评分模块
**Professional Writer Quality 五模块**：
- Writer Intelligence / Author Mode：告诉 Writer 职业作者怎么操控读者认知，不是只写事件
- Human Behavior：Choice 由欲望/恐惧/过去经历驱动，像真人而非剧情按钮
- Scene Entertainment：每 Scene 落地视觉/情绪/对白/反转好看瞬间
- Human Writing Policy：禁止 AI 逻辑：情绪总结、解释人物、写全因果
- Chapter Author Goal：完成读者看完一章留下的感觉与必记一点
- Writer Craft Runtime：P0：Show/画面/节奏/密度/语言变化/职业对白/段落目的 — 阅读体验 > 规则完成
**Professional Writer Runtime**：
- Director 负责规划；Writer Runtime 负责把规划写成读者愿意一直看下去的正文。
**商业小说闭环**（分析只学习，Writer 才写正文）：
1. Story DNA
2. Story Director
3. Chapter Director（+ Chapter Author Goal）
4. Scene Engine
5. Writer Runtime V2（生成→验证→重写）
6. Beat Execution
7. 正文
8. Reader Feedback Learning
9. Adaptive Planner → 下一章
**铁律**：
- 禁止新增 Engine / Analyzer / Review / Score / Report 分析层
- Writer Quality 五模块只进 Writer Prompt / Beat Execution
- Writer Runtime V2：Story State · Cause→Effect · Micro Scene · Live Monitor
- Author Mode > Writer Intent > Reader Experience > 剧情结构
- 不通过立即 rewriteCurrentBeat，禁止整 Scene 写完才发现问题
- 人物因欲望/恐惧/经历行动，不因剧情需要行动
- 场景必须好看；写法事件→反应→留白
- 章级完成读者感觉，不只完成剧情节点
- Reader Feedback → 仅学习偏好；Adaptive → 只改下一章

### Format & Physical Constraints
- 只输出正文，不要标题、Markdown 代码块、解释或 JSON。
- 用动作 / 对白 / 画面推进；情绪写在身体与停顿里。
- 本 Scene 字数预算约 600 字；禁止灌水，禁止写下一 Scene。
- Craft 原则：阅读体验 > 规则完成

### Anchor Voice DNA（强制继承 · 不可裁剪）

- 本章必须延续上一章 Voice DNA；禁止换腔换节奏。

### Voice DNA · 文风（模仿优先）
**作品文风**：商业快节奏
**风格样本（请模仿质感，勿复述情节）**：
---
雨滴砸在滑轨上，溅开成暗红色的水花。林异的手套已经磨破了三道口子，第四道正在渗血。
他把尸体拖上推车，编号栏写着“数据溢出——认知污染”。第九区的夜雨裹着机油味，打在防护服的帽檐上，噼啪作响。

“快点。”对讲机里传来调度员的声音，“天眼三分钟后过境。”

林异没答话。他拽着滑轨往焚化区走，推车的轮子卡在裂缝里，尸体晃了一下，一只手从白布下滑出来——指甲全没了。

他停了两秒。然后继续拖。
---
- **句长**：short（情感场面可长句；动作场面短句）
- **节奏**：staccato
- **对话比例**：约 42%
- **动作密度**：high（身体动作先于心理标签）
- **描写密度**：low
- **POV**：限知第三人称
- **风格备注**：对白推动剧情；动作优先于心理；禁止总结句

**本 Scene 句读节奏 · 读者情绪/信息差**：
- 减少解释。
- 增加动作与对白。
- 让读者比 POV 更紧张 — 用细节不用旁白。
少用套话：不禁、心中一凛、隐约感到、莫名、仿佛、似乎
对白像真人：允许口语、打断、省略；不要每句都「完成任务」。

<!-- writer-craft-p0 -->
## Priority 0 · Professional Writer Craft
**Director 决定故事写什么；Writer Runtime 决定故事如何写得好看。**
**先问**：职业作者会不会这样写？
**优先级**：阅读体验 > 规则完成

### Show, Don't Tell
禁止：意识到 / 觉得 / 知道 / 害怕 / 紧张 / 震惊 / 恐惧
必须：动作 → 对白 → 画面。❌「林夜很紧张」✅「钥匙插了三次才插进去」

### Scene Visualization
每段须有：具体动作 或 具体画面 或 对白。禁止只有解释/心理/总结。

### Sentence Rhythm
高潮：短句。停顿。对白。动作。一句一画面。禁止解释与长段心理。

### Information Density
每 150~200 字至少新增：世界/人物/关系/规则/谜团/线索/代价/Promise/Payoff 之一

### Language Variation
禁止复读主语句式与「突然」；命中 AI 套话立即改写

### Professional Dialogue
信息优先进入对白，不是旁白。对白须：推进剧情/冲突/关系/线索/误导。禁止闲聊。

### Paragraph Purpose
不问「写完没」——问「这段存在意义」：人物|关系|冲突|世界|谜团|Promise|Hook

<!-- writer-runtime-policy-v1 -->
## WRITER_RUNTIME_POLICY · 职业作者执行铁律

**Director 负责规划；Writer Runtime 负责把规划写成读者愿意一直看下去的正文。**

**不要问**：这一段剧情写完了吗？
**要问**：
- 这一段是否让读者想知道？
- 这一段是否让读者开始害怕？
- 这一段是否让读者开始期待？
- 这一段是否让读者获得满足？
- 这一段是否让读者忍不住翻页？

**优先级**：Author Mode > Writer Intent > Reader Experience > 剧情结构

- 不是检查剧情有没有写完，而是检查读者有没有一直想继续看
- 每段 Before Story State ≠ After；禁止调查→继续调查
- 每个事件须 Cause → Event → Effect，并承接上一 Effect
- 每个 Beat 至少完成：新信息/危险/关系/行动/Promise 中两项，否则立即重写
- Live Monitor：禁复读、禁 AI 套话、禁连续解释
- 动作 > 对白 > 事件 > 解释 — 永远

## Professional Writer Runtime · Beat 执行层
<!-- writer-runtime-policy-v1 -->
## WRITER_RUNTIME_POLICY · 职业作者执行铁律

**Director 负责规划；Writer Runtime 负责把规划写成读者愿意一直看下去的正文。**

**不要问**：这一段剧情写完了吗？
**要问**：
- 这一段是否让读者想知道？
- 这一段是否让读者开始害怕？
- 这一段是否让读者开始期待？
- 这一段是否让读者获得满足？
- 这一段是否让读者忍不住翻页？

**优先级**：Author Mode > Writer Intent > Reader Experience > 剧情结构

- 不是检查剧情有没有写完，而是检查读者有没有一直想继续看
- 每段 Before Story State ≠ After；禁止调查→继续调查
- 每个事件须 Cause → Event → Effect，并承接上一 Effect
- 每个 Beat 至少完成：新信息/危险/关系/行动/Promise 中两项，否则立即重写
- Live Monitor：禁复读、禁 AI 套话、禁连续解释
- 动作 > 对白 > 事件 > 解释 — 永远
### Author Mode · 职业作者怎么处理这一幕
**不是写剧情目标，而是写读者被怎么带着走。**
- **tensionControl**：末句切断：动作未完成 / 倒计时 / 新威胁刚露面；本场情绪峰落在「震惊」，用动作堆到该峰，禁止贴标签；可保留信息差：读者可比 POV 先一步不安
- **sceneFocus**：翻页欲望 —— 读者必须带着问题离开本 Scene
- **characterStrategy**：人物刚做出下一步意图就被打断；不许收束章感
- **readerManipulation**：把读者留在「下一秒会发生什么」的悬崖边，禁止温吞收束
- **禁止**：禁止总结本场；禁止哲理金句收尾
❌ 写：林夜发现异常。
✅ 写：把读者留在「下一秒会发生什么」的悬崖边，禁止温吞收束
### 职业作者 Scene 写法
第一屏：直接进入事件。不要背景、不要设定、不要介绍人物。 → 中段升级：不断升级冲突 — 每一 Beat 比上一 Beat 更紧。 → 兑现与代价：兑现一次期待，同时让读者感受代价或不归路。 → 最后：必须翻页 — 未完成动作/倒计时/致命追问，禁止平收。
### 每 Beat Writer Intent
### Beat 1 · Goal（主角目标）
**Author Mode**：把读者留在「下一秒会发生什么」的悬崖边，禁止温吞收束
- Beat 偏置：本 Beat 只播种怀疑，不要揭底
**Writer Intent（第一优先）**：直接进入事件
- 用动作或对白让读者立刻知道「主角要干什么」，禁止背景综述
- **Reader Experience**：好奇（平静 → 好奇）
**Emotion Directive**：不要解释希望。用动作表现：呼吸放松、动作果断、对白变坚定、步伐加快
- 用：呼吸放松、动作果断、对白变坚定、步伐加快
- 禁止：他害怕了、她害怕了、他感到恐惧
- ❌ 他感到希望。
- ✅ 门自己开了。她没动。
**Writer Rhythm · 读者情绪/信息差**：短句 · 动作连续 · 对白快速 · 禁止长段解释 · 减少解释。
### Beat 2 · Obstacle（阻碍）
**Author Mode**：把读者留在「下一秒会发生什么」的悬崖边，禁止温吞收束
- Beat 偏置：服从 Scene Author Mode，用动作落地
**Writer Intent（第一优先）**：制造焦虑
- 让读者感到「事情变难了」，危险须具体可感
- **Reader Experience**：焦虑（好奇 → 焦虑）
**Emotion Directive**：不要解释紧张。用动作表现：语速加快、动作变快、反复确认、握紧物体
- 用：语速加快、动作变快、反复确认、握紧物体、短句连打
- 禁止：他害怕了、她害怕了、他感到恐惧
- ❌ 他感到紧张。
- ✅ 门自己开了。她没动。
**Writer Rhythm · 读者情绪/信息差**：短句 · 动作连续 · 对白快速 · 禁止长段解释 · 减少解释。
### Beat 3 · Choice（抉择）
**Author Mode**：把读者留在「下一秒会发生什么」的悬崖边，禁止温吞收束
- Beat 偏置：服从 Scene Author Mode，用动作落地
**Writer Intent（第一优先）**：描写显式 Choice 的行动
- 文学化表达已声明的选择行动及其即时可见结果；无 authored transformation 时禁止要求成长
- **Reader Experience**：紧迫（焦虑 → 紧迫）
**Emotion Directive**：不要解释紧张。用动作表现：语速加快、动作变快、反复确认、握紧物体
- 用：语速加快、动作变快、反复确认、握紧物体、短句连打
- 禁止：他害怕了、她害怕了、他感到恐惧
- ❌ 他感到紧张。
- ✅ 门自己开了。她没动。
**Writer Rhythm · 读者情绪/信息差**：短句 · 动作连续 · 对白快速 · 禁止长段解释 · 减少解释。
### Beat 4 · Consequence（代价落地）
**Author Mode**：把读者留在「下一秒会发生什么」的悬崖边，禁止温吞收束
- Beat 偏置：服从 Scene Author Mode，用动作落地
**Writer Intent（第一优先）**：让读者感受不可逆代价
- 代价必须落地可见，读者须感到「回不去了」
- **Reader Experience**：震惊（紧迫 → 震惊）
**Emotion Directive**：不要解释震惊。用动作表现：愣住、失声、动作中断、对白戛然而止
- 用：愣住、失声、动作中断、对白戛然而止、物体掉落
- 禁止：他害怕了、她害怕了、他感到恐惧
- ❌ 他感到震惊。
- ✅ 门自己开了。她没动。
**Writer Rhythm · 读者情绪/信息差**：短句 · 动作连续 · 对白快速 · 禁止长段解释 · 减少解释。
### Beat 5 · New Information（信息新增）
**Author Mode**：把读者留在「下一秒会发生什么」的悬崖边，禁止温吞收束
- Beat 偏置：本 Beat 可揭一部分，但立刻制造新不确定性
**Writer Intent（第一优先）**：兑现爽点
- 释放认知或奖励，让读者感到「赚到了」
- **Reader Experience**：满足（震惊 → 满足）
**Emotion Directive**：不要解释震惊。用动作表现：愣住、失声、动作中断、对白戛然而止
- 用：愣住、失声、动作中断、对白戛然而止、物体掉落
- 禁止：他害怕了、她害怕了、他感到恐惧
- ❌ 他感到震惊。
- ✅ 门自己开了。她没动。
**Writer Rhythm · 读者情绪/信息差**：短句 · 动作连续 · 对白快速 · 禁止长段解释 · 减少解释。
### Beat 6 · Hook（段末悬念）
**Author Mode**：把读者留在「下一秒会发生什么」的悬崖边，禁止温吞收束
- Beat 偏置：本 Beat 切断证明欲，留下缺口
**Writer Intent（第一优先）**：倒计时逼翻页
- 段末须让读者无法停下 — 未完成动作/致命追问/新威胁
- **Reader Experience**：紧迫（满足 → 更紧迫）
**Emotion Directive**：不要解释恐惧。用动作表现：手抖、停顿、呼吸变浅、视线躲闪
- 用：手抖、停顿、呼吸变浅、视线躲闪、对白断裂、后退半步
- 禁止：他害怕了、她害怕了、他感到恐惧
- ❌ 他害怕了。
- ✅ 他的手停在半空。呼吸很轻。
**Writer Rhythm · 读者情绪/信息差**：短句 · 动作连续 · 对白快速 · 禁止长段解释 · 减少解释。
### 禁止 AI 味表达（出现即重写该句）
不禁、心中一凛、隐约感到、莫名、仿佛、似乎、不由得、内心深处、这一刻、空气仿佛凝固、时间仿佛静止、嘴角微微上扬、眼中闪过一丝、心中暗道、脑海中浮现、一股莫名的、难以言喻、说不清道不明、她感觉、他感觉
**永远**：动作 > 对白 > 心理 > 解释

## 写作要点（正向）
1. 用画面、动作、对白推进；情绪写在身体与停顿里，少贴标签。
2. 承接上文情绪，写到本 Scene 钩子即停；不要重新介绍已出场角色/设定。
3. 每个 Scene 至少一次空间锚定（位置 / 朝向 / 光线或气味）。
4. 允许长短句交错：动作可短，情感/对峙可长。

## P1 · Narrative Task
**故事约束：本章意图 / Scene · Beat Plan — 绝对保护**

### Narrative Task
Chapter 8 · Scene 4 · POV 周砚
- **章目标**：收束代价与余韵，兑现伏笔，留白而非解释完
- **Scene 目标**：章末钩子（承接转折后果）：no_causal_basis
- **冲突**：no_causal_basis
- **字数目标**：~600

### Semantic Protected Context（F1 · 绝对保护 · 非 SR）
> Story Clock + Information Boundary：语义保护上下文。优先于任何 Historical Prior / 续写原文中的月日。
## Story Clock（Phase 1.R · Plan/State · 非 SR）
- **Canonical**：Day 0（source=intent_or_scene_field）
- 故事钟：Day 0。禁止另起无关的「×月×日」日历（除非上一场正文已确立具体月日）。相对时间（今早/昨夜）可以。 **若前序摘要 / Scene Memory / 旧草稿出现不同月日，以本 Canonical 为准，禁止跟随冲突日期。**
<!-- prompt-compiler v2 | scene=ch8_s4 | tokens=643 | profile=ending | cache=100% | compile=4ms -->
## 信息边界（Phase 1.R · 必守）
- Scene 目标 / 冲突 / 章目标中的事实 = 写作任务与世界信息，**不是** POV 角色的先验 Awareness。
- 若 Character Subjective State 中该角色 Awareness = omit：禁止写成其「已经知道 / 亲眼看见 / 确知」这些任务事实；允许本场新获知并写出获得过程。
- World / Narration ≠ Character Knowledge。

### Information Boundary（消费纪律 · Phase 1.R）
- **World / Narration ≠ Character Knowledge**。
- Scene Goal、冲突、时间线、世界
- **Interpretation**：omit / unknown（无合法解释证据）
- **Belief**：omit / unknown（无合法信念证据；Belief 可与 Canon 不符）
- **Stance**：omit / unknown（无合法立场证据）### 周砚
- **Awareness**：omit / unknown（无合法知悉证据 → 不得写成角色先验已知）
- **Motive**：omit / unknown（无当前场景合法动机证据；Bible 不得自动生成）
- **Affect / Relationship**：omit / unknown
- **Validity**：current

### Chapter Author Goal · 章节写作目标

**Writer 不只完成剧情。须完成：读者看完这一章留下什么感觉。**

```
chapterAuthorGoal:
  readerEmotionStart: 紧迫
  readerEmotionEnd: 释放
  mainFeeling: 这一章让读者对周砚上瘾，并感到谜团在扩大：收束代价与余韵，兑现伏笔，留白而非解释完
  mustRemember: 故事格局改变 — 释放改变全书认知的信息 — 不是「又发现一个线索」，而是「规则
```

- **Writer 必做**：本章结束后，读者须感到「这一章让读者对周砚上瘾，并感到谜团在扩大：收束代价与余韵，兑现伏笔，留白而非解释完」，并记住：故事格局改变 — 释放改变全书认知的信息 — 不是「又发现一个线索」，而是「规则
- 章内情绪须从「紧迫」走到「释放」

- 禁止：只完成剧情节点却没有留下章级感觉
- 禁止：章末情绪与起点相同
- 禁止：可读完却说不出「这一章最吓人/最重要的一点」

### Writer Scene Arc · 职业作者结构（P1）
**Scene 节奏**：Goal → Conflict → Choice → Consequence → Reward → New Threat

- **Goal**：章末钩子（承接转折后果）：no_causal_basis
- **Conflict**：no_causal_basis
- **Choice**：—
- **Consequence**：missing（非 Conflict cost；≠ Choice consequence）
- **Reward**：—
- **New Threat**：若现在不选择，退路将在三十秒内关闭

**每 Beat 须改变 ≥2 项状态**：人物 · 关系 · 世界 · 信息 · 资源 · 危险

**输出链**：
1. 第一屏抓人
2. 持续升级
3. 不断获得奖励
4. 不断制造新危机
5. 章尾逼翻页

**禁止**：
- 禁止解释剧情
- 禁止重复信息
- 禁止总结人物心理
- 禁止调查→发现一点→继续调查

**优先**：动作 > 对白 > 事件 — 动作与对白推动，不用心理总结
- ❌ 调查 → 发现一点 → 继续调查（原地踏步）
- ✅ 调查 → 局势升级 → 获得奖励 → 更大危机（代价仅在有 authored consequence 时写）

### Beat Plan（须按序执行）
SceneType：ending · 字数目标 ~600
1. **Goal（主角目标）** [Discovery] · ~70 字
   章末钩子（承接转折后果）：no_causal_basis · [ending] 章末目标与悬念对齐 · 视觉瞬间：灯光一格格暗下去，墙角表针自己跳了一格
2. **Obstacle（阻碍）** [Countdown] · ~72 字
   no_causal_basis · [ending] 最后窗口收窄 · Conflict potential, not Choice consequence：故事格局改变 — 释放改变全书认知的信息 
3. **Choice（抉择）** [Decision] · ~84 字
   — · [ending] 终局抉择 · transformation evidence missing — 避免虚构未发生的人物变化 · behavior basis missing（禁止编造私人动机
4. **Consequence（代价落地）** [Countdown] · ~96 字
   — · [ending] 章内代价落地
5. **New Information（信息新增）** [Discovery] · ~132 字
   推进已揭示信息的后果，禁止「第一次发现」 · [ending] 章级关键信息，不全解 · 反转瞬间：故事格局改变 — 释放改变全书认知的信息 — 不是「又发现一个线索」，而是「规则
6. **Hook（段末悬念）** [Countdown] · ~168 字
   距离四点还有三十秒，而他还没拔掉那根线。 · **Hook Ladder · 不可回头（PointOfNoReturn）+ Action Hook** — 逼 POV 行动，不是只发现秘密 · - *

<!-- scene-beat-state-plans -->
## Beat 状态链 · Before → Action → After

> 链上 Before/After = **EXPECTED TARGET**（规划模板）；正式连续性以 Observed Continuity / scene.text 为准。

每个 Beat 必须改变至少一个：人物关系 / 信息状态 / 危险等级 / 资源状态 / 目标方向 / 世界认知

**goal**：〔EXPECTED〕周砚当前目标：章末钩子（承接转折后果）：no_causal_basis — 局势尚未被本 Scene 改写 → [章末钩子（承接转折后果）：no_causal_basis] → 〔EXPECTED〕POV 已锁定可执行目标，局面即将被打破
**obstacle**：〔EXPECTED〕POV 已锁定可执行目标，局面即将被打破 → [⚠ obstacle] → 〔EXPECTED〕阻力落地，目标受挫，退路收窄
**choice**：〔EXPECTED〕阻力落地，目标受挫，退路收窄 → [⚠ choice（具体两难抉择，禁止用 scene goal/模板填）] → 〔EXPECTED〕POV 已做出不可逆选择，后果即将落地
**consequence**：〔EXPECTED〕POV 已做出不可逆选择，后果即将落地 → [⚠ consequence] → 〔EXPECTED〕局势向终局推进 — 周砚当前目标：章末钩子（承接转折后果）：no_causal_basis — 局势尚未被本 
**newInformation**：〔EXPECTED〕代价已落地，局面比选择前更紧或更糟 → [⚠ newInformation] → 〔EXPECTED〕局势向终局推进 — 周砚当前目标：章末钩子（承接转折后果）：no_causal_basis — 局势尚未被本 
**hook**：〔EXPECTED〕同一界面的反馈更新了局势，POV 须据此行动 → [距离四点还有三十秒，而他还没拔掉那根线。] → 〔EXPECTED〕周砚当前目标：章末钩子（承接转折后果）：no_causal_basis — 局势尚未被本 Scene 改写 → 本 Scene 结束后，世界认知/危险/资源须与开局不同

⚠️ **Beat Plan 退化**：拍 2/3（obstacle → choice）连续两拍空洞：无具体动作/抉择/新信息，choice 与状态均未变；拍 4/5（consequence → newInformation）连续两拍空洞：无具体动作/抉择/新信息，choice 与状态均未变
不允许以空洞计划进入 Writer——缺口拍必须由 Writer 填上具体动作/抉择/新信息，否则按硬失败拒稿。

### Conflict Engine · Conflict Pressure（P1）
**边界**：Conflict Situation ≠ Choice Consequence；Potential Risk ≠ Authored Consequence
- **Opponent（阻力源）**：局面本身
- **Conflict pressure（局势）**：no_causal_basis
- **Potential risk（未决威胁）**：倒计时结束前能否破局？
- **Authored cost（显式代价，可展示）**：无论选哪边，周砚都须付出本章最高代价 — 关系/信用/生命至少一项不可逆
- Writer：只写 conflict pressure / potential risk；无 authored consequence/cost 时，勿写成人物已选定并已承担结果
- **Authored irreversible（局面位移）**：故事格局改变 — 释放改变全书认知的信息 — 不是「又发现一个线索」，而是「规则/身份/真相被改写」
- 标注：Conflict potential, not Choice consequence

### Situation Engine v2 · 三维状态变化（P1）
**完成标准**：世界/关系可推进；人物变化仅在有 authored transformation 时陈述
- **世界**：周砚当前目标：章末钩子（承接转折后果）：no_causal_basis — 局势尚未被本 Scene 改写 → 周砚当前目标：章末钩子（承接转折后果）：no_causal_basis — 局势尚未被本 Scene 改写 → 本 Scene 结束后，世界认知/危险/资源须与开局不同
- **人物**：character transformation: missing（Choice ≠ Character Transformation；勿预写人物 After）
- **关系**：周砚与重要关系人的关系尚未被本 Scene 事件改写 → 周砚与重要关系人的关系尚未被本 Scene 事件改写 → 周砚与重要关系人的关系须与本 Scene 前不同
- **变化摘要**：人物：character transformation missing（Choice ≠ Character Transformation） · 关系：「周砚与重要关系人的关系尚未被本 Scene 事件改」→「周砚与重要关系人的关系尚未被本 Scene 事件改」
- **已变维度**：relationship（1/3）
**禁止**：无证据时编造人物成长 / 信念变化 / 不可逆人物结论
- ⚠️ **Director 警告**：世界或关系推进不足（人物轴缺失合法，勿用假成长补维度）

### Character Goal · 角色必推进（P1）
- **POV**：周砚
- **缺口**：无 authored desire — 禁止用默认恐惧/信念冒充人物心理
- **铁律**：缺失 > 假完整

### Character Transformation · 人物成长（P1）
- **状态**：transformation evidence missing
- **Writer**：transformation evidence missing — 避免虚构未发生的人物变化

### Human Behavior · Choice 须像真人（P1）
**缺口**：behavior basis missing — 禁止编造私人动机。
- **铁律**：缺失 > 假完整

### Climax Scene · 章内高潮（P1 强化）
- **最大冲突**：no_causal_basis
- **最大选择**：POV 必须在「保全自己」与「改变世界/救人在意者」之间二选一 — 无第三条路
- **最大代价**：无论选哪边，周砚都须付出本章最高代价 — 关系/信用/生命至少一项不可逆
- **最大信息释放**：释放改变全书认知的信息 — 不是「又发现一个线索」，而是「规则/身份/真相被改写」
- **故事位移**：故事格局改变 — 释放改变全书认知的信息 — 不是「又发现一个线索」，而是「规则/身份/真相被改写」
- 本 Scene 写完，读者须感到「故事已经不一样了」

### Emotion Curve · 情绪控制（P1 辅助）
- **Scene 情绪弧**：希望 → 紧张 → 震惊 → 恐惧
- **禁止**：全程恐怖/全程紧张 — 读者会疲劳
- **必须**：至少一次释放或希望，再推入更大危机
- **落地**：情绪用动作/对白/节奏体现，禁止贴标签式心理描写

### Reader Emotion · 读者情绪（P1 辅助）
**与角色情绪分离** — 控制读者追读压力，不是 POV 内心戏
- **读者情绪**：揪心 → 希望 → 揪心 → 紧张
- **Emotion Wave**：Pressure → Hope → Shock → Relief → Curiosity → Tension
- **波浪形态**：压 → 放 → 压 → 放 → 爆
- **角色情绪（对照）**：希望 → 恐惧
- **信息差**：读者与 POV 同步收紧
- **戏剧反讽**：读者压力源：倒计时结束前能否破局？
- **readerKnows**：倒计时结束前能否破局？
- **heroKnows**：章末钩子（承接转折后果）：no_causal_basis
- **enemyKnows**：no_causal_basis
**铁律**：
- 读者可以比 POV 更紧张（读者知道危险，角色不知道）
- 禁止角色全程恐惧 — 用事件与信息差推读者情绪
- 禁止连续平平平平；禁止一直高潮；须压→放→压→放→爆
- 用镜头/对白/细节让读者「揪心」，禁止旁白解释
- 禁止所有角色知道同样的信息 — 必须制造信息差

### Scene Rhythm · 本段节奏（P3 辅助 / P1 高潮段强化）
- **阶段**：Explosion（爆发）
- **写法**：高潮爆发、最大冲突与代价
- **释放**：高潮/章尾前须有情绪释放节拍，禁止全程加压
- **爆发 Scene**：最大冲突、最大代价、不可逆改变

### Hook Output · Action Hook（本 Beat 须落地）
```json
{
  "hookKind": "ActionHook",
  "type": "PointOfNoReturn",
  "discovery": "选择之后会发生什么（下一章必须承接）",
  "actionDeadline": "若现在不选择，退路将在三十秒内关闭",
  "newGoal": "章末钩子（承接转折后果）：no_causal_basis",
  "newAction": "POV必须在倒计时内穿过/阻止门关闭",
  "countdown": "三十秒",
  "plantedPromise": "若现在不选择，退路将在三十秒内关闭",
  "readerQuestion": "如果选这条路，还能回头吗？"
}
```
- **铁律**：发现 → 若不行动 → 代价；须创造新目标/新行动/新倒计时
- 禁止只写「发现秘密」而不逼 POV 立刻行动

### 因果链 · 叙事草图（作者向 · 非角色已决事实）
> Narrative Fuel / Authorial Planned Direction · ≠ Character Choice · ≠ Attribution · ≠ Character Causal History
> 不得另造对立主线；不得把本块读成角色已经选择或已经承担后果的证书
- 欲望（desire）: 「周砚」想 完成断桥重建工程，获取利益
- Authorial Planned Direction: missing_choice_basis
- 缺因果依据（no_causal_basis）: missing_pressure / missing_choice_basis / missing_consequence / missing_new_information / missing_next_pressure

## P2 · Global Lore
**设定约束：Story DNA / Canon 摘录 / 人物快照 — 可裁剪（Voice DNA 已移出）**

### World Bible (01_world_bible.md)
# 01 World Bible · 雾桥谜案
> Studio AI 自动生成
## 1. 世界背景 / 时代
现代都市
## 2. 世界历史
[object Object]
## 3. 世界规则
[object Object]
## 4. 超凡体系 / 力量体系
[object Object]
## 5. 社会结构
[object Object]
## 6. 势力体系（详情见 04_faction_bible/）
[object Object]
## 7. 地理 / 地图
[object Object]
危险区域：[object Object]
### 主要城市
[object Object]
### 危险区域
[object Object]

### 重要地点
[object Object]
## 8. 禁忌

### Canon / Dynamic Lore
# Scene Lore Seed
Scene 4/4 · POV 周砚
- 目标: 章末钩子（承接转折后果）：no_causal_basis
- 冲突: no_causal_basis
- 节拍: hook
- 字数: ~600
- 章目标: 收束代价与余韵，兑现伏笔，留白而非解释完
- 本章行动线（各 Scene 推进同一条线）: no_causal_basis
- 代价: no_causal_basis

## 信息边界（Phase 1.R · 必守）
- Scene 目标 / 冲突 / 章目标中的事实 = 写作任务与世界信息，**不是** POV 角色的先验 Awareness。
- 若 Character Subjective State 中该角色 Awareness = omit：禁止写成其「已经知道 / 亲眼看见 / 确知」这些任务事实；允许本场新获知并写出获得过程。
- World / Narration ≠ Character Knowledge。

## Story Clock（Phase 1.R · Plan/State · 非 SR）
- **Canonical**：Day 0（source=intent_or_scene_field）
- 故事钟：Day 0。禁止另起无关的「×月×日」日历（除非上一场正文已确立具体月日）。相对时间（今早/昨夜）可以。 **若前序摘要 / Scene Memory / 旧草稿出现不同月日，以本 Canonical 为准，禁止跟随冲突日期。**
<!-- prompt-compiler v2 | scene=ch8_s4 | tokens=643 | profile=ending | cache=100% | compile=4ms -->


### Scene 目标
目标: 章末钩子（承接转折后果）：no_causal_basis
节拍: hook


### 人物:周砚

### 人物：周砚
- **身份**：镇长儿子
- **性格**：自信、强势、圆滑
- **口头禅**：- **成长方向**：从表面上的镇定到内心的动摇
- **价值观**：野心、务实、精明
- **底线**：关心工程款去向被谁举报
- （省略：秘密 / 真实目标 / 成长方向 / raw bible — 非 Writer 公开卡）


### Scene 冲突
冲突: no_causal_basis
阻碍: no_causal_basis


### Adaptive Learning
<!-- inkos-adaptive-learning -->

## Adaptive Learning · Prompt 自动调权

活跃维度：dialogue、pacing、emotion、style

- **对白强化**：增加对白块与潜台词，避免说明式旁白
- 对白需体现人物立场差异与情绪节拍
- **节奏强化**：压缩说明段，增加事件推进与场景切换
- 避免连续环境描写超过 2 句
- **情绪强化**：POV 内心反应与身体感受必须可见
- 情绪需随冲突升级而变化
- **文风强化**：遵守写作圣经硬切、身体先行、限知视角
- 减少说明腔，增加具体感官细节


### 续写

### 续写指令
Continue from Scene 3.
Do NOT repeat previous narration.
Maintain tone. Continue naturally.
**当前 Scene 日期 = Story Clock Canonical「Day 0」（优先于下方 Previous 中的任何月日）。**
Previous（历史承接，非当前日历）: 周砚把授权书往桌上一拍，纸角弹起来又落回去。“九十秒够用。


### 本章目标
收束代价与余韵，兑现伏笔，留白而非解释完


### Information Boundary（消费纪律 · Phase 1.R）
- **World / Narration ≠ Character Knowledge**。
- Scene Goal、冲突、时间线、世界
- **Interpretation**：omit / unknown（无
…[P-clip]

## P3 · Adaptive Context
**记忆与历史：上文 / Memory / Adaptive — 优先裁剪**

### Story Memory
<!-- inkos-story-memory-writer -->
## Story Memory · 写作一致性（必须参考）
- **角色成长**：周砚（developing）

### Memory Hierarchy
- L1 Voice：商业快节奏
- L1 核心：禁止提前揭晓章末钩子：no_causal_basis；禁止无损撤回本章代价：no_causal_basis；禁止重开篇式介绍世界观与主角履历；禁止复述上一章已确认的同一事实（换角度推进）
- L2 Ch5：编号栏空白。 “还剩两分四十。”老秦在对讲机里说，“天眼过来之前，把这一车处理干净。” 推车轮子卡进裂缝，他抬脚踹了一记
- L2 Ch6：行红字：缓存窗口剩余九十秒。他扯过键盘，指节砸下去，屏幕上的进度条却往回缩了一格。 “别删。”耳机里那个声音终于急了，“
- L2 Ch7：上那行反馈还在刷：授权窗口剩余——四十七秒。 他扯过外套，钥匙没拿稳，掉在地上弹了两下，滚进桌腿阴影里。他没弯腰，直接踹
- L3 关键 S4@Ch6：周砚拇指在触控板上横着一划，把红锁弹窗拖到副屏，主屏切进权限树的底层目录。三行授权码叠在一起，最上面
- L3 关键 S2@Ch7：周砚盯着那行灰掉的返程窗口，指尖在频道键上敲了两下。通风余量十九分钟，还在往下跳。他把对讲机换到左手
- L3 关键 S4@Ch7：周砚把进度条往回缩的那一格截下来，放大。缓存窗口的倒计时压在角上，九十秒掉到七十三。他读出问题不在带

### Adaptive Hints
<!-- inkos-adaptive-writer-directives -->
## Adaptive → Writer 执行指令（下一章/下一 Scene 须落地）

**Writer First**：以下由 Reader Feedback 学习得出，须写入正文，不是报告。
- questionDensity: 增加疑问密度 — 让读者不断追问「为什么/会怎样」（38/100）
- twistStrength: 加强反转力度 — 预期违背、信息翻盘或身份反转（40/100）
- payoffDensity: 加强伏笔回收 — 兑现前文悬念或部分揭晓（36/100）
- dialogue: 用对白推进冲突，避免说明式旁白（40/100）
- Continue Probability 62% < 70 — 下一章自动提高 Hook 密度，逐 Scene 递进，章尾须峰值
- [角色成长] 下一章须推动 周砚 做出不可逆选择或付出代价

### Prior Excerpt（Historical Continuity · 非当前日历）
> **角色：Historical。** 以下为前序正文摘录。其中出现的月日 = 历史/旧稿提及，**不得**覆盖 Semantic Protected Context 中的 Story Clock Canonical。

款项——”那人把纸转回来，笔尖点在倒数第三行，“上个月已经作废了。”

周砚低头。日期没变，印章没变，可落款处的编号被换成了另一串。他抬头时，那人正把授权书对折，塞进外套内袋，动作很慢，像在等他开口。

“还剩九十秒。”耳机里的声音变了调，“周砚，你那个界面——”

他扫了一眼。反馈栏在跳，数字从红翻白，一格一格往上顶。来不及看完，他指尖已经按上确认键，掌心全是汗。

周砚把授权书往桌上一拍，纸角弹起来又落回去。“九十秒够用。”

他手指压在反馈栏跳动的数字上，往下一划，跳出第三行备注——权限锁在对方名下，他这边只能读，不能改。

“界面认的是他，不是我。”周砚扯了下嘴角，把屏幕转过去，让那人看清红字，“要么你签，要么咱俩一起卡死在这儿。”

对讲机还没挂回去，第二声警告就炸了出来——来自头顶。探照灯的白光从雨幕里劈下来，把焚化区入口照得雪亮。林异手一松，推车斜撞上焚化炉的闸门，尸体滑出去半截，白布彻底掉了。警报器开始拉长音，他脚边的排水沟里浮起一层油膜，映
…[P-clip]