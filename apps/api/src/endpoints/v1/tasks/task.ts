// server/api/process-task/index.ts
import { Logger } from '@oliver/utils';
import { Trello } from '../../../features/trello/trello';
import * as gitApi from '../../../features/git/git_api';
import * as gitRunner from '../../../features/git/git_runner';
import * as ai from '../../../features/ai/code_gen';
import * as file from '../../../features/file_processing';

// Bun's server setup (if this is the entry point)
// If you have a central server file, adapt this handler logic.

export default async function handler(req: Request): Promise<Response> {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
    }

    let tempRepoPath: string | null = null; // Keep track for cleanup

    try {
        const body = await req.json();
        const { cardId, repoUrl } = body;

        if (!cardId || !repoUrl) {
            return new Response(JSON.stringify({ error: 'Missing cardId or repoUrl in request body' }), { status: 400 });
        }
        Logger.logInfo(`Processing request for Trello Card: ${cardId}, Repo: ${repoUrl}`);

        // 1. Parse Repo URL
        const repoInfo = gitApi.parseRepoUrl(repoUrl);
        if (!repoInfo) {
            return new Response(JSON.stringify({ error: 'Invalid repository URL format' }), { status: 400 });
        }

        // 2. Get Trello Card Details
        const card = await Trello.getCardDetails(cardId);
        if (!card) {
            return new Response(JSON.stringify({ error: `Trello card ${cardId} not found or API error` }), { status: 404 });
        }
        const taskDescription = `Trello Card: "${card.name}"\n\nDescription:\n${card.desc}`;

        // 3. Create Temp Directory and Clone Repo
        tempRepoPath = await file.createTempDir('./server/temp'); // Throws on error
        await gitRunner.cloneRepo(repoUrl, tempRepoPath, "add user token"); // Throws on error

        // 4. Generate Code using AI (pass task description)
        // Optional: Read existing files for context? (More complex)
        const codeChanges = await ai.generateCode(taskDescription);
        if (!codeChanges || codeChanges.files.length === 0) {
            // Optionally comment on Trello card if no changes
            await Trello.addCommentToCard(cardId, "AI did not generate any code changes for this task.");
            Logger.logWarn(`AI generated no changes for card ${cardId}.`);
            return new Response(JSON.stringify({ message: 'AI generated no code changes.' }), { status: 200 });
        }

        // 5. Apply Code Changes
        await file.applyCodeChanges(tempRepoPath, codeChanges); // Throws on error

        // 6. Git Workflow: Branch, Commit, Push
        const branchName = `feature/trello-${cardId}-${Date.now().toString().slice(-5)}`; // Simple unique branch name
        const commitMessage = `feat: Implement Trello task "${card.name}" (${cardId})\n\n${codeChanges.explanation || ''}`;
        const authorEmail = `${"add user username"}@users.noreply.github.com`; // Common practice for automation

        await gitRunner.createBranch(tempRepoPath, branchName);
        await gitRunner.commitChanges(tempRepoPath, commitMessage, "add user username", authorEmail); // Handles no changes case
        await gitRunner.pushBranch(tempRepoPath, branchName);

        // 7. Create GitHub Pull Request
        const prDetails = await gitApi.createPullRequest({
            owner: repoInfo.owner,
            repo: repoInfo.repo,
            title: `Implement Trello Task: ${card.name} (${cardId})`,
            body: `Resolves Trello card: [${card.name}](https://trello.com/c/${cardId})\n\n${codeChanges.explanation || 'AI generated changes.'}`,
            head: branchName,
            base: process.env.GITHUB_BASE_BRANCH as string,
        });

        if (!prDetails) {
            // Push succeeded but PR failed - maybe comment on Trello?
            await Trello.addCommentToCard(cardId, `Code pushed to branch ${branchName}, but failed to create Pull Request automatically.`);
            throw new Error("Failed to create GitHub Pull Request after push."); // Let generic error handler catch
        }

        // 8. Optional: Comment on Trello Card with PR link
        await Trello.addCommentToCard(cardId, `Pull request created: ${prDetails.html_url}`);

        // 9. Success Response
        Logger.logInfo(`Successfully processed card ${cardId}. PR: ${prDetails.html_url}`);
        return new Response(JSON.stringify({
            message: 'Successfully processed task and created Pull Request.',
            pullRequestUrl: prDetails.html_url,
            branchName: branchName,
        }), { status: 200 });

    } catch (error: any) {
        Logger.logError('Error during task processing:', error?.message || error);
        // Optional: Add comment to Trello card about the failure
        // if (body?.cardId) { await trello.addCommentToCard(body.cardId, `Failed to process task. Error: ${error?.message}`); }

        return new Response(JSON.stringify({
            error: 'Failed to process task.',
            details: error?.message || 'Unknown error',
        }), { status: 500 });

    } finally {
        // 10. Cleanup: Always try to remove the temporary directory
        if (tempRepoPath) {
            await file.removeDir(tempRepoPath);
        }
    }
}

// --- How to run this specific file (if needed) ---
// This assumes you might run this standalone or integrate into a larger Bun server
// const server = Bun.serve({
//     port: 3001, // Or your desired port
//     async fetch(req) {
//         const url = new URL(req.url);
//         if (url.pathname === '/api/process-task') {
//             return handler(req);
//         }
//         return new Response("Not Found", { status: 404 });
//     },
//     error(error) {
//         Logger.logError("Server Error:", error);
//         return new Response("Internal Server Error", { status: 500 });
//     }
// });
// Logger.logInfo(`Task processing server listening on port ${server.port}`);
// --- End standalone run example ---
