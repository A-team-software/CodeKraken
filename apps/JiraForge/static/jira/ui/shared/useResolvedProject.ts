import { useMemo } from 'react';
import { useResolvedContext } from './useResolvedContext';

type ResolvedProject = {
	id: string | null;
	key: string | null;
	name: string | null;
};

type ResolvedProjectState = {
	project: ResolvedProject;
	isLoading: boolean;
	error: string | null;
};

export function useResolvedProject(): ResolvedProjectState {
	const { context, isLoading: isContextLoading, error: contextError } = useResolvedContext();
    const { projectId, projectKey, projectName } = useMemo(() => {
        const projectId = context?.extension?.project?.id ?? null;
        const projectKey = context?.extension?.project?.key ?? null;
        const projectName = context?.extension?.project?.name ?? projectKey;
        const contextProjectIconUrl =
            context?.extension?.project?.avatarUrl ??
            context?.extension?.project?.iconUrl ??
            context?.extension?.project?.projectTypeIconUrl ??
            null;
            
        return { projectId, projectKey, projectName, contextProjectIconUrl };
    }, [context]);

	return {
		project: {
			id: projectId,
			key: projectKey,
			name: projectName,
		},
		isLoading: isContextLoading,
		error: contextError,
	};
}
