import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RepositoryResult } from './repository-finder';
import { MockRepositoryFinder } from './mock-repository-finder';
import { RemoteRepositoryFinder } from './remote-repository-finder';

vi.mock('@forge/bridge', () => ({
	invoke: vi.fn(),
}));

describe('MockRepositoryFinder', () => {
	let finder: MockRepositoryFinder;

	beforeEach(() => {
		finder = new MockRepositoryFinder();
	});

	it('should return empty array for empty query', async () => {
		const results = await finder.search('');
		expect(results).toEqual([]);
	});

	it('should return empty array for whitespace-only query', async () => {
		const results = await finder.search('   ');
		expect(results).toEqual([]);
	});

	it('should find repositories by name (case-insensitive)', async () => {
		const results = await finder.search('oliver');
		expect(results.length).toBeGreaterThan(0);
		expect(results.some((r) => r.name.toLowerCase().includes('oliver'))).toBe(true);
	});

	it('should find repositories by URL (case-insensitive)', async () => {
		const results = await finder.search('github.com/a-team');
		expect(results.length).toBeGreaterThan(0);
		expect(results.some((r) => r.url.toLowerCase().includes('a-team'))).toBe(true);
	});

	it('should return at most 20 results', async () => {
		const results = await finder.search('service');
		expect(results.length).toBeLessThanOrEqual(20);
	});

	it('should return results with correct structure', async () => {
		const results = await finder.search('api');
		expect(results.length).toBeGreaterThan(0);
		results.forEach((repo: RepositoryResult) => {
			expect(repo).toHaveProperty('id');
			expect(repo).toHaveProperty('name');
			expect(repo).toHaveProperty('url');
			expect(repo).toHaveProperty('source');
			expect(['github', 'gitlab', 'bitbucket']).toContain(repo.source);
		});
	});

	it('should include github repos in results', async () => {
		const results = await finder.search('github');
		const githubRepos = results.filter((r) => r.source === 'github');
		expect(githubRepos.length).toBeGreaterThan(0);
	});

	it('should include gitlab repos in results', async () => {
		const results = await finder.search('gitlab');
		const gitlabRepos = results.filter((r) => r.source === 'gitlab');
		expect(gitlabRepos.length).toBeGreaterThan(0);
	});

	it('should include bitbucket repos in results', async () => {
		const results = await finder.search('bitbucket');
		const bitbucketRepos = results.filter((r) => r.source === 'bitbucket');
		expect(bitbucketRepos.length).toBeGreaterThan(0);
	});
});

describe('RemoteRepositoryFinder', () => {
	let finder: RemoteRepositoryFinder;

	beforeEach(() => {
		finder = new RemoteRepositoryFinder();
	});

	it('should initialize with three internal finders', () => {
		expect(finder).toBeDefined();
		expect(finder).toHaveProperty('githubFinder');
		expect(finder).toHaveProperty('gitlabFinder');
		expect(finder).toHaveProperty('bitbucketFinder');
	});

	it('should return empty array for empty query', async () => {
		const results = await finder.search('');
		expect(results).toEqual([]);
	});

	it('should handle search errors gracefully', async () => {
		vi.spyOn((finder as any).githubFinder, 'search').mockRejectedValue(new Error('boom'));
		vi.spyOn((finder as any).gitlabFinder, 'search').mockResolvedValue([]);
		vi.spyOn((finder as any).bitbucketFinder, 'search').mockResolvedValue([]);

		const results = await finder.search('test');
		expect(results).toEqual([]);
	});
});
