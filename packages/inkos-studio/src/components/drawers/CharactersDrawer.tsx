import { Book } from '../../api/client';
import { EntityManager, CHARACTER_FIELDS } from '../entity-manager';

interface Props {
  book: Book;
}

export function CharactersDrawer({ book }: Props) {
  return (
    <div className="drawer-content">
      <EntityManager
        entityType="character"
        bookId={book.id}
        title="人物卡"
        fields={CHARACTER_FIELDS}
        minCount={0}
        maxCount={50}
        compact
      />
    </div>
  );
}
