import { invoke } from '@forge/bridge';
import { RepositoryFinder, RepositoryResult } from './repository-finder';

export class BitbucketRepositoryFinder implements RepositoryFinder {
	async search(query: string): Promise<RepositoryResult[]> {
		if (!query.trim()) {
			return [];
		}

		try {
			const results = await invoke('searchBitbucketRepositories', { query });
			return (results || []).map((repo: any) => ({
				id: repo.id || `bb-${repo.name}`,
				name: repo.name,
				url: repo.url || `https://bitbucket.org/${repo.workspace}/${repo.name}`,
				source: 'bitbucket' as const,
			}));
		} catch (error) {
			console.error('Bitbucket repository search failed:', error);
			return [];
		}
	}
}
