import { HashDependencyTree as HashTreeData } from '../api/client';

const STATUS_LABEL: Record<string, string> = {
  cached: 'Cached',
  modified: 'Modified',
  invalid: 'Invalid',
  regenerating: 'Regenerating',
};

interface Props {
  tree: HashTreeData | null;
  live?: boolean;
}

function shortHash(hash?: string | null) {
  if (!hash) return '—';
  return hash.slice(0, 8);
}

export function HashDependencyTree({ tree, live }: Props) {
  if (!tree) {
    return (
      <div className="hash-dep-tree">
        <div className="hash-dep-header">
          <span className="panel-title">Hash Dependency Tree</span>
        </div>
        <p className="text-dim">暂无依赖树数据 — 运行 Pipeline 或修改 Canon 后将自动生成</p>
      </div>
    );
  }

  const summary = tree.summary ?? { cached: 0, modified: 0, invalid: 0, regenerating: 0 };

  return (
    <div className="hash-dep-tree">
      <div className="hash-dep-header">
        <span className="panel-title">Hash Dependency Tree</span>
        {live && <span className="live-badge">LIVE</span>}
      </div>

      <div className="hash-dep-summary">
        <span className="hash-status-chip cached">{summary.cached ?? 0} Cached</span>
        <span className="hash-status-chip modified">{summary.modified ?? 0} Modified</span>
        <span className="hash-status-chip invalid">{summary.invalid ?? 0} Invalid</span>
        <span className="hash-status-chip regenerating">{summary.regenerating ?? 0} Regenerating</span>
      </div>

      <div className="hash-dep-meta">
        <span>Combined: <code>{shortHash(tree.combinedHash)}</code></span>
        {tree.previousCombinedHash && (
          <span>Prev: <code>{shortHash(tree.previousCombinedHash)}</code></span>
        )}
        {tree.trigger && <span>Trigger: {tree.trigger}</span>}
      </div>

      <div className="hash-dep-nodes">
        {(tree.nodes || []).map((node) => (
          <div className={`hash-dep-node status-${node.status}`} key={node.id}>
            <div className="hash-dep-node-head">
              <span className="hash-dep-node-label">{node.label}</span>
              <span className={`hash-status-badge ${node.status}`}>
                {STATUS_LABEL[node.status] || node.status}
              </span>
            </div>
            <div className="hash-dep-node-detail">
              <span className="hash-dep-source">{node.canonSource}</span>
              <span className="hash-dep-hash">
                {shortHash(node.previous)} → {shortHash(node.hash)}
              </span>
            </div>
          </div>
        ))}

        {(tree.sceneNodes || []).map((node) => (
          <div className={`hash-dep-node hash-dep-scene status-${node.status}`} key={node.id}>
            <div className="hash-dep-node-head">
              <span className="hash-dep-node-label">{node.label}</span>
              <span className={`hash-status-badge ${node.status}`}>
                {STATUS_LABEL[node.status] || node.status}
              </span>
            </div>
            {node.mustRecompile && (
              <div className="hash-dep-node-detail text-dim">需重新编译</div>
            )}
          </div>
        ))}

        {tree.promptCache && (
          <div className={`hash-dep-node hash-dep-cache status-${tree.promptCache.status}`}>
            <div className="hash-dep-node-head">
              <span className="hash-dep-node-label">Prompt Cache</span>
              <span className={`hash-status-badge ${tree.promptCache.status}`}>
                {STATUS_LABEL[tree.promptCache.status] || tree.promptCache.status}
              </span>
            </div>
            <div className="hash-dep-node-detail">
              <span>Brain {tree.promptCache.brain ? '✓' : '—'}</span>
              <span>Studio {tree.promptCache.studio ? '✓' : '—'}</span>
            </div>
            <div className="hash-dep-flow">↓ Compiled Prompt</div>
          </div>
        )}
      </div>
    </div>
  );
}
