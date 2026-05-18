import { showFlag } from '@forge/bridge';
import { JiraIssueDescription, TaskLauncher } from './task-launcher';
import { RepositoryNotConfiguredError } from './task-launcher';

type InvokeFunction = (functionName: string, payload?: Record<string, unknown>) => Promise<unknown>;

type InvokeRemoteFunction = (args: {
	path: string;
	method?: string;
	headers?: Record<string, string>;
	body?: string;
}) => Promise<unknown>;

type RemoteTaskLauncherDeps = {
	invoke?: InvokeFunction;
	invokeRemote?: InvokeRemoteFunction;
};

export class RemoteTaskLauncher implements TaskLauncher {
	constructor(private readonly deps: RemoteTaskLauncherDeps) {}

	async startTask(issue: JiraIssueDescription, targetRepositoryUrls: string[]): Promise<unknown> {
		const repoUrl = targetRepositoryUrls.map((url) => String(url || '').trim()).find(Boolean);

		if (!repoUrl) {
			showFlag({
				id: `repository-not-configured-${Date.now()}`,
				title: 'Repository not configured',
				description:
					'Ask your project admin to configure the code repository for this Jira project in OliverAI Project Settings.',
				type: 'warning',
				isAutoDismiss: true,
			});

			throw new RepositoryNotConfiguredError();
		}

		if (this.deps.invoke) {
			return this.deps.invoke('startTaskDevelopment', {
				repoUrl,
				webhookEvent: 'jira:issue_created',
				issue,
			});
		}

		if (this.deps.invokeRemote) {
			return this.deps.invokeRemote({
				path: '/api/task?provider=jira',
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					repoUrl,
					webhookEvent: 'jira:issue_created',
					issue,
				}),
			});
		}

		throw new Error('RemoteTaskLauncher requires either invoke or invokeRemote.');
	}
}
