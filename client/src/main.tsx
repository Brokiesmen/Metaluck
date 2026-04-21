import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';

// dev: react-playing-cards всё ещё на defaultProps — шум в консоли, на работу приложения не влияет
if (import.meta.env.DEV) {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    const first = args[0];
    if (typeof first === 'string' && /Support for defaultProps will be removed/.test(first)) {
      return;
    }
    originalError.call(console, ...args);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
