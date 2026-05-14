import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GitlabRepositoryFinder } from './gitlab-repository-finder';

vi.mock('@forge/bridge', () => ({
	invoke: vi.fn(),
}));

import { invoke } from '@forge/bridge';

describe('GitlabRepositoryFinder', () => {
	let finder: GitlabRepositoryFinder;

	beforeEach(() => {
		finder = new GitlabRepositoryFinder();
		vi.clearAllMocks();
	});

	it('should return empty array for empty query', async () => {
		const results = await finder.search('');
		expect(results).toEqual([]);
		expect(invoke).not.toHaveBeenCalled();
	});

	it('should invoke searchGitlabRepositories resolver', async () => {
		vi.mocked(invoke).mockResolvedValue([
			{ id: 'gl-1', name: 'project1', url: 'https://gitlab.com/group/project1', namespace: 'group' },
		]);

		const results = await finder.search('project');

		expect(invoke).toHaveBeenCalledWith('searchGitlabRepositories', { query: 'project' });
		expect(results.length).toBe(1);
		expect(results[0].source).toBe('gitlab');
	});

	it('should map resolver response to RepositoryResult', async () => {
		vi.mocked(invoke).mockResolvedValue([
			{
				id: 'gl-789',
				name: 'my-project',
				namespace: 'my-group',
				url: 'https://gitlab.com/my-group/my-project',
			},
		]);

		const results = await finder.search('my');

		expect(results[0]).toEqual({
			id: 'gl-789',
			name: 'my-project',
			url: 'https://gitlab.com/my-group/my-project',
			source: 'gitlab',
		});
	});

	it('should generate URL if not provided by resolver', async () => {
		vi.mocked(invoke).mockResolvedValue([
			{ id: 'gl-999', name: 'test-project', namespace: 'test-namespace' },
		]);

		const results = await finder.search('test');

		expect(results[0].url).toBe('https://gitlab.com/test-namespace/test-project');
	});

	it('should return empty array on error', async () => {
		vi.mocked(invoke).mockRejectedValue(new Error('Search failed'));

		const results = await finder.search('query');

		expect(results).toEqual([]);
	});

	it('should handle null or undefined resolver response', async () => {
		vi.mocked(invoke).mockResolvedValue(undefined);

		const results = await finder.search('query');

		expect(results).toEqual([]);
	});
});
