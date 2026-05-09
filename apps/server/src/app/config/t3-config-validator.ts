import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

import { EnvConfigValidator } from "./env-config-validator";

const optionalNonEmptyString = z.string().trim().min(1).optional();
const optionalBooleanString = z.enum(["true", "false"]).optional();
const optionalUrlString = z.string().url().optional();

type RuntimeEnvInput = Record<string, string | undefined>;

function buildT3Env(runtimeEnv: RuntimeEnvInput) {
    return createEnv({
        server: {
            NODE_ENV: z.enum(["development", "test", "production"]).optional(),
            NEXT_RUNTIME: z.enum(["nodejs", "edge"]).optional(),

            OAUTH_STATE_SECRET: optionalNonEmptyString,
            API_SECRET: optionalNonEmptyString,

            GITHUB_CLIENT_ID: optionalNonEmptyString,
            GITHUB_CLIENT_SECRET: optionalNonEmptyString,

            GITHUB_TOKEN: optionalNonEmptyString,
            GITHUB_REPO_OWNER: optionalNonEmptyString,
            GITHUB_REPO_NAME: optionalNonEmptyString,

            GITLAB_TOKEN: optionalNonEmptyString,
            GITLAB_PROJECT_ID: optionalNonEmptyString,
            GITLAB_BASE_URL: optionalUrlString,

            BITBUCKET_TOKEN: optionalNonEmptyString,
            BITBUCKET_WORKSPACE: optionalNonEmptyString,
            BITBUCKET_REPO_SLUG: optionalNonEmptyString,

            GITHUB_WEBHOOK_AUTH_SECRET: optionalNonEmptyString,
            GITHUB_WEBHOOK_SECRET: optionalNonEmptyString,
            GITLAB_WEBHOOK_AUTH_SECRET: optionalNonEmptyString,
            GITLAB_WEBHOOK_SECRET: optionalNonEmptyString,
            BITBUCKET_WEBHOOK_AUTH_SECRET: optionalNonEmptyString,
            BITBUCKET_WEBHOOK_SECRET: optionalNonEmptyString,

            OPENCODE_TASK_API_ALLOW_UNAUTHENTICATED: optionalBooleanString,
            OPENCODE_TASK_API_TOKEN: optionalNonEmptyString,
            TASK_API_TOKEN: optionalNonEmptyString,
            API_KEY: optionalNonEmptyString,

            OPENCODE_TASK_REPO_URL: optionalNonEmptyString,
            OPENCODE_REPO_URL: optionalNonEmptyString,
            OPENCODE_TASK_MODE: z.enum(["plan", "agent"]).optional(),
            OPENCODE_TASK_BRANCH: optionalNonEmptyString,
            OPENCODE_TASK_COMMIT: optionalNonEmptyString,

            GITHUB_APP_USER: optionalNonEmptyString,
            GITLAB_APP_USER: optionalNonEmptyString,
            BITBUCKET_APP_USER: optionalNonEmptyString,

            GCP_RUN_JOB_NAME: optionalNonEmptyString,
            GCP_PROJECT_ID: optionalNonEmptyString,
            GCP_RUN_LOCATION: optionalNonEmptyString,
            GCP_REGION: optionalNonEmptyString,
            GCP_RUN_CONTAINER_NAME: optionalNonEmptyString,
            GCP_RUN_OPERATION_NAME: optionalNonEmptyString,
            GCP_OPERATION_NAME: optionalNonEmptyString,
            RUN_OPERATION_NAME: optionalNonEmptyString,
            GCP_ACCESS_TOKEN: optionalNonEmptyString,
            GOOGLE_OAUTH_ACCESS_TOKEN: optionalNonEmptyString,
            GOOGLE_ACCESS_TOKEN: optionalNonEmptyString,

            OPENCODE_DOCKER_REBUILD: z.enum(["1", "true", "false"]).optional(),
            OPENCODE_DOCKER_VERSION: optionalNonEmptyString,
            OPENCODE_DOCKER_IMAGE: optionalNonEmptyString,
            OPENCODE_DOCKER_NETWORK_MODE: optionalNonEmptyString,
            OPENCODE_DOCKER_WORKSPACE_HOST_DIR: optionalNonEmptyString,

            OPENCODE_FLAGS: optionalNonEmptyString,
            OPENCODE_COMMAND: optionalNonEmptyString,
            OPENCODE_AI_PROVIDER: optionalNonEmptyString,
            OPENCODE_AI_API_KEY: optionalNonEmptyString,
            AI_PROVIDER: optionalNonEmptyString,
            AI_API_KEY: optionalNonEmptyString,
            GIT_USERNAME: optionalNonEmptyString,
            GIT_PASSWORD: optionalNonEmptyString,
            GIT_TOKEN: optionalNonEmptyString,
            WORKSPACE_DIR: optionalNonEmptyString,

            FORGE_APP_ID: optionalNonEmptyString,
            OLIVERAI_API_KEY: optionalNonEmptyString
        },
        client: {
            NEXT_PUBLIC_OLIVERAI_API_KEY: optionalNonEmptyString,
            NEXT_PUBLIC_APP_URL: optionalUrlString
        },
        runtimeEnv: {
            NODE_ENV: runtimeEnv.NODE_ENV,
            NEXT_RUNTIME: runtimeEnv.NEXT_RUNTIME,

            OAUTH_STATE_SECRET: runtimeEnv.OAUTH_STATE_SECRET,
            API_SECRET: runtimeEnv.API_SECRET,

            GITHUB_CLIENT_ID: runtimeEnv.GITHUB_CLIENT_ID,
            GITHUB_CLIENT_SECRET: runtimeEnv.GITHUB_CLIENT_SECRET,

            GITHUB_TOKEN: runtimeEnv.GITHUB_TOKEN,
            GITHUB_REPO_OWNER: runtimeEnv.GITHUB_REPO_OWNER,
            GITHUB_REPO_NAME: runtimeEnv.GITHUB_REPO_NAME,

            GITLAB_TOKEN: runtimeEnv.GITLAB_TOKEN,
            GITLAB_PROJECT_ID: runtimeEnv.GITLAB_PROJECT_ID,
            GITLAB_BASE_URL: runtimeEnv.GITLAB_BASE_URL,

            BITBUCKET_TOKEN: runtimeEnv.BITBUCKET_TOKEN,
            BITBUCKET_WORKSPACE: runtimeEnv.BITBUCKET_WORKSPACE,
            BITBUCKET_REPO_SLUG: runtimeEnv.BITBUCKET_REPO_SLUG,

            GITHUB_WEBHOOK_AUTH_SECRET: runtimeEnv.GITHUB_WEBHOOK_AUTH_SECRET,
            GITHUB_WEBHOOK_SECRET: runtimeEnv.GITHUB_WEBHOOK_SECRET,
            GITLAB_WEBHOOK_AUTH_SECRET: runtimeEnv.GITLAB_WEBHOOK_AUTH_SECRET,
            GITLAB_WEBHOOK_SECRET: runtimeEnv.GITLAB_WEBHOOK_SECRET,
            BITBUCKET_WEBHOOK_AUTH_SECRET: runtimeEnv.BITBUCKET_WEBHOOK_AUTH_SECRET,
            BITBUCKET_WEBHOOK_SECRET: runtimeEnv.BITBUCKET_WEBHOOK_SECRET,

            OPENCODE_TASK_API_ALLOW_UNAUTHENTICATED: runtimeEnv.OPENCODE_TASK_API_ALLOW_UNAUTHENTICATED,
            OPENCODE_TASK_API_TOKEN: runtimeEnv.OPENCODE_TASK_API_TOKEN,
            TASK_API_TOKEN: runtimeEnv.TASK_API_TOKEN,
            API_KEY: runtimeEnv.API_KEY,

            OPENCODE_TASK_REPO_URL: runtimeEnv.OPENCODE_TASK_REPO_URL,
            OPENCODE_REPO_URL: runtimeEnv.OPENCODE_REPO_URL,
            OPENCODE_TASK_MODE: runtimeEnv.OPENCODE_TASK_MODE,
            OPENCODE_TASK_BRANCH: runtimeEnv.OPENCODE_TASK_BRANCH,
            OPENCODE_TASK_COMMIT: runtimeEnv.OPENCODE_TASK_COMMIT,

            GITHUB_APP_USER: runtimeEnv.GITHUB_APP_USER,
            GITLAB_APP_USER: runtimeEnv.GITLAB_APP_USER,
            BITBUCKET_APP_USER: runtimeEnv.BITBUCKET_APP_USER,

            GCP_RUN_JOB_NAME: runtimeEnv.GCP_RUN_JOB_NAME,
            GCP_PROJECT_ID: runtimeEnv.GCP_PROJECT_ID,
            GCP_RUN_LOCATION: runtimeEnv.GCP_RUN_LOCATION,
            GCP_REGION: runtimeEnv.GCP_REGION,
            GCP_RUN_CONTAINER_NAME: runtimeEnv.GCP_RUN_CONTAINER_NAME,
            GCP_RUN_OPERATION_NAME: runtimeEnv.GCP_RUN_OPERATION_NAME,
            GCP_OPERATION_NAME: runtimeEnv.GCP_OPERATION_NAME,
            RUN_OPERATION_NAME: runtimeEnv.RUN_OPERATION_NAME,
            GCP_ACCESS_TOKEN: runtimeEnv.GCP_ACCESS_TOKEN,
            GOOGLE_OAUTH_ACCESS_TOKEN: runtimeEnv.GOOGLE_OAUTH_ACCESS_TOKEN,
            GOOGLE_ACCESS_TOKEN: runtimeEnv.GOOGLE_ACCESS_TOKEN,

            OPENCODE_DOCKER_REBUILD: runtimeEnv.OPENCODE_DOCKER_REBUILD,
            OPENCODE_DOCKER_VERSION: runtimeEnv.OPENCODE_DOCKER_VERSION,
            OPENCODE_DOCKER_IMAGE: runtimeEnv.OPENCODE_DOCKER_IMAGE,
            OPENCODE_DOCKER_NETWORK_MODE: runtimeEnv.OPENCODE_DOCKER_NETWORK_MODE,
            OPENCODE_DOCKER_WORKSPACE_HOST_DIR: runtimeEnv.OPENCODE_DOCKER_WORKSPACE_HOST_DIR,

            OPENCODE_FLAGS: runtimeEnv.OPENCODE_FLAGS,
            OPENCODE_COMMAND: runtimeEnv.OPENCODE_COMMAND,
            OPENCODE_AI_PROVIDER: runtimeEnv.OPENCODE_AI_PROVIDER,
            OPENCODE_AI_API_KEY: runtimeEnv.OPENCODE_AI_API_KEY,
            AI_PROVIDER: runtimeEnv.AI_PROVIDER,
            AI_API_KEY: runtimeEnv.AI_API_KEY,
            GIT_USERNAME: runtimeEnv.GIT_USERNAME,
            GIT_PASSWORD: runtimeEnv.GIT_PASSWORD,
            GIT_TOKEN: runtimeEnv.GIT_TOKEN,
            WORKSPACE_DIR: runtimeEnv.WORKSPACE_DIR,

            FORGE_APP_ID: runtimeEnv.FORGE_APP_ID,
            OLIVERAI_API_KEY: runtimeEnv.OLIVERAI_API_KEY,
            NEXT_PUBLIC_OLIVERAI_API_KEY: runtimeEnv.NEXT_PUBLIC_OLIVERAI_API_KEY,
            NEXT_PUBLIC_APP_URL: runtimeEnv.NEXT_PUBLIC_APP_URL
        },
        emptyStringAsUndefined: true
    });
}

