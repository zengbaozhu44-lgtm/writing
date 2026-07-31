import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { InkOSErrorBoundary } from './components/InkOSErrorBoundary';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <InkOSErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </InkOSErrorBoundary>
  </StrictMode>,
);
