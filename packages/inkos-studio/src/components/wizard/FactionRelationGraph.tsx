import type { EntityRecord } from '../entity-manager';

/** 轻量 SVG 势力关系图：节点 + hostile/friendly 连线 */
export function FactionRelationGraph({ factions }: { factions: EntityRecord[] }) {
  const n = factions.length;
  if (!n) return <p className="text-dim">暂无势力节点</p>;

  const w = 420;
  const h = 220;
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(80, 40 + n * 8);

  const nodes = factions.map((f, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return {
      id: f.id,
      name: f.fields.name || f.id,
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      hostile: String(f.fields.hostile || ''),
      friendly: String(f.fields.friendly || ''),
    };
  });

  const find = (name: string) =>
    nodes.find((nd) => nd.name === name || name.includes(nd.name) || nd.name.includes(name));

  const edges: { x1: number; y1: number; x2: number; y2: number; kind: 'hostile' | 'friendly' }[] = [];
  for (const nd of nodes) {
    for (const part of nd.hostile.split(/[,，、;/|]/).map((s) => s.trim()).filter(Boolean)) {
      const t = find(part);
      if (t && t.id !== nd.id) edges.push({ x1: nd.x, y1: nd.y, x2: t.x, y2: t.y, kind: 'hostile' });
    }
    for (const part of nd.friendly.split(/[,，、;/|]/).map((s) => s.trim()).filter(Boolean)) {
      const t = find(part);
      if (t && t.id !== nd.id) edges.push({ x1: nd.x, y1: nd.y, x2: t.x, y2: t.y, kind: 'friendly' });
    }
  }

  return (
    <div className="faction-graph panel">
      <div className="panel-title">势力关系图</div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} className="faction-graph-svg">
        {edges.map((e, i) => (
          <line
            key={i}
            x1={e.x1}
            y1={e.y1}
            x2={e.x2}
            y2={e.y2}
            stroke={e.kind === 'hostile' ? '#e35d6a' : '#3dd68c'}
            strokeWidth={1.5}
            strokeDasharray={e.kind === 'friendly' ? '4 3' : undefined}
          />
        ))}
        {nodes.map((nd) => (
          <g key={nd.id}>
            <circle cx={nd.x} cy={nd.y} r={18} fill="var(--bg-elevated, #1a1a1a)" stroke="var(--accent, #6cf)" strokeWidth={1.5} />
            <text x={nd.x} y={nd.y + 4} textAnchor="middle" fontSize={10} fill="currentColor">
              {(nd.name || '?').slice(0, 4)}
            </text>
          </g>
        ))}
      </svg>
      <p className="text-dim faction-graph-legend">实线=敌对 · 虚线=友好</p>
    </div>
  );
}
