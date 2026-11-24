/**
 * RF-01 — Prose Boundary Gate (Writer output → scene.text)
 *
 * High-precision strip/reject of internal Beat scaffolding that leaked
 * into draft prose. Not a Reality/Canon/SR authority.
 *
 * Strip: only leading / beat-head lines matching known scaffold grammar.
 * Uncertain → KEEP. Never full-text keyword scrub.
 *
 * writesCanon / writesSR / writesReality = false
 */
export const PROSE_BOUNDARY_VERSION = 'rf-01-prose-boundary-1';

/** Known STRUCTURAL_LABELS from scene-execution (must stay in sync conceptually). */
export const STRUCTURAL_LABEL_FRAGMENTS = [
  'Goal（主角目标）',
  'Obstacle（阻碍）',
  'Choice（抉择）',
  'Consequence（代价落地）',
  'New Information（信息新增）',
  'Hook（段末悬念）',
];

// Fullwidth （） are not regex metacharacters; only escape ASCII () if present.
const LABEL_ALT = STRUCTURAL_LABEL_FRAGMENTS
  .map((s) => s.replace(/[()]/g, (c) => `\\${c}`))
  .join('|');

/** High-confidence internal Beat header lines (heading-shaped). */
const LEADING_SCAFFOLD_RES = [
  // # Beat 1/6：Goal（主角目标）  |  ## 当前 Beat 1/6：…
  new RegExp(
    `^#{1,3}\\s*(?:当前\\s*)?Beat\\s*\\d+\\s*/\\s*\\d+\\s*[:：].*$`,
    'u',
  ),
  // ### Beat 1 · Goal（主角目标）
  new RegExp(
    `^#{1,3}\\s*Beat\\s*\\d+\\s*[·•.]\\s*(?:${LABEL_ALT}).*$`,
    'u',
  ),
  // ### Beat 1 · Goal（主角目标） — Goal without requiring full label if structural English+CN
  /^#{1,3}\s*Beat\s*\d+\s*[·•.]\s*(?:Goal|Obstacle|Choice|Consequence|New Information|Hook)\b.*$/u,
];

/** Max leading lines inspected / stripped (beat head only — never full-document scan). */
export const PROSE_BOUNDARY_MAX_HEAD_LINES = 5;

function normalizeHeaderKey(line = '') {
  return String(line || '')
    .trim()
    .replace(/^#{1,6}\s*/u, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

/**
 * True iff this single line is high-confidence internal Beat scaffold.
 */
export function isInternalBeatScaffoldLine(line = '') {
  const t = String(line || '').trim();
  if (!t) return false;
  for (const re of LEADING_SCAFFOLD_RES) {
    if (re.test(t)) return true;
  }
  return false;
}

/**
 * Optional: exact/near echo of Beat header lines present in this beat's userPrompt.
 */
export function isPromptEchoScaffoldLine(line = '', userPrompt = '') {
  const prompt = String(userPrompt || '');
  if (!prompt.trim() || !String(line || '').trim()) return false;
  const key = normalizeHeaderKey(line);
  if (!key || key.length < 8) return false;
  // Only treat as echo if it still looks like a Beat header after normalize
  if (!/^((当前\s*)?Beat\s*\d+)/u.test(key)) return false;
  const promptLines = prompt.split(/\n/);
  for (const pl of promptLines) {
    if (!/^#{1,3}\s*/u.test(pl.trim()) && !/当前\s*Beat\s*\d+/u.test(pl)) continue;
    if (normalizeHeaderKey(pl) === key) return true;
    // L4 form vs model `# Beat 1/6：…`
    const plKey = normalizeHeaderKey(pl).replace(/^当前\s*/u, '');
    const lineKey = key.replace(/^当前\s*/u, '');
    if (plKey === lineKey) return true;
  }
  return false;
}

function shouldStripLeadingLine(line, userPrompt) {
  return isInternalBeatScaffoldLine(line) || isPromptEchoScaffoldLine(line, userPrompt);
}

/**
 * Apply prose boundary to a single Beat (or scene chunk) draft.
 *
 * @param {string} raw
 * @param {{ userPrompt?: string }} [opts]
 * @returns {{
 *   text: string,
 *   strippedCount: number,
 *   strippedLines: string[],
 *   hardFail: boolean,
 *   hardFailReason: string,
 *   writesCanon: false,
 *   writesSR: false,
 *   writesReality: false,
 *   role: string,
 *   version: string,
 * }}
 */
export function applyProseBoundaryGate(raw = '', opts = {}) {
  const userPrompt = opts.userPrompt || '';
  const original = String(raw || '');
  const lines = original.split('\n');
  const strippedLines = [];
  let headVisited = 0;
  let i = 0;

  // Only walk the opening head: skip leading blanks; strip scaffold lines; stop at first prose.
  while (i < lines.length && headVisited < PROSE_BOUNDARY_MAX_HEAD_LINES) {
    const line = lines[i];
    if (!String(line).trim()) {
      // Leading blank before any content — drop with scaffold head cleanup
      if (strippedLines.length > 0 || i === 0) {
        // keep internal blanks after prose starts — here still in head
        lines.splice(i, 1);
        continue;
      }
      i += 1;
      headVisited += 1;
      continue;
    }
    headVisited += 1;
    if (shouldStripLeadingLine(line, userPrompt)) {
      strippedLines.push(line);
      lines.splice(i, 1);
      continue;
    }
    break;
  }

  let text = lines.join('\n').replace(/^\n+/, '').trimEnd();
  // Trim only leading whitespace block; preserve intentional trailing style lightly
  text = text.replace(/^\s+/, '');

  let hardFail = false;
  let hardFailReason = '';
  const firstContent = text.split('\n').find((l) => String(l).trim());
  if (firstContent && shouldStripLeadingLine(firstContent, userPrompt)) {
    // Residual scaffold after strip — do not invent further cleaning
    hardFail = true;
    hardFailReason = 'Prose Boundary: residual internal Beat scaffold after strip';
  } else if (!text.trim() && strippedLines.length > 0) {
    hardFail = true;
    hardFailReason = 'Prose Boundary: draft was only internal Beat scaffold';
  }

  return {
    text,
    strippedCount: strippedLines.length,
    strippedLines,
    hardFail,
    hardFailReason,
    writesCanon: false,
    writesSR: false,
    writesReality: false,
    role: 'prose_boundary_gate',
    version: PROSE_BOUNDARY_VERSION,
  };
}
