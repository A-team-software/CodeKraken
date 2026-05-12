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

// We are handling the theme locally via Redux and @atlaskit/tokens
renderApp();
