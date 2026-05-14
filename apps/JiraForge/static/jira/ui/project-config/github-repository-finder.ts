import { invoke } from '@forge/bridge';
import { RepositoryFinder, RepositoryResult } from './repository-finder';

export class GitHubRepositoryFinder implements RepositoryFinder {
	async search(query: string): Promise<RepositoryResult[]> {
		if (!query.trim()) {
			return [];
		}

		try {
			const results = await invoke('searchGitHubRepositories', { query });
			return ((results as any[]) || []).map((repo: any) => ({
				id: repo.id || `gh-${repo.name}`,
				name: repo.name,
				url: repo.url || `https://github.com/${repo.owner}/${repo.name}`,
				source: 'github' as const,
			}));
		} catch (error) {
			console.error('GitHub repository search failed:', error);
			return [];
		}
	}
}
