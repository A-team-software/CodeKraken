import React, { useState, useCallback, useEffect } from 'react';
import { invoke, showFlag } from '@forge/bridge';
import Button from '@atlaskit/button';
import { Box, Flex, xcss } from '@atlaskit/primitives';
import '@atlaskit/css-reset';
import { useProjectDetails } from '../shared/useProjectDetails';
import { RepositoryResult } from './repository-finder';
import { RepositoryAutocomplete } from './repository-autocomplete';
import { RepositoryList, Repository, PAGE_SIZE } from './repository-list';

// ─── Skeleton ─────────────────────────────────────────────────────────────────────────

function Skeleton({ width = '100%', height = '16px', borderRadius = '4px', style }: {
	width?: string; height?: string; borderRadius?: string; style?: React.CSSProperties;
}) {
	return (
		<div style={{
			width, height, borderRadius,
			background: 'linear-gradient(90deg, #e9ebee 25%, #f4f5f7 50%, #e9ebee 75%)',
			backgroundSize: '200% 100%',
			animation: 'skeleton-shimmer 1.4s infinite',
			...style,
		}} />
	);
}

function PageSkeleton() {
	return (
		<div style={{ padding: '16px', maxWidth: '600px' }}>
			<style>{`@keyframes skeleton-shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`}</style>
			<Skeleton width="260px" height="22px" style={{ marginBottom: '24px' }} />
			<div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
				<Skeleton width="20px" height="20px" borderRadius="3px" />
				<Skeleton width="140px" height="16px" />
			</div>
			<Skeleton width="100px" height="14px" style={{ marginBottom: '8px' }} />
			<Skeleton width="100%" height="36px" borderRadius="3px" style={{ marginBottom: '24px' }} />
			<Skeleton width="160px" height="14px" style={{ marginBottom: '12px' }} />
			{[1, 2, 3].map((i) => (
				<div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
					<Skeleton width="16px" height="16px" borderRadius="3px" />
					<Skeleton width="24px" height="24px" borderRadius="50%" />
					<div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
						<Skeleton width="45%" height="14px" />
						<Skeleton width="65%" height="12px" />
					</div>
					<Skeleton width="60px" height="28px" borderRadius="3px" />
				</div>
			))}
			<div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
				<Skeleton width="140px" height="32px" borderRadius="3px" />
				<Skeleton width="80px" height="32px" borderRadius="3px" />
			</div>
		</div>
	);
}

// ─── Styles ───────────────────────────────────────────────────────────────────────────

const containerStyles = xcss({
	padding: 'space.200',
	maxWidth: '600px',
	fontFamily:
		'var(--ds-font-family-body, "Atlassian Sans", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif)',
});

const headingStyles = xcss({
	fontSize: '1.25rem',
	fontWeight: 'bold',
	marginBottom: 'space.200',
});

const sectionStyles = xcss({
	marginBottom: 'space.300',
});

const repositoriesListStyles = xcss({
	padding: 'space.150',
	marginBottom: 'space.200',
});

const buttonGroupStyles = xcss({
	display: 'flex',
	gap: 'space.100',
	marginTop: 'space.200',
});

// ─── Types ──────────────────────────────────────────────────────────────────────────────

// ─── Component ──────────────────────────────────────────────────────────────────────────

