// server/services/githubService.ts

import { Logger } from "@/utils/logger/logger";
import { config } from '../../env_config';


const GITHUB_API_BASE = 'https://api.github.com';

interface PullRequestInput {
    owner: string;
    repo: string;
    title: string;
    body: string;
    head: string; // The branch you want to merge (e.g., "feature/trello-123")
    base: string; // The branch you want to merge into (e.g., "main")
}

interface PullRequestResponse {
    html_url: string;
    number: number;
    // Add other fields as needed
}

export async function createPullRequest(prInput: PullRequestInput): Promise<PullRequestResponse | null> {
    const url = `${GITHUB_API_BASE}/repos/${prInput.owner}/${prInput.repo}/pulls`;
    Logger.logInfo(`Creating GitHub PR for ${prInput.head} -> ${prInput.base} in ${prInput.owner}/${prInput.repo}`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `token ${"add user's token"}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: prInput.title,
                body: prInput.body,
                head: prInput.head,
                base: prInput.base,
            }),
        });

        const responseData = await response.json();

        if (!response.ok) {
            Logger.logError(`GitHub API error creating PR (${response.status}):`, responseData);
            throw new Error(`Failed to create GitHub PR. Status: ${response.status}. Message: ${responseData.message || 'Unknown error'}`);
        }

        Logger.logInfo(`Successfully created GitHub PR #${responseData.number}: ${responseData.html_url}`);
        return responseData as PullRequestResponse;
    } catch (error: any) {
        Logger.logError(`Error in createPullRequest:`, error.message);
        return null;
    }
}

/** Utility to extract owner/repo from URL */
export function parseRepoUrl(repoUrl: string): { owner: string; repo: string } | null {
    // Handles https://github.com/owner/repo.git and https://github.com/owner/repo
    const match = repoUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)(\.git)?$/i);
    if (match && match[1] && match[2]) {
        return { owner: match[1], repo: match[2] };
    }
    Logger.logError(`Could not parse owner/repo from URL: ${repoUrl}`);
    return null;
}
