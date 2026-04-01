import { ObjectId } from '@oliver/db';
import { UserReadService, UserProfileDTO } from '../../application/services/UserReadService.interface';
import { UserCollection } from '@oliver/db';

export class MongoUserReadService implements UserReadService {
    async getUserProfileById(id: string): Promise<UserProfileDTO | null> {
        const col = await UserCollection.get();
        const doc = await col.findOne(
            { _id: new ObjectId(id) },
            { projection: { _id: 1, name: 1, username: 1, avatarUrl: 1, email: 1, role: 1, image: 1 } }
        );

        if (!doc) return null;
        return this.mapToDTO(doc);
    }

    async getUserProfileByUsername(username: string): Promise<UserProfileDTO | null> {
        const col = await UserCollection.get();
        const doc = await col.findOne(
            { username },
            { projection: { _id: 1, name: 1, username: 1, avatarUrl: 1, email: 1, role: 1, image: 1 } }
        );

        if (!doc) return null;
        return this.mapToDTO(doc);
    }

    private mapToDTO(doc: any): UserProfileDTO {
        return {
            id: doc._id.toString(),
            name: doc.name,
            username: doc.username,
            avatarUrl: doc.avatarUrl,
            email: doc.email,
            role: doc.role,
            image: doc.image,
        };
    }
}
