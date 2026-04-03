import { AuthenticateGitProviderUseCase } from "../../application/use_cases/AuthenticateGitProviderUseCase";
import { GetRepositoriesUseCase } from "../../application/use_cases/GetRepositoriesUseCase";
import { ListGitProvidersUseCase } from "../../application/use_cases/ListGitProvidersUseCase";

export const gitModule = {
    useCases: {
        authenticate: new AuthenticateGitProviderUseCase(),
        listProviders: new ListGitProvidersUseCase(),
        getRepositories: new GetRepositoriesUseCase(),
    }
};
