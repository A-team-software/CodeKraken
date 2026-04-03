import { PlainAtlassianTenant } from "@oliver/core";

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
