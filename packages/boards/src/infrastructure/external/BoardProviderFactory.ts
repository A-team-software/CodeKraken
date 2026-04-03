import { Trello as TrelloIcon, CheckSquare, Workflow } from 'lucide-react';
import { AsanaService } from './AsanaService';
import { JiraService } from './JiraService';
import { LinearService } from './LinearService';
import { TrelloService } from './TrelloService';
import { IBoardProvider } from '../../domain/services/IBoardProvider.interface';
import { BoardProviderError } from '@oliver/shared';

export interface BoardProviderMetadata {
    id: string;
    name: string;
    icon: any;
    tokenPlaceholder: string;
    tokenDescription: string;
    supportsOAuth: boolean;
    factory: (token: string) => IBoardProvider;
    oauth?: {
        getLoginUrl: (state: string) => string;
        exchangeCodeForToken: (code: string, redirectUri?: string) => Promise<any>;
    };
}

export const BOARD_PROVIDER_REGISTRY: Record<string, BoardProviderMetadata> = {
    jira: {
        id: 'jira',
        name: 'Jira Software',
        icon: TrelloIcon, // Placeholder
        tokenPlaceholder: 'domain.atlassian.net|email|api_token',
        tokenDescription: 'Format: Domain | Email | API Token',
        supportsOAuth: true,
        factory: (token: string) => new JiraService(token),
        oauth: {
            getLoginUrl: JiraService.getLoginUrl,
            exchangeCodeForToken: JiraService.exchangeCodeForToken,
        },
    },
    trello: {
        id: 'trello',
        name: 'Trello',
        icon: TrelloIcon,
        tokenPlaceholder: 'api_key|token',
        tokenDescription: 'Format: API Key | Token',
        supportsOAuth: true,
        factory: (token: string) => new TrelloService(token),
        oauth: {
            getLoginUrl: TrelloService.getLoginUrl,
            exchangeCodeForToken: async (code: string) => ({ access_token: code, token_type: 'Bearer' }),
        },
    },
    asana: {
        id: 'asana',
        name: 'Asana',
        icon: CheckSquare,
        tokenPlaceholder: 'personal_access_token',
        tokenDescription: 'Personal Access Token from Asana',
        supportsOAuth: true,
        factory: (token: string) => new AsanaService(token),
        oauth: {
            getLoginUrl: AsanaService.getLoginUrl,
            exchangeCodeForToken: AsanaService.exchangeCodeForToken,
        },
    },
    linear: {
        id: 'linear',
        name: 'Linear',
        icon: Workflow,
        tokenPlaceholder: 'personal_api_key',
        tokenDescription: 'Personal API Key from Linear',
        supportsOAuth: true,
        factory: (token: string) => new LinearService(token),
        oauth: {
            getLoginUrl: LinearService.getLoginUrl,
            exchangeCodeForToken: LinearService.exchangeCodeForToken,
        },
    },
};

export class BoardProviderFactory {
    static create(type: string, token: string): IBoardProvider {
        const provider = BOARD_PROVIDER_REGISTRY[type.toLowerCase()];
        if (!provider) {
            throw new BoardProviderError(
                `Board provider ${type} not supported.`,
                'NOT_SUPPORTED'
            );
        }
        return provider.factory(token);
    }

    static getMetadata(type: string): BoardProviderMetadata | null {
        return BOARD_PROVIDER_REGISTRY[type.toLowerCase()] || null;
    }

    static getAllProviders(): BoardProviderMetadata[] {
        return Object.values(BOARD_PROVIDER_REGISTRY);
    }

    static getLoginUrl(provider: string, state: string): string {
        const metadata = this.getMetadata(provider);
        if (!metadata || !metadata.oauth) {
            throw new BoardProviderError(
                `Login URL not supported for provider ${provider}`,
                'NOT_SUPPORTED'
            );
        }
        return metadata.oauth.getLoginUrl(state);
    }

    static async exchangeCodeForToken(provider: string, code: string, redirectUri?: string): Promise<any> {
        const metadata = this.getMetadata(provider);
        if (!metadata || !metadata.oauth || !metadata.oauth.exchangeCodeForToken) {
            throw new BoardProviderError(
                `Code exchange not supported for provider ${provider}`,
                'NOT_SUPPORTED'
            );
        }
        return metadata.oauth.exchangeCodeForToken(code, redirectUri);
    }
}
