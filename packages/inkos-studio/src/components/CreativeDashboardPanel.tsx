import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, CreativeDashboard, PromptQuality, StoryDna } from '../api/client';
import { useBookPath } from '../hooks/useBookPath';

interface Props {
  bookId: string;
  pitch?: string;
  storyDna?: StoryDna | null;
  onRefresh?: () => void;
}

export function CreativeDashboardPanel({ bookId, pitch, storyDna, onRefresh }: Props) {
  const { to: bookTo } = useBookPath();
  const [dash, setDash] = useState<CreativeDashboard | null>(null);
  const [quality, setQuality] = useState<PromptQuality | null>(null);
  const [taskBusy, setTaskBusy] = useState<string | null>(null);
  const [taskMsg, setTaskMsg] = useState('');

  const reload = () => {
    api.getCreativeDashboard(bookId).then(setDash).catch(() => {});
  };

  useEffect(() => {
    reload();
  }, [bookId]);

  useEffect(() => {
    if (!pitch && !storyDna) return;
    api.promptQuality({ pitch, storyDna }).then(setQuality).catch(() => {});
  }, [pitch, storyDna]);

  if (!dash) return null;

  const actionLink = (action: string) => {
    const map: Record<string, string> = {
      world: bookTo('world'),
      characters: bookTo('characters'),
      volume: bookTo('chapter'),
      director: bookTo('create'),
      world_sim: bookTo('world'),
    };
    return map[action] || bookTo('create');
  };

  const runTask = async (task: { id: string; action: string; label: string }) => {
    if (task.action === 'world_sim') {
      setTaskBusy(task.id);
      setTaskMsg('世界模拟运行中…');
      try {
        await api.worldSimulate(bookId, 10);
        setTaskMsg('世界模拟完成');
        reload();
        onRefresh?.();
      } catch (e) {
        setTaskMsg((e as Error).message);
      } finally {
        setTaskBusy(null);
      }
      return;
    }
  };

  return (
    <div className="creative-dashboard panel">
      <div className="panel-title">Creative Dashboard · 创作任务中心</div>
      <div className="dash-completion">
        <div className="completion-bar">
          <div className="completion-fill" style={{ width: `${dash.completion}%` }} />
        </div>
        <span>完成度 <strong>{dash.completion}%</strong></span>
        <span className="text-dim" style={{ fontSize: 12 }}>（设定准备度，不影响生成章节）</span>
      </div>

      <div className="dash-modules">
        {dash.modules.map((m) => (
          <div key={m.key} className={`dash-mod ${m.done ? 'done' : ''}`}>
            {m.done ? '✔' : '⚠'} {m.label}
            {m.pct != null && !m.done && <span className="text-dim"> ({m.pct}%)</span>}
          </div>
        ))}
      </div>

      <div className="dash-tasks">
        <div className="panel-title">下一步</div>
        {dash.tasks.map((t) => (
          <div key={t.id} className="dash-task">
            <span>{t.label}</span>
            {t.action === 'world_sim' ? (
              <button type="button" className="btn btn-sm btn-primary" disabled={!!taskBusy}
                onClick={() => runTask(t)}>
                {taskBusy === t.id ? '运行中…' : '执行'}
              </button>
            ) : (
              <Link to={actionLink(t.action)} className="btn btn-sm btn-primary">执行</Link>
            )}
          </div>
        ))}
      </div>
      {taskMsg && <p className="ai-msg">{taskMsg}</p>}

      {quality && (
        <div className="prompt-quality">
          <span>Prompt 质量: <strong>{quality.score}/100</strong> ({quality.grade})</span>
          {quality.missing.length > 0 && (
            <ul className="quality-gaps">
              {quality.missing.slice(0, 3).map((m) => (
                <li key={m.key}>{m.label} -{m.penalty}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
