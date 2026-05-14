import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GitHubRepositoryFinder } from './github-repository-finder';

vi.mock('@forge/bridge', () => ({
	invoke: vi.fn(),
}));

import { invoke } from '@forge/bridge';

describe('GitHubRepositoryFinder', () => {
	let finder: GitHubRepositoryFinder;

	beforeEach(() => {
		finder = new GitHubRepositoryFinder();
		vi.clearAllMocks();
	});

	it('should return empty array for empty query', async () => {
		const results = await finder.search('');
		expect(results).toEqual([]);
		expect(invoke).not.toHaveBeenCalled();
	});

	it('should invoke searchGitHubRepositories resolver', async () => {
		vi.mocked(invoke).mockResolvedValue([
			{ id: 'gh-1', name: 'repo1', url: 'https://github.com/user/repo1', owner: 'user' },
		]);

		const results = await finder.search('repo');

		expect(invoke).toHaveBeenCalledWith('searchGitHubRepositories', { query: 'repo' });
		expect(results.length).toBe(1);
		expect(results[0].source).toBe('github');
	});

	it('should map resolver response to RepositoryResult', async () => {
		vi.mocked(invoke).mockResolvedValue([
			{
				id: 'gh-123',
				name: 'awesome-repo',
				owner: 'my-org',
				url: 'https://github.com/my-org/awesome-repo',
			},
		]);

		const results = await finder.search('awesome');

		expect(results[0]).toEqual({
			id: 'gh-123',
			name: 'awesome-repo',
			url: 'https://github.com/my-org/awesome-repo',
			source: 'github',
		});
	});

	it('should generate URL if not provided by resolver', async () => {
		vi.mocked(invoke).mockResolvedValue([
			{ id: 'gh-456', name: 'test-repo', owner: 'test-org' },
		]);

		const results = await finder.search('test');

		expect(results[0].url).toBe('https://github.com/test-org/test-repo');
	});

	it('should return empty array on error', async () => {
		vi.mocked(invoke).mockRejectedValue(new Error('Search failed'));

		const results = await finder.search('query');

		expect(results).toEqual([]);
	});

	it('should handle null or undefined resolver response', async () => {
		vi.mocked(invoke).mockResolvedValue(null);

		const results = await finder.search('query');

		expect(results).toEqual([]);
	});
});
