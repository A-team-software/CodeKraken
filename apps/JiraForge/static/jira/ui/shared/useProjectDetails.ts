import { useEffect, useMemo, useState } from 'react';
import { invoke } from '@forge/bridge';
import { useResolvedContext } from './useResolvedContext';

type ProjectDetails = {
	id: string | null;
	key: string | null;
	name: string | null;
	iconUrl: string | null;
};

type UseProjectDetailsState = {
	project: ProjectDetails;
	isLoading: boolean;
	error: string | null;
};

export function useProjectDetails(): UseProjectDetailsState {
	const { context, isLoading: isContextLoading, error: contextError } = useResolvedContext();
	const [resolvedProject, setResolvedProject] = useState<ProjectDetails | null>(null);
	const [isProjectLoading, setIsProjectLoading] = useState(false);
	const [projectError, setProjectError] = useState<string | null>(null);

	const contextProject = useMemo<ProjectDetails>(() => {
		const id = context?.extension?.project?.id ? String(context.extension.project.id) : null;
		const key = context?.extension?.project?.key ? String(context.extension.project.key) : null;
		const name = context?.extension?.project?.name ? String(context.extension.project.name) : key;
		const iconUrl =
			context?.extension?.project?.avatarUrl ??
			context?.extension?.project?.iconUrl ??
			context?.extension?.project?.projectTypeIconUrl ??
			null;

		return { id, key, name, iconUrl };
	}, [context]);

	useEffect(() => {
		let isMounted = true;
		const projectIdOrKey = contextProject.id ?? contextProject.key;

		if (!projectIdOrKey) {
			setResolvedProject(null);
			setProjectError(null);
			setIsProjectLoading(false);
			return;
		}

		async function loadProjectDetails() {
			setIsProjectLoading(true);
			setProjectError(null);

			try {
				const result = (await invoke('getProjectDetails', {
					projectIdOrKey,
				})) as Partial<ProjectDetails>;

				if (!isMounted) {
					return;
				}

				setResolvedProject({
					id: result.id ? String(result.id) : contextProject.id,
					key: result.key ? String(result.key) : contextProject.key,
					name: result.name ? String(result.name) : contextProject.name,
					iconUrl: result.iconUrl ?? contextProject.iconUrl,
				});
			} catch (e: any) {
				if (!isMounted) {
					return;
				}

				setResolvedProject(null);
				setProjectError(e?.message || 'Failed to load project details.');
			} finally {
				if (isMounted) {
					setIsProjectLoading(false);
				}
			}
		}

		loadProjectDetails();

		return () => {
			isMounted = false;
		};
	}, [contextProject]);

	return {
		project: resolvedProject ?? contextProject,
		isLoading: isContextLoading || isProjectLoading,
		error: contextError ?? projectError,
	};
}
