import { useEffect } from 'react';
import { setGlobalTheme } from '@atlaskit/tokens';

export function useIssuePanelTheme() {
	useEffect(() => {
		setGlobalTheme({ colorMode: 'light', dark: 'dark', light: 'light', spacing: 'spacing' });
	}, []);
}
