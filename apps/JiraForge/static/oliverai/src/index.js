import React from 'react';
import { createRoot } from 'react-dom/client';
import { view } from '@forge/bridge';
import { Provider } from 'react-redux';
import { store } from './store';
import App from './App';

import '@atlaskit/css-reset';
import './index.css';

const container = document.getElementById('root');
const root = createRoot(container);

// Enable Forge/Jira theming so Atlaskit components and design tokens resolve correctly.
// This fetches Jira's active theme and applies it to the Custom UI iframe.
const renderApp = () => {
  root.render(
    <React.StrictMode>
      <Provider store={store}>
        <App />
      </Provider>
    </React.StrictMode>
  );
};

// We attempt to enable themes, but ensure we render even if it fails or hangs
// to avoid a blank page in the Forge sandbox.
view.theme.enable()
  .then(renderApp)
  .catch((err) => {
    console.warn('Failed to enable Jira theme:', err);
    renderApp();
  });
