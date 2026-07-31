export const MODULE_LABELS = {
  world: 'World',
  character: 'Character',
  facts: 'Facts',
  timeline: 'Timeline',
  relationship: 'Relationship',
  knowledge: 'Knowledge',
  resources: 'Resources',
  style: 'Style DNA',
  writing: 'Writing Bible',
  storyDna: 'Story DNA',
};

export const MODULE_CANON_SOURCE = {
  world: '01_world_bible.md',
  character: '03_character_bible/',
  facts: '13_facts_db.yaml',
  timeline: '11_timeline.yaml',
  relationship: '05_relationship_graph.yaml',
  knowledge: '06_knowledge_matrix.yaml',
  resources: '14_resource_db.yaml',
  style: '_system/style_dna.yaml',
  writing: '02_writing_bible.md',
  storyDna: '_system/story_dna.yaml',
};

export const STATUS = {
  CACHED: 'cached',
  MODIFIED: 'modified',
  INVALID: 'invalid',
  REGENERATING: 'regenerating',
};
