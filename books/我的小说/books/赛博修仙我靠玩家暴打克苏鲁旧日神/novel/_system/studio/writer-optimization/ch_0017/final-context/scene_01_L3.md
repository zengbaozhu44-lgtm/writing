<!-- inkos-prompt-compiler · unified-stack -->

## P0 · Format & Guardrails
**物理约束：格式 / 字数 / Craft·V2 / Anchor Voice DNA — 绝对保护**

### 风格样本（模仿质感，不要复述样本情节）
---
# 风格样本 · 赛博修仙：我靠玩家暴打克苏鲁旧日神

## 脏话预算（铁律）

整章脏话（操/妈的/他妈的/我操等）≤ 2 次，且只能在情绪真正到顶时使用一次。禁止把「操」当句间口头禅、禁止连续多段都用脏话。其余情绪一律用：动作的停顿、发白的指节、颤抖的手、空白的凝视、生理反应、回忆闪回、沉默。

## 非脏话情绪表达（禁止用「操/妈的」代替情绪）

林砚看着监控屏上那行字——「林薇·已离线」。他的手指停在键盘上方，没有落下去。

他数自己的心跳，数到七。第七下的时候，他终于动了——不是去按什么，而是把那只焦毁的左手从桌沿上收回来，搁在膝盖上，像搁一件不属于自己的东西。

窗外的雨打在钢化玻璃上，噼啪作响。他忽然想起三年前那个雨夜，林薇趴在他背上问：哥，等城修好了，我们还住一起好不好。他应过一声好。

