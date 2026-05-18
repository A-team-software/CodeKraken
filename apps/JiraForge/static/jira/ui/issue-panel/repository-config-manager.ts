export type Repository = {
	id: string;
	name: string;
	url: string;
	source: string;
	selected: boolean;
};

export type RepositoryConfig = {
	repositories: Repository[];
};

export class RepositoryConfigNotFoundError extends Error {
	constructor(message = 'Repository configuration not found for this project.') {
		super(message);
		this.name = 'RepositoryConfigNotFoundError';
	}
}

export interface RepositoryConfigManager {
	getConfig(projectIdOrKey: string): Promise<RepositoryConfig>;
}
