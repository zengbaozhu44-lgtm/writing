export const LEARNING_DIMENSIONS = [
  'hook',
  'conflict',
  'dialogue',
  'pacing',
  'emotion',
  'style',
];

export const LOW_SCORE_THRESHOLD = 70;
export const MIN_LOW_STREAK = 3;
export const MAX_CHAPTERS = 10;

export const DIMENSION_REVIEW_KEYS = {
  hook: ['hookDensity', 'hook'],
  conflict: ['conflict', 'readerCuriosity'],
  dialogue: ['dialogue'],
  pacing: ['readerCuriosity', 'pacing'],
  emotion: ['readerCuriosity', 'emotion'],
  style: ['twistStrength', 'style'],
};

export const DIMENSION_OPTIMIZER_KEYS = {
  hook: ['hook'],
  conflict: ['climax'],
  dialogue: ['commercialPleasure'],
  pacing: ['pacing'],
  emotion: ['characterConsistency'],
  style: ['styleConsistency'],
};