export function ProjectConfigPage() {
	const { project, isLoading: isContextLoading, error: contextError } = useProjectDetails();
	const [repositories, setRepositories] = useState<Repository[]>([]);
	const [baselineRepositories, setBaselineRepositories] = useState<Repository[]>([]);
	const [isSaving, setIsSaving] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);

	const projectIdOrKey = project.id ?? project.key;
	const projectName = project.name;
	const projectIconUrl = project.iconUrl;

	const addFlag = useCallback(
		(title: string, description: string | undefined, type: 'error' | 'success' | 'info' | 'warning') => {
			showFlag({
				id: `project-config-${type}-${Date.now()}`,
				title,
				description,
				type,
				isAutoDismiss: true,
			});
		},
		[],
	);

	useEffect(() => {
		if (!contextError) {
			return;
		}

		addFlag('Failed to load project context', contextError, 'error');
	}, [contextError, addFlag]);

	const handleAddRepository = (repo: RepositoryResult) => {
		if (repositories.some((r) => r.url === repo.url)) {
			addFlag('Duplicate Repository', `${repo.name} has already been added.`, 'error');
			return;
		}
		setRepositories((prev) => {
			const next = [...prev, { id: `repo-${Date.now()}`, name: repo.name, url: repo.url, source: repo.source, selected: true }];
			setCurrentPage(Math.ceil(next.length / PAGE_SIZE));
			return next;
		});
	};

	const handleToggleRepository = (id: string) => {
		setRepositories((prev) => prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r)));
	};

	const handleRemoveRepository = (id: string) => {
		setRepositories((prev) => {
			const next = prev.filter((r) => r.id !== id);
			setCurrentPage((p) => Math.min(p, Math.max(1, Math.ceil(next.length / PAGE_SIZE))));
			return next;
		});
	};

	useEffect(() => {
		let isMounted = true;

		async function loadBaselineRepositories() {
			if (!projectIdOrKey) {
				return;
			}

			try {
				const loaded = (await invoke('getProjectRepositories', { projectIdOrKey })) as Repository[];
				if (!isMounted || !Array.isArray(loaded)) {
					return;
				}

				const normalized = loaded
					.filter((repo) => repo?.url && repo?.name && repo?.id)
					.map((repo) => ({ ...repo, selected: repo.selected !== false }));

				setRepositories(normalized);
				setBaselineRepositories(normalized);
				setCurrentPage(1);
			} catch (e: any) {
				if (!isMounted) {
					return;
				}
				addFlag('Load Failed', e?.message || 'Failed to load existing repository configuration.', 'error');
			}
		}

		loadBaselineRepositories();

		return () => {
			isMounted = false;
		};
	}, [projectIdOrKey, addFlag]);

	const handleSave = async () => {
		setIsSaving(true);
		try {
			if (!projectIdOrKey) throw new Error('Project context was not found.');

			// Calculate added and removed repos
			const currentSelectedByUrl = new Map(repositories.filter((r) => r.selected).map((r) => [r.url, r]));
			const baselineSelectedByUrl = new Map(baselineRepositories.filter((r) => r.selected).map((r) => [r.url, r]));

			const added = Array.from(currentSelectedByUrl.entries())
				.filter(([url]) => !baselineSelectedByUrl.has(url))
				.map(([, repo]) => repo);
			const removed = Array.from(baselineSelectedByUrl.entries())
				.filter(([url]) => !currentSelectedByUrl.has(url))
				.map(([, repo]) => repo);

			await invoke('saveProjectRepositories', { repositories, projectIdOrKey });
			setBaselineRepositories(repositories);
			addFlag(
				'Configuration Saved',
				`Successfully saved configuration with ${added.length} added and ${removed.length} removed repository(ies).`,
				'success'
			);
		} catch (e: any) {
			addFlag('Save Failed', e?.message || 'Failed to save repositories.', 'error');
		} finally {
			setIsSaving(false);
		}
	};

	const serializeRepositories = (list: Repository[]) =>
		JSON.stringify(list.map(({ url, selected }) => ({ url, selected })));

	const selectedCount = repositories.filter((r) => r.selected).length;
	const hasActiveChanges = serializeRepositories(repositories) !== serializeRepositories(baselineRepositories);
	const totalPages = Math.max(1, Math.ceil(repositories.length / PAGE_SIZE));

	if (isContextLoading) {
		return <PageSkeleton />;
	}

	return (
		<>
			<Box xcss={containerStyles}>
				<Box xcss={headingStyles}>Project Repository Configuration</Box>

				{projectName && (
					<Box xcss={sectionStyles}>
						<Flex alignItems="center" gap="space.100">
							{projectIconUrl ? (
								<img
									src={projectIconUrl}
									alt={String(projectName)}
									width={20}
									height={20}
									style={{ borderRadius: '3px', objectFit: 'cover' }}
								/>
							) : (
								<Box
									as="span"
									style={{
										display: 'inline-flex',
										alignItems: 'center',
										justifyContent: 'center',
										width: '20px',
										height: '20px',
										borderRadius: '3px',
										background: '#1d7afc',
										color: '#ffffff',
										fontSize: '12px',
										fontWeight: 600,
									}}
								>
									{String(projectName).charAt(0).toUpperCase()}
								</Box>
							)}
							<Box as="p">
								<strong>{projectName}</strong>
							</Box>
						</Flex>
					</Box>
				)}

				<Box xcss={sectionStyles}>
					<Box as="label" htmlFor="project-repository-search" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
						Add Repository
					</Box>
				<RepositoryAutocomplete onSelect={handleAddRepository} excludedUrls={repositories.map((r) => r.url)} />
				</Box>

				<Box xcss={sectionStyles}>
					<Box as="label">Selected Repositories ({selectedCount})</Box>
					<Box xcss={repositoriesListStyles}>
						<RepositoryList
							repositories={repositories}
							currentPage={currentPage}
							totalPages={totalPages}
							onPageChange={setCurrentPage}
							onToggle={handleToggleRepository}
							onRemove={handleRemoveRepository}
						/>
					</Box>
				</Box>

				<Flex xcss={buttonGroupStyles}>
					<Button
						appearance="primary"
						onClick={handleSave}
						isDisabled={isSaving || isContextLoading || !hasActiveChanges}
					>
						{isSaving ? 'Saving...' : 'Save Configuration'}
					</Button>
					<Button appearance="default" onClick={() => { setRepositories(baselineRepositories); setCurrentPage(1); }} isDisabled={!hasActiveChanges}>
						Cancel
					</Button>
				</Flex>
			</Box>
		</>
	);
}