function requireAllOrNone(
    env: Record<string, string | undefined>,
    keys: string[],
    label: string,
    errors: string[]
): void {
    const provided = keys.filter((key) => Boolean(env[key]));
    if (provided.length === 0 || provided.length === keys.length) {
        return;
    }

    errors.push(
        `${label}: either provide all of ${keys.join(", ")} or none. Currently provided: ${provided.join(", ")}.`
    );
}

function requireAtLeastOne(
    env: Record<string, string | undefined>,
    keys: string[],
    label: string,
    errors: string[]
): void {
    if (keys.some((key) => Boolean(env[key]))) {
        return;
    }

    errors.push(`${label}: provide at least one of ${keys.join(", ")}.`);
}

export function validateServerEnv(runtimeEnv: RuntimeEnvInput = process.env): void {
    const validated = buildT3Env(runtimeEnv);
    const errors: string[] = [];

    if (!validated.OAUTH_STATE_SECRET) {
        errors.push("OAUTH_STATE_SECRET is required.");
    }

    requireAllOrNone(validated, ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"], "GitHub OAuth config", errors);

    requireAllOrNone(
        validated,
        ["GITHUB_TOKEN", "GITHUB_REPO_OWNER", "GITHUB_REPO_NAME"],
        "GitHub adapter config",
        errors
    );
    requireAllOrNone(
        validated,
        ["GITLAB_TOKEN", "GITLAB_PROJECT_ID"],
        "GitLab adapter config",
        errors
    );
    requireAllOrNone(
        validated,
        ["BITBUCKET_TOKEN", "BITBUCKET_WORKSPACE", "BITBUCKET_REPO_SLUG"],
        "Bitbucket adapter config",
        errors
    );

    requireAllOrNone(validated, ["AI_PROVIDER", "AI_API_KEY"], "AI provider credentials", errors);
    requireAllOrNone(validated, ["OPENCODE_AI_PROVIDER", "OPENCODE_AI_API_KEY"], "OpenCode AI credentials", errors);
    requireAllOrNone(validated, ["GIT_USERNAME", "GIT_PASSWORD"], "Git username/password credentials", errors);

    if (validated.OPENCODE_TASK_API_ALLOW_UNAUTHENTICATED !== "true") {
        requireAtLeastOne(
            validated,
            ["OPENCODE_TASK_API_TOKEN", "TASK_API_TOKEN", "API_KEY"],
            "Task API authentication",
            errors
        );
    }

    if (validated.GCP_RUN_JOB_NAME) {
        requireAtLeastOne(
            validated,
            ["GCP_ACCESS_TOKEN", "GOOGLE_OAUTH_ACCESS_TOKEN", "GOOGLE_ACCESS_TOKEN"],
            "GCP authentication",
            errors
        );
    }

    if (errors.length > 0) {
        throw new Error(`Invalid environment configuration:\n- ${errors.join("\n- ")}`);
    }
}

export class T3ConfigValidator implements EnvConfigValidator {
    async validate(): Promise<void> {
        validateServerEnv();
    }
}
