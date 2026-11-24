<!-- inkos-prompt-compiler · unified-stack -->

## P0 · Format & Guardrails
**物理约束：格式 / 字数 / Craft·V2 / Anchor Voice DNA — 绝对保护**

### 风格样本（模仿质感，不要复述样本情节）
---
周一开门时，门槛缝里卡着一片枯叶。梧桐的。巷子里没有梧桐树，秋天也还没到。林守常蹲下去，没立刻捡，先对着光看叶柄的断口——是揪下来的，不是风吹落的。他把它夹进柜台上一本《植物名实图考》里，书卖了八年，塑封都没拆。
“目录”在抽屉里翻了个身，聋了的耳朵抖了抖。
老周是十点来的，挟着一本脱胶的《陶庵梦忆》，书脊像张开的嘴，塑料绳捆了两道。
“还你。”书撂在柜台上，“湖心亭看雪那章，脱胶了。”
林守常解开绳子，拇指顺着裂缝滑进去，停在那页。雪字正好裂成两半。
“修修？”
“不修。”老周从兜里掏出个橘子，搁在《辞海》上，想了想，又挪到旁边的《新华字典》上，“破损是时间的勋章。”
林守常没接话，从柜台下摸出糨糊瓶，用旧牙刷蘸了，涂在脱胶的书脊内侧。橘子在柜台上慢慢滚了半圈，停在收银机旁边。
老周看着他把书按在煤炉边烘干，突然说：“下周日？”
“嗯。”
“几点搬？”
林守常把书翻过来，对着光检查胶痕…
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
周一开门时，门槛缝里卡着一片枯叶。梧桐的。巷子里没有梧桐树，秋天也还没到。林守常蹲下去，没立刻捡，先对着光看叶柄的断口——是揪下来的，不是风吹落的。他把它夹进柜台上一本《植物名实图考》里，书卖了八年，塑封都没拆。
“目录”在抽屉里翻了个身，聋了的耳朵抖了抖。
老周是十点来的，挟着一本脱胶的《陶庵梦忆》，书脊像张开的嘴，塑料绳捆了两道。
“还你。”书撂在柜台上，“湖心亭看雪那章，脱胶了。”
林守常解开绳子，拇指顺着裂缝滑进去，停在那页。雪字正好裂成两半。
“修修？”
“不修。”老周从兜里掏出个橘子，搁在《辞海》上，想了想，又挪到旁边的《新华字典》上，“破损是时间的勋章。”
林守常没接话，从柜台下摸出糨糊瓶，用旧牙刷蘸了，涂在脱胶的书脊内侧。橘子在柜台上慢慢滚了半圈，停在收银机旁边。
老周看着他把书按在煤炉边烘干，突然说：“下周日？”
“嗯。”
“几点搬？”
林守常把书翻过来，对着光检查胶痕…
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
揭秘：中长句可，信息递进，留白，禁止一口气讲完。

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
**Emotion Directive**：不要解释恐惧。用动作表现：手抖、停顿、呼吸变浅、视线躲闪
- 用：手抖、停顿、呼吸变浅、视线躲闪、对白断裂、后退半步
- 禁止：他害怕了、她害怕了、他感到恐惧
- ❌ 他害怕了。
- ✅ 他的手停在半空。呼吸很轻。
**Writer Rhythm · 读者情绪/信息差**：放慢 · 停顿 · 留白 · 一句一句揭开 · 减少解释。
### Beat 2 · Obstacle（阻碍）
**Author Mode**：先让读者替 POV 着急，再局部兑现信息；兑现后立刻加更大威胁
- Beat 偏置：服从 Scene Author Mode，用动作落地
**Writer Intent（第一优先）**：制造压力
- 让读者感到「事情变难了」，危险须具体可感
- **Reader Experience**：焦虑（好奇 → 焦虑）
**Emotion Directive**：不要解释紧张。用动作表现：语速加快、动作变快、反复确认、握紧物体
- 用：语速加快、动作变快、反复确认、握紧物体、短句连打
- 禁止：他害怕了、她害怕了、他感到恐惧
- ❌ 他感到紧张。
- ✅ 门自己开了。她没动。
**Writer Rhythm · 读者情绪/信息差**：放慢 · 停顿 · 留白 · 一句一句揭开 · 减少解释。
### Beat 3 · Choice（抉择）
**Author Mode**：先让读者替 POV 着急，再局部兑现信息；兑现后立刻加更大威胁
- Beat 偏置：服从 Scene Author Mode，用动作落地
**Writer Intent（第一优先）**：描写显式 Choice 的行动
- 文学化表达已声明的选择行动及其即时可见结果；无 authored transformation 时禁止要求成长
- **Reader Experience**：紧迫（焦虑 → 紧迫）
**Emotion Directive**：不要解释挣扎。用动作表现：语速加快、动作变快、反复确认、握紧物体
- 用：语速加快、动作变快、反复确认、握紧物体、短句连打
- 禁止：他害怕了、她害怕了、他感到恐惧
- ❌ 他感到挣扎。
- ✅ 门自己开了。她没动。
**Writer Rhythm · 读者情绪/信息差**：放慢 · 停顿 · 留白 · 一句一句揭开 · 减少解释。
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
**Emotion Directive**：不要解释希望。用动作表现：呼吸放松、动作果断、对白变坚定、步伐加快
- 用：呼吸放松、动作果断、对白变坚定、步伐加快
- 禁止：他害怕了、她害怕了、他感到恐惧
- ❌ 他感到希望。
- ✅ 门自己开了。她没动。
**Writer Rhythm · 读者情绪/信息差**：放慢 · 停顿 · 留白 · 一句一句揭开 · 减少解释。
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
Chapter 3 · Scene 2 · POV 林守常
- **章目标**：阿婆如常来店里，不买东西，只坐在角落那把缺腿的椅子上晒太阳。临走时，她留下一个洗干净的橘子（没有塑料袋，用一块旧手帕包着）。林守常回赠一本缺页的《繁星·春水》。两人全程几乎没有对话。
- **Scene 目标**：克服阻碍：no_causal_basis
- **冲突**：no_causal_basis
- **字数目标**：~800