现在他盯着那行「已离线」，喉咙里滚了半圈，什么也没说出来。他松开手，指节发白，血顺着…
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
- 本 Scene 字数预算约 800 字；禁止灌水，禁止写下一 Scene。
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
推进：画面→动作→对白→信息。

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
- **tensionControl**：压力先升、真相后揭：每多加一次阻力，就少给一条答案；本场情绪峰落在「震惊」，用动作堆到该峰，禁止贴标签；可保留信息差：读者可比 POV 先一步不安
- **sceneFocus**：代价逼近 —— 读者关心「来不及了」胜过「是什么」
- **characterStrategy**：人物为活/为救人而动，不是为调查而调查；选择短促、对白带刺
- **readerManipulation**：先让读者替 POV 着急，再局部兑现信息；兑现后立刻加更大威胁
- **禁止**：禁止解释完设定再写冲突；禁止调查→发现→继续调查
❌ 写：林夜发现异常。
✅ 写：先让读者替 POV 着急，再局部兑现信息；兑现后立刻加更大威胁
### 职业作者 Scene 写法
第一屏：直接进入事件。不要背景、不要设定、不要介绍人物。 → 中段升级：不断升级冲突 — 每一 Beat 比上一 Beat 更紧。 → 兑现与代价：兑现一次期待，同时让读者感受代价或不归路。 → 最后：必须翻页 — 未完成动作/倒计时/致命追问，禁止平收。
### 每 Beat Writer Intent
### Beat 1 · Goal（主角目标）
**Author Mode**：先让读者替 POV 着急，再局部兑现信息；兑现后立刻加更大威胁
- Beat 偏置：本 Beat 只播种怀疑，不要揭底
**Writer Intent（第一优先）**：直接进入事件
- 用动作或对白让读者立刻知道「主角要干什么」，禁止背景综述
- **Reader Experience**：好奇（平静 → 好奇）
**Emotion Directive**：不要解释疑惑。用动作表现：停顿、重复对方的话、视线搜索、试探性对白
- 用：停顿、重复对方的话、视线搜索、试探性对白
- 禁止：他害怕了、她害怕了、他感到恐惧
- ❌ 他感到疑惑。
- ✅ 门自己开了。她没动。
**Writer Rhythm · 读者情绪/信息差**：动作 · 对白 · 不要解释 · 禁止心理总结 · 减少解释。
### Beat 2 · Obstacle（阻碍）
**Author Mode**：先让读者替 POV 着急，再局部兑现信息；兑现后立刻加更大威胁
- Beat 偏置：服从 Scene Author Mode，用动作落地
**Writer Intent（第一优先）**：制造焦虑
- 让读者感到「事情变难了」，危险须具体可感
- **Reader Experience**：焦虑（好奇 → 焦虑）
**Emotion Directive**：不要解释紧张。用动作表现：语速加快、动作变快、反复确认、握紧物体
- 用：语速加快、动作变快、反复确认、握紧物体、短句连打
- 禁止：他害怕了、她害怕了、他感到恐惧
- ❌ 他感到紧张。
- ✅ 门自己开了。她没动。
**Writer Rhythm · 读者情绪/信息差**：动作 · 对白 · 不要解释 · 禁止心理总结 · 减少解释。
### Beat 3 · Choice（抉择）
**Author Mode**：先让读者替 POV 着急，再局部兑现信息；兑现后立刻加更大威胁
- Beat 偏置：服从 Scene Author Mode，用动作落地
**Writer Intent（第一优先）**：描写显式 Choice 的行动
- 文学化表达已声明的选择行动及其即时可见结果；无 authored transformation 时禁止要求成长
- **Reader Experience**：紧迫（焦虑 → 紧迫）
**Emotion Directive**：不要解释紧张。用动作表现：语速加快、动作变快、反复确认、握紧物体
- 用：语速加快、动作变快、反复确认、握紧物体、短句连打
- 禁止：他害怕了、她害怕了、他感到恐惧
- ❌ 他感到紧张。
- ✅ 门自己开了。她没动。
**Writer Rhythm · 读者情绪/信息差**：动作 · 对白 · 不要解释 · 禁止心理总结 · 减少解释。
### Beat 4 · Consequence（代价落地）
**Author Mode**：先让读者替 POV 着急，再局部兑现信息；兑现后立刻加更大威胁
- Beat 偏置：服从 Scene Author Mode，用动作落地
**Writer Intent（第一优先）**：让读者感受到代价
- 代价必须落地可见，读者须感到「回不去了」
- **Reader Experience**：震惊（紧迫 → 震惊）
**Emotion Directive**：不要解释震惊。用动作表现：愣住、失声、动作中断、对白戛然而止
- 用：愣住、失声、动作中断、对白戛然而止、物体掉落
- 禁止：他害怕了、她害怕了、他感到恐惧
- ❌ 他感到震惊。
- ✅ 门自己开了。她没动。
**Writer Rhythm · 读者情绪/信息差**：短句 · 动作连续 · 对白快速 · 禁止长段解释 · 减少解释。
### Beat 5 · New Information（信息新增）
**Author Mode**：先让读者替 POV 着急，再局部兑现信息；兑现后立刻加更大威胁
- Beat 偏置：本 Beat 可揭一部分，但立刻制造新不确定性
**Writer Intent（第一优先）**：兑现爽点
- 释放认知或奖励，让读者感到「赚到了」
- **Reader Experience**：满足（震惊 → 满足）
**Emotion Directive**：不要解释震惊。用动作表现：愣住、失声、动作中断、对白戛然而止
- 用：愣住、失声、动作中断、对白戛然而止、物体掉落
- 禁止：他害怕了、她害怕了、他感到恐惧
- ❌ 他感到震惊。
- ✅ 门自己开了。她没动。
**Writer Rhythm · 读者情绪/信息差**：放慢 · 停顿 · 留白 · 一句一句揭开 · 减少解释。
### Beat 6 · Hook（段末悬念）
**Author Mode**：先让读者替 POV 着急，再局部兑现信息；兑现后立刻加更大威胁
- Beat 偏置：本 Beat 切断证明欲，留下缺口
**Writer Intent（第一优先）**：逼读者翻页
- 段末须让读者无法停下 — 未完成动作/致命追问/新威胁
- **Reader Experience**：紧迫（满足 → 更紧迫）
**Emotion Directive**：不要解释恐惧。用动作表现：手抖、停顿、呼吸变浅、视线躲闪
- 用：手抖、停顿、呼吸变浅、视线躲闪、对白断裂、后退半步
- 禁止：他害怕了、她害怕了、他感到恐惧
- ❌ 他害怕了。
- ✅ 他的手停在半空。呼吸很轻。
**Writer Rhythm · 读者情绪/信息差**：动作 · 对白 · 不要解释 · 禁止心理总结 · 减少解释。
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
Chapter 17 · Scene 1 · POV 林砚
- **章目标**：第17章：神级计算器 **概念战斗**：混沌之核试图用数学规则抹除玩家，但玩家“无限复活”本身就是数学悖论，导致计算器死机。 **爽点**：林砚趁机写入管理员代码，将混沌之核转化为“位面引擎”，可穿越旧日维度。 **章末钩子**：位面引擎启动，林砚看到域外星空无数旧日神盘踞，等待他跨界征伐。
- **Scene 目标**：承接上章情绪「紧迫·倒计时压迫」进入局面 · 承接「紧迫·倒计时压迫」进入现场：第17章：神级计算器 **概念战斗**：混沌之核试图用数学规则抹除玩家
- **冲突**：no_causal_basis
- **字数目标**：~800

