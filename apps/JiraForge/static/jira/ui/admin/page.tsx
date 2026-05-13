import React from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import App from './App';

import '@atlaskit/css-reset';
import './index.css';

export function AdminPage() {
	return (
		<React.StrictMode>
			<Provider store={store}>
				<App />
			</Provider>
		</React.StrictMode>
	);
}
