import { BitbucketRepositoryFinder } from './bitbucket-repository-finder';
import { GitHubRepositoryFinder } from './github-repository-finder';
import { GitlabRepositoryFinder } from './gitlab-repository-finder';
import { RepositoryFinder, RepositoryResult } from './repository-finder';

export class RemoteRepositoryFinder implements RepositoryFinder {
	private githubFinder: GitHubRepositoryFinder;
	private gitlabFinder: GitlabRepositoryFinder;
	private bitbucketFinder: BitbucketRepositoryFinder;

	constructor() {
		this.githubFinder = new GitHubRepositoryFinder();
		this.gitlabFinder = new GitlabRepositoryFinder();
		this.bitbucketFinder = new BitbucketRepositoryFinder();
	}

	async search(query: string): Promise<RepositoryResult[]> {
		try {
			const [githubResults, gitlabResults, bitbucketResults] = await Promise.all([
				this.githubFinder.search(query),
				this.gitlabFinder.search(query),
				this.bitbucketFinder.search(query),
			]);

			// Merge results from all three sources
			return [...githubResults, ...gitlabResults, ...bitbucketResults];
		} catch (error) {
			console.error('RemoteRepositoryFinder search failed:', error);
			return [];
		}
	}
}
