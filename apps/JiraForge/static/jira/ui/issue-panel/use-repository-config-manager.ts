import { useMemo } from 'react';
import { invoke } from '@forge/bridge';
import { EntityPropertiesRepositoryConfigManager } from './entity-properties-repository-config-manager';
import { MockRepositoryConfigManager } from './mock-repository-config-manager';
import { RepositoryConfigManager } from './repository-config-manager';

type RepositoryConfigManagerMode = 'mock' | 'entity-properties';

type UseRepositoryConfigManagerOptions = {
	mode?: RepositoryConfigManagerMode;
};

export function useRepositoryConfigManager(options?: UseRepositoryConfigManagerOptions): RepositoryConfigManager {
	const mode = options?.mode ?? 'mock';

	return useMemo(() => {
		if (mode === 'entity-properties') {
			return new EntityPropertiesRepositoryConfigManager(invoke);
		}

		return new MockRepositoryConfigManager();
	}, [mode]);
}
