import { useEffect, useState } from 'react';
import { api, CharacterBrain } from '../api/client';

interface Props {
  bookId: string;
  characterName: string;
}

export function CharacterBrainPanel({ bookId, characterName }: Props) {
  const [brain, setBrain] = useState<CharacterBrain | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    api.getCharacterBrain(bookId, characterName).then(setBrain).catch(() => setBrain(null));
  };

  useEffect(() => { if (characterName) load(); }, [bookId, characterName]);

  const analyze = async () => {
    setBusy(true);
    try {
      const res = await api.analyzeCharacterBrain(bookId, characterName);
      setBrain(res.brain);
    } finally {
      setBusy(false);
    }
  };

  if (!characterName) return null;

  const state = brain?.current_state || {};

  return (
    <div className="panel character-brain-panel">
      <div className="panel-title">Character Brain · {characterName}</div>
      {!brain ? (
        <button type="button" className="btn btn-ai" disabled={busy} onClick={analyze}>
          {busy ? '分析中…' : 'AI 生成人物大脑'}
        </button>
      ) : (
        <>
          <div className="brain-section">
            <p><strong>表面目标</strong>：{brain.goals?.surface}</p>
            <p><strong>隐藏目标</strong>：{brain.goals?.hidden}</p>
            <p><strong>底线</strong>：{brain.bottom_line}</p>
            <p><strong>恐惧</strong>：{(brain.fears || []).join('、')}</p>
          </div>
          <div className="brain-meters">
            {Object.entries(state).map(([k, v]) => (
              <div key={k} className="brain-meter">
                <span>{k}</span>
                <div className="meter-bar"><div className="meter-fill" style={{ width: `${v}%` }} /></div>
                <span>{v}</span>
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-sm" disabled={busy} onClick={analyze}>重新分析</button>
        </>
      )}
    </div>
  );
}
