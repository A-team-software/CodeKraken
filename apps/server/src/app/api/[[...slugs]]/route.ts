import { Elysia, t } from "elysia";
import fs, { truncate } from "fs/promises";
import os from "os";
import path from "path";
import { registerHandlers, UserAggregate } from "@oliver/user";
import { SafeExecute } from "@oliver/core";
import { createSessionId, cloneRepo, analyzeDiff, runSolve } from "@oliver/code-gen";
import { Result } from "execa";
import { PersonalAccessTokenService } from "@oliver/auth";
import { decrypt, encrypt } from "@oliver/shared";
import { BitbucketService, GitHubService } from "@oliver/git";

// Initialize event handlers
registerHandlers();

const app = new Elysia({ prefix: "/api" })
    .derive(async ({ headers }) => {
        try {
            const authHeader = headers['authorization'];
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.substring(7);

                // Check if this is a Forge request using the shared secret
                const API_SECRET = process.env.API_SECRET;
                if (API_SECRET && token === API_SECRET) {
                    const forgeAccountId = headers['x-forge-account-id'];
                    const forgeClientKey = headers['x-forge-client-key'];

                    if (forgeAccountId && forgeClientKey) {
                        console.log(`Elysia Auth: Forge check success. Account: ${forgeAccountId}, ClientKey: ${forgeClientKey}`);
                        const { MongoUserJiraSiteAccessRepository } = await import('@oliver/db');
                        const accessRepo = new MongoUserJiraSiteAccessRepository();

                        // Map Forge context to userId
                        const access = await accessRepo.findByClientKeyAndAccountId(forgeClientKey as string, forgeAccountId as string);
                        if (access) {
                            console.log(`Elysia Auth: Forge mapped to userId ${access.userId}`);
                            return { userId: access.userId };
                        }
                        console.warn(`Elysia Auth: Forge mapping failed - no access record found for clientKey: ${forgeClientKey}, accountId: ${forgeAccountId}`);
                    } else {
                        console.warn(`Elysia Auth: Forge token matched but missing headers. x-forge-account-id: ${!!forgeAccountId}, x-forge-client-key: ${!!forgeClientKey}`);
                    }
                } else if (API_SECRET) {
                    console.warn(`Elysia Auth: Forge token mismatch. Received: ${token.substring(0, 4)}... Expected: ${API_SECRET.substring(0, 4)}...`);
                } else {
                    console.warn('Elysia Auth: API_SECRET not set on server');
                }

                // Fallback to PAT validation
                const tokenService = PersonalAccessTokenService.getInstance();
                const tokenAggregate = await tokenService.validateToken(token);
                if (tokenAggregate) {
                    console.log(`Elysia Auth: Validated PAT for user ${tokenAggregate.userId}`);
                    return {
                        userId: tokenAggregate.userId
                    };
                }
                console.log('Elysia Auth: Token validation failed (not found in DB)');
            } else {
                console.log('Elysia Auth: No valid Bearer token found in headers');
            }
        } catch (error: any) {
            console.error('Elysia Auth Error during derivation:', error);
        }
        return { userId: null };
    })
    .post(
        "/solve",
        async (ctx) => {
            const { userId } = ctx as any;
            const body = ctx.body as any;
            const {
                task,
                repoUrl,
                githubToken: directGithubToken,
                apiKey,
                provider = "github",
            } = body;

            if (!apiKey) {
                ctx.set.status = 400;
                return {
                    success: false,
                    code: "MISSING_API_KEY",
                    error: "Missing apiKey",
                };
            }

            let githubToken = directGithubToken;

            // If we have a userId from PAT, automatically fetch the provider token
            if (!githubToken && userId) {
                const { MongoUserRepository } = await import('@oliver/user');
                const userRepo = new MongoUserRepository();
                const [user, error] = await SafeExecute.withSync<UserAggregate | null, Array<Error | null>>(() => userRepo.findById(userId))
                    .withRetry({ attempts: 3, delayMs: 100 })
                    .withTimeout(1000)
                    .execute();


                if (error != null) {
                    return { success: false, message: error.message, stack: error.stack, name: error.name, cause: error.cause };
                }


                if (user == null) {
                    return { success: false, message: "No user has been found" };
                }



                const account = user.accounts.find(a => a.provider.toLowerCase() === provider.toLowerCase());
                if (account?.accessToken) {
                    githubToken = account.accessToken;
                }
            }

            const sessionId = createSessionId();
            const workDir = await fs.mkdtemp(path.join(os.tmpdir(), `${sessionId}-`));

            const [clone, error] = await SafeExecute.withSync(() => cloneRepo(repoUrl, githubToken)).execute();

            if (error != null) {
                return {
                    success: false,
                    message: error.message,
                    stack: error.stack,
                    name: error.name,
                    cause: error.cause,
                    code: 500
                };
            }

            if ((clone == null) || (clone.exitCode !== 0)) {
                ctx.set.status = 500;
                return {
                    success: false,
                    sessionId,
                    logs: truncate(clone!.stdout),
                    stdErr: truncate(clone!.stderr)
                };
            }

            try {
                const solve = await runSolve(task, apiKey);

                const [diffPayload, error] = await SafeExecute.withSync<{
                    changedFiles: Record<string, string>;
                    deletedFiles: string[];
                    diff: string;
                } | null, Array<Error | null>>(() => analyzeDiff(workDir)).execute();

                if (!diffPayload) return {
                    message: "Failed to retrieve result",
                    success: solve.exitCode === 0,
                    sessionId,
                    exitCode: solve.exitCode,
                    logs: truncate(solve.stdout),
                    stdErr: truncate(solve.stderr),
                }
                if (error != null) {
                    return {
                        success: false,
                        message: error.message,
                        stack: error.stack,
                        name: error.name,
                        cause: error.cause,
                    };
                }
                const { changedFiles, deletedFiles, diff } = diffPayload;
                return {
                    success: solve.exitCode === 0,
                    sessionId,
                    exitCode: solve.exitCode,
                    logs: truncate(solve.stdout),
                    stdErr: truncate(solve.stderr),
                    changedFiles,
                    deletedFiles,
                    diff: truncate(diff, 20_000)
                };
            } finally {
                await SafeExecute.withSync(() => fs.rm(workDir, { recursive: true, force: true }));
            }
        },
        {
            body: t.Object({
                task: t.String(),
                repoUrl: t.String(),
                githubToken: t.Optional(t.String()),
                apiKey: t.Optional(t.String()),
                provider: t.Optional(t.String()),
            })
        }
    )
    // --- Forge API Endpoints ---

    .get('/forge/git/providers', async () => {
        return {
            providers: [
                { id: 'github', name: 'GitHub', icon: 'github' },
                { id: 'bitbucket', name: 'Bitbucket', icon: 'bitbucket' }
            ]
        };
    })

    .get('/forge/repositories', async ({ userId, query, set }) => {
        if (!userId) {
            set.status = 401;
            return { error: 'Unauthorized' };
        }

        const provider = (query?.provider || 'github').toString().toLowerCase();

        const { MongoUserRepository } = await import('@oliver/user');
        const userRepo = new MongoUserRepository();
        const user = await userRepo.findById(userId);

        if (!user) {
            set.status = 404;
            return { error: 'User not found' };
        }

        const gitAccount = user.accounts.find(a => a.provider.toLowerCase() === provider);
        if (!gitAccount?.accessToken) {
            set.status = 400;
            return { error: `No ${provider} connection found. Please connect ${provider} in the SCA dashboard.` };
        }

        const { GetRepositoriesUseCase } = await import('@oliver/git');
        const useCase = new GetRepositoriesUseCase();
        const repos = await useCase.execute({
            providerType: provider,
            token: gitAccount.accessToken
        });

        return { repositories: repos };
    })

    .get('/forge/identity/status', async ({ userId, query, set }) => {
        console.log(`GET /forge/identity/status: userId=${userId}`);
        if (!userId) {
            set.status = 401;
            return { connected: false, error: 'Unauthorized' };
        }

        const provider = (query?.provider || 'github').toString().toUpperCase();
        console.log(`GET /forge/identity/status: Checking provider ${provider}`);
        const { MongoUserRepository } = await import('@oliver/user');
        const userRepo = new MongoUserRepository();
        const user = await userRepo.findById(userId);

        if (!user) {
            console.log(`GET /forge/identity/status: User ${userId} not found in DB`);
            return { connected: false };
        }

        const gitAccount = user.accounts.find(
            (a: any) => a.provider?.toString().toUpperCase() === provider
        );

        return {
            connected: !!gitAccount,
            hasGitToken: !!(gitAccount?.accessToken),
            username: gitAccount?.username,
            userId: userId
        };
    })

    .get('/forge/github/token', async ({ userId, set }) => {
        if (!userId) {
            set.status = 401;
            return { error: 'Unauthorized' };
        }

        try {
            const { MongoOAuthTokenRepository } = await import('@oliver/auth');
            const tokenRepo = new MongoOAuthTokenRepository();

            const tokens = await tokenRepo.findByUser(userId);
            const githubToken = tokens.find(t =>
                t.provider === 'github' &&
                t.providerType === 'git' &&
                (!t.expiresAt || t.expiresAt.getTime() > Date.now())
            );

            if (!githubToken) {
                set.status = 404;
                return { error: 'GitHub token not found or expired' };
            }

            return {
                accessToken: githubToken.accessToken,
                provider: githubToken.provider,
                scope: githubToken.scope,
                expiresAt: githubToken.expiresAt,
            };
        } catch (error: any) {
            set.status = 500;
            return { error: error.message || 'Failed to retrieve token' };
        }
    })


    // Fallback for user info
    .get('/user/me', async ({ userId }) => {
        if (!userId) return { authenticated: false };

        const { MongoUserRepository } = await import('@oliver/user');
        const userRepo = new MongoUserRepository();
        const user = await userRepo.findById(userId);

        if (!user) return { authenticated: false };

        return {
            authenticated: true,
            user: {
                id: user.id,
                name: user.name,
                username: user.username,
                email: user.email
            }
        };
    })

    // --- Legacy / Other Endpoints (Retained for compatibility) ---
    // Note: Some of these might be redundant now but kept to avoid breaking other flows

    .get('/forge/git/:provider/oauth', async ({ params, query, set }) => {
        const { accountId, cloudId } = query;
        if (!accountId || !cloudId) {
            set.status = 400;
            return { ok: false, error: 'Missing accountId or cloudId' };
        }

        const { MongoForgeSessionRepository } = await import('@oliver/auth');
        const sessionRepo = new MongoForgeSessionRepository();
        const forgeToken = await sessionRepo.create(accountId, cloudId, params.provider);

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://oliver-oliver-client.vercel.app';
        const connectUrl = `${baseUrl}/connect/forge?forgeToken=${encodeURIComponent(forgeToken)}&provider=${encodeURIComponent(params.provider)}`;

        return { loginUrl: connectUrl };
    })

    .get('/forge/oauth/:provider/start', async ({ params, query, set }) => {
        const { provider } = params;
        const { accountId } = query;

        if (!accountId) {
            set.status = 400;
            return { error: 'Missing accountId' };
        }

        // Create secure state: encrypt(accountId + timestamp)
        const stateData = JSON.stringify({
            accountId,
            timestamp: Date.now(),
            provider
        });
        const state = await encrypt(stateData);

        let authUrl: string;
        if (provider === 'github') {
            authUrl = GitHubService.getLoginUrl(state);
        } else if (provider === 'bitbucket') {
            authUrl = BitbucketService.getLoginUrl(state);
        } else {
            set.status = 400;
            return { error: `Unsupported provider: ${provider}` };
        }

        return { authUrl };
    })

    .get('/forge/oauth/:provider/callback', async ({ params, query, set }) => {
        const { provider } = params;
        const { code, state } = query;

        if (!code || !state) {
            set.status = 400;
            return { error: 'Missing code or state' };
        }

        try {
            // 1. Verify state
            const decryptedState = await decrypt(state as string);
            const { accountId, timestamp } = JSON.parse(decryptedState);

            // Check expiration (e.g., 10 minutes)
            if (Date.now() - timestamp > 10 * 60 * 1000) {
                set.status = 400;
                return { error: 'State expired' };
            }

            // 2. Exchange code for token and get provider account ID
            let tokenData;
            let providerAccountId: string;
            let gitUsername: string = '';
            let avatarUrl: string | undefined;
            let profileUrl: string | undefined;
            let gitEmail: string | undefined;

            if (provider === 'github') {
                tokenData = await GitHubService.exchangeCodeForToken(code as string);
                const ghService = new GitHubService(tokenData.access_token);
                providerAccountId = await ghService.getProviderAccountId();
                const ghUser = await ghService.getUser();
                gitUsername = ghUser.username ?? '';
                avatarUrl = ghUser.avatarUrl;
                profileUrl = ghUser.url;
                gitEmail = ghUser.email || undefined;
            } else if (provider === 'bitbucket') {
                tokenData = await BitbucketService.exchangeCodeForToken(code as string);
                const bbService = new BitbucketService(tokenData.access_token);
                providerAccountId = await bbService.getProviderAccountId();
                const bbUser = await bbService.getUser();
                gitUsername = bbUser.username ?? '';
                avatarUrl = bbUser.avatarUrl;
                profileUrl = bbUser.url;
                gitEmail = bbUser.email || undefined;
            } else {
                set.status = 400;
                return { error: `Unsupported provider: ${provider}` };
            }

            // 3. Associate with Atlassian user
            const { MongoUserJiraSiteAccessRepository } = await import('@oliver/db');
            const accessRepo = new MongoUserJiraSiteAccessRepository();
            const access = await accessRepo.findByAtlassianAccountId(accountId);

            if (!access) {
                return `
                    <html>
                        <head>
                            <title>Account Not Found</title>
                            <style>
                                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #000; color: #fff; text-align: center; padding-top: 100px; }
                                .card { background: #111; border: 1px solid #333; border-radius: 12px; padding: 40px; display: inline-block; max-width: 400px; }
                                h2 { color: #ff4d4d; }
                                p { color: #888; line-height: 1.5; }
                                button { background: #fff; color: #000; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; margin-top: 20px; }
                            </style>
                        </head>
                        <body>
                            <div class="card">
                                <h2>Identity record not found</h2>
                                <p>No OliverAI account was found for this Jira user. Please sign in to the SCA dashboard first.</p>
                                <button onclick="window.close()">Close Window</button>
                            </div>
                        </body>
                    </html>
                `;
            }

            // 4. Save token to User record
            const { MongoUserRepository } = await import('@oliver/user');
            const userRepo = new MongoUserRepository();
            const user = await userRepo.findById(access.userId);

            if (user) {
                user.linkOrUpdateAccount({
                    provider: provider.toUpperCase() as any,
                    providerAccountId,
                    username: gitUsername,
                    accessToken: tokenData.access_token,
                    refreshToken: tokenData.refresh_token,
                    expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : undefined,
                    avatarUrl,
                    profileUrl,
                    email: gitEmail,
                });
                await userRepo.save(user);
            }

            // 5. Success UI
            return `
                <html>
                    <head>
                        <title>Connected Successfully</title>
                        <style>
                            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #000; color: #fff; text-align: center; padding-top: 100px; }
                            .card { background: #111; border: 1px solid #333; border-radius: 12px; padding: 40px; display: inline-block; max-width: 400px; }
                            h2 { color: #4ade80; }
                            p { color: #888; line-height: 1.5; }
                            .instruction { margin-top: 24px; font-size: 0.9em; color: #555; border-top: 1px solid #222; padding-top: 20px; }
                        </style>
                    </head>
                    <body>
                        <div class="card">
                            <h2>Connected Successfully!</h2>
                            <p>You can now return to the Jira tab to continue.</p>
                            <div class="instruction">You may close this window.</div>
                        </div>
                        <script>
                            if (window.opener) {
                                window.opener.postMessage({ type: 'oliverai:forge:oauth_complete', ok: true, provider: '${provider}' }, "*");
                            }
                            // Auto-close attempt (might be blocked in standard tabs)
                            setTimeout(() => window.close(), 3000);
                        </script>
                    </body>
                </html>
            `;

        } catch (error: any) {
            console.error('Forge OAuth Callback Error:', error);
            set.status = 500;
            return { error: error.message || 'Identity association failed' };
        }
    })

    .get('/forge/oauth/pending', async ({ query }) => {
        const { state, accountId, cloudId, provider } = query as any;

        if (state) {
            const { MongoOAuthStateRepository } = await import('@oliver/auth');
            const stateRepo = new MongoOAuthStateRepository();
            const stateDoc = await stateRepo.findByState(state);
            return { pending: !!stateDoc };
        }

        return { pending: false, error: 'Missing polling parameters' };
    })

    .post('/forge/connect/associate', async ({ body, set }) => {
        const { accountId, clientKey, userId } = body;
        if (!accountId || !clientKey || !userId) {
            set.status = 400;
            return { error: 'Missing required fields' };
        }

        try {
            const { AtlassianConnectService } = await import('@oliver/application');
            const atlassianService = new AtlassianConnectService();

            const siteUrl = `https://${clientKey}`;

            await atlassianService.storeUserSiteAccess(
                userId,
                siteUrl,
                'forge:connected',
                undefined,
                accountId,
                clientKey
            );

            return { success: true };
        } catch (error: any) {
            set.status = 500;
            return { error: error.message || 'Failed to associate identities' };
        }
    }, {
        body: t.Object({
            accountId: t.String(),
            clientKey: t.String(),
            userId: t.String(),
        })
    })




export const GET = app.fetch;
export const POST = app.fetch;
