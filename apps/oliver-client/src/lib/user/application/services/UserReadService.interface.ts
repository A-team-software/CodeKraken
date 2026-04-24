export interface UserProfileDTO {
    id: string;
    name: string;
    username?: string;
    avatarUrl?: string;
    email: string;
    role: string;
    image?: string;
}

export interface UserReadService {
    getUserProfileById(id: string): Promise<UserProfileDTO | null>;
    getUserProfileByUsername(username: string): Promise<UserProfileDTO | null>;
}
