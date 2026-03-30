import { UserRepository } from '@/lib/user/domain/repository/UserRepository.interface';
import { EventBus } from '@/lib/shared/events';
import { ConnectedAccount } from '@/lib/git';

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
