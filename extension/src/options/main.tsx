import '../../styles/global.css';
import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { Options } from './options';

const el = document.getElementById('root');
if (!el) throw new Error('#root not found');

createRoot(el).render(
  <StrictMode>
    <Options />
  </StrictMode>,
);
