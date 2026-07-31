/**
 * Story DNA → AI Prompt 上下文（Wizard / Creator Loop 共用）
 */

export function buildStoryBrief({ pitch = '', title = '', storyDna = null } = {}) {
  const lines = [];
  if (title) lines.push(`书名：${title}`);
  if (pitch?.trim()) lines.push(`作者创意：${pitch.trim()}`);
  const d = storyDna || {};
  if (d.genre) lines.push(`题材：${d.genre}`);
  if (d.core_hook) lines.push(`核心卖点：${d.core_hook}`);
  if (d.main_conflict) lines.push(`主线冲突：${d.main_conflict}`);
  if (d.main_question) lines.push(`核心悬念：${d.main_question}`);
  if (d.theme) lines.push(`主题：${d.theme}`);
  if (d.power_fantasy) lines.push(`爽点/力量幻想：${d.power_fantasy}`);
  if (d.ending_direction) lines.push(`结局方向：${d.ending_direction}`);
  if (d.commercial_direction) lines.push(`商业方向：${d.commercial_direction}`);
  if (d.reader || d.audience) lines.push(`目标读者：${d.reader || d.audience}`);
  if (d.selling_point) lines.push(`差异化卖点：${d.selling_point}`);
  return lines.filter(Boolean).join('\n');
}

export function storyDnaConstraint(storyDna) {
  if (!storyDna?.core_hook && !storyDna?.main_conflict) return '';
  return [
    '【硬性约束】世界设定必须严格服务于以下 Story DNA，禁止写成无关的通用玄幻/修仙模板：',
    buildStoryBrief({ storyDna }),
    '时代背景、力量体系、势力、地图、社会结构均需体现上述卖点与冲突。',
  ].join('\n');
}
