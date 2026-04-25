import React from 'react';
import { createRoot } from 'react-dom/client';
import { view } from '@forge/bridge';
import App from './App';

import '@atlaskit/css-reset';
import './index.css';

const container = document.getElementById('root');
const root = createRoot(container);

// Enable Forge/Jira theming so Atlaskit components and design tokens resolve correctly.
// This fetches Jira's active theme and applies it to the Custom UI iframe.
view.theme.enable().then(() => {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
