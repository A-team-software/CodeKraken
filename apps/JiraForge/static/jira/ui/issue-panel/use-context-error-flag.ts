import { useEffect } from 'react';

export function useContextErrorFlag(
	contextError: string | null,
	showErrorFlag: (message: string) => void,
) {
	useEffect(() => {
		if (!contextError) {
			return;
		}

		showErrorFlag(contextError);
	}, [contextError, showErrorFlag]);
}
