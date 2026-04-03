import { UserRepository } from '../../../domain/repository/UserRepository.interface';
import { EventBus } from '@oliver/shared';
import { UserProps } from '@oliver/core';

export interface UpdateUserSettingsCommand {
    userId: string;
    settings: Partial<UserProps['settings']>;
}

export class UpdateUserSettingsUseCase {
    constructor(
        private readonly userRepo: UserRepository,
        private readonly eventBus: EventBus,
    ) { }

    async execute(cmd: UpdateUserSettingsCommand): Promise<UserProps['settings']> {
        const aggregate = await this.userRepo.findById(cmd.userId);
        if (!aggregate) {
            throw new Error('User not found');
        }

        aggregate.updateSettings(cmd.settings);
        await this.userRepo.save(aggregate);

        await this.eventBus.publishAll(aggregate.domainEvents);
        aggregate.clearDomainEvents();

        return aggregate.settings;
    }
}
