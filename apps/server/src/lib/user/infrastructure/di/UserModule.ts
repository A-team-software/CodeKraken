import { MongoUserRepository } from '../repositories/UserRepository.mongo';
import { GetUserProfileUseCase } from '@/lib/user/application/use_cases/use_cases/GetUserProfileUseCase';
import { UpdateUserProfileUseCase } from '@/lib/user/application/use_cases/use_cases/UpdateUserProfileUseCase';
import { CreateUserUseCase } from '@/lib/user/application/use_cases/use_cases/CreateUserUseCase';
import { UpdateUserSettingsUseCase } from '@/lib/user/application/use_cases/use_cases/UpdateUserSettingsUseCase';
import { UpdateUserOnboardingStepUseCase } from '@/lib/user/application/use_cases/use_cases/UpdateUserOnboardingStepUseCase';
import { EventBus } from '@/lib/shared/events';
import { MongoUserReadService } from '../services/MongoUserReadService';

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
