import { Github, Box } from 'lucide-react';
import { IGitProvider } from '../../application/domain/services/IGitProvider.interface';
import { GitHubService } from './GitHubService';
import { BitbucketService } from './BitbucketService';

export interface OAuthTokenResponse {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
}

export interface GitProviderMetadata {
    id: string;
    name: string;
    icon: any;
    tokenPlaceholder: string;
    tokenDescription: string;
    supportsOAuth: boolean;
    factory: (token: string) => IGitProvider;
    oauth?: {
        getLoginUrl: (state: string, redirectUri?: string) => string;
        exchangeCodeForToken: (code: string) => Promise<OAuthTokenResponse>;
    };
}

export const GIT_PROVIDER_REGISTRY: Record<string, GitProviderMetadata> = {
    github: {
        id: 'github',
        name: 'GitHub',
        icon: Github,
        tokenPlaceholder: 'ghp_xxxxxxxxxxxx',
        tokenDescription: 'Personal Access Token (scopes: repo, admin:repo_hook)',
        supportsOAuth: true,
        factory: (token: string) => new GitHubService(token),
        oauth: {
            getLoginUrl: GitHubService.getLoginUrl,
            exchangeCodeForToken: GitHubService.exchangeCodeForToken,
        },
    },
    bitbucket: {
        id: 'bitbucket',
        name: 'Bitbucket',
        icon: Box, // Placeholder for now
        tokenPlaceholder: 'Bitbucket Token',
        tokenDescription: 'Bitbucket App Password or OAuth Token',
        supportsOAuth: true,
        factory: (token: string) => new BitbucketService(token),
        oauth: {
            getLoginUrl: BitbucketService.getLoginUrl,
            exchangeCodeForToken: BitbucketService.exchangeCodeForToken,
        },
    },
};

export type GitProviderType = keyof typeof GIT_PROVIDER_REGISTRY;

export class GitProviderFactory {
    static create(type: string, token: string): IGitProvider {
        const provider = GIT_PROVIDER_REGISTRY[type];
        if (!provider) {
            throw new Error(`Git provider ${type} not supported.`);
        }
        return provider.factory(token);
    }

    static getMetadata(type: string): GitProviderMetadata | null {
        return GIT_PROVIDER_REGISTRY[type] || null;
    }

    static getAllProviders(): GitProviderMetadata[] {
        return Object.values(GIT_PROVIDER_REGISTRY);
    }
}
