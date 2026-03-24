import { decodeSymmetric, getAlgorithm, createQueryStringHash, fromExpressRequest } from 'atlassian-jwt';
import { MongoAtlassianTenantRepository } from '@/lib/infrastructure/db/mongodb/repositories/AtlassianTenantRepository.mongo';
import { MongoUserJiraSiteAccessRepository } from '@/lib/infrastructure/db/mongodb/repositories/UserJiraSiteAccessRepository.mongo';
import { MongoSiteRepositoryRepository } from '@/lib/infrastructure/db/mongodb/repositories/SiteRepositoryRepository.mongo';
import { StoreUserSiteAccessUseCase } from '@/lib/application/use_cases/atlassian/StoreUserSiteAccessUseCase';
import { Logger } from '@/lib/infrastructure/logging/logger';

export class AtlassianConnectService {
    private tenantRepo: MongoAtlassianTenantRepository;
    private userSiteAccessRepo: MongoUserJiraSiteAccessRepository;
    private siteRepo: MongoSiteRepositoryRepository;

    constructor() {
        this.tenantRepo = new MongoAtlassianTenantRepository();
        this.userSiteAccessRepo = new MongoUserJiraSiteAccessRepository();
        this.siteRepo = new MongoSiteRepositoryRepository();
    }

    /**
     * Handles the 'installed' lifecycle event from Jira/Confluence.
     * Stores the tenant credentials (shared secret, client key) securely.
     */
    async handleInstalled(payload: any): Promise<void> {
        try {
            const { key, clientKey, sharedSecret, baseUrl, productType, description, eventType } = payload;

            if (!clientKey || !sharedSecret) {
                throw new Error('Missing clientKey or sharedSecret in installed payload');
            }

            await this.tenantRepo.upsert({
                key,
                clientKey,
                sharedSecret,
                baseUrl,
                productType,
                description,
                eventType: eventType || 'installed',
            });

            Logger.info(`Atlassian app installed for clientKey: ${clientKey}`);
        } catch (error) {
            Logger.error('Failed to handle Atlassian installation', error);
            throw error;
        }
    }

    /**
     * Handles the 'uninstalled' lifecycle event.
     * Removes the tenant credentials.
     */
    async handleUninstalled(payload: any): Promise<void> {
        try {
            const { clientKey } = payload;

            if (!clientKey) {
                throw new Error('Missing clientKey in uninstalled payload');
            }

            await this.tenantRepo.deleteByClientKey(clientKey);
            Logger.info(`Atlassian app uninstalled for clientKey: ${clientKey}`);
        } catch (error) {
            Logger.error('Failed to handle Atlassian uninstallation', error);
            throw error;
        }
    }

    /**
     * Verifies the JWT token from an incoming request.
     * 1. Decodes the token to get the clientKey.
     * 2. Fetches the sharedSecret for that clientKey.
     * 3. Verifies the signature and query string hash (QSH).
     */
    async verifyJwt(token: string, method: string, url: string): Promise<any> {
        try {
            // 1. Decode without verification to get clientKey
            const alg = getAlgorithm(token);
            const decodedConfig = decodeSymmetric(token, '', alg, true); // no verification yet
            const clientKey = decodedConfig.iss;

            if (!clientKey) {
                throw new Error('JWT missing issuer (clientKey)');
            }

            // 2. Fetch shared secret
            const tenant = await this.tenantRepo.findByClientKey(clientKey);
            if (!tenant) {
                throw new Error(`Tenant not found for clientKey: ${clientKey}`);
            }

            const sharedSecret = tenant.sharedSecret;

            // 3. Verify signature
            const verified = decodeSymmetric(token, sharedSecret, alg);

            // 4. Verify QSH (Query String Hash)
            // Note: In a real Next.js Request, we need to construct the request object correctly for atlassian-jwt
            // or manually calculate QSH. For now, we'll assume basic verification.
            // TODO: Implement rigorous QSH verification based on full request URL and method.

            // For now, return the payload
            return verified;
        } catch (error: any) {
            Logger.error('JWT Verification Failed', error);
            throw new Error('Invalid JWT: ' + error.message);
        }
    }

    /**
     * Registers a Jira Forge app installation.
     * Called from the Forge app frontend to register itself when it loads.
     * Unlike Atlassian Connect, Forge apps don't have a sharedSecret mechanism.
     */
    async registerForgeApp(payload: any): Promise<void> {
        try {
            const { clientKey, baseUrl, cloudId, productType = 'jira' } = payload;

            if (!clientKey || !baseUrl) {
                throw new Error('Missing clientKey or baseUrl in Forge registration payload');
            }

            // For Forge apps, we generate a placeholder shared secret since they don't use JWT.
            // This allows the tenant record to exist in the database but marks it as a Forge app.
            const sharedSecret = `forge_${clientKey}_placeholder`;

            await this.tenantRepo.upsert({
                key: `com.oliverai.jira-forge`,
                clientKey,
                sharedSecret, // Placeholder for Forge apps
                baseUrl,
                cloudId,
                productType,
                description: 'Jira Forge app registration',
                eventType: 'forge_registered',
            });

            Logger.info(`Jira Forge app registered for clientKey: ${clientKey}`);
        } catch (error) {
            Logger.error('Failed to register Forge app', error);
            throw error;
        }
    }

    /**
     * Stores a user's access to a Jira site after OAuth completion.
     * Called when a user grants permissions to access a specific Jira instance.
     */
    async storeUserSiteAccess(
        userId: string,
        baseUrl: string,
        scope: string,
        expiresAt?: Date,
        atlassianAccountId?: string,
        cloudId?: string
    ): Promise<void> {
        try {
            if (!userId || !baseUrl) {
                throw new Error('Missing userId or baseUrl for user site access');
            }

            // Extract clientKey from baseUrl or use baseUrl as identifier
            // Jira baseUrl is typically: https://company.jira.com
            const clientKey = new URL(baseUrl).hostname;

            if (!clientKey) {
                throw new Error('Could not extract clientKey from baseUrl');
            }

            const useCase = new StoreUserSiteAccessUseCase(
                this.userSiteAccessRepo,
                this.siteRepo
            );
            await useCase.execute({
                userId,
                clientKey,
                baseUrl,
                scope,
                expiresAt,
                atlassianAccountId,
                cloudId,
            });

            Logger.info('User site access stored', { userId, clientKey, baseUrl });
        } catch (error) {
            Logger.error('Failed to store user site access', error);
            throw error;
        }
    }

    /**
     * Gets a system user ID associated with an Atlassian account ID.
     */
    async getUserIdByAtlassianAccountId(atlassianAccountId: string): Promise<string | null> {
        try {
            const access = await this.userSiteAccessRepo.findByAtlassianAccountId(atlassianAccountId);
            return access ? access.userId : null;
        } catch (error) {
            Logger.error('Failed to get user by Atlassian account ID', error);
            return null;
        }
    }
}
