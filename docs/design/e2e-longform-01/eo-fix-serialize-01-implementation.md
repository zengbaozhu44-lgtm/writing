# EO-FIX-SERIALIZE-01 — Implementation Record

**Status**: `EO-FIX-SERIALIZE-01 — IMPLEMENTED / VALIDATED — STOP`
**Date**: 2026-11-01 · **Authorization**: EO-FIX-SERIALIZE-01 ONLY

## 1. 实际修改文件和函数

**仅一个生产文件**：`packages/inkos-studio-server/src/ai-serializers.js`

| 变更 | 内容 |
|---|---|
| 新增 `normalizeFieldValue()` 局部 helper | 类型归一纯函数（~40 行）：string/number/boolean 原样；null/undefined→空串；object→JSON.stringify；array→递归逐项+`；`分隔 |
| `serializeWorldMd` 内部 | 每字段从 `${f.X \|\| ''}` 改为 `${normalizeFieldValue(f.X)}`；ternary 条目同步改 |

**新增测试文件**：`scripts/test-eo-fix-serialize-01.js` + `package.json` script 注册。

**其余函数零变更**（diff 确认 `serializeWritingMd` / `serializeChapterTaskMd` / `serializeCharacterMd` 未动）。

## 2. 修改前后数据流

```
Before:
  LLM JSON → extractJson（无校验）→ fields 对象
    f.history = {period:"近代"} → `${f.history}` → "[object Object]"
    f.rules = ["A","B"] → `${f.rules}` → "A,B"（碰巧可读但依赖默认 toString）

After:
  LLM JSON → extractJson（无校验，不改）→ fields 对象
    f.history = {period:"近代"} → normalizeFieldValue → '{"period":"近代"}'
    f.rules = ["A","B"] → normalizeFieldValue → "A；B"
    f.era = "现代都市" → normalizeFieldValue → "现代都市"（string 原样零变换）
    f.era = 0 → normalizeFieldValue → "0"（不清空）
```

## 3. 类型归一行为表

| 输入类型 | 输出 | 验证 |
|---|---|---|
| string | 原样（零变换，不 JSON.stringify） | R4 ✓ |
| number（含 0） | String(n)，保留 0 | R6+附加 ✓ |
| boolean（含 false） | String(b)，保留 false | R6+附加 ✓ |
| null / undefined | 空串 | R5 ✓ |
| object | JSON.stringify(v, null, 0) | R1 ✓ |
| string array | 逐项原样+`；`连接 | R2 ✓ |
| object array | 逐项 JSON.stringify+`；`连接（保留元素边界与顺序） | R3 ✓ |
| 混合 array | string 原样；number/boolean String；object JSON；递归归一 | 附加 ✓ |
| 空 array | 空串 | 附加 ✓ |
| 嵌套 object/array | 递归 JSON.stringify（不丢结构） | R6+附加 ✓ |
| 不可序列化（循环引用） | try/catch → 空串 | 实现 ✓ |

## 4. 数组与原始值边界验证

- **0 不清空**：`normalizeFieldValue(0)` → `"0"` ✓
- **false 不清空**：`normalizeFieldValue(false)` → `"false"` ✓
- **空字符串保持**：`normalizeFieldValue('')` → `''` ✓
- **空数组**：`normalizeFieldValue([])` → `''` ✓
- **混合数组**：`['文字一', 42, {key:'val'}, ['嵌套数组']]` → `文字一；42；{"key":"val"}；嵌套数组` ✓
- **零 [object Object]**：全部 25 断言确认 ✓

## 5. R1–R10 逐项结果

| # | 测试 | 结果 |
|---|---|---|
| R1 | object→结构化 JSON | ✓ |
| R2 | string array→`；`连接 | ✓ |
| R3 | object array→完整结构+边界 | ✓ |
| R4 | string 原样（不重复 stringify） | ✓ |
| R5 | null/undefined→空串 | ✓ |
| R6 | 嵌套含 null/number/boolean | ✓ |
| 附加 | 0/false/空串/空数组/混合/多层嵌套 | ✓ 全过 |
| R7 | E2E 书（10 处损坏）内存渲染→零 [object Object]+结构化内容呈现 | ✓ |
| R8 | 全量 28 套回归 | ✓ 全绿 |
| R9 | 二手书店（12 处损坏）内存渲染→零 [object Object]+结构化内容呈现 | ✓ |
| R10 | 结构化输入→新序列化→零 [object Object]+内容检查 PASS | ✓ |

**R10 产出全文**（可见于测试运行输出）：object 字段产出可读 JSON（`{"period":"近代"}`）；string array 产出分号连接（`规则一：无超自然；规则二：纯悬疑`）；object array 产出逐项 JSON+分号（`{"name":"镇政府"}；{"name":"派出所"}`）；全部内容检查 PASS。

## 6. 28 套回归结果

全部 28 套全绿（含 reality-golden OK、story-route ALL PASS）。**唯一修改的文件=ai-serializers.js**；其余 27 套证明零副作用。

## 7. R10 生产消费者读取证据

