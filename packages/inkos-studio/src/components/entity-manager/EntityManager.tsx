/**
 * 通用实体管理 — 列表 / 新增 / 编辑 / 删除
 * 本地模式（Wizard）与远端模式（IDE bookId）共用同一套 UI
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import { Field } from '../FormFields';
import {
  EntityField,
  EntityRecord,
  EntityType,
  ENTITY_MODULE_KEY,
  emptyRecord,
} from './types';
import { parseEntityMarkdown, serializeEntityMarkdown } from './serialize';
import { formatEntryChapter, validateCharacterDraft } from './fields-presets';

export interface EntityManagerProps {
  entityType: EntityType;
  /** 有 bookId → 远端 Canon CRUD；无 → 纯本地 value/onChange */
  bookId?: string;
  title: string;
  fields: EntityField[];
  minCount?: number;
  maxCount?: number;
  value?: EntityRecord[];
  onChange?: (items: EntityRecord[]) => void;
  readOnly?: boolean;
  compact?: boolean;
  /** 用于动态 label（由外部传入 fields 亦可） */
  genre?: string;
}

function safeFileName(name: string): string {
  return String(name || '未命名').replace(/[/\\?%*:|"<>]/g, '_').trim() || '未命名';
}

export function EntityManager({
  entityType,
  bookId,
  title,
  fields,
  minCount = 0,
  maxCount = 50,
  value,
  onChange,
  readOnly = false,
  compact = false,
  genre = '',
}: EntityManagerProps) {
  const moduleKey = ENTITY_MODULE_KEY[entityType];
  const remote = Boolean(bookId);

  const [items, setItems] = useState<EntityRecord[]>(value || []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const [origId, setOrigId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const syncLocal = useCallback((next: EntityRecord[]) => {
    setItems(next);
    onChange?.(next);
  }, [onChange]);

  const loadRemote = useCallback(async () => {
    if (!bookId) return;
    setBusy(true);
    setErr('');
    try {
      const m = await api.getModule(bookId, moduleKey);
      const files = m.files || [];
      const loaded: EntityRecord[] = [];
      for (const f of files) {
        try {
          const file = await api.getModuleFile(bookId, moduleKey, `${f.id}.md`);
          const rec = parseEntityMarkdown(entityType, file.content || '', f.id);
          // organization 视图：优先显示标记为组织的；也可全部显示
          if (entityType === 'organization' && rec.fields.kind && rec.fields.kind !== '组织') {
            // still show — mixed bible
          }
          loaded.push(rec);
        } catch {
          loaded.push(emptyRecord(entityType, f.id));
        }
      }
      setItems(loaded);
      if (loaded.length && !selectedId) {
        setSelectedId(loaded[0].id);
        setDraft({ ...loaded[0].fields });
        setOrigId(loaded[0].id);
      } else if (!loaded.length) {
        setSelectedId(null);
        setDraft(null);
        setOrigId(null);
      }
    } catch (e) {
      setErr((e as Error).message);
      setItems([]);
    } finally {
      setBusy(false);
    }
  }, [bookId, moduleKey, entityType, selectedId]);

  useEffect(() => {
    if (remote) void loadRemote();
  }, [remote, bookId, moduleKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!remote && value) {
      setItems(value);
      if (value.length && (!selectedId || !value.find((v) => v.id === selectedId))) {
        setSelectedId(value[0].id);
        setDraft({ ...value[0].fields });
        setOrigId(value[0].id);
      }
    }
  }, [remote, value]); // eslint-disable-line react-hooks/exhaustive-deps

  const select = (id: string) => {
    const rec = items.find((i) => i.id === id);
    if (!rec) return;
    setSelectedId(id);
    setDraft({ ...rec.fields });
    setOrigId(id);
    setMsg('');
  };

  const create = async () => {
    if (readOnly) return;
    if (items.length >= maxCount) {
      setMsg(`最多 ${maxCount} 个`);
      return;
    }
    const name = window.prompt(`新${title.replace(/卡$/, '')}名称`);
    if (!name?.trim()) return;
    const id = safeFileName(name.trim());
    if (items.some((i) => i.id === id || i.fields.name === id)) {
      setMsg('名称已存在');
      return;
    }
    const rec = emptyRecord(entityType, id);
    rec.fields.name = name.trim();
    const md = serializeEntityMarkdown(entityType, rec.fields);
    rec.markdown = md;

    if (remote && bookId) {
      setBusy(true);
      try {
        await api.putModuleFile(bookId, moduleKey, `${id}.md`, md);
        await loadRemote();
        setSelectedId(id);
        setDraft({ ...rec.fields });
        setOrigId(id);
        setMsg('已创建');
      } catch (e) {
        setErr((e as Error).message);
      } finally {
        setBusy(false);
      }
    } else {
      const next = [...items, rec];
      syncLocal(next);
      setSelectedId(id);
      setDraft({ ...rec.fields });
      setOrigId(id);
    }
  };

  const save = async () => {
    if (readOnly || !draft || !origId) return;
    let nextDraft = { ...draft };
    if (nextDraft.entryChapter) {
      nextDraft.entryChapter = formatEntryChapter(nextDraft.entryChapter);
    }
    if (entityType === 'character') {
      const missing = validateCharacterDraft(nextDraft);
      if (missing.length) {
        setMsg(`必填未完成：${missing.join('、')}（姓名/能力/目标至少三项）`);
        setDraft(nextDraft);
        return;
      }
    }
    const name = (nextDraft.name || '').trim();
    if (!name) {
      setMsg('名称不能为空');
      return;
    }
    const requiredMissing = fields.filter((f) => f.required && !String(nextDraft[f.key] || '').trim());
    if (requiredMissing.length && entityType !== 'character') {
      setMsg(`必填：${requiredMissing.map((f) => f.label).join('、')}`);
      return;
    }
    const newId = safeFileName(name);
    const md = serializeEntityMarkdown(entityType, { ...nextDraft, name });
    const updated: EntityRecord = { id: newId, fields: { ...nextDraft, name }, markdown: md };

    if (remote && bookId) {
      setBusy(true);
      setErr('');
      try {
        await api.putModuleFile(bookId, moduleKey, `${newId}.md`, md);
        if (newId !== origId) {
          await api.deleteModuleFile(bookId, moduleKey, `${origId}.md`);
        }
        await loadRemote();
        setSelectedId(newId);
        setDraft({ ...updated.fields });
        setOrigId(newId);
        setMsg('已保存');
      } catch (e) {
        setErr((e as Error).message);
      } finally {
        setBusy(false);
      }
    } else {
      const next = items.map((i) => (i.id === origId ? updated : i));
      syncLocal(next);
      setSelectedId(newId);
      setDraft({ ...updated.fields });
      setOrigId(newId);
      setMsg('已更新');
    }
  };

  const remove = async () => {
    if (readOnly || !origId) return;
    if (items.length <= minCount) {
      setMsg(`至少保留 ${minCount} 个`);
      return;
    }
    if (!window.confirm(`确认删除「${draft?.name || origId}」？`)) return;

    if (remote && bookId) {
      setBusy(true);
      try {
        await api.deleteModuleFile(bookId, moduleKey, `${origId}.md`);
        setSelectedId(null);
        setDraft(null);
        setOrigId(null);
        await loadRemote();
        setMsg('已删除');
      } catch (e) {
        setErr((e as Error).message);
      } finally {
        setBusy(false);
      }
    } else {
      const next = items.filter((i) => i.id !== origId);
      syncLocal(next);
      if (next.length) {
        setSelectedId(next[0].id);
        setDraft({ ...next[0].fields });
        setOrigId(next[0].id);
      } else {
        setSelectedId(null);
        setDraft(null);
        setOrigId(null);
      }
      setMsg('已删除');
    }
  };

  const nameField = useMemo(() => fields.find((f) => f.key === 'name'), [fields]);
  const otherFields = useMemo(() => fields.filter((f) => f.key !== 'name'), [fields]);

  return (
    <div className={`entity-manager ${compact ? 'compact' : ''}`}>
      <div className="entity-manager-toolbar">
        <div className="panel-title">{title}</div>
        <div className="entity-manager-actions">
          {!readOnly && (
            <button type="button" className="btn btn-sm" disabled={busy || items.length >= maxCount} onClick={() => void create()}>
              + 新增
            </button>
          )}
          {remote && (
            <button type="button" className="btn btn-sm" disabled={busy} onClick={() => void loadRemote()}>
              刷新
            </button>
          )}
        </div>
      </div>
      <p className="text-dim entity-count">{items.length} / {maxCount}{minCount > 0 ? ` · 最少 ${minCount}` : ''}</p>
      {msg && <p className="ai-msg">{msg}</p>}
      {err && <p className="error-text">{err}</p>}

      <div className="entity-manager-layout">
        <div className="entity-manager-list">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`entity-list-item ${selectedId === item.id ? 'active' : ''}`}
              onClick={() => select(item.id)}
            >
              <span className="entity-list-avatar">{(item.fields.name || item.id)[0] || '?'}</span>
              <span className="entity-list-name">{item.fields.name || item.id}</span>
            </button>
          ))}
          {items.length === 0 && (
            <p className="text-dim">暂无{title} — 点击「+ 新增」或使用 AI 生成</p>
          )}
        </div>

        {draft && (
          <div className="entity-manager-editor form-grid">
            {nameField && (
              <Field
                label={nameField.label}
                value={draft.name || ''}
                placeholder={nameField.placeholder}
                onChange={(v) => setDraft({ ...draft, name: v })}
                readOnly={readOnly}
              />
            )}
            {otherFields.map((f) => (
              <Field
                key={f.key}
                label={f.label}
                value={draft[f.key] || ''}
                placeholder={f.placeholder}
                multiline={f.multiline}
                onChange={(v) => setDraft({ ...draft, [f.key]: v })}
                onBlur={(v) => {
                  if (f.key === 'entryChapter') {
                    setDraft((d) => (d ? { ...d, entryChapter: formatEntryChapter(v) } : d));
                  }
                }}
                readOnly={readOnly}
              />
            ))}
            {entityType === 'character' && genre ? (
              <p className="text-dim entity-genre-hint">题材：{genre} · 能力字段已按题材适配</p>
            ) : null}
            {!readOnly && (
              <div className="entity-editor-actions">
                <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void save()}>
                  {busy ? '保存中…' : '保存'}
                </button>
                <button type="button" className="btn btn-danger" disabled={busy || items.length <= minCount} onClick={() => void remove()}>
                  删除
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
