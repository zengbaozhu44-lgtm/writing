import { useCallback, useEffect, useState } from 'react';
import { api, Book, HashDependencyTree as HashTreeData, RuntimeEvent } from '../../api/client';
import { HashDependencyTree } from '../HashDependencyTree';

interface Props {
  book: Book;
  chapter: number;
}

export function HashDrawer({ book, chapter }: Props) {
  const [hashTree, setHashTree] = useState<HashTreeData | null>(null);
  const [live, setLive] = useState(false);

  const refresh = useCallback(() => {
    api.getHashDependencyTree(book.id, chapter).then(setHashTree).catch(() => {});
  }, [book.id, chapter]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    const unsub = api.subscribeRuntimeEvents(book.id, (ev: RuntimeEvent) => {
      const name = (ev.event || ev.type) as string;
      if (name === 'hashDependencyChecked' || name === 'hashDependencyTreeUpdated') {
        setLive(true);
        const payload = (ev.payload || ev) as { tree?: HashTreeData };
        if (payload.tree) setHashTree(payload.tree);
        refresh();
        setTimeout(() => setLive(false), 5000);
      }
    });
    return () => unsub();
  }, [book.id, refresh]);

  return (
    <div className="drawer-content hash-drawer">
      <HashDependencyTree tree={hashTree} live={live} />
    </div>
  );
}
