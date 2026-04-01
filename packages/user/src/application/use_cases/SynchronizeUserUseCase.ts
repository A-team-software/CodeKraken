import { UserAggregate } from "../../domain/aggregates/user_aggregate";
import { UserRepository } from "../../domain/repository/UserRepository.interface";
import { Logger } from "@oliver/core";

export interface SynchronizeUserCommand {
    email?: string;
    username?: string;
    name?: string;
    image?: string;
    avatarUrl?: string;
    url?: string;
}

export class SynchronizeUserUseCase {
    constructor(private userRepo: UserRepository) { }

    async execute(cmd: SynchronizeUserCommand): Promise<UserAggregate> {
        // Try to find existing user by email, then by username
        let existingUser = cmd.email
            ? await this.userRepo.findByEmail(cmd.email)
            : null;

        if (!existingUser && cmd.username) {
            existingUser = await this.userRepo.findByUsername(cmd.username);
        }

        if (existingUser) {
            existingUser.updateProfile({
                name: cmd.name,
                email: cmd.email,
                image: cmd.image,
                username: cmd.username,
                avatarUrl: cmd.avatarUrl,
                url: cmd.url,
            });
            await this.userRepo.save(existingUser);
            Logger.info(`User ${cmd.username || cmd.email} synchronized`, { userId: existingUser.id });
            return existingUser;
        } else {
            const newUser = UserAggregate.create({
                name: cmd.name || cmd.username || 'Unknown',
                email: cmd.email || `${cmd.username}@provider.local`,
                role: 'user',
                image: cmd.image,
                username: cmd.username,
                avatarUrl: cmd.avatarUrl,
                url: cmd.url,
                onboardingStep: 'connect',
            }, this.userRepo.nextIdentity());

            const saved = await this.userRepo.save(newUser);
            Logger.info(`New user created for ${cmd.username || cmd.email}`, { userId: saved.id });
            return saved;
        }
    }
}
