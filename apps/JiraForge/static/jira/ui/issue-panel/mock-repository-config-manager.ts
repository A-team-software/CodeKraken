import { RepositoryConfigManager } from './repository-config-manager';
import { Repository } from './repository-config-manager';
import { DEFAULT_FIBONACCI_REPOSITORY_URLS } from './mock-task-launcher';

const DEFAULT_MOCK_REPOSITORIES: Repository[] = DEFAULT_FIBONACCI_REPOSITORY_URLS.map((url, index) => ({
	id: `mock-repository-${index + 1}`,
	name: `mock-repository-${index + 1}`,
	url,
	source: 'github',
	selected: true,
}));

export class MockRepositoryConfigManager implements RepositoryConfigManager {
	async getConfig(_projectIdOrKey: string) {
		return { repositories: DEFAULT_MOCK_REPOSITORIES };
	}
}
