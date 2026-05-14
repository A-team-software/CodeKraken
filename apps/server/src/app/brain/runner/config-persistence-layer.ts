export interface TenantConfig {
    incrementalPrsOn: boolean;
}

export interface ConfigPersistenceLayer {
    getTenantConfig(tenantId: string): Promise<TenantConfig | null>;
    updateTenantConfig(tenantId: string, config: Partial<TenantConfig>): Promise<void>;
}