### Semantic Protected Context（F1 · 绝对保护 · 非 SR）
> Story Clock + Information Boundary：语义保护上下文。优先于任何 Historical Prior / 续写原文中的月日。
## Story Clock（Phase 1.R · Plan/State · 非 SR）
- **Canonical**：Day 1（source=intent_or_scene_field）
- 故事钟：Day 1。禁止另起无关的「×月×日」日历（除非上一场正文已确立具体月日）。相对时间（今早/昨夜）可以。 **若前序摘要 / Scene Memory / 旧草稿出现不同月日，以本 Canonical 为准，禁止跟随冲突日期。**
<!-- prompt-compiler v2 | scene=ch3_s2 | tokens=670 | profile=dialogue | cache=100% | compile=10ms -->
## 信息边界（Phase 1.R · 必守）
- Scene 目标 / 冲突 / 章目标中的事实 = 写作任务与世界信息，**不是** POV 角色的先验 Awareness。
- 若 Character Subjective State 中该角色 Awareness = omit：禁止写成其「已经知道 / 亲眼看见 / 确知」这些任务事实；允许本场新获知并写出获得过程。
- World / Narration ≠ Character Knowledge。

### Information Boundary（消费纪律 · Phase 1.R）
- **World / Narration ≠ Character Knowledge**。
- Scene Goal、冲突、时间线、世界设定、其他角色经历 = 世界/任务信息，**不是** POV 已知事实。
- Character Subjective State 有明确 Awareness → 可写为该角色已知/经历。
- Awareness = omit / unknown → **禁止**写成该角色「已经知道 / 亲眼看见
- **Interpretation**：omit / unknown（无合法解释证据）
- **Belief**：omit / unknown（无合法信念证据；Belief 可与 Canon 不符）
- **Stance**：omit / unknown（无合法立场证据）### 林守常
- **Awareness**：omit / unknown（无合法知悉证据 → 不得写成角色先验已知）
- **Motive**：omit / unknown（无当前场景合法动机证据；Bible 不得自动生成）
- **Affect / Relationship**：omit / unknown
- **Validity**：current

### Chapter Author Goal · 章节写作目标

**Writer 不只完成剧情。须完成：读者看完这一章留下什么感觉。**

```
chapterAuthorGoal:
  readerEmotionStart: 震惊
  readerEmotionEnd: 愤怒
  mainFeeling: 这一章让读者对林守常上瘾，并感到谜团在扩大：阿婆如常来店里，不买东西，只坐在角落那把缺腿的椅子上晒太
  mustRemember: 故事格局改变 — 释放改变全书认知的信息 — 不是「又发现一个线索」，而是「规则
```

