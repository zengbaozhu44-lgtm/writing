import { Book } from '../../api/client';
import { EntityManager, FACTION_FIELDS } from '../entity-manager';

interface Props {
  book: Book;
}

export function FactionsDrawer({ book }: Props) {
  return (
    <div className="drawer-content">
      <EntityManager
        entityType="faction"
        bookId={book.id}
        title="势力 / 组织"
        fields={FACTION_FIELDS}
        minCount={0}
        maxCount={50}
        compact
      />
    </div>
  );
}
