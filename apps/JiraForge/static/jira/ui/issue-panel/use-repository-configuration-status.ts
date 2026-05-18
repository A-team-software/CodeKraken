import { useEffect } from 'react';
import { RepositoryConfigManager, RepositoryConfigNotFoundError } from './repository-config-manager';

function resolveProjectIdOrKeyFromContext(context: any): string {
	const project = context?.extension?.project;
	if (project?.id) return String(project.id);
	if (project?.key) return String(project.key);
	throw new Error('Missing project context. Could not resolve project id or key.');
}

type UseRepositoryConfigurationStatusArgs = {
	context: any | null;
	isContextLoading: boolean;
	contextError: string | null;
	repositoryConfigManager: RepositoryConfigManager;
	setIsRepositoryConfigured: (value: boolean | null) => void;
	showErrorFlag: (message: string) => void;
};

export function useRepositoryConfigurationStatus({
	context,
	isContextLoading,
	contextError,
	repositoryConfigManager,
	setIsRepositoryConfigured,
	showErrorFlag,
}: UseRepositoryConfigurationStatusArgs) {
	useEffect(() => {
		let isMounted = true;

		async function loadRepositoryConfiguration() {
			if (isContextLoading || contextError) {
				return;
			}

			if (!context) {
				setIsRepositoryConfigured(null);
				return;
			}

			try {
				const projectIdOrKey = resolveProjectIdOrKeyFromContext(context);
				const { repositories } = await repositoryConfigManager.getConfig(projectIdOrKey);

				if (!isMounted) {
					return;
				}

				setIsRepositoryConfigured(repositories.length > 0);
			} catch (e: any) {
				if (!isMounted) {
					return;
				}

				if (e instanceof RepositoryConfigNotFoundError) {
					setIsRepositoryConfigured(false);
					return;
				}

				setIsRepositoryConfigured(null);
				showErrorFlag('Failed to load project repository configuration.');
			}
		}

		loadRepositoryConfiguration();

		return () => {
			isMounted = false;
		};
	}, [
		context,
		isContextLoading,
		contextError,
		repositoryConfigManager,
		setIsRepositoryConfigured,
		showErrorFlag,
	]);
}
