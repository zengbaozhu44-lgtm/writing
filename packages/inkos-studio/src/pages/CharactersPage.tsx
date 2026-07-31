import { useOutletContext } from 'react-router-dom';
import { EntityManager, CHARACTER_FIELDS } from '../components/entity-manager';
import { ModuleBackBar } from '../components/ModuleBackBar';
import { PageHeader } from '../components/FormFields';
import type { BookContext } from '../layouts/BookLayout';

export function CharactersPage() {
  const { book } = useOutletContext<BookContext>();
  return (
    <div className="page">
      <ModuleBackBar />
      <PageHeader title="人物" subtitle="Character Bible · 可随时增删改" />
      <EntityManager
        entityType="character"
        bookId={book.id}
        title="人物卡"
        fields={CHARACTER_FIELDS}
        minCount={0}
        maxCount={50}
      />
    </div>
  );
}
