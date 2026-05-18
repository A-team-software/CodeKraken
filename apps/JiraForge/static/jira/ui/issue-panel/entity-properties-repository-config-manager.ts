import { Repository, RepositoryConfigManager, RepositoryConfigNotFoundError } from './repository-config-manager';

type InvokeFunction = (functionName: string, payload?: Record<string, unknown>) => Promise<unknown>;

export class EntityPropertiesRepositoryConfigManager implements RepositoryConfigManager {
	constructor(private readonly invoke: InvokeFunction) {}

	async getConfig(projectIdOrKey: string) {
		const payload = (await this.invoke('getProjectRepositories', { projectIdOrKey })) as unknown;
		const repositories = Array.isArray(payload) ? (payload as Repository[]) : [];

		if (repositories.length === 0) {
			throw new RepositoryConfigNotFoundError();
		}

		return { repositories };
	}
}
