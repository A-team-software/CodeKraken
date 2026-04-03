import { UserRepository } from '../../../domain/repository/UserRepository.interface';
import { EventBus } from '@oliver/shared';

export interface UpdateUserProfileCommand {
    userId: string;
    name?: string;
    email?: string;
    image?: string;
}

export class UpdateUserProfileUseCase {
    constructor(
        private readonly userRepo: UserRepository,
        private readonly eventBus: EventBus,
    ) { }

    async execute(cmd: UpdateUserProfileCommand): Promise<void> {
        const aggregate = await this.userRepo.findById(cmd.userId);
        if (!aggregate) {
            throw new Error('User not found');
        }

        aggregate.updateProfile({
            name: cmd.name,
            email: cmd.email,
            image: cmd.image,
        });

        await this.userRepo.save(aggregate);

        await this.eventBus.publishAll(aggregate.domainEvents);
        aggregate.clearDomainEvents();
    }
}
