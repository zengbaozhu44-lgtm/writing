# @inkos/hash-dependency

Hash Dependency（PR8）— 替代 Prompt Cache 固定 Tier 模型。

## 模块 Hash

| 模块 | 来源 |
|------|------|
| world | worldBible |
| character | POV + 出场角色卡片 |
| facts | facts_db |
| timeline | timeline days |
| relationship | relationship_graph |
| knowledge | knowledge_matrix |
| resources | resource_db |
| style | style_dna.yaml |
| writing | writing_bible |
| storyDna | story_dna.yaml |

## 策略

任意模块 **Hash 变化** → **Invalidate** 全部 Prompt 缓存 → **mustRecompile: true**

禁止使用旧 Prompt。

## 节点状态

| 状态 | 含义 |
|------|------|
| **Cached** | Hash 稳定且 Prompt Cache 存在 |
| **Modified** | Hash 已变化，尚未清除缓存 |
| **Invalid** | Hash 变化后缓存已清除 |
| **Regenerating** | Writer 正在重新 Compile Prompt |

## 输出

```
novel/_system/studio/hash-dependency/canon_state.json
novel/_system/studio/hash-dependency/dependency_tree.json
novel/_system/studio/hash-dependency/ch_XXXX/dependency_tree.json
novel/_system/studio/hash-dependency/ch_XXXX/scene_XX/cache_dependency.json
novel/_system/studio/hash-dependency/ch_XXXX/state.json
```

## API

```js
import {
  runHashDependencyCheck,
  onCanonModified,
  buildHashDependencyTree,
  loadDependencyTree,
} from '@inkos/hash-dependency';

// Pipeline / Writer
const result = runHashDependencyCheck({
  bookDir, chapter, scene, ctx, storyDna, styleDna,
  regenerating: false,
});
// result.mustRecompile, result.changed, result.tree

// Canon 写入后自动同步
onCanonModified({ bookDir, chapter, ctx, storyDna, styleDna, triggerKey: 'world_bible' });
```

Studio API: `GET /api/books/:id/hash-dependency-tree?chapter=N`
