import { WebhookService } from "../provider_service/webhooks";
import { ProjectService } from "../projects/project_service";

const initProject = async (userAndRepoName: string, repoName: string, repoID: string, repoUrl: string, accountID: string) => {
    // try {
    //     await WebhookService.setWebhook(userAndRepoName, token);
    // } catch (e) {
    //     console.log(e);
    // }
    try {
        await ProjectService.createProject(repoID, accountID, repoName, repoUrl);
    } catch (e) {
        console.log(e);
    }

}


export const ServiceProvider = Object.freeze({
    initProject: initProject,
});