### Semantic Protected Context（F1 · 绝对保护 · 非 SR）
> Story Clock + Information Boundary：语义保护上下文。优先于任何 Historical Prior / 续写原文中的月日。
## Story Clock（Phase 1.R · Plan/State · 非 SR）
- **Canonical**：Day 12（source=intent_or_scene_field）
- 故事钟：Day 12。禁止另起无关的「×月×日」日历（除非上一场正文已确立具体月日）。相对时间（今早/昨夜）可以。 **若前序摘要 / Scene Memory / 旧草稿出现不同月日，以本 Canonical 为准，禁止跟随冲突日期。**
<!-- prompt-compiler v2 | scene=ch17_s1 | tokens=1487 | profile=opening | cache=0% | compile=24ms -->
## 信息边界（Phase 1.R · 必守）
- Scene 目标 / 冲突 / 章目标中的事实 = 写作任务与世界信息，**不是** POV 角色的先验 Awareness。
- 若 Character Subjective State 中该角色 Awareness = omit：禁止写成其「已经知道 / 亲眼看见 / 确知」这些任务事实；允许本场新获知并写出获得过程。
- World / Narration ≠ Character Knowledge。

### Information Boundary（消费纪律 · Phase 1.R）
- **World / Narration ≠ Character Knowledge**。
- Scene Goal、冲突、时间线、世界设定、其他角色经历 = 世界/任务信息，**不是** POV 已知事实。
- Character Subjective State 有明确 Awareness → 可写为该角色已知/经历。
- Awareness = omit / unknown → **禁止**写成该角色「已经知道 / 亲眼看见 / 明确确认」该信息。
- 仍允许：其他角色告知、本场新发现、叙述描写但不归因于角色先验知识。
- 禁止：把 Goa
- **Interpretation**：omit / unknown（无合法解释证据）
- **Belief**：omit / unknown（无合法信念证据；Belief 可与 Canon 不符）
- **Stance**：omit / unknown（无合法立场证据）### 林砚
- **Awareness**：omit / unknown（无合法知悉证据 → 不得写成角色先验已知）
- **Motive**：omit / unknown（无当前场景合法动机证据；Bible 不得自动生成）
- **Affect / Relationship**：omit / unknown
- **Validity**：current

### Chapter Author Goal · 章节写作目标

**Writer 不只完成剧情。须完成：读者看完这一章留下什么感觉。**

```
chapterAuthorGoal:
  readerEmotionStart: 焦虑
  readerEmotionEnd: 紧迫
  mainFeeling: 这一章让读者感到「故事格局改变 — 释放改变全书认知的信息 — 不是「又发现一个线索」，而」—— 中段不重复只加压
  mustRemember: 故事格局改变 — 释放改变全书认知的信息 — 不是「又发现一个线索」，而是「规则
```

