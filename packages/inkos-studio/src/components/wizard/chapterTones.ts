/**
 * 前三章基调 — 向导 Step 7
 */
export type ChapterToneIndex = 1 | 2 | 3;

export interface ChapterTone {
  chapterIndex: ChapterToneIndex;
  tone: string;
  coreEvent: string;
  endingDirection: string;
  wordTarget: number;
}

export const DEFAULT_WORD_TARGET = 2500;

export function defaultChapterTones(): ChapterTone[] {
  return [
    {
      chapterIndex: 1,
      tone: '日常异变',
      coreEvent: '主角日常被打破，第一次接触异常规则/能力',
      endingDirection: '确认异常真实存在，留下必须追查的钩子',
      wordTarget: DEFAULT_WORD_TARGET,
    },
    {
      chapterIndex: 2,
      tone: '压抑惊悚',
      coreEvent: '主角试探规则边界，付出第一次可见代价',
      endingDirection: '代价落地，对手或系统开始注意到主角',
      wordTarget: DEFAULT_WORD_TARGET,
    },
    {
      chapterIndex: 3,
      tone: '悬念突袭',
      coreEvent: '信息差扩大：主角掌握关键线索但陷入更大危险',
      endingDirection: '大钩子：读者必须点开第4章',
      wordTarget: DEFAULT_WORD_TARGET,
    },
  ];
}

/** 按题材给出基调预设 */
export function tonePresetsForGenre(genre = ''): string[] {
  const g = String(genre || '');
  if (/规则怪谈|诡异/.test(g)) {
    return ['压抑惊悚', '规则压迫', '日常异变', '悬念突袭', '冷静推理'];
  }
  if (/年代|重生/.test(g)) {
    return ['怀旧日常', '信息差爽感', '人情博弈', '资源争夺', '悬念突袭'];
  }
  if (/修仙/.test(g)) {
    return ['压迫开局', '功法异变', '宗门暗流', '生死试炼', '悬念突袭'];
  }
  if (/神豪|签到/.test(g)) {
    return ['装逼打脸', '金手指觉醒', '商战压迫', '爽点连发', '悬念突袭'];
  }
  if (/历史/.test(g)) {
    return ['朝堂暗涌', '权谋试探', '身份危机', '智斗突袭', '悬念突袭'];
  }
  return ['压抑惊悚', '日常异变', '悬念突袭', '热血推进', '情感拉扯', '冷静推理'];
}

export function tonesAreComplete(tones: ChapterTone[]): boolean {
  return tones.length >= 3 && tones.every((t) =>
    String(t.tone || '').trim()
    && String(t.coreEvent || '').trim()
    && String(t.endingDirection || '').trim()
    && Number(t.wordTarget) > 0,
  );
}
