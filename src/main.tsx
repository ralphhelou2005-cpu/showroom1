import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import './styles/site.css';

const root = document.getElementById('root')!;
const app = (
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <App />
    </BrowserRouter>
  </StrictMode>
);
/* pages built ahead of time arrive with their content already in place, and React takes them over without redrawing.
   Any other address (a car added after the last build, an old link) is drawn here. */
const here = location.pathname.slice(import.meta.env.BASE_URL.length - 1).replace(/\/+$/, '') || '/';
if (root.firstElementChild && root.dataset.path === here) hydrateRoot(root, app);
else { root.textContent = ''; createRoot(root).render(app); }
