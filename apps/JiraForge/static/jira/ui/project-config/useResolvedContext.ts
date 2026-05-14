import { useEffect, useState } from 'react';
import { view } from '@forge/bridge';

type ResolvedContextState = {
	context: any | null;
	isLoading: boolean;
	error: string | null;
};

export function useResolvedContext(): ResolvedContextState {
	const [context, setContext] = useState<any | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let isMounted = true;

		async function loadContext() {
			try {
				const resolvedContext = await view.getContext();

				if (!isMounted) {
					return;
				}

				setContext(resolvedContext);
			} catch (e: any) {
				if (!isMounted) {
					return;
				}

				setError(e?.message || 'Failed to resolve Forge context.');
			} finally {
				if (isMounted) {
					setIsLoading(false);
				}
			}
		}

		loadContext();

		return () => {
			isMounted = false;
		};
	}, []);

	return { context, isLoading, error };
}
