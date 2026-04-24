import { UserRepository } from '../../../domain/repository/UserRepository.interface';
import { EventBus } from '@oliver/shared';

export interface UnlinkGitAccountCommand {
    userId: string;
    provider: string;
    providerAccountId: string;
}

export class UnlinkGitAccountUseCase {
    constructor(
        private readonly userRepo: UserRepository,
        private readonly eventBus: EventBus,
    ) { }

    async execute(cmd: UnlinkGitAccountCommand): Promise<void> {
        const aggregate = await this.userRepo.findById(cmd.userId);
        if (!aggregate) {
            throw new Error('User not found');
        }

        aggregate.unlinkAccount(cmd.provider, cmd.providerAccountId);

        await this.userRepo.save(aggregate);

        await this.eventBus.publishAll(aggregate.domainEvents);
        aggregate.clearDomainEvents();
    }
}
