import { PlainAtlassianTenant } from "@/lib/infrastructure/db/mongodb/models/AtlassianTenant.model";

export interface AtlassianTenantRepository {
    findByClientKey(clientKey: string): Promise<PlainAtlassianTenant | null>;
    upsert(tenantData: {
        key: string;
        clientKey: string;
        sharedSecret: string;
        baseUrl: string;
        productType: string;
        description?: string;
        eventType?: string;
    }): Promise<PlainAtlassianTenant>;
    deleteByClientKey(clientKey: string): Promise<boolean>;
}