- **Writer 必做**：本章结束后，读者须感到「这一章让读者感到「故事格局改变 — 释放改变全书认知的信息 — 不是「又发现一个线索」，而」—— 中段不重复只加压」，并记住：故事格局改变 — 释放改变全书认知的信息 — 不是「又发现一个线索」，而是「规则
- 章内情绪须从「焦虑」走到「紧迫」

- 禁止：只完成剧情节点却没有留下章级感觉
- 禁止：章末情绪与起点相同
- 禁止：可读完却说不出「这一章最吓人/最重要的一点」

### Writer Scene Arc · 职业作者结构（P1）
**Scene 节奏**：Goal → Conflict → Choice → Consequence → Reward → New Threat

- **Goal**：承接上章情绪「紧迫·倒计时压迫」进入局面 · 承接「紧迫·倒计时压迫」进入现场：第17章：神级计算器 **概念
- **Conflict**：no_causal_basis
- **Choice**：—
- **Consequence**：missing（非 Conflict cost；≠ Choice consequence）
- **Reward**：读者期待兑现 — [object Object]
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
SceneType：opening · 字数目标 ~800
1. **Goal（主角目标）** [Discovery] · ~144 字
   承接上章情绪「紧迫·倒计时压迫」进入局面 · 承接「紧迫·倒计时压迫」进入现场：第17章：神级计算器 **概念战斗**：混沌之核试图用数学规则抹除玩家 · [opening] 快速建立 POV 目标，
2. **Obstacle（阻碍）** [Danger] · ~128 字
   no_causal_basis · [opening] 阻力具体可感，危险等级须上升
3. **Choice（抉择）** [Decision] · ~96 字
   — · [opening] 被迫二选一，关系或目标方向将改变 · transformation evidence missing — 避免虚构未发生的人物变化 · behavior basis mis
4. **Consequence（代价落地）** [Danger] · ~112 字
   — · [opening] 选择代价可见落地，资源或退路受损
5. **New Information（信息新增）** [Discovery] · ~176 字
   — · [opening] 释放新线索，世界认知须更新 · 反转瞬间：屏幕最底下一行不是警告，是他的名字，后面跟着「已归档」
6. **Hook（段末悬念）** [Twist] · ~144 字
   上报，或者成为共犯 — 她只有三秒。 · **Hook Ladder · 不可回头（PointOfNoReturn）+ Action Hook** — 逼 POV 行动，不是只发现秘密 · - **读

<!-- scene-beat-state-plans -->
## Beat 状态链 · Before → Action → After

> 链上 Before/After = **EXPECTED TARGET**（规划模板）；正式连续性以 Observed Continuity / scene.text 为准。

每个 Beat 必须改变至少一个：人物关系 / 信息状态 / 危险等级 / 资源状态 / 目标方向 / 世界认知

**goal**：〔EXPECTED〕林砚当前目标：承接上章情绪「紧迫·倒计时压迫」进入局面 · 承接「紧迫·倒计时压迫」进入现场： — 局势尚未被本 Scene 改写 → [承接上章情绪「紧迫·倒计时压迫」进入局面 · 承接「紧迫·倒计时压迫」进入现场：第17章：神级计算器 **概念战斗**：混沌之核试图用数学规则抹除玩家] → 〔EXPECTED〕POV 已锁定可执行目标，局面即将被打破
**obstacle**：〔EXPECTED〕POV 已锁定可执行目标，局面即将被打破 → [⚠ obstacle] → 〔EXPECTED〕阻力落地，目标受挫，退路收窄
**choice**：〔EXPECTED〕阻力落地，目标受挫，退路收窄 → [⚠ choice（具体两难抉择，禁止用 scene goal/模板填）] → 〔EXPECTED〕POV 已做出不可逆选择，后果即将落地
**consequence**：〔EXPECTED〕POV 已做出不可逆选择，后果即将落地 → [⚠ consequence] → 〔EXPECTED〕局势向终局推进 — 林砚当前目标：承接上章情绪「紧迫·倒计时压迫」进入局面 · 承接「紧迫·倒计时压迫」进入现
**newInformation**：〔EXPECTED〕代价已落地，局面比选择前更紧或更糟 → [⚠ newInformation] → 〔EXPECTED〕局势向终局推进 — 林砚当前目标：承接上章情绪「紧迫·倒计时压迫」进入局面 · 承接「紧迫·倒计时压迫」进入现
**hook**：〔EXPECTED〕同一界面的反馈更新了局势，POV 须据此行动 → [上报，或者成为共犯 — 她只有三秒。] → 〔EXPECTED〕林砚当前目标：承接上章情绪「紧迫·倒计时压迫」进入局面 · 承接「紧迫·倒计时压迫」进入现场： — 局势尚未被本 Scene 改写 → 本 Scene 结束后，世界认知/危险/资源须与开局不同

