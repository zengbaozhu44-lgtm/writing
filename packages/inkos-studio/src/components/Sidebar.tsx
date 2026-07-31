import { useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';

const NAV_ITEMS = [
  { to: 'home', icon: '📚', label: '我的小说' },
  { to: 'create', icon: '✍️', label: '创作中心' },
  { to: 'write', icon: '📖', label: '写作工作台' },
  { to: 'ai', icon: '🤖', label: 'AI助手' },
  { to: 'data', icon: '📊', label: '数据中心' },
  { to: 'settings', icon: '⚙️', label: '系统设置' },
];

export function Sidebar({ bookTitle, onBack }: { bookTitle: string; onBack: () => void }) {
  const { bookId } = useParams<{ bookId: string }>();
  const id = bookId ? decodeURIComponent(bookId) : '';
  const bookTo = (segment: string) => `/book/${encodeURIComponent(id)}/${segment}`;

  return (
    <aside className="ide-sidebar v3">
      <div className="sidebar-header">
        <button type="button" className="btn-ghost" onClick={onBack}>← 书库</button>
        <div className="book-title">{bookTitle}</div>
      </div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={bookTo(item.to)}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <span className="badge">V3.0</span>
      </div>
    </aside>
  );
}
