import React from 'react';
import { createRoot } from 'react-dom/client';
import { ProjectConfigPage } from './page';

const container = document.getElementById('root');

if (!container) {
	throw new Error('Root element #root was not found');
}

createRoot(container).render(
	<React.StrictMode>
		<ProjectConfigPage />
	</React.StrictMode>
);
