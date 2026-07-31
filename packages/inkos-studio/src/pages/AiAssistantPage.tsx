import { useEffect, useState } from 'react';
import { CopilotPanel } from '../components/CopilotPanel';
import { AiCreationAssistant } from '../components/AiCreationAssistant';
import { useOutletContext } from 'react-router-dom';
import { api } from '../api/client';
import type { BookContext } from '../layouts/BookLayout';

export function AiAssistantPage() {
  const { book, chapter, refresh } = useOutletContext<BookContext>();
  const [assistant, setAssistant] = useState<Awaited<ReturnType<typeof api.getCreationSuggestions>> | null>(null);

  useEffect(() => {
    api.getCreationSuggestions(book.id, chapter).then(setAssistant).catch(() => {});
  }, [book.id, chapter]);

  return (
    <div className="page ai-assistant-page">
      <div className="page-header">
        <div>
          <h1>AI 助手</h1>
          <p className="page-sub">创作建议 · Copilot · Runtime</p>
        </div>
      </div>

      <div className="panel creation-assistant-panel">
        <AiCreationAssistant data={assistant?.assistant ?? null} />
      </div>

      <div className="ai-assistant-embed">
        <CopilotPanel bookId={book.id} onDone={refresh} embedded />
      </div>
    </div>
  );
}
