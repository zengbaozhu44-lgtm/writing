import { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, Book } from '../api/client';
import { useRuntimeStream } from '../hooks/useRuntimeStream';
import { useTaskStream } from '../hooks/useTaskStream';
import { useBookTaskStore } from '../stores/bookTaskStore';
import { FloatingProgress } from '../components/FloatingProgress';
import { useBookPath } from '../hooks/useBookPath';

export interface BookContext {
  book: Book;
  chapter: number;
  setChapter: (n: number) => void;
  refresh: () => void;
  /** 用户是否手动选过章（优先于 dashboard.chapter） */
  userSelectedChapter: boolean;
  runtime: ReturnType<typeof useRuntimeStream>;
}

export function BookLayout() {
  const { bookId: rawId } = useParams<{ bookId: string }>();
  const bookId = rawId ? decodeURIComponent(rawId) : '';
  const location = useLocation();
  const navigate = useNavigate();
  const { to: bookTo } = useBookPath();

  const [book, setBook] = useState<Book | null>(null);
  const [chapter, setChapterState] = useState(1);
  const [userSelectedChapter, setUserSelectedChapter] = useState(false);
  const [tick, setTick] = useState(0);

  const runtime = useRuntimeStream(bookId);
  const taskId = useBookTaskStore((s) => (s.bookId === bookId ? s.taskId : null));
  const taskBusy = useBookTaskStore((s) => (
    s.bookId === bookId && (s.status === 'pending' || s.status === 'running')
  ));

  // Task SSE：补充进度文案（终态仍由轮询/调用方 release）
  useTaskStream(taskId, {
    enabled: Boolean(taskId && taskBusy),
    onEvent: (ev) => {
      const msg = ev.message || (ev as { detail?: string }).detail;
      if (msg) useBookTaskStore.getState().setStatus('running', String(msg));
      if (ev.status === 'running' || ev.event === 'taskStarted') {
        useBookTaskStore.getState().setStatus('running', String(msg || '生成中…'));
      }
    },
  });

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const setChapter = useCallback((n: number) => {
    setUserSelectedChapter(true);
    setChapterState(n);
  }, []);

  // 换书时重置选章标记，并取消上一本书的任务等待
  useEffect(() => {
    setUserSelectedChapter(false);
    setChapterState(1);
    return () => {
      const state = useBookTaskStore.getState();
      if (state.bookId === bookId && state.isBusy()) {
        state.cancel('离开书籍，已取消等待');
      }
    };
  }, [bookId]);

  useEffect(() => {
    if (!bookId) return;
    api.getDashboard(bookId, chapter).then((d) => {
      setBook(d.book);
      // 仅在用户尚未手动选章时跟随 dashboard
      if (!userSelectedChapter && d.chapter) {
        setChapterState(d.chapter);
      }
    }).catch(() => navigate('/'));
  }, [bookId, tick, navigate, userSelectedChapter, chapter]);

  useEffect(() => {
    if (!bookId) return;
    return api.subscribeEvents(bookId, () => refresh());
  }, [bookId, refresh]);

  const segment = location.pathname.split('/').pop() || '';
  const isIde = segment === 'ide';

  const context = useMemo<BookContext | null>(() => {
    if (!book) return null;
    return {
      book,
      chapter,
      setChapter,
      refresh,
      userSelectedChapter,
      runtime,
    };
  }, [book, chapter, setChapter, refresh, userSelectedChapter, runtime]);

  if (!book || !bookId || !context) return <div className="loading">加载中…</div>;

  return (
    <>
      {isIde ? (
        <Outlet context={context} />
      ) : (
        <div className="book-shell">
          <Outlet context={context} />
        </div>
      )}
      <FloatingProgress onNavigateIde={() => navigate(bookTo('ide'))} />
    </>
  );
}