⚠️ **Beat Plan 退化**：拍 2/3（obstacle → choice）连续两拍空洞：无具体动作/抉择/新信息，choice 与状态均未变；拍 4/5（consequence → newInformation）连续两拍空洞：无具体动作/抉择/新信息，choice 与状态均未变
不允许以空洞计划进入 Writer——缺口拍必须由 Writer 填上具体动作/抉择/新信息，否则按硬失败拒稿。

### Conflict Engine · Conflict Pressure（P1）
**边界**：Conflict Situation ≠ Choice Consequence；Potential Risk ≠ Authored Consequence
- **Opponent（阻力源）**：林砚与玩家联盟对抗被邪神污染的修仙财团、
- **Conflict pressure（局势）**：no_causal_basis
- **Potential risk（未决威胁）**：林砚能否承接上章情绪「紧迫·倒计时压迫」进入局面 · 承接「紧迫·倒计时压迫」进入现场：第17章：神级计算器 **概念战斗**：混沌之核试图用数学规则抹除玩家？
- Writer：只写 conflict pressure / potential risk；无 authored consequence/cost 时，勿写成人物已选定并已承担结果
- ⚠️ cost basis 非 authored 或缺失 — 勿补 Choice consequence

### Situation Engine v2 · 三维状态变化（P1）
**完成标准**：世界/关系可推进；人物变化仅在有 authored transformation 时陈述
- **世界**：林砚当前目标：承接上章情绪「紧迫·倒计时压迫」进入局面 · 承接「紧迫·倒计时压迫」进入现场： — 局势尚未被本 Scene 改写 → 林砚当前目标：承接上章情绪「紧迫·倒计时压迫」进入局面 · 承接「紧迫·倒计时压迫」进入现场： — 局势尚未被本 Scene 改写 → 本 Scene 结束后，世界认知/危险/资源须与开局不同
- **人物**：character transformation: missing（Choice ≠ Character Transformation；勿预写人物 After）
- **关系**：林砚与重要关系人的关系尚未被本 Scene 事件改写 → 林砚与重要关系人的关系尚未被本 Scene 事件改写 → 林砚与重要关系人的关系须与本 Scene 前不同
- **变化摘要**：人物：character transformation missing（Choice ≠ Character Transformation） · 关系：「林砚与重要关系人的关系尚未被本 Scene 事件改」→「林砚与重要关系人的关系尚未被本 Scene 事件改」
- **已变维度**：relationship（1/3）
**禁止**：无证据时编造人物成长 / 信念变化 / 不可逆人物结论
- ⚠️ **Director 警告**：世界或关系推进不足（人物轴缺失合法，勿用假成长补维度）

### Character Goal · 角色必推进（P1）
- **POV**：林砚
- **缺口**：无 authored desire — 禁止用默认恐惧/信念冒充人物心理
- **铁律**：缺失 > 假完整

### Character Transformation · 人物成长（P1）
- **状态**：transformation evidence missing
- **Writer**：transformation evidence missing — 避免虚构未发生的人物变化

