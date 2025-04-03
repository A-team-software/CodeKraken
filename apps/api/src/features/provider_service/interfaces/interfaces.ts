

export interface WebhookServiceInterface {
    getWebhooks: (userName: string, repoName: string, token: string) => Promise<any>;
    setWebhook: (userAndRepoName: string, token: string) => Promise<any>;
}


export interface GitRepositoryServiceInterface {
    getUserRepos: (serviceProvider: string) => Promise<Repository[] | null>;
}




/**
 * Enum defining common Git repository hosting providers.
 */
export enum RepositoryProvider {
    GITHUB = 'github',
    GITLAB = 'gitlab',
    BITBUCKET = 'bitbucket',
    AZURE_DEVOPS = 'azure_devops',
    SELF_HOSTED = 'self_hosted', // For custom Git server instances
    UNKNOWN = 'unknown',
}

/**
 * Enum defining the visibility of the repository.
 */
export enum RepositoryVisibility {
    PUBLIC = 'public',
    PRIVATE = 'private',
    INTERNAL = 'internal', // Some providers like GitHub/GitLab have this concept
}

/**
 * Represents a code repository, typically managed with Git.
 * Contains details needed to locate, clone, and interact with the repo.
 */
export type Repository = {
    id: string,
    name: string, //Repository name
    full_name: string, // Repositories's name and owner's name
    html_url: string, //Repository URL
    owner: {
        login: string // User name
    },
    private: boolean,
    repositoriesURL: string | any,
}

