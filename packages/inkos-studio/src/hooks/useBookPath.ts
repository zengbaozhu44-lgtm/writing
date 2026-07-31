import { useParams } from 'react-router-dom';

/** 书籍内子路由绝对路径（避免在 /home 下相对链接变成 /home/world） */
export function useBookPath() {
  const { bookId } = useParams<{ bookId: string }>();
  const id = bookId ? decodeURIComponent(bookId) : '';
  const to = (segment: string) => `/book/${encodeURIComponent(id)}/${segment.replace(/^\//, '')}`;
  return { bookId: id, to };
}
