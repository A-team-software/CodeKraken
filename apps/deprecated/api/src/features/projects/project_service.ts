import { Logger } from "@/utils/logger/logger";
import { Project } from "./interface";


const getAllProjects = async (accountID: string): Promise<Project[] | null> => {
    try {
        // TODO: replace this Url.
        const response = await fetch(`http://localhost:3000/api/v1/users/${accountID}/projects`, {
            method: "GET",
            headers: {
                'Content-Type': 'application/json',
            }
        });
        const projectsData = await response.json();
        const projects: Project[] = JSON.parse(JSON.stringify(projectsData.Ok));

        return projects;
    } catch (e: any) {
        Logger.logError(e);
        return null;
    }
}

const createProject = async (repoID: string, accountID: string, repoName: string, repoURL: string): Promise<boolean> => {
    try {
        await fetch("/api/v1/projects/projects", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ accountID: accountID, repoID: repoID, repoName: repoName, repoURL: repoURL })
        });
        return true;
    } catch (e: any) {
        Logger.logError(e)
        return false;
    }
}

const updateProject = async (repoID: string, projectStage: Number): Promise<boolean> => {
    try {
        await fetch("/api/v1/projects/project", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ repoID: repoID, projectStage: projectStage })
        });
        return true;
    } catch (e: any) {
        Logger.logError(e);
        return false;
    }
}

export const ProjectService = ({
    getAllProjects: getAllProjects,
    createProject: createProject,
    updateProject: updateProject,
}) as const;
