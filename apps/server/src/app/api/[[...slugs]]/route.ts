import { Elysia, t } from "elysia";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { registerHandlers } from "@oliver/user";
import { PersonalAccessTokenService } from "@oliver/auth";
import { decrypt, encrypt } from "@oliver/shared";
import { BitbucketService, GitHubService } from "@oliver/git";
import { createSessionId, cloneRepo, truncate, runSolve, analyzeDiff } from '@oliver/code-gen';
import { SafeExecute } from "@oliver/core/src/errors";

// Initialize event handlers
registerHandlers();

const app = new Elysia({ prefix: "/api" })
    .derive(async ({ headers }) => {
        const [result, deriveError] = await SafeExecute.withSync(async () => {
            const authHeader = headers['authorization'];
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.substring(7);

                // Check if this is a Forge request using the shared secret
                const API_SECRET = process.env.API_SECRET;
                if (API_SECRET && token === API_SECRET) {
                    const forgeAccountId = headers['x-forge-account-id'];
                    const forgeClientKey = headers['x-forge-client-key'];

                    if (forgeAccountId && forgeClientKey) {
                        const [db, importDbError] = await SafeExecute.withSync(async () => import('@oliver/db')).execute();
                        if (importDbError || !db) throw importDbError || new Error('Failed to import DB module');
                        const { MongoUserJiraSiteAccessRepository } = db;
                        const accessRepo = new MongoUserJiraSiteAccessRepository();

                        // Map Forge context to userId
                        const [access, accessError] = await SafeExecute.withSync(async () =>
                            accessRepo.findByClientKeyAndAccountId(forgeClientKey as string, forgeAccountId as string)
                        ).execute();
                        if (accessError) throw accessError;

                        if (access) {
                            return { userId: access.userId };
                        }
                    }
                }

                // Fallback to PAT validation
                const tokenService = PersonalAccessTokenService.getInstance();
                const [tokenAggregate, tokenError] = await SafeExecute.withSync(async () =>
                    tokenService.validateToken(token)
                ).execute();
                if (tokenError) throw tokenError;

                if (tokenAggregate) {
                    return {
                        userId: tokenAggregate.userId
                    };
                }
            }
            return { userId: null };
        }).execute();

        if (deriveError) {
            console.error('Elysia Auth Error during derivation:', deriveError);
        }
        return result || { userId: null };
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
                apiKey: directApiKey,
                provider = "github",
            } = body;

            const apiKey = directApiKey || process.env.OLIVERAI_API_KEY || process.env.NEXT_PUBLIC_OLIVERAI_API_KEY;
            if (!apiKey) {
                ctx.set.status = 400;
                return {
                    success: false,
                    code: "MISSING_API_KEY",
                    error: "Missing apiKey (or set OLIVERAI_API_KEY on server)",
                };
            }

            let githubToken = directGithubToken;

            // If we have a userId from PAT, automatically fetch the provider token
            if (!githubToken && userId) {
                const [userModule, importUserError] = await SafeExecute.withSync(async () => import('@oliver/user')).execute();
                if (importUserError || !userModule) throw importUserError || new Error('Failed to import user module');
                const { MongoUserRepository } = userModule;
                const userRepo = new MongoUserRepository();
                const [user, userError] = await SafeExecute.withSync(async () => userRepo.findById(userId)).execute();
                if (userError) throw userError;
                const account = user?.accounts.find(a => a.provider.toLowerCase() === provider.toLowerCase());
                if (account?.accessToken) {
                    githubToken = account.accessToken;
                }
            }

            const sessionId = createSessionId();
            const [workDir, tempDirError] = await SafeExecute.withSync(async () => fs.mkdtemp(path.join(os.tmpdir(), `${sessionId}-`))).execute();
            if (tempDirError || !workDir) throw tempDirError || new Error('Failed to create temp directory');

            try {
                const [clone, cloneError] = await SafeExecute.withSync(async () => cloneRepo(repoUrl, githubToken)).execute();
                if (cloneError || !clone) throw cloneError || new Error('Clone failed');

                if (clone.exitCode !== 0) {
                    ctx.set.status = 500;
                    return {
                        success: false,
                        sessionId,
                        logs: truncate(clone.stdout),
                        stdErr: truncate(clone.stderr)
                    };
                }

                const [solve, solveError] = await SafeExecute.withSync(async () => runSolve(task, apiKey)).execute();
                if (solveError || !solve) throw solveError || new Error('Solve failed');

                const [diffResult, diffError] = await SafeExecute.withSync(async () => analyzeDiff(workDir)).execute();
                if (diffError || !diffResult) throw diffError || new Error('Diff analysis failed');
                const { changedFiles, deletedFiles, diff } = diffResult;

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
                await SafeExecute.withSync(async () => fs.rm(workDir, { recursive: true, force: true })).execute();
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

        const [userModule, importUserError] = await SafeExecute.withSync(async () => import('@oliver/user')).execute();
        if (importUserError || !userModule) {
            set.status = 500;
            return { error: 'Internal server error' };
        }
        const { MongoUserRepository } = userModule;
        const userRepo = new MongoUserRepository();
        const [user, userError] = await SafeExecute.withSync(async () => userRepo.findById(userId)).execute();
        if (userError) {
            set.status = 500;
            return { error: 'Failed to fetch user' };
        }

        if (!user) {
            set.status = 404;
            return { error: 'User not found' };
        }

        const gitAccount = user.accounts.find(a => a.provider.toLowerCase() === provider);
        if (!gitAccount?.accessToken) {
            set.status = 400;
            return { error: `No ${provider} connection found. Please connect ${provider} in the SCA dashboard.` };
        }

        const [gitModule, importGitError] = await SafeExecute.withSync(async () => import('@oliver/git')).execute();
        if (importGitError || !gitModule) {
            set.status = 500;
            return { error: 'Internal server error' };
        }
        const { GetRepositoriesUseCase } = gitModule;
        const useCase = new GetRepositoriesUseCase();
        const [repos, reposError] = await SafeExecute.withSync(async () =>
            useCase.execute({
                providerType: provider,
                token: gitAccount.accessToken!
            })
        ).execute();

        if (reposError) {
            set.status = 500;
            return { error: 'Failed to fetch repositories' };
        }

        return { repositories: repos };
    })


    .get('/forge/github/token', async ({ userId, set }) => {
        if (!userId) {
            set.status = 401;
            return { error: 'Unauthorized' };
        }

        try {
            const [authModule, importAuthError] = await SafeExecute.withSync(async () => import('@oliver/auth')).execute();
            if (importAuthError || !authModule) throw importAuthError || new Error('Failed to import auth module');
            const { MongoOAuthTokenRepository } = authModule;
            const tokenRepo = new MongoOAuthTokenRepository();

            const [tokens, tokensError] = await SafeExecute.withSync(async () => tokenRepo.findByUser(userId)).execute();
            if (tokensError) throw tokensError;

            const githubToken = tokens?.find(t =>
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

        const [userModule, importUserError] = await SafeExecute.withSync(async () => import('@oliver/user')).execute();
        if (importUserError || !userModule) return { authenticated: false };
        const { MongoUserRepository } = userModule;
        const userRepo = new MongoUserRepository();
        const [user, userError] = await SafeExecute.withSync(async () => userRepo.findById(userId)).execute();

        if (userError || !user) return { authenticated: false };

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

    .get('/forge/git/:provider/oauth', async ({ params, query, set }: any) => {
        const { accountId, cloudId } = query;
        if (!accountId || !cloudId) {
            set.status = 400;
            return { ok: false, error: 'Missing accountId or cloudId' };
        }

        const [authModule, importAuthError] = await SafeExecute.withSync(async () => import('@oliver/auth')).execute();
        if (importAuthError || !authModule) {
            set.status = 500;
            return { ok: false, error: 'Internal server error' };
        }
        const { MongoForgeSessionRepository } = authModule;
        const sessionRepo = new MongoForgeSessionRepository();
        const [forgeToken, sessionError] = await SafeExecute.withSync(async () => sessionRepo.create(accountId as string, cloudId as string, params.provider)).execute();

        if (sessionError || !forgeToken) {
            set.status = 500;
            return { ok: false, error: 'Failed to create forge session' };
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sca-pi.vercel.app';
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
        const [state, encryptError] = await SafeExecute.withSync(async () => encrypt(stateData)).execute();
        if (encryptError || !state) {
            set.status = 500;
            return { error: 'Failed to encrypt state' };
        }

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
            const [decryptedState, decryptError] = await SafeExecute.withSync(async () => decrypt(state as string)).execute();
            if (decryptError || !decryptedState) throw decryptError || new Error('Failed to decrypt state');
            const { accountId, timestamp } = JSON.parse(decryptedState);

            // Check expiration (e.g., 10 minutes)
            if (Date.now() - timestamp > 10 * 60 * 1000) {
                set.status = 400;
                return { error: 'State expired' };
            }

            // 2. Exchange code for token and get provider account ID
            let tokenDataRef: any;
            let providerAccountId: string;
            let gitUsername: string = '';
            let avatarUrl: string | undefined;
            let profileUrl: string | undefined;
            let gitEmail: string | undefined;

            if (provider === 'github') {
                const [tokenData, exchangeError] = await SafeExecute.withSync(async () => GitHubService.exchangeCodeForToken(code as string)).execute();
                if (exchangeError || !tokenData) throw exchangeError || new Error('Token exchange failed');
                const ghService = new GitHubService(tokenData.access_token);
                const [pAccountId, pAccountError] = await SafeExecute.withSync(async () => ghService.getProviderAccountId()).execute();
                if (pAccountError || !pAccountId) throw pAccountError || new Error('Failed to get provider account ID');
                providerAccountId = pAccountId;
                const [ghUser, userError] = await SafeExecute.withSync(async () => ghService.getUser()).execute();
                if (userError || !ghUser) throw userError || new Error('Failed to get user');
                gitUsername = ghUser.username ?? '';
                avatarUrl = ghUser.avatarUrl;
                profileUrl = ghUser.url;
                gitEmail = ghUser.email || undefined;
                tokenDataRef = tokenData;
            } else if (provider === 'bitbucket') {
                const [tokenData, exchangeError] = await SafeExecute.withSync(async () => BitbucketService.exchangeCodeForToken(code as string)).execute();
                if (exchangeError || !tokenData) throw exchangeError || new Error('Token exchange failed');
                const bbService = new BitbucketService(tokenData.access_token);
                const [pAccountId, pAccountError] = await SafeExecute.withSync(async () => bbService.getProviderAccountId()).execute();
                if (pAccountError || !pAccountId) throw pAccountError || new Error('Failed to get provider account ID');
                providerAccountId = pAccountId;
                const [bbUser, userError] = await SafeExecute.withSync(async () => bbService.getUser()).execute();
                if (userError || !bbUser) throw userError || new Error('Failed to get user');
                gitUsername = bbUser.username ?? '';
                avatarUrl = bbUser.avatarUrl;
                profileUrl = bbUser.url;
                gitEmail = bbUser.email || undefined;
                tokenDataRef = tokenData;
            } else {
                set.status = 400;
                return { error: `Unsupported provider: ${provider}` };
            }

            // 3. Associate with Atlassian user
            const [db, importDbError] = await SafeExecute.withSync(async () => import('@oliver/db')).execute();
            if (importDbError || !db) throw importDbError || new Error('Failed to import DB module');
            const { MongoUserJiraSiteAccessRepository } = db;
            const accessRepo = new MongoUserJiraSiteAccessRepository();
            const [access, accessError] = await SafeExecute.withSync(async () => accessRepo.findByAtlassianAccountId(accountId)).execute();
            if (accessError) throw accessError;

            if (!access) {
                return `
                    <html>
                        <body style="font-family: sans-serif; text-align: center; padding-top: 50px;">
                            <h2>Identity record not found</h2>
                            <p>No SCA account found for this Jira user. Please sign in to SCA first.</p>
                            <button onclick="window.close()">Close</button>
                        </body>
                    </html>
                `;
            }

            // 4. Save token to User record
            const [userModule, importUserError] = await SafeExecute.withSync(async () => import('@oliver/user')).execute();
            if (importUserError || !userModule) throw importUserError || new Error('Failed to import user module');
            const { MongoUserRepository } = userModule;
            const userRepo = new MongoUserRepository();
            const [user, userError] = await SafeExecute.withSync(async () => userRepo.findById(access.userId)).execute();
            if (userError) throw userError;

            if (user) {
                user.linkOrUpdateAccount({
                    provider: provider.toUpperCase() as any,
                    providerAccountId,
                    username: gitUsername,
                    accessToken: tokenDataRef.access_token,
                    refreshToken: tokenDataRef.refresh_token,
                    expiresAt: tokenDataRef.expires_in ? new Date(Date.now() + tokenDataRef.expires_in * 1000) : undefined,
                    avatarUrl,
                    profileUrl,
                    email: gitEmail,
                });
                const [_, saveError] = await SafeExecute.withSync(async () => userRepo.save(user!)).execute();
                if (saveError) throw saveError;
            }

            // 5. Success UI
            return `
                <html>
                    <body style="font-family: sans-serif; text-align: center; padding-top: 50px;">
                        <h2>Connected Successfully!</h2>
                        <p>You can close this window now.</p>
                        <script>
                            if (window.opener) {
                                window.opener.postMessage({ type: 'SCA_AUTH_SUCCESS', provider: '${provider}' }, "*");
                            }
                            setTimeout(() => window.close(), 2000);
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

    .get('/forge/oauth/pending', async ({ query }: any) => {
        const { state, accountId, cloudId, provider } = query;

        if (state) {
            const [authModule, importAuthError] = await SafeExecute.withSync(async () => import('@oliver/auth')).execute();
            if (importAuthError || !authModule) return { pending: false, error: 'Internal server error' };
            const { MongoOAuthStateRepository } = authModule;
            const stateRepo = new MongoOAuthStateRepository();
            const [stateDoc, stateError] = await SafeExecute.withSync(async () => stateRepo.findByState(state)).execute();
            return { pending: !!stateDoc };
        }

        return { pending: false, error: 'Missing polling parameters' };
    })

    .post('/forge/connect/associate', async ({ body, set }: any) => {
        const { accountId, clientKey, userId } = body;
        if (!accountId || !clientKey || !userId) {
            set.status = 400;
            return { error: 'Missing required fields' };
        }

        try {
            const [appModule, importAppError] = await SafeExecute.withSync(async () => import('@oliver/application')).execute();
            if (importAppError || !appModule) throw importAppError || new Error('Failed to import application module');
            const { AtlassianConnectService } = appModule;
            const atlassianService = new AtlassianConnectService();

            const siteUrl = `https://${clientKey}`;

            const [_, storeError] = await SafeExecute.withSync(async () =>
                atlassianService.storeUserSiteAccess(
                    userId,
                    siteUrl,
                    'forge:connected',
                    undefined,
                    accountId,
                    clientKey
                )
            ).execute();

            if (storeError) throw storeError;

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
