import { z } from "zod";

export interface WebhookServiceInterface {
    getWebhooks: (userName: string, repoName: string, token: string) => Promise<any>;
    setWebhook: (userAndRepoName: string, token: string) => Promise<any>;
}


export interface GitRepositoryServiceInterface {
    getUserRepos: (serviceProvider: string) => Promise<Repository[] | null>;
}


const PROVIDERS = [
    "GITHUB",
    "GITLAB",
    "BITBUCKET",
] as const;

const GitProvidersZEnum = z.enum(PROVIDERS);
export const GitProviders: z.ZodEnum<["GITHUB", "GITLAB", "BITBUCKET"]> = GitProvidersZEnum;


const VISIBILITY_OPTIONS = [
    "PUBLIC",
    "PRIVATE",
    "INTERNAL", // Some providers like GitHub/GitLab have this concept
] as const;


const RepositoryZVisibility = z.enum(VISIBILITY_OPTIONS)

/**
 * Enum defining the visibility of the repository.
 */
export const REPOSITORY_VISIBILITY: z.ZodEnum<["PUBLIC", "PRIVATE", "INTERNAL"]> = RepositoryZVisibility;

const RepositoryZSchema = z.object({
    id: z.string(),
    name: z.string(),
    full_name: z.string(),
    html_url: z.string(),
    owner: z.object({
        login: z.string()
    }),
    private: z.boolean(),
    repositoriesURL: z.string().or(z.null()),
});

export const RepositoryTypeChecker = RepositoryZSchema;

/**
 * Represents a git repository.
 * Contains details needed to locate, clone, and interact with the repo.
 */
export type Repository = z.infer<typeof RepositoryZSchema>;



