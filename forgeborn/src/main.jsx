// FORGEBORN — entry point.
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { loadGame, createStore, storage } from './engine.js';

function start(hot) {
  const store = createStore(loadGame(hot));
  try { if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => ({ state: store.s, storage: storage.status })); } catch (e) { /* optional */ }
  const el = document.getElementById('root');
  createRoot(el).render(<App store={store} />);
}
const hot = window.claude && window.claude.hot;
if (hot && hot.ready) hot.ready(start); else start((hot && hot.data) || null);
