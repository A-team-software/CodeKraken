import { UserRepository } from '../../../domain/repository/UserRepository.interface';
import { EventBus } from '@oliver/shared';
import { ConnectedAccount } from '@oliver/core';

export interface LinkGitAccountCommand {
    userId: string;
    account: ConnectedAccount;
}

export class LinkGitAccountUseCase {
    constructor(
        private readonly userRepo: UserRepository,
        private readonly eventBus: EventBus,
    ) { }

    async execute(cmd: LinkGitAccountCommand): Promise<void> {
        const aggregate = await this.userRepo.findById(cmd.userId);
        if (!aggregate) {
            throw new Error('User not found');
        }

        aggregate.linkAccount(cmd.account);

        await this.userRepo.save(aggregate);

        await this.eventBus.publishAll(aggregate.domainEvents);
        aggregate.clearDomainEvents();
    }
}
