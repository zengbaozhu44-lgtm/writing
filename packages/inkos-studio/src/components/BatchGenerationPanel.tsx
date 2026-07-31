import { useState } from 'react';
import { useBatchGeneration } from '../hooks/useBatchGeneration';

interface Props {
  bookId: string;
  fromChapter: number;
}

export function BatchGenerationPanel({ bookId, fromChapter }: Props) {
  const [count, setCount] = useState(3);
  const { start, stop, running, progress } = useBatchGeneration(bookId);

  return (
    <div className="batch-gen-panel panel">
      <div className="panel-title">批量生成</div>
      <p className="text-dim">从第 {fromChapter} 章起串行生成（前一章完成后再下一章）</p>
      <div className="batch-gen-row">
        <label>
          章数
          <input
            type="number"
            min={1}
            max={20}
            value={count}
            disabled={running}
            onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))}
          />
        </label>
        {!running ? (
          <button type="button" className="btn btn-primary" onClick={() => void start(fromChapter, count)}>
            开始队列
          </button>
        ) : (
          <button type="button" className="btn" onClick={stop}>停止</button>
        )}
      </div>
      {progress && (
        <p className="ai-msg">
          [{progress.current}/{progress.total}] {progress.message}
        </p>
      )}
    </div>
  );
}
