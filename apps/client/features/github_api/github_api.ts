import { Repository } from '@oliver/shared-types';
import { Logger } from '@oliver/utils';
const getGitHubRepos = async (accessToken: string): Promise<Repository[] | null> => {
    // const [accessToken, error] = await safeExecute(LocalCacheDB.get, "accessToken");
    // if (error) {
    //     Logger.logError(error);
    //     return null;
    // }
    try {
        const response = await fetch('https://api.github.com/user/repos', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/vnd.github.v3+json",
            },
        });
        const repos = await response.json();
        if (!response.ok) {
            Logger.logInfo(response);
            return null;
        }
        const repositories: Repository[] = JSON.parse(JSON.stringify(repos));
        return repositories;
    } catch (e: any) {
        Logger.logError(e);
        return null;
    }
}

const getUserRepos = async (serviceProvider = "GitHub", accessToken: string): Promise<Repository[] | null> => {
    const repos = await getGitHubRepos(accessToken);
    return repos;
}





export const GitRepository = Object.freeze({
    getUserRepos: getUserRepos,
});
