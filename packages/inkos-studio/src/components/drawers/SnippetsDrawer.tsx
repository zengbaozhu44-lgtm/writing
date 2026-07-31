const DEFAULT_SNIPPETS = [
  { id: 'hook-countdown', label: '倒计时钩子', text: '屏幕上的数字又跳了一下。他还剩——' },
  { id: 'action-door', label: '推门动作', text: '他推开门。冷风灌进来，走廊里什么都没有。' },
  { id: 'dialogue-pressure', label: '施压对白', text: '「你再犹豫一次，我们就都走不了。」' },
  { id: 'cost-reveal', label: '代价落地', text: '代价已经发生了：他的名字从通讯录里消失了。' },
  { id: 'sensory-short', label: '尖锐感官', text: '金属味贴着舌根。耳鸣一声，世界短暂失真。' },
];

interface Props {
  onInsert: (text: string) => void;
}

export function SnippetsDrawer({ onInsert }: Props) {
  return (
    <div className="drawer-content snippets-drawer">
      <div className="panel-title">写作片段</div>
      <p className="text-dim">点击插入到当前编辑正文末尾</p>
      <div className="snippets-list">
        {DEFAULT_SNIPPETS.map((s) => (
          <button
            key={s.id}
            type="button"
            className="snippet-item"
            onClick={() => onInsert(s.text)}
          >
            <strong>{s.label}</strong>
            <span>{s.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