- **Writer 必做**：本章结束后，读者须感到「这一章让读者对林守常上瘾，并感到谜团在扩大：阿婆如常来店里，不买东西，只坐在角落那把缺腿的椅子上晒太」，并记住：故事格局改变 — 释放改变全书认知的信息 — 不是「又发现一个线索」，而是「规则
- 章内情绪须从「震惊」走到「愤怒」

- 禁止：只完成剧情节点却没有留下章级感觉
- 禁止：章末情绪与起点相同
- 禁止：可读完却说不出「这一章最吓人/最重要的一点」

### Writer Scene Arc · 职业作者结构（P1）
**Scene 节奏**：Goal → Conflict → Choice → Consequence → Reward → New Threat

- **Goal**：克服阻碍：no_causal_basis
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
SceneType：dialogue · 字数目标 ~800
1. **Goal（主角目标）** [Discovery] · ~80 字
   克服阻碍：no_causal_basis · [dialogue] 目标通过对白或试探行为体现 · 视觉瞬间：门缝外走廊里的人影像被按了暂停，尘埃在光柱里抖
2. **Obstacle（阻碍）** [Relationship] · ~144 字
   no_causal_basis · [dialogue] 立场对立，信息不对称
3. **Choice（抉择）** [Twist] · ~144 字
   — · [dialogue] 对白逼出选择 — 信还是不信、说还是不说 · transformation evidence missing — 避免虚构未发生的人物变化 · behavior basi
4. **Consequence（代价落地）** [Danger] · ~128 字
   — · [dialogue] 选择通过对白后果显现，关系改变
5. **New Information（信息新增）** [Twist] · ~184 字
   推进已揭示信息的后果，禁止「第一次发现」 · [dialogue] 对白揭示新事实，禁止重复质问 · 反转瞬间：屏幕最底下一行不是警告，是他的名字，后面跟着「已归档」
6. **Hook（段末悬念）** [Countdown] · ~120 字
   妹妹活下来了 — 系统日志里出现了她的名字。 · **Hook Ladder · 不可回头（PointOfNoReturn）+ Action Hook** — 逼 POV 行动，不是只发现秘密 · -

<!-- scene-beat-state-plans -->
## Beat 状态链 · Before → Action → After

> 链上 Before/After = **EXPECTED TARGET**（规划模板）；正式连续性以 Observed Continuity / scene.text 为准。

每个 Beat 必须改变至少一个：人物关系 / 信息状态 / 危险等级 / 资源状态 / 目标方向 / 世界认知

**goal**：〔EXPECTED〕林守常当前目标：克服阻碍：no_causal_basis — 局势尚未被本 Scene 改写 → [克服阻碍：no_causal_basis] → 〔EXPECTED〕POV 已锁定可执行目标，局面即将被打破
**obstacle**：〔EXPECTED〕POV 已锁定可执行目标，局面即将被打破 → [⚠ obstacle] → 〔EXPECTED〕阻力落地，目标受挫，退路收窄
**choice**：〔EXPECTED〕阻力落地，目标受挫，退路收窄 → [⚠ choice（具体两难抉择，禁止用 scene goal/模板填）] → 〔EXPECTED〕POV 已做出不可逆选择，后果即将落地
**consequence**：〔EXPECTED〕POV 已做出不可逆选择，后果即将落地 → [⚠ consequence] → 〔EXPECTED〕局势向终局推进 — 林守常当前目标：克服阻碍：no_causal_basis — 局势尚未被本 Scene 改
**newInformation**：〔EXPECTED〕代价已落地，局面比选择前更紧或更糟 → [⚠ newInformation] → 〔EXPECTED〕局势向终局推进 — 林守常当前目标：克服阻碍：no_causal_basis — 局势尚未被本 Scene 改
**hook**：〔EXPECTED〕同一界面的反馈更新了局势，POV 须据此行动 → [妹妹活下来了 — 系统日志里出现了她的名字。] → 〔EXPECTED〕林守常当前目标：克服阻碍：no_causal_basis — 局势尚未被本 Scene 改写 → 本 Scene 结束后，世界认知/危险/资源须与开局不同

⚠️ **Beat Plan 退化**：拍 2/3（obstacle → choice）连续两拍空洞：无具体动作/抉择/新信息，choice 与状态均未变；拍 4/5（consequence → newInformation）连续两拍空洞：无具体动作/抉择/新信息，choice 与状态均未变
不允许以空洞计划进入 Writer——缺口拍必须由 Writer 填上具体动作/抉择/新信息，否则按硬失败拒稿。