### Human Behavior · Choice 须像真人（P1）
**缺口**：behavior basis missing — 禁止编造私人动机。
- **铁律**：缺失 > 假完整

### Emotion Curve · 情绪控制（P1 辅助）
- **Scene 情绪弧**：疑惑 → 紧张 → 震惊 → 恐惧
- **禁止**：全程恐怖/全程紧张 — 读者会疲劳
- **必须**：至少一次释放或希望，再推入更大危机
- **落地**：情绪用动作/对白/节奏体现，禁止贴标签式心理描写

### Reader Emotion · 读者情绪（P1 辅助）
**与角色情绪分离** — 控制读者追读压力，不是 POV 内心戏
- **读者情绪**：好奇 → 紧张 → 揪心 → 后怕
- **Emotion Wave**：Curiosity → Tension → Pressure → Hope → Shock → Relief
- **波浪形态**：压 → 放 → 压 → 放 → 爆
- **角色情绪（对照）**：疑惑 → 恐惧
- **信息差**：读者与 POV 同步收紧
- **戏剧反讽**：读者压力源：林砚能否承接上章情绪「紧迫·倒计时压迫」进入局面 · 承接「紧迫·倒计时压迫」进入现场：第
- **readerKnows**：林砚能否承接上章情绪「紧迫·倒计时压迫」进入局面 · 承接「紧迫·倒计时压迫」进入现场：第17章：神级计算器 **概念战
- **heroKnows**：承接上章情绪「紧迫·倒计时压迫」进入局面 · 承接「紧迫·倒计时压迫」进入现场：第17章：神级计算器 **概念战斗**：
- **enemyKnows**：no_causal_basis
**铁律**：
- 读者可以比 POV 更紧张（读者知道危险，角色不知道）
- 禁止角色全程恐惧 — 用事件与信息差推读者情绪
- 禁止连续平平平平；禁止一直高潮；须压→放→压→放→爆
- 用镜头/对白/细节让读者「揪心」，禁止旁白解释
- 禁止所有角色知道同样的信息 — 必须制造信息差

### Scene Rhythm · 本段节奏（P3 辅助 / P1 高潮段强化）
- **阶段**：Fast（快）
- **写法**：短句、动作连打、少解释

