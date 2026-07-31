import path from 'node:path';
import { exists, readJson } from './paths.js';

export function detectBookVersion(bookDir) {
  const bookJson = path.join(bookDir, 'book.json');
  if (!exists(bookJson)) return null;
  const book = readJson(bookJson);
  if (book.schemaVersion === 4 || exists(path.join(bookDir, 'novel'))) return 4;
  if (book.schemaVersion === 3 || exists(path.join(bookDir, 'canon'))) return 3;
  if (exists(path.join(bookDir, 'story'))) return 2;
  return book.schemaVersion ?? 2;
}

export function getBookPaths(bookDir) {
  const v = detectBookVersion(bookDir);
  if (v === 4) {
    const n = path.join(bookDir, 'novel');
    return {
      version: 4,
      bookDir,
      refs: path.join(n, '_system/refs.json'),
      manifest: path.join(n, '_system/manifest.json'),
      modules: {
        world_bible: path.join(n, '01_world_bible.md'),
        writing_bible: path.join(n, '02_writing_bible.md'),
        character_bible: path.join(n, '03_character_bible'),
        faction_bible: path.join(n, '04_faction_bible'),
        location_bible: path.join(n, '04b_location_bible'),
        relationship_graph: path.join(n, '05_relationship_graph.yaml'),
        knowledge_matrix: path.join(n, '06_knowledge_matrix.yaml'),
        state_board: path.join(n, '07_state_board.md'),
        current_state: path.join(n, '08_current_state.md'),
        current_chapter: path.join(n, '09_current_chapter.md'),
        volume_outline: path.join(n, '10_volume_outline'),
        timeline: path.join(n, '11_timeline.yaml'),
        foreshadow_db: path.join(n, '12_foreshadow_db.yaml'),
        facts_db: path.join(n, '13_facts_db.yaml'),
        resource_db: path.join(n, '14_resource_db.yaml'),
        npc_simulation: path.join(n, '15_npc_simulation.yaml'),
        chapter_review: path.join(n, '16_chapter_review'),
        state_machine: path.join(n, '_system/state_machine.yaml'),
        snapshots: path.join(n, '_system/snapshots'),
      },
    };
  }
  return { version: v, bookDir };
}
