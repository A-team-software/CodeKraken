import { BoardProviderFactory } from "../../infrastructure/external/BoardProviderFactory";

export class ListBoardProvidersUseCase {
    async execute() {
        return BoardProviderFactory.getAllProviders().map((p) => ({
            id: p.id,
            name: p.name,
            supportsOAuth: p.supportsOAuth,
            tokenPlaceholder: p.tokenPlaceholder,
            tokenDescription: p.tokenDescription,
        }));
    }
}
