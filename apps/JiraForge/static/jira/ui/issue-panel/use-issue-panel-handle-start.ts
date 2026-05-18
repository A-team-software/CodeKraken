import { useMemo } from 'react';
import { TaskLauncher, RepositoryNotConfiguredError } from './task-launcher';
import { Repository, RepositoryConfigManager, RepositoryConfigNotFoundError } from './repository-config-manager';
import {
	normalizeIssueFromContext,
	resolveProjectIdOrKeyFromContext,
	resolveTargetRepositoryUrlsFromProjectRepositories,
} from './issue-panel-utils';

type UseIssuePanelHandleStartArgs = {
	context: any | null;
	contextError: string | null;
	taskLauncher: TaskLauncher;
	repositoryConfigManager: RepositoryConfigManager;
	setIsStarting: (value: boolean) => void;
	setStatus: (value: string | null) => void;
	setIsRepositoryConfigured: (value: boolean | null) => void;
	showErrorFlag: (message: string) => void;
};

export function useIssuePanelHandleStart({
	context,
	contextError,
	taskLauncher,
	repositoryConfigManager,
	setIsStarting,
	setStatus,
	setIsRepositoryConfigured,
	showErrorFlag,
}: UseIssuePanelHandleStartArgs) {
	return useMemo(
		() =>
			async function handleStart() {
				setIsStarting(true);
				setStatus(null);

				try {
					if (!context) {
						throw new Error(contextError || 'Forge context has not been resolved yet.');
					}

					const projectIdOrKey = resolveProjectIdOrKeyFromContext(context);
					let configuredRepositories: Repository[] = [];

					try {
						const config = await repositoryConfigManager.getConfig(projectIdOrKey);
						configuredRepositories = config.repositories;
					} catch (e: any) {
						if (!(e instanceof RepositoryConfigNotFoundError)) {
							throw e;
						}
					}

					const issue = await normalizeIssueFromContext(context);
					const targetRepositoryUrls = resolveTargetRepositoryUrlsFromProjectRepositories(configuredRepositories);

					await taskLauncher.startTask(issue, targetRepositoryUrls);
					setIsRepositoryConfigured(true);
					setStatus('Task started successfully.');
				} catch (e: any) {
					if (e instanceof RepositoryNotConfiguredError) {
						setIsRepositoryConfigured(false);
						return;
					}

					showErrorFlag(e?.message || 'Failed to start task development.');
				} finally {
					setIsStarting(false);
				}
			},
		[
			context,
			contextError,
			taskLauncher,
			repositoryConfigManager,
			setIsStarting,
			setStatus,
			setIsRepositoryConfigured,
			showErrorFlag,
		],
	);
}