R10 使用结构化输入（模拟 LLM 返回的 object/array 类型字段）经新 `serializeWorldMd` 序列化，产出 markdown 全文如上——**零 [object Object]**，所有结构化内容以 JSON/分号可读形式呈现。该 markdown 格式与 loader.js:258 `readText` → compiler.js:660-674 `worldBible` 模块的现有读取协议兼容（markdown 文本格式未变）。

**注意**：本轮按授权未使用真实 LLM 新建测试书（避免消耗额度+避免污染）——R10 用结构化输入模拟 LLM 返回、经真实序列化函数验证。

## 8. 冻结契约兼容性确认

八项检查（授权门报告 §4）全部维持兼容：
1. Reality/Actual Authority 不变 ✓
2. Plan/Outline/Required Event 不升为 Actual ✓
3. Writer/Planner 不获 Reality Authority ✓
4. Prose 仍为 Evidence Source ✓
5. Truth/Control/Realization 边界不变 ✓
6. 不引入 Canon Admission/Plan→Fact ✓
7. 不改唯一生产路径 ✓
8. 不改字段语义含义（归一只保留表达输入数据） ✓

## 9. 工作区变更清单

| 文件 | 类型 | 变更 |
|---|---|---|
| `packages/inkos-studio-server/src/ai-serializers.js` | 生产代码 | **本 EO 唯一生产修改**（+normalizeFieldValue helper+serializeWorldMd 内部归一） |
| `scripts/test-eo-fix-serialize-01.js` | 测试 | 新增 |
| `package.json` | 配置 | +1 script 行 |

既有未提交改动（~1066 行）全部未被覆盖。原始文件备份于 `/tmp/ai-serializers-backup.js`。

## 10. 未解决问题与已知限制

1. **旧书修复**：E2E 书（10 处）与二手书店（12 处）的损坏文件未修复——本 EO 授权不含数据迁移/重建（属独立后续操作）
2. **上游 extractJson 无校验**：LLM 返回类型仍不受约束——本修复是下游最后防线，上游加固属独立后续项
3. **R10 未使用真实 LLM**：用结构化输入模拟——真实向导建书时 LLM 返回+新序列化的端到端验证需后续（可用低额度探测）
4. **JSON 可读性**：object 字段产出 JSON 串（`{"key":"value"}`）——对 LLM Consumer 可读但非自然语言；是否需进一步转为自然语言段落属后续优化（非本 EO 范围）

## 11. 回滚说明

还原 `ai-serializers.js` 单文件即可（`git checkout -- packages/inkos-studio-server/src/ai-serializers.js` 或从 `/tmp/ai-serializers-backup.js` 恢复）。影响范围=1 文件 1 函数内部。

---

> **EO-FIX-SERIALIZE-01 — IMPLEMENTED / VALIDATED — STOP**

---

## R10 补充验证（2026-11-01）

> **R10 — PASS**

### 验证路径

隔离测试书 `/tmp/r10-book/`（schemaVersion 4，与正式书籍完全隔离）：

1. **真实 `serializeWorldMd`**：结构化输入（object/string array/object array/nested/`0`/`false`）→ Markdown 508 字，**零 `[object Object]`**
2. **写入隔离书文件**：`/tmp/r10-book/novel/01_world_bible.md`
3. **真实 `loader.js` 读取**：`loadBrainContext("/tmp/r10-book", {chapter:1})` → `ctx.worldBible` 长度 508（完整读取）
4. **真实 `compiler.js` 消费**：`compileScenePrompt(ctx, scene)` → prompt 1196 字，**世界规则块在场**，含全部结构化内容
5. **消费结果检查**：**8/8 全 PASS**

### 逐项证据

| 检查项 | 结果 |
|---|---|
| 雾河镇到达 prompt | PASS |
| 断桥到达 prompt | PASS |
| 规则一到达 prompt | PASS |
| `0` 到达（不清空） | PASS（`"level":0` 在 prompt 与 md 中） |
| `false` 到达（不清空） | PASS（`"active":false` 在 prompt 与 md 中） |
| 嵌套结构到达 | PASS（`"timeline"` JSON 结构完整） |
| object array 到达 | PASS（`"name":"镇政府"` 完整保留） |
| 零 `[object Object]` | PASS（serialize 产物+loader+compiler 全链） |

### 隔离确认

- 正式书籍 `E2E-LONGFORM-01A` bible **未变**（仍有损坏=未触碰）
- 正式书籍 `二手书店` bible **未变**（同上）
- 隔离书已清理（`/tmp/r10-book/` 已删除）

### 调用的真实入口

| 环节 | 入口 | 运行结果 |
|---|---|---|
| 序列化 | `packages/inkos-studio-server/src/ai-serializers.js::serializeWorldMd` | 508 字 Markdown |
| 写入 | `node:fs.writeFileSync` | 隔离书文件 |
| Loader | `packages/inkos-brain/src/loader.js::loadBrainContext` | `ctx.worldBible` 508 字 |
| Compiler | `packages/inkos-prompt/src/index.js::compileScenePrompt` | prompt 1196 字含世界块 |
