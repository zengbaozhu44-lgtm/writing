# WORK_REPORT — 只读审计：deriveSceneFear 孤儿导出 + P3.7 文档债务（审计阶段）

## 1. 当前任务状态

- 目标：在允许任何删除之前，先完成全仓定位和 consumer map。
- 当前阶段：**只审计，不修改**。
- 已加入聊天的文件：
  - `packages/inkos-brain/src/prompt/dynamic-prompt.js`
  - `AGENTS.md`
  - `WORK_REPORT.md`

## 2. 当前状态标注

- P3.7-B4 / deriveSceneFear — **AUDIT INCOMPLETE / DELETE BLOCKED**
- 尚未得出“孤儿确认”结论。
- 当前不允许执行删除步骤。

## 3. 已观察范围的审计结果

### 3.1 `packages/inkos-brain/src/prompt/dynamic-prompt.js`
- 内容：仅导出 `buildDynamicPrompt` 和 `buildDynamicContextForChapter`。
- `deriveSceneFear` 检查结果：
  - definition：未发现
  - export：未发现
  - import：未发现
  - direct call：未发现
  - indirect reference：未发现

### 3.2 `AGENTS.md`
- `deriveSceneFear` 检查结果：
  - definition：未发现
  - export：未发现
  - import：未发现
  - direct call：未发现
  - indirect reference：未发现

### 3.3 `WORK_REPORT.md`
- `deriveSceneFear` 检查结果：
  - definition：未发现
  - export：未发现
  - import：未发现
  - direct call：未发现
  - indirect reference：仅文档内部提及该名称（元级别提及），不算生产/测试/脚本 consumer。

## 4. 当前 consumer map（已观察范围）

- production consumer：0
- test consumer：0
- script consumer：0
- fixtures consumer：0
- docs-only reference：0（除 WORK_REPORT 元提及外）
- definition / export 来源：未在已观察范围内定位

注意：这里的 file:line 为空，因为在已观察文件中没有命中。

## 5. 全仓只读 grep 要求（必须执行）

为确认“0 consumers + orphan export”，需要在实际仓库中运行全仓搜索，覆盖：

- `packages/`
- `scripts/`
- `tests/`
- `fixtures/`
- `docs/`
- `_ai_system_map/`
- 以及 JS/TS/JSON/Markdown 等非源码文件

### 5.1 搜索项

1. 名称定位
   - `deriveSceneFear`

2. 按角色分类
   - definition / export：
     - `export.*deriveSceneFear`
     - 函数声明形式：`function deriveSceneFear`、`const deriveSceneFear`、`deriveSceneFear =`
   - import：
     - `import.*deriveSceneFear`
     - `from ['"]...['"]` 中包含 `deriveSceneFear`
     - `require(...deriveSceneFear...)`
   - direct call：
     - `deriveSceneFear(`
   - indirect reference：
     - 注释或文档中提及该函数名
     - 字符串常量或键名中包含该名称（如果有）

### 5.2 分类规则（重要）

- 不要把“任意字符串命中”全部算作 consumer。
- 例如：
  - `const name = "deriveSceneFear";`
  - 历史审计文档里的“deriveSceneFear 是孤儿导出”
- 这些应分类为 reference / docs-only，而不是 consumer。
- 真正阻止删除的是：
  - definition / export
  - import
  - callable reference
  - dynamic require
  - re-export chain

### 5.3 输出格式要求

最终表格应压缩成这样的形式：

file:line	命中内容	类型	是否阻止删除
xxx.js:123	function deriveSceneFear	definition	—
xxx.js:456	export { deriveSceneFear }	export	—
yyy.js:78	deriveSceneFear(...)	production consumer	❌
tests/...:20	import	test consumer	❌
scripts/...:30	import	script consumer	❌
docs/...:40	文档提及	docs-only	通常不阻止
WORK_REPORT.md:...	审计文字	meta	不阻止

## 6. 允许的结果路径

### A. 真正确认孤儿

- definition/export = 1
- production = 0
- tests = 0
- scripts = 0
- fixtures = 0
- docs = 0（或仅历史/审计记录）

→ 才进入删除。

### B. 出现任何真实 consumer

- 立即停止。
- 不得由 Aider 自行判断“这个 consumer 应该也能删”。

## 7. 任务拆分建议（保持节奏）

- B4 deriveSceneFear
  - 全仓审计
  - 确认孤儿
  - 1 处最小删除
  - 回归

- B1/B2 文档事实对账
  - 逐文件只读审计
  - 冲突清单
  - 拍板
  - 最小文字修改
  - 回归

不要把 deriveSceneFear 和文档债务混成一个修改任务。

## 8. 回归要求（后续删除时）

- 删除后跑固定的 module-4 + regression + golden 3×。
- 每次执行后的结果和修改说明写入 WORK_REPORT.md，方便转给其他 AI 查看。

## 9. P3.7 文档债务审计状态（未变）

- 已观察：`AGENTS.md`（当前文本与 Runtime 2.0 描述一致，未发现手动串联脑管线引导）。
- 未加入、未审计：
  - `docs/runtime/43`
  - `docs/runtime/54`
  - `_ai_system_map/01`
  - `_ai_system_map/03`
  - `_ai_system_map/04`
  - `_ai_system_map/09`
  - `_ai_system_map/11`
  - `Golden README`
- 这些文件仍需要加入后阅读，才能确认是否存在 P3.1 旧架构描述或其他失实内容。

## 10. 备注

- 本次更新仅为审计记录，不修改任何文件内容。
- 所有结论都带有范围限制，便于后续接续。
