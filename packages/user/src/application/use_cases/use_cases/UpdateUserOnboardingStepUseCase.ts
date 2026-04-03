import { UserRepository } from '../../../domain/repository/UserRepository.interface';
import { EventBus } from '@oliver/shared';
import { UserProps } from '@oliver/core';

export interface UpdateUserOnboardingStepCommand {
    userId: string;
    step: UserProps['onboardingStep'];
}

export class UpdateUserOnboardingStepUseCase {
    constructor(
        private readonly userRepo: UserRepository,
        private readonly eventBus: EventBus,
    ) { }

    async execute(cmd: UpdateUserOnboardingStepCommand): Promise<void> {
        const aggregate = await this.userRepo.findById(cmd.userId);
        if (!aggregate) {
            throw new Error('User not found');
        }

        aggregate.updateOnboardingStep(cmd.step);
        await this.userRepo.save(aggregate);

        await this.eventBus.publishAll(aggregate.domainEvents);
        aggregate.clearDomainEvents();
    }
}
