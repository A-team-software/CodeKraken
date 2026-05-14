import React from 'react';
import { createRoot } from 'react-dom/client';

const container = document.getElementById('root');

if (!container) {
	throw new Error('Root element #root was not found');
}

createRoot(container).render(
	<React.StrictMode>
		<div style={{ padding: 16, fontFamily: 'var(--ds-font-family-body, sans-serif)' }}>
			This surface is no longer active.
		</div>
	</React.StrictMode>
);
