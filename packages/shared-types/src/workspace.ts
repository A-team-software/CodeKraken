import { Repository } from "./entities"

export type Workspace = {
    uuid: string,
    name: string,
    private: boolean,
    repositoriesURL: string,
    repositories: Repository[],
}

export const toWorkspace = (json: any): Workspace => {
    return {
        uuid: json.uuid,
        name: json.name,
        private: json.is_private,
        repositoriesURL: json.links.repositories.href,
        repositories: [],
    }
}
