import { BoardProviderFactory } from '@/src/infrastructure/external/BoardProviderFactory';
import { AuthenticateBoardProviderUseCase } from '@/src/application/use_cases/AuthenticateBoardProviderUseCase';
import { GetBoardsUseCase } from '@/src/application/use_cases/GetBoardsUseCase';
import { ListBoardProvidersUseCase } from '@/src/application/use_cases/ListBoardProvidersUseCase';

export class BoardModule {
    private static factory = BoardProviderFactory;

    static getProviderFactory() {
        return this.factory;
    }

    static getAuthenticateUseCase() {
        return new AuthenticateBoardProviderUseCase();
    }

    static getGetBoardsUseCase() {
        return new GetBoardsUseCase();
    }

    static getListProvidersUseCase() {
        return new ListBoardProvidersUseCase();
    }
}
