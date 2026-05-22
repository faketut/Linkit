import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

const container = document.getElementById('app') ?? document.body;
container.removeAttribute('aria-busy');
container.innerHTML = '';
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