### Conflict Engine · Conflict Pressure（P1）
**边界**：Conflict Situation ≠ Choice Consequence；Potential Risk ≠ Authored Consequence
- **Opponent（阻力源）**：周一，林守常打开店门时，发现门槛内侧躺着
- **Conflict pressure（局势）**：no_causal_basis
- **Potential risk（未决威胁）**：如果现在不行动，谁会受伤？
- Writer：只写 conflict pressure / potential risk；无 authored consequence/cost 时，勿写成人物已选定并已承担结果
- ⚠️ cost basis 非 authored 或缺失 — 勿补 Choice consequence

### Situation Engine v2 · 三维状态变化（P1）
**完成标准**：世界/关系可推进；人物变化仅在有 authored transformation 时陈述
- **世界**：林守常当前目标：克服阻碍：no_causal_basis — 局势尚未被本 Scene 改写 → 林守常当前目标：克服阻碍：no_causal_basis — 局势尚未被本 Scene 改写 → 本 Scene 结束后，世界认知/危险/资源须与开局不同
- **人物**：character transformation: missing（Choice ≠ Character Transformation；勿预写人物 After）
- **关系**：林守常与重要关系人的关系尚未被本 Scene 事件改写 → 林守常与重要关系人的关系尚未被本 Scene 事件改写 → 林守常与重要关系人的关系须与本 Scene 前不同
- **变化摘要**：人物：character transformation missing（Choice ≠ Character Transformation） · 关系：「林守常与重要关系人的关系尚未被本 Scene 事件」→「林守常与重要关系人的关系尚未被本 Scene 事件」
- **已变维度**：relationship（1/3）
**禁止**：无证据时编造人物成长 / 信念变化 / 不可逆人物结论
- ⚠️ **Director 警告**：世界或关系推进不足（人物轴缺失合法，勿用假成长补维度）

### Character Goal · 角色必推进（P1）
- **POV**：林守常
- **缺口**：无 authored desire — 禁止用默认恐惧/信念冒充人物心理
- **铁律**：缺失 > 假完整

### Character Transformation · 人物成长（P1）
- **状态**：transformation evidence missing
- **Writer**：transformation evidence missing — 避免虚构未发生的人物变化

### Human Behavior · Choice 须像真人（P1）
**缺口**：behavior basis missing — 禁止编造私人动机。
- **铁律**：缺失 > 假完整

### Emotion Curve · 情绪控制（P1 辅助）
- **Scene 情绪弧**：恐惧 → 挣扎 → 震惊 → 希望
- **禁止**：全程恐怖/全程紧张 — 读者会疲劳
- **必须**：至少一次释放或希望，再推入更大危机
- **落地**：情绪用动作/对白/节奏体现，禁止贴标签式心理描写

### Reader Emotion · 读者情绪（P1 辅助）
**与角色情绪分离** — 控制读者追读压力，不是 POV 内心戏
- **读者情绪**：紧张 → 揪心 → 揪心 → 紧张
- **Emotion Wave**：Tension → Pressure → Hope → Shock → Relief → Tension
- **波浪形态**：压 → 放 → 压 → 放 → 爆
- **角色情绪（对照）**：恐惧 → 希望
- **信息差**：读者与 POV 同步收紧
- **戏剧反讽**：读者压力源：如果现在不行动，谁会受伤？
- **readerKnows**：如果现在不行动，谁会受伤？
- **heroKnows**：克服阻碍：no_causal_basis
- **enemyKnows**：no_causal_basis
**铁律**：
- 读者可以比 POV 更紧张（读者知道危险，角色不知道）
- 禁止角色全程恐惧 — 用事件与信息差推读者情绪
- 禁止连续平平平平；禁止一直高潮；须压→放→压→放→爆
- 用镜头/对白/细节让读者「揪心」，禁止旁白解释
- 禁止所有角色知道同样的信息 — 必须制造信息差

### Scene Rhythm · 本段节奏（P3 辅助 / P1 高潮段强化）
- **阶段**：Slow（慢）
- **写法**：呼吸位：动作暂停，插入一段安静——环境细节 / 回忆闪回 / 角色沉默 / 生理喘息。禁止推进新情节、禁止新倒计时。让读者消化前情。

