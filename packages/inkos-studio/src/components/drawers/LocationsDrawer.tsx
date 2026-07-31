import { Book } from '../../api/client';
import { EntityManager, LOCATION_FIELDS } from '../entity-manager';

interface Props {
  book: Book;
}

export function LocationsDrawer({ book }: Props) {
  return (
    <div className="drawer-content">
      <EntityManager
        entityType="location"
        bookId={book.id}
        title="地点"
        fields={LOCATION_FIELDS}
        minCount={0}
        maxCount={50}
        compact
      />
    </div>
  );
}