### Hook Output · Action Hook（本 Beat 须落地）
```json
{
  "hookKind": "ActionHook",
  "type": "PointOfNoReturn",
  "discovery": "选择之后会发生什么（下一章必须承接）",
  "actionDeadline": "若现在不选择，退路将在三十秒内关闭",
  "newGoal": "承接上章情绪「紧迫·倒计时压迫」进入局面 · 承接「紧迫·倒计时压迫」进入现场：第17章：神级计算器 **概念战斗**：混沌之核试图用数学规则抹除玩家",
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
- 欲望（desire）: 「一刀岁暮（玩家ID，现实身份未知）」想 打通末世副本、吊打各路BOSS、解锁隐藏神装、玩遍世界所有玩法
- Authorial Planned Direction: missing_choice_basis
- 新信息（new_information）: 看着掌心跳动的数据流权限，林砚眸光冰冷。前世他倾尽所有守护人族，换来背叛惨死。这一世，手握管理员权柄，他只剩24小时——要以玩家为刃，屠尽叛贼邪神！
- 下一压力（next_pressure）: 未解悬念维持：看着掌心跳动的数据流权限，林砚眸光冰冷。前世他倾尽所有守护人族，换来背叛惨死。这一世，手握管理员权柄，他只剩24小时——要以玩家为刃，屠尽叛贼邪神！
- 缺因果依据（no_causal_basis）: missing_pressure / missing_choice_basis / missing_consequence

## P2 · Global Lore
**设定约束：Story DNA / Canon 摘录 / 人物快照 — 可裁剪（Voice DNA 已移出）**

### Story DNA（摘录）
- **core_hook**：开局黄金三章（强冲突开局）：男主林砚是末世唯一残存的半机械修仙者，肉身半机械化，主修数据流修仙功法。他坚守人类最后一座浮空城，血战三年，最终被邪神污染的顶级修仙财团背叛，神魂破碎、义体报废，临死前窥见世界真相：这个末世世界，只是高维玩家的测
- **genre**：诡异修仙
- **theme**：在机械与灵气的末世中，人类联合不屈意志对抗不可名状之恶，探索自由意志与命运枷锁

### World Bible (01_world_bible.md)
# 01 World Bible · 赛博修仙：我靠玩家暴打克苏鲁旧日神
> Studio AI 自动生成
## 1. 世界背景
/ 时代

时代背景（2149 赛博修仙末世）

人类文明进入「机械灵气双生时代」。

一百年前地球灵气复苏，上古修仙体系重现人间，但人类科技并未倒退，反而高速融合灵气，诞生全新体系：赛博修仙。

修士可以肉身筑基，也可以义体改造、机械化神魂、数据化灵力。

科技与修仙不再对立，而是互相叠加：

符文可以写入芯片、阵法可以化作网络、灵根可以机械移植、元婴可以数据备份。

但在 2120 年，深空星门撕裂，克苏鲁旧日领域入侵现实。

诡异低语、精神污染、位面畸变、血肉异化席卷世界。

灵气开始变质、网络开始滋生诡秘、机械义体会寄生邪神碎片。

世界进入：修仙者对抗神明、机械对抗诡秘、人类对抗疯狂的黑暗末世。

现存人类不足巅峰时期的 15%，多数城市沦为「畸变废土」。
## 2. 世界历史
2117年，灵气复苏与赛博改造技术同步爆发，人类进入修仙与机械融合时代。2146年，深空裂隙开启，克苏鲁旧日支配者与诡秘异兽入侵，污染灵气与机械代码。高阶修士与财团相继堕落，人类浮空城成为最后堡垒。林砚作为半机械修仙者坚守三年，于2149年濒死时觉醒世界管理员权限，重生至邪神入侵初期的关键节点。
## 3. 世界规则
世界运行受高维数据流和灵气法则双重支配。管理员权限可解锁玩家通道、修改局部规则（如复活刷新、掉落率）。旧日支配者低语污染精神，对玩家无效；玩家自带不死BUG，死亡后复活但丢失当前经验与装备。世界受位面枷锁限制，高维诡秘无法直接干涉低维，但可通过渗透控制。
## 4. 超凡体系 / 力量体系
双轨制：灵气修仙（境界：炼气、筑基、金丹、元婴、化神、大乘）与机械改造（义体强化、数据流功法、代码编程）。林砚主修数据流修仙，可融合灵气与机械代码，创造‘机械符箓’、‘量子飞剑’等技能。玩家升级靠刷怪爆修为与装备，无境界瓶颈，装备随机掉落。
## 5. 社会结构
社会结构（三层阶级，极度割裂）
顶层：修仙机械财团（神明阶级）
代表势力：青穹重工
掌握灵脉、义体工厂、阵法网络、最高战力。
大部分高层已经半邪神化，表面是人，内里是域外眷属。
中层：赛博修士、改造人、战斗者
拥有灵根或义体改造资格，负责出城猎杀畸变体。
随时可能被低语污染、疯狂、异化。
是最绝望的群体：越强大，越容易被邪神盯上。
底层：普通平民（耗材阶级）
无灵根、无改造、无战力。
只能在浮空城底层苟活，提供劳动力、灵气养料、实验体。
## 6. 势力体系（详情见 04_faction_bible/）
人类抵抗阵线（林砚领导，玩家军团为核心）、叛变修仙财团‘天网集团’（被邪神污染，掌控精英修士与义体科技）、机械军阀‘铁血议会’（信奉机械神教，与旧日神交易）、旧日邪神教团（深潜者、星之
…[P-clip]

## P3 · Adaptive Context
**记忆与历史：上文 / Memory / Adaptive — 优先裁剪**

### Story Memory
<!-- inkos-story-memory-writer -->
## Story Memory · 写作一致性（必须参考）
- **Theme**：在机械与灵气的末世中，人类联合不屈意志对抗不可名状之恶，探索自由意志与命运枷锁
- **未回收伏笔（勿遗忘）**：[object Object]
- **角色成长**：林砚（developing）

**本章优先处理**：
- 伏笔「[object Object]」已 16 章未回收，建议本章推进或兑现

### Memory Hierarchy
- L1 Voice：商业快节奏
- L1 核心：禁止提前揭晓章末钩子：位面碎片封印完成的瞬间，一道不属于任何已知维度的冰冷观测目光穿透虚空落在林砚身上——系统弹出红色警告：【检测到高维观测者；禁止无损撤回本章代价：林砚燃烧三成神魂本源，体内数据流与灵气出现不可逆的紊乱，未来突破更高境界将面临永；禁止无损撤回本章代价：林砚为掩护玩家撤退和夺取数据，被迫全力运转数据流权限，强烈的能量波动被青穹重工总；禁止提前揭晓章末钩子：发现型钩子；禁止无损撤回本章代价：时间或身体代价
- L2 Ch14：响，像吞了块烧红的铁。坐标指向的地方，不在城里，不在野外，在渊尊旗下的冷冻库房。他的手开始发颤，不是因为疼。 他转身去拔
- L2 Ch15：得不像自己的：“剩下多久？” 没人回答。屏幕自己跳了一行：通道将在11分钟后关闭。11分钟。他低头看自己那只焦毁的左手，
- L2 Ch16：拇指在按键上滑了半圈，才按下。对面接通的瞬间，他喉咙里滚出三个字：“薇，退——” 后半截被屏幕上一道横贯的红色数据流掐断
- L3 关键 S4@Ch15：林砚的手指悬在确认键上方。屏幕里，深渊底层的扫描图上，那条蜷缩在混沌之核旁边的轮廓，心跳频率和林薇的
- L3 关键 S1@Ch16：林砚的手指悬在确认键上方，屏幕光把指尖照成青白。他盯着那一行字——「全服投票：破坏封印·打BOSS爆
- L3 关键 S3@Ch16：林砚的手指悬在确认键上方，屏幕上的投票条还在滚动——全服玩家，七万四千人，超过九成点了同一个选项：破

### Adaptive Hints
<!-- inkos-adaptive-writer-directives -->
## Adaptive → Writer 执行指令（下一章/下一 Scene 须落地）

**Writer First**：以下由 Reader Feedback 学习得出，须写入正文，不是报告。
- Mystery Curve 断档 — 下一章须加深核心追问，禁止过早全解
- Payoff 兑现不足 — 下一章须回收本章伏笔，给读者「原来如此」
- 反转力度不足 — 下一章安排预期违背或信息翻盘
- Mystery Curve 断档 — 下一章须加深核心追问，禁止过早全解
- Payoff 兑现不足 — 下一章须回收本章伏笔，给读者「原来如此」
- 反转力度不足 — 下一章安排预期违背或信息翻盘
- Continue Probability 55% < 70 — 下一章自动提高 Hook 密度，逐 Scene 递进，章尾须峰值
- Question Count 偏低（0）— 下一章须新增谜团、信息差与悬念，禁止平叙收束

## 续写锚点
本章第一个 Scene：章首 300 字内须出现事件、冲突或异常信号。
禁止开篇：背景介绍、世界观、人物履历、环境铺陈。
正确顺序：动作/异常先行 → 角色反应 → 必要时才补原因。
仍禁止冗长背景综述与重复性主角介绍。

> **Historical Continuity**：续写锚点 / 环境余韵中的月日 ≠ 当前 Story Clock；当前日期以 Semantic Protected Context 为准。

## Scene 边界（五段式 · Writer 不得越界）
- **Goal**：承接上章情绪「紧迫·倒计时压迫」进入局面 · 承接「紧迫·倒计时压迫」进入现场：第1
…[P-clip]