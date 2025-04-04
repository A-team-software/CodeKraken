// server/services/gitService.ts
import { Logger } from '@oliver/utils';
import { $ } from 'bun'; // Use Bun's built-in shell

// Ensure you have git installed and accessible in the PATH where Bun runs

/** Clones a repository into a specified directory */
export async function cloneRepo(repoUrl: string, targetDir: string, githubToken: string): Promise<void> {
    Logger.logInfo(`Cloning repository ${repoUrl} into ${targetDir}`);
    // Inject token into URL for private repos (use with caution - consider SSH keys for production)
    // Assumes HTTPS URL like https://github.com/owner/repo.git
    const urlWithAuth = repoUrl.replace('https://', `https://oauth2:${githubToken}@`);

    try {
        // Bun's $ automatically handles streaming output/errors
        await $`git clone --depth 1 ${urlWithAuth} ${targetDir}`.quiet(); // Use quiet() to suppress stdout unless erroring
        Logger.logInfo(`Repository cloned successfully.`);
    } catch (error: any) {
        Logger.logError(`Failed to clone repository: ${error?.stderr || error?.message || error}`);
        throw new Error(`Git clone failed for ${repoUrl}`);
    }
}

/** Creates and checks out a new branch */
export async function createBranch(repoPath: string, branchName: string): Promise<void> {
    Logger.logInfo(`Creating and checking out branch: ${branchName} in ${repoPath}`);
    try {
        await $`git -C ${repoPath} checkout -b ${branchName}`.quiet();
        Logger.logInfo(`Branch ${branchName} created and checked out.`);
    } catch (error: any) {
        Logger.logError(`Failed to create branch ${branchName}: ${error?.stderr || error?.message || error}`);
        throw new Error(`Git checkout -b failed for ${branchName}`);
    }
}

/** Stages all changes and commits */
export async function commitChanges(repoPath: string, message: string, authorName: string, authorEmail: string): Promise<void> {
    Logger.logInfo(`Committing changes in ${repoPath} with message: "${message}"`);
    try {
        // Configure author locally for this commit (important for GitHub)
        await $`git -C ${repoPath} config user.name ${authorName}`.quiet();
        await $`git -C ${repoPath} config user.email ${authorEmail}`.quiet();

        await $`git -C ${repoPath} add .`.quiet();
        // Use --allow-empty for cases where AI might generate no changes (or handle this case earlier)
        await $`git -C ${repoPath} commit -m ${message} --allow-empty`.quiet();
        Logger.logInfo(`Changes committed successfully.`);
    } catch (error: any) {
        // Handle "nothing to commit" specifically if needed (it might exit non-zero)
        if (error?.stderr?.includes('nothing to commit')) {
            Logger.logWarn(`No changes to commit in ${repoPath}.`);
            return; // Not necessarily an error in this workflow
        }
        Logger.logError(`Failed to commit changes: ${error?.stderr || error?.message || error}`);
        throw new Error(`Git commit failed`);
    }
}

/** Pushes the current branch to the origin */
export async function pushBranch(repoPath: string, branchName: string): Promise<void> {
    Logger.logInfo(`Pushing branch ${branchName} to origin from ${repoPath}`);
    try {
        await $`git -C ${repoPath} push -u origin ${branchName}`.quiet();
        Logger.logInfo(`Branch ${branchName} pushed successfully.`);
    } catch (error: any) {
        Logger.logError(`Failed to push branch ${branchName}: ${error?.stderr || error?.message || error}`);
        throw new Error(`Git push failed for ${branchName}`);
    }
}
