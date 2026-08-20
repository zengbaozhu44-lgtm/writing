# WORK_REPORT — 只读审计：deriveSceneFear 孤儿导出 + P3.7 文档债务

## 1. 审计目标

- 搜索 `deriveSceneFear` 的 definition、export、import、direct call、indirect reference。
- 范围：packages、scripts、tests、fixtures、docs（尽可能基于已加入聊天的文件和已有摘要）。
- 同时检查 P3.7 已列文档债务：
  - AGENTS.md
  - docs/runtime/43
  - docs/runtime/54
  - _ai_system_map/01、03、04、09、11
  - Golden README
- 不修改任何文件，不删除任何文件。
- 最终只报告：已证事实、file:line、未完成项、下一步最小修改范围。

## 2. 方法与限制

- 当前审计基于：
  - 已加入聊天的文件：`packages/inkos-brain/src/prompt/dynamic-prompt.js`、`AGENTS.md`、`WORK_REPORT.md`
  - 你此前提供的只读文件摘要（不含完整行号）
- 无法在本对话中执行全仓 grep，因此“0 call sites”目前是**部分确认**，仅针对已观察到的内容。
- 真正的 0-call-site 确认需要在实际仓库中运行一次全仓搜索（包括 tests/fixtures/docs），本报告为其提供待执行的搜索清单。

## 3. deriveSceneFear 审计结果（已观察范围）

### 3.1 定义 / export
- 在已加入聊天的 `packages/inkos-brain/src/prompt/dynamic-prompt.js` 中，**未**发现 `deriveSceneFear` 的定义或 export。
- 在此前提供的只读摘要中，也没有任何文件明确显示 `deriveSceneFear` 的定义或 export。

### 3.2 import / direct call / indirect reference
- 在已加入聊天的文件中，**未**发现任何对 `deriveSceneFear` 的 import、direct call 或 indirect reference。
- 在此前提供的只读摘要中，同样未发现相关引用。

### 3.3 结论（已观察范围）
- 当前观察范围内：`deriveSceneFear` 没有可见的 definition/export，也没有可见的 consumer。
- 这与“孤儿导出”假设一致，但尚未定位到唯一 export 来源。

### 3.4 需要补充的全仓搜索（待执行）
为真正确认 0 call sites，建议在仓库中运行以下搜索：

1. 全仓文本搜索：
   - `deriveSceneFear`（不限定扩展名）
   - 特别检查：
     - `packages/inkos-brain/src/**`
     - `packages/inkos-brain/src/prompt/**`
     - `packages/inkos-brain/src/**/*.js`
     - `packages/inkos-brain/src/**/*.ts`
     - `scripts/**`
     - `tests/**`
     - `fixtures/**`
     - `docs/**`
     - `_ai_system_map/**`
2. 导出/导入模式检查：
   - `export.*deriveSceneFear`
   - `import.*deriveSceneFear`
   - `from ['"]...deriveSceneFear['"]`
   - `require(...deriveSceneFear...)`
3. 间接引用检查：
   - 任何仅提及该函数名的注释或文档（例如“此处使用 deriveSceneFear”）也应列入 consumer map。

## 4. P3.7 文档债务审计（已观察范围）

### 4.1 AGENTS.md
- 已观察版本已去除手动串联 `brain plan` → `brain scene` → `brain run` 的引导。
- 当前内容与 Runtime 2.0 全自动闭环描述一致。
- 未发现明显的 P3.1 旧架构描述残留（基于当前文本）。
- 状态：**已部分核对，未修改**。

### 4.2 docs/runtime/43、docs/runtime/54
- 当前对话中**未加入**这两个文档。
- 无法确认是否仍有失实描述。
- 状态：**未审计**（需要加入后阅读）。

### 4.3 _ai_system_map/01、03、04、09、11
- 当前对话中**未加入**这些映射文件。
- 无法确认是否仍有描述 P3.1 旧架构的部分。
- 状态：**未审计**（需要加入后阅读）。

### 4.4 Golden README
- 当前对话中**未加入**该 README。
- 此前提到其中可能存在“规划零重试”之类的失实描述，但本次未验证。
- 状态：**未审计**（需要加入后阅读）。

## 5. 已证事实（截至当前）

- 在已加入聊天的文件中，`deriveSceneFear` 没有 definition/export，也没有 consumer。
- AGENTS.md 当前文本已不包含手动串联脑管线的引导，与 Runtime 2.0 描述一致。
- 其余 P3.7 文档债务文件尚未纳入审计范围，无法确认是否存在失实描述。

## 6. file:line consumer map（已观察范围）

- `packages/inkos-brain/src/prompt/dynamic-prompt.js`：
  - 无 `deriveSceneFear` 相关记录（无 definition/export，无 import/use）。
- 其余文件（已加入或已摘要）：
  - 未发现 `deriveSceneFear` 相关记录。

注意：这里的“file:line”无法给出具体行号，因为当前观察范围内没有命中。如果全仓 grep 发现任何命中，应补充为 `file:line` 形式。

## 7. 未完成项

- 确认 `deriveSceneFear` 的唯一 export 来源（如果存在）。
- 确认 0 call sites（需全仓 grep，包括 tests/fixtures/docs/scripts）。
- 审计以下文档债务文件（需加入后阅读）：
  - `docs/runtime/43`
  - `docs/runtime/54`
  - `_ai_system_map/01`
  - `_ai_system_map/03`
  - `_ai_system_map/04`
  - `_ai_system_map/09`
  - `_ai_system_map/11`
  - `Golden README`
- 确认上述文档中是否仍有描述 P3.1 旧架构或其他失实内容。

## 8. 下一步最小修改范围（仅供后续参考，不执行）

若后续确认以下前提：

- `deriveSceneFear` 确实存在唯一孤儿 export；
- 且全仓 grep 确认 0 call sites；

则最小修改范围仅为：

- 删除该孤儿 export（仅限定义它的文件）。
- 不碰调用方（因为不存在）。
- 不改 Runtime 行为。
- 不删脚本。
- 删除后再次全仓 grep，确保无残留。

对于文档债务：

- 仅修改已确认过时的描述。
- 不推导新架构。
- 不改源码。
- 不删文件。

## 9. 建议的后续操作顺序

1. 加入上述 P3.7 文档债务文件，逐一阅读并标记冲突点。
2. 在实际仓库中运行全仓 grep，确认 `deriveSceneFear` 的 definition/export 和所有 consumer。
3. 若确认 0 call sites 且存在孤儿 export，则按最小范围删除该 export。
4. 若发现文档债务中的失实描述，则仅同步事实，不重构架构描述。
5 完成后运行文档相关的 grep + regression/golden（如有）。

## 10. 备注

- 本报告是只读审计结果，不包含任何文件修改。
- 所有结论都附带了“已观察范围”或“未审计”的状态，便于其他 AI 接续。
