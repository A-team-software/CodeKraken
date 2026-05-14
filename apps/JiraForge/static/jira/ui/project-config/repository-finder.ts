export type RepositorySource = 'github' | 'gitlab' | 'bitbucket';

export type RepositoryResult = {
	id: string;
	name: string;
	url: string;
	source: RepositorySource;
};

export interface RepositoryFinder {
	search(query: string): Promise<RepositoryResult[]>;
}
