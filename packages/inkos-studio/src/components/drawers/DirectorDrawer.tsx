import { ChapterDirectorPanel } from '../ChapterDirectorPanel';

interface Props {
  bookId: string;
  chapter: number;
  onGenerate?: () => void;
}

export function DirectorDrawer({ bookId, chapter, onGenerate }: Props) {
  return (
    <div className="drawer-content director-drawer">
      <ChapterDirectorPanel
        bookId={bookId}
        chapter={chapter}
        onConfirm={() => onGenerate?.()}
      />
    </div>
  );
}
