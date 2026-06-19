import React from 'react';
import { createRoot } from 'react-dom/client';
import { Playground } from './components/Playground';
import './style.css'; // Optional if they have one, I'll create a basic one or just inline styles. Actually I'll use styled-components or inline styles in the components.

const app = document.getElementById('app');
if (!app) {
  throw new Error("Root element 'app' not found");
}
const root = createRoot(app);

root.render(
  <React.StrictMode>
    <Playground />
  </React.StrictMode>
);
