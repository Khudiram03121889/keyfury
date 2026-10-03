import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { generateMatchCardBlob } from './lib/downloadMatchCard.ts';

if (import.meta.env.DEV) {
  (window as any).__generateMatchCardBlob = generateMatchCardBlob;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