### Hook Output · Action Hook（本 Beat 须落地）
```json
{
  "hookKind": "ActionHook",
  "type": "PointOfNoReturn",
  "discovery": "选择之后会发生什么（下一章必须承接）",
  "actionDeadline": "若现在不选择，退路将在三十秒内关闭",
  "newGoal": "克服阻碍：no_causal_basis",
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
- 欲望（desire）: 「周岚」想 在最后一周里试图用高价买下书店所在房产，以解决债务危机
- Authorial Planned Direction: missing_choice_basis
- 新信息（new_information）: 梧桐叶是谁放的——巷子里没有梧桐，断口齐整如刀切
- 下一压力（next_pressure）: 未解悬念维持：梧桐叶是谁放的——巷子里没有梧桐，断口齐整如刀切
- 缺因果依据（no_causal_basis）: missing_pressure / missing_choice_basis / missing_consequence

## P2 · Global Lore
**设定约束：Story DNA / Canon 摘录 / 人物快照 — 可裁剪（Voice DNA 已移出）**

### Story DNA（摘录）
- **core_hook**：周一，林守常打开店门时，发现门槛内侧躺着一片枯叶。梧桐的。这条巷子里没有梧桐，秋天也还没到。他弯腰捡起来，对着光看了看叶脉，把它夹进了柜台上一本积灰的书里。那本书叫《植物名实图考》，卖了七年，始终没人买走。
"目录"从抽屉里探出头，聋了的耳
- **genre**：历史脑洞

### World Bible (01_world_bible.md)
# 01 World Bible · 二手书店老板的最后一周 
> Studio AI 自动生成
## 1. 世界背景 / 时代
蒸汽与电气交替的黄昏时代，城市钟楼顶层仍靠发条驱动，但街角已亮起第一盏钨丝灯。日历停在连续第七个「星期日」，但人们照常上班、照常吵架、照常把旧书垫在橘子篮下。
## 2. 世界历史
三百年前，一场「大静默」让所有印刷文字短暂消失，直到一位无名装订匠用旧报纸糊墙，才让第一句话重新出现在人间。此后，城市立誓保存每一页纸，但无人记得誓言。书店老板的祖父是最后一位「记忆装订师」，他去世时把一整柜手抄本交给了孙子，说：「别卖，每天读一页，读到第七天，你自然知道怎么办。」老板没读过，他只在每天清晨把新到的旧书按厚度排好。
## 3. 世界规则
星期一：任何被翻过三次以上的书，封底会渗出淡淡的油墨味，气味对应书中最常出现的情绪。,星期二：书店角落的藤椅会自行前后摇晃，但只在有人说出「明天再说」时停住。,星期三：从旧书里掉出的车票、照片、处方笺，若当天未放回原书页，第二天会出现在店门口台阶上，位置不变。,星期四：橘子若压在报纸上超过三小时，报纸上被压住的那段文字会褪色，而橘子表皮会浮现相同的句子。,星期五：所有书脊朝外的书，在午夜会整齐地转向朝内，像在面壁。,星期六：老板会在打烊后烧掉一页没人要的空白页，灰烬飘向的方向，是第二天唯一会进店的顾客的来向。,星期日：不营业。但门缝下会塞进一张写有「再见」的纸片，字迹每年不同，去年是七岁女孩的铅笔字。
## 4. 超凡体系 / 力量体系
「旧页共鸣」——不属于任何人的超自然法则，由被遗忘的文字残留驱动。能力者被称为「听页人」，可通过触摸纸面感知书写者的情绪片段，但代价是逐渐忘记自己的记忆。书店老板从未承认自己是听页人，但他每天打烊后都会用拇指划过每本书的书脊，像在点数羊群。
## 5. 社会结构
市民按「读过书页数」划分等级：读过一万页以上的称为「页人」，可进入图书馆废墟采风；读过一千页到一万页的为「折页工」，负责把旧书拆散再装订成新册；读过十页以下的被称作「空白者」，只能在集市摆摊卖橘子。书店老板从不解释自己属于哪一级，但所有「空白者」都愿意把最蔫的橘子留给他。
## 6. 势力体系（详情见 04_faction_bible/）
[object Object],[object Object],[object Object]
## 7. 地理 / 地图
城市呈同心圆结构，最外圈是锈蚀的工业环带，向内依次是杂货市场、市政大厅、图书馆废墟，圆心是「旧书店街」——一条只有十米长却永远走不到头的巷子。书店位于巷子的第七个门洞，门牌锈得只剩下「二」字。
危险区域：[object Object],[object Object]
### 主要城市
[object Object],[object Object]
### 危险区域
[object Object],[object Object]

### 重要地点
[object Object],[object Object],[object Object]
## 8. 禁忌

### Canon / Dynamic Lore
# Scene Lore Seed
Scene 2/4 · POV 林守常
- 目
…[P-clip]

## P3 · Adaptive Context
**记忆与历史：上文 / Memory / Adaptive — 优先裁剪**

### Story Memory
<!-- inkos-story-memory-writer -->
## Story Memory · 写作一致性（必须参考）
- **未回收伏笔（勿遗忘）**：[object Object]；[object Object]；[object Object]；[object Object]
- **角色成长**：林守常（developing）

### Memory Hierarchy
- L1 Voice：商业快节奏
- L1 核心：禁止无损撤回本章代价：【角色代价: 失去之物】他接住的不是一件买卖，是一个不肯说出口的处境——他用「多；禁止重开篇式介绍世界观与主角履历；禁止复述上一章已确认的同一事实（换角度推进）；禁止提前揭晓章末钩子：「目录」在抽屉里翻了个身，尾巴扫过那张卡片。他盯着那张卡看了两秒——卡缘微微卷着，像被压在某本书里很多年。他没有把它放回；禁止无损撤回本章代价：他接下了一桩不该接的交易，也接住了一个不愿被点破的谎——他在用「多做一点、多给一
- L2 Ch1：的一声。他转身，柜台上的橘子还在，皮上沾着灰。他拿起来，没擦，搁在胸袋那叠纸旁边。 屋里暗下来。他站在柜台后头，听着墙上
- L2 Ch2：了。 他没叫她别走，也没跟出去，只把手电往前推了半步，光斑扫过门槛外面一串黏糊糊的脚印，正往巷子的暗处走。橘子皮的甜味还
- L3 关键 S3@Ch1：柜台后的布帘被穿堂风掀了一下，露出墙上一道水渍，像条枯瘦的河。林守常把橘子从收银机边捡起来，橙皮在指
- L3 关键 S2@Ch2：他把纸片夹进《辞海》第 1126 页和 1127 页之间，指腹蹭过纸张边缘时，突然停了。那边沿有铅笔
- L3 关键 S3@Ch2：中午十二点刚过，收书单上的字迹还没干，店门铃被风箱般拉响，林守常从柜台后面推出来，只撑住右边的门框，

### Adaptive Hints
<!-- inkos-adaptive-writer-directives -->
## Adaptive → Writer 执行指令（下一章/下一 Scene 须落地）

**Writer First**：以下由 Reader Feedback 学习得出，须写入正文，不是报告。
- payoffDensity: 加强伏笔回收 — 兑现前文悬念或部分揭晓（46/100）
- readerCuriosity: 提升阅读驱动力 — 代价逼近、选择收窄、好奇心悬而未决（50/100）
- dialogue: 用对白推进冲突，避免说明式旁白（59/100）
- twistStrength: 加强反转力度 — 预期违背、信息翻盘或身份反转（69/100）
- [角色成长] 下一章须推动 周岚 做出不可逆选择或付出代价

## 续写锚点
上一 Scene 尚无正文缓存：从本 Scene Start 自然进入，禁止重新介绍主角、禁止重新开篇。

> **Historical Continuity**：续写锚点 / 环境余韵中的月日 ≠ 当前 Story Clock；当前日期以 Semantic Protected Context 为准。

## Scene 边界（五段式 · Writer 不得越界）
- **Goal**：克服阻碍：no_causal_basis
- **Obstacle**：no_causal_basis
- **Escalation**：complication
- **New Information**：至少一条新规则或谜团
- **Hook**：段末悬念
- **Start**：从上一 Scene 结尾动作/对话直接延续
- **End**：Escalation 可见，代价或选择收窄
- 写到 **Hook** 即停止，不得进入下一 Scene 或全章总结。

## Reveal Manager · 信息释放预算
- 章节：第 3 章 | Scene 2 (complication)
- 本章已用世界观术语约 0 次（预算 8）
- 本章已揭示秘密线索约 0 次（预算 3）
- **首章禁止信息倾泻**：不得集中解释世界观、制度、历史背景
- 只写 POV 当下可感知的一个细节，让读者自己拼图
- 本 Scene：可暗示 1 条矛盾，不说破
- **信息增量铁律**：本 Scene 必须至少新增以下之一（禁止复述已知）：
  · 一
…[P-clip]