import { WebhookServiceInterface } from "./interfaces/interfaces";

const getWebhooks = async (userName: string, repoName: string, token: string) => {
    const webhooksUrl: string = `https://api.github.com/repos/${userName}/${repoName}/hooks`;
    const response = await fetch(webhooksUrl, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        }
    });
    const hooks = await response.json();
    return hooks;
}

const setWebhook = async (userAndRepoName: string, token: string) => {
    const webhooksUrl: string = `https://api.github.com/repos/${userAndRepoName}/hooks`;
    const payload = {
        name: "web",
        activate: true,
        events: ['pull_request_review', 'push'],
        config: {
            url: "https://aix-docs.vercel.app/api/webhook",
            content_type: "json",
            secret: process.env.WEBHOOK_SECRET,
        },
    }
    const response = await fetch(webhooksUrl, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
    });
    const result = await response.json();
    return result;
}


export const WebhookService: WebhookServiceInterface = Object.freeze({
    getWebhooks: getWebhooks,
    setWebhook: setWebhook
});

