import { JiraIssueDescription, TaskLauncher } from './task-launcher';
import { RemoteTaskLauncher } from './remote-task-launcher';

export const DEFAULT_FIBONACCI_REPOSITORY_URLS = ['https://github.com/hervinhio/fibonacci'];

type InvokeFunction = (functionName: string, payload?: Record<string, unknown>) => Promise<unknown>;

type InvokeRemoteFunction = (args: {
	path: string;
	method?: string;
	headers?: Record<string, string>;
	body?: string;
}) => Promise<unknown>;

type MockTaskLauncherDeps = {
	invoke?: InvokeFunction;
	invokeRemote?: InvokeRemoteFunction;
};

export class MockTaskLauncher implements TaskLauncher {
	private readonly remoteLauncher: RemoteTaskLauncher;

	constructor(
		private readonly deps: MockTaskLauncherDeps,
		private readonly defaultTargetRepositoryUrls: string[] = DEFAULT_FIBONACCI_REPOSITORY_URLS
	) {
		this.remoteLauncher = new RemoteTaskLauncher(deps);
	}

	async startTask(issue: JiraIssueDescription, targetRepositoryUrls: string[] = this.defaultTargetRepositoryUrls): Promise<unknown> {
		const normalizedTargetRepositories = targetRepositoryUrls
			.map((url) => String(url || '').trim())
			.filter(Boolean);

		const effectiveTargetRepositories =
			normalizedTargetRepositories.length > 0 ? normalizedTargetRepositories : this.defaultTargetRepositoryUrls;

		return this.remoteLauncher.startTask(issue, effectiveTargetRepositories);
	}
}
