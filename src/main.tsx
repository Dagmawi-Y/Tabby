import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import TabbyExtension from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TabbyExtension />
  </StrictMode>
);
