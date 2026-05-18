export type JiraIssueDescription = {
	id: string;
	key: string;
	fields: {
		summary: string;
		description: unknown;
		issuetype: {
			id?: string;
			name?: string;
		} | null;
	};
};

export interface TaskLauncher {
	startTask(issue: JiraIssueDescription, targetRepositoryUrls: string[]): Promise<unknown>;
}

export class RepositoryNotConfiguredError extends Error {
	constructor(message = 'Repository not configured for this project.') {
		super(message);
		this.name = 'RepositoryNotConfiguredError';
	}
}
