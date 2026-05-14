export type RepositorySource = 'github' | 'gitlab' | 'bitbucket';

export type RepositoryResult = {
	id: string;
	name: string;
	url: string;
	source: RepositorySource;
};

export interface RepositoryFinder {
	search(query: string): Promise<RepositoryResult[]>;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_REPOSITORIES: RepositoryResult[] = [
	// GitHub – 40 repos
	{ id: 'gh-1',  name: 'oliver-ai',               url: 'https://github.com/a-team-software/oliver-ai',               source: 'github' },
	{ id: 'gh-2',  name: 'code-kraken',             url: 'https://github.com/a-team-software/code-kraken',             source: 'github' },
	{ id: 'gh-3',  name: 'forge-bridge-utils',      url: 'https://github.com/a-team-software/forge-bridge-utils',      source: 'github' },
	{ id: 'gh-4',  name: 'jira-automation',         url: 'https://github.com/acme-corp/jira-automation',               source: 'github' },
	{ id: 'gh-5',  name: 'react-components',        url: 'https://github.com/acme-corp/react-components',              source: 'github' },
	{ id: 'gh-6',  name: 'node-api-gateway',        url: 'https://github.com/acme-corp/node-api-gateway',              source: 'github' },
	{ id: 'gh-7',  name: 'infra-terraform',         url: 'https://github.com/acme-corp/infra-terraform',               source: 'github' },
	{ id: 'gh-8',  name: 'monorepo-tools',          url: 'https://github.com/acme-corp/monorepo-tools',                source: 'github' },
	{ id: 'gh-9',  name: 'design-system',           url: 'https://github.com/acme-corp/design-system',                 source: 'github' },
	{ id: 'gh-10', name: 'auth-service',            url: 'https://github.com/acme-corp/auth-service',                  source: 'github' },
	{ id: 'gh-11', name: 'payments-service',        url: 'https://github.com/acme-corp/payments-service',              source: 'github' },
	{ id: 'gh-12', name: 'notification-worker',     url: 'https://github.com/acme-corp/notification-worker',           source: 'github' },
	{ id: 'gh-13', name: 'search-indexer',          url: 'https://github.com/acme-corp/search-indexer',                source: 'github' },
	{ id: 'gh-14', name: 'analytics-pipeline',      url: 'https://github.com/acme-corp/analytics-pipeline',            source: 'github' },
	{ id: 'gh-15', name: 'mobile-app-ios',          url: 'https://github.com/acme-corp/mobile-app-ios',                source: 'github' },
	{ id: 'gh-16', name: 'mobile-app-android',      url: 'https://github.com/acme-corp/mobile-app-android',            source: 'github' },
	{ id: 'gh-17', name: 'data-warehouse',          url: 'https://github.com/acme-corp/data-warehouse',                source: 'github' },
	{ id: 'gh-18', name: 'ml-model-server',         url: 'https://github.com/acme-corp/ml-model-server',               source: 'github' },
	{ id: 'gh-19', name: 'customer-portal',         url: 'https://github.com/acme-corp/customer-portal',               source: 'github' },
	{ id: 'gh-20', name: 'admin-dashboard',         url: 'https://github.com/acme-corp/admin-dashboard',               source: 'github' },
	{ id: 'gh-21', name: 'graphql-api',             url: 'https://github.com/acme-corp/graphql-api',                   source: 'github' },
	{ id: 'gh-22', name: 'event-bus',               url: 'https://github.com/acme-corp/event-bus',                     source: 'github' },
	{ id: 'gh-23', name: 'feature-flags-sdk',       url: 'https://github.com/acme-corp/feature-flags-sdk',             source: 'github' },
	{ id: 'gh-24', name: 'ci-cd-pipelines',         url: 'https://github.com/acme-corp/ci-cd-pipelines',               source: 'github' },
	{ id: 'gh-25', name: 'e2e-test-suite',          url: 'https://github.com/acme-corp/e2e-test-suite',                 source: 'github' },
	{ id: 'gh-26', name: 'docs-site',               url: 'https://github.com/acme-corp/docs-site',                     source: 'github' },
	{ id: 'gh-27', name: 'cli-tooling',             url: 'https://github.com/acme-corp/cli-tooling',                   source: 'github' },
	{ id: 'gh-28', name: 'plugin-sdk',              url: 'https://github.com/acme-corp/plugin-sdk',                    source: 'github' },
	{ id: 'gh-29', name: 'webhook-router',          url: 'https://github.com/acme-corp/webhook-router',                source: 'github' },
	{ id: 'gh-30', name: 'rate-limiter',            url: 'https://github.com/acme-corp/rate-limiter',                  source: 'github' },
	{ id: 'gh-31', name: 'config-service',          url: 'https://github.com/acme-corp/config-service',                source: 'github' },
	{ id: 'gh-32', name: 'log-aggregator',          url: 'https://github.com/acme-corp/log-aggregator',                source: 'github' },
	{ id: 'gh-33', name: 'billing-service',         url: 'https://github.com/acme-corp/billing-service',               source: 'github' },
	{ id: 'gh-34', name: 'user-service',            url: 'https://github.com/acme-corp/user-service',                  source: 'github' },
	{ id: 'gh-35', name: 'file-storage-api',        url: 'https://github.com/acme-corp/file-storage-api',              source: 'github' },
	{ id: 'gh-36', name: 'reporting-engine',        url: 'https://github.com/acme-corp/reporting-engine',              source: 'github' },
	{ id: 'gh-37', name: 'cache-proxy',             url: 'https://github.com/acme-corp/cache-proxy',                   source: 'github' },
	{ id: 'gh-38', name: 'api-mocking-server',      url: 'https://github.com/acme-corp/api-mocking-server',            source: 'github' },
	{ id: 'gh-39', name: 'content-delivery-api',    url: 'https://github.com/acme-corp/content-delivery-api',          source: 'github' },
	{ id: 'gh-40', name: 'oauth-provider',          url: 'https://github.com/acme-corp/oauth-provider',                source: 'github' },

	// GitLab – 30 repos
	{ id: 'gl-1',  name: 'platform-core',           url: 'https://gitlab.com/acme-group/platform-core',                source: 'gitlab' },
	{ id: 'gl-2',  name: 'devops-scripts',          url: 'https://gitlab.com/acme-group/devops-scripts',               source: 'gitlab' },
	{ id: 'gl-3',  name: 'kubernetes-configs',      url: 'https://gitlab.com/acme-group/kubernetes-configs',           source: 'gitlab' },
	{ id: 'gl-4',  name: 'helm-charts',             url: 'https://gitlab.com/acme-group/helm-charts',                  source: 'gitlab' },
	{ id: 'gl-5',  name: 'backend-monolith',        url: 'https://gitlab.com/acme-group/backend-monolith',             source: 'gitlab' },
	{ id: 'gl-6',  name: 'frontend-nextjs',         url: 'https://gitlab.com/acme-group/frontend-nextjs',              source: 'gitlab' },
	{ id: 'gl-7',  name: 'shared-libraries',        url: 'https://gitlab.com/acme-group/shared-libraries',             source: 'gitlab' },
	{ id: 'gl-8',  name: 'security-scanner',        url: 'https://gitlab.com/acme-group/security-scanner',             source: 'gitlab' },
	{ id: 'gl-9',  name: 'db-migrations',           url: 'https://gitlab.com/acme-group/db-migrations',                source: 'gitlab' },
	{ id: 'gl-10', name: 'integration-tests',       url: 'https://gitlab.com/acme-group/integration-tests',            source: 'gitlab' },
	{ id: 'gl-11', name: 'message-queue-consumer',  url: 'https://gitlab.com/acme-group/message-queue-consumer',       source: 'gitlab' },
	{ id: 'gl-12', name: 'api-contracts',           url: 'https://gitlab.com/acme-group/api-contracts',                source: 'gitlab' },
	{ id: 'gl-13', name: 'load-balancer-config',    url: 'https://gitlab.com/acme-group/load-balancer-config',         source: 'gitlab' },
	{ id: 'gl-14', name: 'monitoring-dashboards',   url: 'https://gitlab.com/acme-group/monitoring-dashboards',        source: 'gitlab' },
	{ id: 'gl-15', name: 'secrets-manager',         url: 'https://gitlab.com/acme-group/secrets-manager',              source: 'gitlab' },
	{ id: 'gl-16', name: 'identity-service',        url: 'https://gitlab.com/acme-group/identity-service',             source: 'gitlab' },
	{ id: 'gl-17', name: 'audit-logging',           url: 'https://gitlab.com/acme-group/audit-logging',                source: 'gitlab' },
	{ id: 'gl-18', name: 'tenant-manager',          url: 'https://gitlab.com/acme-group/tenant-manager',               source: 'gitlab' },
	{ id: 'gl-19', name: 'saml-integration',        url: 'https://gitlab.com/acme-group/saml-integration',             source: 'gitlab' },
	{ id: 'gl-20', name: 'data-exporter',           url: 'https://gitlab.com/acme-group/data-exporter',                source: 'gitlab' },
	{ id: 'gl-21', name: 'realtime-sync',           url: 'https://gitlab.com/acme-group/realtime-sync',                source: 'gitlab' },
	{ id: 'gl-22', name: 'workflow-engine',         url: 'https://gitlab.com/acme-group/workflow-engine',              source: 'gitlab' },
	{ id: 'gl-23', name: 'scheduler-service',       url: 'https://gitlab.com/acme-group/scheduler-service',            source: 'gitlab' },
	{ id: 'gl-24', name: 'gdpr-compliance',         url: 'https://gitlab.com/acme-group/gdpr-compliance',              source: 'gitlab' },
	{ id: 'gl-25', name: 'localization-service',    url: 'https://gitlab.com/acme-group/localization-service',         source: 'gitlab' },
	{ id: 'gl-26', name: 'template-renderer',       url: 'https://gitlab.com/acme-group/template-renderer',            source: 'gitlab' },
	{ id: 'gl-27', name: 'cron-runner',             url: 'https://gitlab.com/acme-group/cron-runner',                  source: 'gitlab' },
	{ id: 'gl-28', name: 'pdf-generator',           url: 'https://gitlab.com/acme-group/pdf-generator',                source: 'gitlab' },
	{ id: 'gl-29', name: 'email-service',           url: 'https://gitlab.com/acme-group/email-service',                source: 'gitlab' },
	{ id: 'gl-30', name: 'archive-service',         url: 'https://gitlab.com/acme-group/archive-service',              source: 'gitlab' },

	// Bitbucket – 30 repos
	{ id: 'bb-1',  name: 'enterprise-core',         url: 'https://bitbucket.org/acme-workspace/enterprise-core',       source: 'bitbucket' },
	{ id: 'bb-2',  name: 'legacy-api',              url: 'https://bitbucket.org/acme-workspace/legacy-api',            source: 'bitbucket' },
	{ id: 'bb-3',  name: 'crm-integration',         url: 'https://bitbucket.org/acme-workspace/crm-integration',       source: 'bitbucket' },
	{ id: 'bb-4',  name: 'erp-connector',           url: 'https://bitbucket.org/acme-workspace/erp-connector',         source: 'bitbucket' },
	{ id: 'bb-5',  name: 'support-portal',          url: 'https://bitbucket.org/acme-workspace/support-portal',        source: 'bitbucket' },
	{ id: 'bb-6',  name: 'partner-api',             url: 'https://bitbucket.org/acme-workspace/partner-api',           source: 'bitbucket' },
	{ id: 'bb-7',  name: 'inventory-service',       url: 'https://bitbucket.org/acme-workspace/inventory-service',     source: 'bitbucket' },
	{ id: 'bb-8',  name: 'shipping-service',        url: 'https://bitbucket.org/acme-workspace/shipping-service',      source: 'bitbucket' },
	{ id: 'bb-9',  name: 'pricing-engine',          url: 'https://bitbucket.org/acme-workspace/pricing-engine',        source: 'bitbucket' },
	{ id: 'bb-10', name: 'catalogue-service',       url: 'https://bitbucket.org/acme-workspace/catalogue-service',     source: 'bitbucket' },
	{ id: 'bb-11', name: 'checkout-service',        url: 'https://bitbucket.org/acme-workspace/checkout-service',      source: 'bitbucket' },
	{ id: 'bb-12', name: 'returns-service',         url: 'https://bitbucket.org/acme-workspace/returns-service',       source: 'bitbucket' },
	{ id: 'bb-13', name: 'loyalty-program',         url: 'https://bitbucket.org/acme-workspace/loyalty-program',       source: 'bitbucket' },
	{ id: 'bb-14', name: 'promotions-engine',       url: 'https://bitbucket.org/acme-workspace/promotions-engine',     source: 'bitbucket' },
	{ id: 'bb-15', name: 'review-service',          url: 'https://bitbucket.org/acme-workspace/review-service',        source: 'bitbucket' },
	{ id: 'bb-16', name: 'recommendation-api',      url: 'https://bitbucket.org/acme-workspace/recommendation-api',   source: 'bitbucket' },
	{ id: 'bb-17', name: 'tax-calculator',          url: 'https://bitbucket.org/acme-workspace/tax-calculator',        source: 'bitbucket' },
	{ id: 'bb-18', name: 'currency-converter',      url: 'https://bitbucket.org/acme-workspace/currency-converter',    source: 'bitbucket' },
	{ id: 'bb-19', name: 'sla-tracker',             url: 'https://bitbucket.org/acme-workspace/sla-tracker',           source: 'bitbucket' },
	{ id: 'bb-20', name: 'contract-service',        url: 'https://bitbucket.org/acme-workspace/contract-service',      source: 'bitbucket' },
	{ id: 'bb-21', name: 'invoice-generator',       url: 'https://bitbucket.org/acme-workspace/invoice-generator',     source: 'bitbucket' },
	{ id: 'bb-22', name: 'ledger-service',          url: 'https://bitbucket.org/acme-workspace/ledger-service',        source: 'bitbucket' },
	{ id: 'bb-23', name: 'reconciliation-tool',     url: 'https://bitbucket.org/acme-workspace/reconciliation-tool',   source: 'bitbucket' },
	{ id: 'bb-24', name: 'fraud-detection',         url: 'https://bitbucket.org/acme-workspace/fraud-detection',       source: 'bitbucket' },
	{ id: 'bb-25', name: 'subscription-manager',    url: 'https://bitbucket.org/acme-workspace/subscription-manager',  source: 'bitbucket' },
	{ id: 'bb-26', name: 'vendor-portal',           url: 'https://bitbucket.org/acme-workspace/vendor-portal',         source: 'bitbucket' },
	{ id: 'bb-27', name: 'procurement-service',     url: 'https://bitbucket.org/acme-workspace/procurement-service',   source: 'bitbucket' },
	{ id: 'bb-28', name: 'warehouse-api',           url: 'https://bitbucket.org/acme-workspace/warehouse-api',         source: 'bitbucket' },
	{ id: 'bb-29', name: 'delivery-tracker',        url: 'https://bitbucket.org/acme-workspace/delivery-tracker',      source: 'bitbucket' },
	{ id: 'bb-30', name: 'fleet-management',        url: 'https://bitbucket.org/acme-workspace/fleet-management',      source: 'bitbucket' },
];

// ─── Implementations ──────────────────────────────────────────────────────────

export class MockRepositoryFinder implements RepositoryFinder {
	async search(query: string): Promise<RepositoryResult[]> {
		const q = query.trim().toLowerCase();
		if (!q) return [];

		// Simulate network latency
		await new Promise((resolve) => setTimeout(resolve, 150));

		return MOCK_REPOSITORIES.filter(
			(repo) => repo.name.toLowerCase().includes(q) || repo.url.toLowerCase().includes(q),
		).slice(0, 20);
	}
}

export class RemoteRepositoryFinder implements RepositoryFinder {
	async search(_query: string): Promise<RepositoryResult[]> {
		// TODO: invoke('searchRepositories', { query }) across all providers
		throw new Error('RemoteRepositoryFinder is not yet implemented.');
	}
}
