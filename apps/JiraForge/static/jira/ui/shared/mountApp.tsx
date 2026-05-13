import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import App from './App';

import '@atlaskit/css-reset';
import './index.css';

export function mountApp() {
  const container = document.getElementById('root');

  if (!container) {
    throw new Error('Root element #root was not found');
  }

  const root = createRoot(container);

  root.render(
    <React.StrictMode>
      <Provider store={store}>
        <App />
      </Provider>
    </React.StrictMode>
  );
}
