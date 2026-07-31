import { useEffect, useState } from 'react';
import { api, Book } from '../../api/client';
import { AiCreationAssistant } from '../AiCreationAssistant';

interface Props {
  book: Book;
  chapter?: number;
}

export function AssistantDrawer({ book, chapter = 1 }: Props) {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.getCreationSuggestions>> | null>(null);

  useEffect(() => {
    api.getCreationSuggestions(book.id, chapter).then(setData).catch(() => {});
    const timer = setInterval(() => {
      api.getCreationSuggestions(book.id, chapter).then(setData).catch(() => {});
    }, 8000);
    return () => clearInterval(timer);
  }, [book.id, chapter]);

  return (
    <div className="drawer-content assistant-drawer">
      <AiCreationAssistant data={data?.assistant ?? null} />
    </div>
  );
}
