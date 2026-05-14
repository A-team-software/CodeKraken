import { invoke } from '@forge/bridge';
import { RepositoryFinder, RepositoryResult } from './repository-finder';

export class GitlabRepositoryFinder implements RepositoryFinder {
	async search(query: string): Promise<RepositoryResult[]> {
		if (!query.trim()) {
			return [];
		}

		try {
			const results = await invoke('searchGitlabRepositories', { query });
			return (results || []).map((repo: any) => ({
				id: repo.id || `gl-${repo.name}`,
				name: repo.name,
				url: repo.url || `https://gitlab.com/${repo.namespace}/${repo.name}`,
				source: 'gitlab' as const,
			}));
		} catch (error) {
			console.error('GitLab repository search failed:', error);
			return [];
		}
	}
}
