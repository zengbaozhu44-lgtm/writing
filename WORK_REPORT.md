# WORK_REPORT — InkOS 文档事实对账 + 孤儿导出清理

## 1. 任务 ①：文档事实对账（已完成）

### 1.1 扫描范围
- AGENTS.md（仓库根）
- packages/inkos-brain/src/prompt/dynamic-prompt.js（已加入聊天）
- 其余只读文件未加入聊天，未做修改

### 1.2 发现的冲突点
- 旧版 AGENTS.md 中仍保留对 P3.1 旧架构的描述（如手动串联 brain plan / brain scene / brain run 的引导语）。
- Golden README 中曾出现“规划零重试”之类的失实描述（本次未直接修改 Golden README，因为未加入聊天；后续需单独处理）。

### 1.3 已完成的修改
- 更新 AGENTS.md：
  - 删除所有暗示“手动串联 brain plan → brain scene → brain run”的旧引导。
  - 明确 Runtime 2.0 全自动闭环流程，强调不要手动串联。
  - 保留 V4 + Runtime 2.0 / Brain 1.0 旧管线 / V4 无 Brain 三种模式的判断表。
  - 保留禁止新增 Markdown 知识库、禁止堆 Prompt、Scene 失败不写下一 Scene 等纪律。
  - 保留 InkOS Studio UI 2.0 的定位（Novel Runtime Console）及前端/API 包说明。

### 1.4 未修改的部分
- packages/ 目录下的任何文件（只读）。
- Runtime 行为（未改变）。
- 脚本（未删除）。

### 1.5 验证方式（建议）
- grep 仓库：确认不再出现“brain plan”、“brain scene”、“brain run”串联指引（除 legacy 模式说明外）。
- 回归文档相关的 README / AGENTS 引用，确保没有引入新架构推导。
- 运行文档相关的 regression / golden 检查（如有）。

---

## 2. 任务 ②：deriveSceneFear 孤儿导出清理（待执行）

### 2.1 当前状态
- 尚未确认零 call sites。
- 尚未确定具体文件中的孤儿导出位置。
- 已加入聊天的 dynamic-prompt.js 中**未**出现 deriveSceneFear 的导出或引用。

### 2.2 需要添加到聊天的文件（建议）
- 可能包含 deriveSceneFear 定义/导出的 brain prompt 模块（例如 `packages/inkos-brain/src/prompt/*.js` 或相关 index）。
- 任何可能引用 deriveSceneFear 的调用点（grep 结果）。

### 2.3 执行步骤（纪律）
1. 确认 0 call sites（grep 全仓）。
2. 删除函数 / export。
3. 再次 grep 全仓，确保无残留。
4. 运行 module-4 + regression + golden。

### 2.4 风险控制
- 不碰 packages/ 外的文件（除非确认是孤儿导出的来源）。
- 不改变 Runtime 行为。
- 不删除脚本。

---

## 3. 后续建议

- 若要继续任务 ②，请提供包含 deriveSceneFear 的源文件（或确认它确实是孤儿导出）。
- 若要处理 Golden README 的“规划零重试”失实描述，请将该 README 加入聊天后再修改。
- 所有修改均以“事实同步”为限，不推导新架构，不改源码，不删文件。

---

*报告生成时间：2026-02（根据当前上下文）*
