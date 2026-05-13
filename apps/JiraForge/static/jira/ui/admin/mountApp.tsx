import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

export function mountApp(node: ReactNode) {
  const container = document.getElementById('root');

  if (!container) {
    throw new Error('Root element #root was not found');
  }

  createRoot(container).render(node);
}
