import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../api/client';
import { PageHeader } from '../components/FormFields';
import type { BookContext } from '../layouts/BookLayout';

function YamlViewPage({ title, moduleKey }: { title: string; moduleKey: string }) {
  const { book } = useOutletContext<BookContext>();
  const [data, setData] = useState<unknown>(null);

  useEffect(() => {
    api.getModule(book.id, moduleKey).then((m) => setData(m.data || m.content)).catch(() => {});
  }, [book.id, moduleKey]);

  return (
    <div className="page">
      <PageHeader title={title} subtitle="Runtime 管理 · 只读" />
      <div className="panel readonly-notice">数据由 Runtime Pipeline 自动更新，Studio 禁止直写</div>
      <pre className="yaml-view">{typeof data === 'string' ? data : JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

export function RelationsPage() { return <YamlViewPage title="关系" moduleKey="relationship" />; }
export function TimelinePage() { return <YamlViewPage title="时间线" moduleKey="timeline" />; }
