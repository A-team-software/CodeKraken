import { UserReadService, UserProfileDTO } from '../../services/UserReadService.interface';

export interface GetUserProfileQuery {
    id?: string;
    username?: string;
}

export class GetUserProfileUseCase {
    constructor(private readonly userReadService: UserReadService) { }

    async execute(query: GetUserProfileQuery): Promise<UserProfileDTO> {
        let user: UserProfileDTO | null = null;

        if (query.id) {
            user = await this.userReadService.getUserProfileById(query.id);
        }

        if (!user && query.username) {
            user = await this.userReadService.getUserProfileByUsername(query.username);
        }

        if (!user) {
            throw new Error('User not found');
        }

        return user;
    }
}
