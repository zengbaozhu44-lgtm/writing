import { Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { NewBookWizardPage } from './pages/NewBookWizardPage';
import { BookLayout } from './layouts/BookLayout';
import { BookHomePage } from './pages/BookHomePage';
import { IdePage } from './pages/IdePage';
import { SettingsPageV3 } from './pages/SettingsPageV3';
import { ChapterTaskPage } from './pages/ChapterTaskPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/new" element={<NewBookWizardPage />} />
      <Route path="/book/:bookId" element={<BookLayout />}>
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<BookHomePage />} />
        <Route path="ide" element={<IdePage />} />
        <Route path="outline" element={<ChapterTaskPage />} />
        <Route path="chapter" element={<ChapterTaskPage />} />
        <Route path="settings" element={<SettingsPageV3 />} />
        {/* 旧路径兼容 → IDE */}
        <Route path="write" element={<Navigate to="../ide" replace />} />
        <Route path="create" element={<Navigate to="../ide" replace />} />
        <Route path="ai" element={<Navigate to="../ide" replace />} />
        <Route path="data" element={<Navigate to="../ide" replace />} />
        <Route path="world" element={<Navigate to="../ide" replace />} />
        <Route path="writing" element={<Navigate to="../ide" replace />} />
        <Route path="characters" element={<Navigate to="../ide" replace />} />
        <Route path="factions" element={<Navigate to="../ide" replace />} />
        <Route path="workspace" element={<Navigate to="../ide" replace />} />
        <Route path="reader" element={<Navigate to="../ide" replace />} />
        <Route path="chapters" element={<Navigate to="../ide" replace />} />
        <Route path="dashboard" element={<Navigate to="../home" replace />} />
        <Route path="metrics" element={<Navigate to="../ide" replace />} />
        <Route path="prompt" element={<Navigate to="../ide" replace />} />
        <Route path="runtime" element={<Navigate to="../ide" replace />} />
        <Route path="memory" element={<Navigate to="../ide" replace />} />
        <Route path="planner" element={<Navigate to="../ide" replace />} />
        <Route path="scene" element={<Navigate to="../ide" replace />} />
        <Route path="state" element={<Navigate to="../ide" replace />} />
        <Route path="relations" element={<Navigate to="../ide" replace />} />
        <Route path="timeline" element={<Navigate to="../ide" replace />} />
      </Route>
    </Routes>
  );
}
