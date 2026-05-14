import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BitbucketRepositoryFinder } from './bitbucket-repository-finder';

vi.mock('@forge/bridge', () => ({
	invoke: vi.fn(),
}));

import { invoke } from '@forge/bridge';

describe('BitbucketRepositoryFinder', () => {
	let finder: BitbucketRepositoryFinder;

	beforeEach(() => {
		finder = new BitbucketRepositoryFinder();
		vi.clearAllMocks();
	});

	it('should return empty array for empty query', async () => {
		const results = await finder.search('');
		expect(results).toEqual([]);
		expect(invoke).not.toHaveBeenCalled();
	});

	it('should invoke searchBitbucketRepositories resolver', async () => {
		vi.mocked(invoke).mockResolvedValue([
			{ id: 'bb-1', name: 'repo1', url: 'https://bitbucket.org/workspace/repo1', workspace: 'workspace' },
		]);

		const results = await finder.search('repo');

		expect(invoke).toHaveBeenCalledWith('searchBitbucketRepositories', { query: 'repo' });
		expect(results.length).toBe(1);
		expect(results[0].source).toBe('bitbucket');
	});

	it('should map resolver response to RepositoryResult', async () => {
		vi.mocked(invoke).mockResolvedValue([
			{
				id: 'bb-321',
				name: 'awesome-project',
				workspace: 'my-workspace',
				url: 'https://bitbucket.org/my-workspace/awesome-project',
			},
		]);

		const results = await finder.search('awesome');

		expect(results[0]).toEqual({
			id: 'bb-321',
			name: 'awesome-project',
			url: 'https://bitbucket.org/my-workspace/awesome-project',
			source: 'bitbucket',
		});
	});

	it('should generate URL if not provided by resolver', async () => {
		vi.mocked(invoke).mockResolvedValue([
			{ id: 'bb-555', name: 'test-repo', workspace: 'test-ws' },
		]);

		const results = await finder.search('test');

		expect(results[0].url).toBe('https://bitbucket.org/test-ws/test-repo');
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
