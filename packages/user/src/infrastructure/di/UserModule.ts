import { MongoUserRepository } from '../repositories/UserRepository.mongo';
import { MongoUserReadService } from '../services/MongoUserReadService';
import { GetUserProfileUseCase } from '../../application/use_cases/use_cases/GetUserProfileUseCase';
import { CreateUserUseCase, UpdateUserProfileUseCase } from '../../application/use_cases/use_cases';
import { UpdateUserSettingsUseCase } from '../../application/use_cases/use_cases/UpdateUserSettingsUseCase';
import { UpdateUserOnboardingStepUseCase } from '../../application/use_cases/use_cases/UpdateUserOnboardingStepUseCase';
import { EventBus } from '@oliver/shared';

// Create singleton instances or factories for your infrastructure
const userRepository = new MongoUserRepository();
const userReadService = new MongoUserReadService();
const eventBus = EventBus.getInstance();

// Export pre-instantiated Use Cases
export const userModule = {
    repositories: {
        userRepository,
    },
    services: {
        userReadService,
    },
    useCases: {
        getUserProfile: new GetUserProfileUseCase(userReadService),
        updateUserProfile: new UpdateUserProfileUseCase(userRepository, eventBus),
        createUser: new CreateUserUseCase(userRepository, eventBus),
        updateUserSettings: new UpdateUserSettingsUseCase(userRepository, eventBus),
        updateUserOnboardingStep: new UpdateUserOnboardingStepUseCase(userRepository, eventBus),
    }
};
