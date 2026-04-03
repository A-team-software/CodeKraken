import { UserAggregate } from '../../../domain/aggregates/user_aggregate';
import { UserRepository } from '../../../domain/repository/UserRepository.interface';
import { EventBus } from '@oliver/shared';
import { UserProps } from '@oliver/core';

export interface CreateUserCommand {
    name: string;
    email: string;
    role: string;
    image?: string;
}

export class CreateUserUseCase {
    constructor(
        private readonly userRepo: UserRepository,
        private readonly eventBus: EventBus,
    ) { }

    async execute(cmd: CreateUserCommand): Promise<UserProps> {
        const id = this.userRepo.nextIdentity();
        const aggregate = UserAggregate.create({
            name: cmd.name,
            email: cmd.email,
            role: cmd.role,
            image: cmd.image,
        }, id);

        await this.userRepo.save(aggregate);

        // Publish all domain events raised during creation
        await this.eventBus.publishAll(aggregate.domainEvents);
        aggregate.clearDomainEvents();

        return aggregate.toPersistence();
    }
}
