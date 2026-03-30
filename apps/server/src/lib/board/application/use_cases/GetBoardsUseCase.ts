import { BoardProviderFactory } from "../../infrastructure/external/BoardProviderFactory";

export class GetBoardsUseCase {
    async execute(params: { providerType: string; token: string; page?: number; perPage?: number }) {
        const provider = BoardProviderFactory.create(params.providerType, params.token);
        return await provider.getBoards(params.page, params.perPage);
    }
}
