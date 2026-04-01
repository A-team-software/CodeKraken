import { AuthenticateGitProviderUseCase } from "@/src/application/use_cases/AuthenticateGitProviderUseCase";
import { GetRepositoriesUseCase } from "@/src/application/use_cases/GetRepositoriesUseCase";
import { ListGitProvidersUseCase } from "@/src/application/use_cases/ListGitProvidersUseCase";

export const gitModule = {
    useCases: {
        authenticate: new AuthenticateGitProviderUseCase(),
        listProviders: new ListGitProvidersUseCase(),
        getRepositories: new GetRepositoriesUseCase(),
    }
};
