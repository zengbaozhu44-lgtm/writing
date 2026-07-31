import { useOutletContext } from 'react-router-dom';
import { EntityManager, FACTION_FIELDS } from '../components/entity-manager';
import { ModuleBackBar } from '../components/ModuleBackBar';
import { PageHeader } from '../components/FormFields';
import type { BookContext } from '../layouts/BookLayout';

export function FactionsPage() {
  const { book } = useOutletContext<BookContext>();
  return (
    <div className="page">
      <ModuleBackBar />
      <PageHeader title="势力" subtitle="Faction Bible · 可随时增删改" />
      <EntityManager
        entityType="faction"
        bookId={book.id}
        title="势力 / 组织"
        fields={FACTION_FIELDS}
        minCount={0}
        maxCount={50}
      />
    </div>
  );
}
