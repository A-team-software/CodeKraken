import React, { useState, useCallback } from 'react';
import { invoke } from '@forge/bridge';
import Button from '@atlaskit/button';
import { Box, Flex, xcss } from '@atlaskit/primitives';
import Flag, { FlagGroup } from '@atlaskit/flag';
import ErrorIcon from '@atlaskit/icon/glyph/error';
import SuccessIcon from '@atlaskit/icon/glyph/check-circle';
import InfoIcon from '@atlaskit/icon/glyph/info';
import { useProjectDetails } from '../shared/useProjectDetails';
import { RepositoryResult } from './repository-finder';
import { RepositoryAutocomplete } from './repository-autocomplete';
import { RepositoryList, Repository, PAGE_SIZE } from './repository-list';
import '@atlaskit/css-reset';

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

type AppFlag = {
	id: string;
	title: string;
	description?: string;
	type: 'error' | 'success' | 'info' | 'warning';
};

// ─── Component ──────────────────────────────────────────────────────────────────────────

export function ProjectConfigPage() {
	const { project, isLoading: isContextLoading, error: contextError } = useProjectDetails();
	const [repositories, setRepositories] = useState<Repository[]>([]);
	const [baselineRepositories, setBaselineRepositories] = useState<Repository[]>([]);
	const [isSaving, setIsSaving] = useState(false);
	const [flags, setFlags] = useState<AppFlag[]>([]);
	const [currentPage, setCurrentPage] = useState(1);

	const projectKey = project.key;
	const projectName = project.name;
	const projectIconUrl = project.iconUrl;

	const addFlag = useCallback(
		(title: string, description: string | undefined, type: AppFlag['type']) => {
			const id = `flag-${Date.now()}`;
			setFlags((prev) => [...prev, { id, title, description, type }]);
			setTimeout(() => setFlags((prev) => prev.filter((f) => f.id !== id)), 6000);
		},
		[],
	);

	const removeFlag = useCallback((id: string | number) => {
		setFlags((prev) => prev.filter((f) => f.id !== String(id)));
	}, []);

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

	const handleSave = async () => {
		setIsSaving(true);
		try {
			if (!projectKey) throw new Error('Project key not found in context.');

			const selectedRepos = repositories.filter((r) => r.selected).map((r) => r.url);
			if (selectedRepos.length === 0) throw new Error('Please select at least one repository.');

			await invoke('saveProjectRepositories', { projectKey, repositories: selectedRepos });
			setBaselineRepositories(repositories);
			addFlag('Configuration Saved', `Successfully saved ${selectedRepos.length} repository(ies) for project ${projectKey}.`, 'success');
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

	return (
		<Box xcss={containerStyles}>
			<FlagGroup onDismissed={removeFlag}>
				{flags.map((flag) => (
					<Flag
						key={flag.id}
						id={flag.id}
						icon={
							flag.type === 'error' ? (
								<ErrorIcon label="Error" primaryColor="red" />
							) : flag.type === 'success' ? (
								<SuccessIcon label="Success" primaryColor="green" />
							) : (
								<InfoIcon label="Info" primaryColor="blue" />
							)
						}
						title={flag.title}
						description={flag.description}
					/>
				))}
			</FlagGroup>

			<Box xcss={headingStyles}>Project Repository Configuration</Box>

			{isContextLoading && (
				<Flag
					id="loading-flag"
					icon={<InfoIcon label="Loading" primaryColor="blue" />}
					title="Loading project context..."
				/>
			)}

			{contextError && (
				<Flag
					id="context-error-flag"
					icon={<ErrorIcon label="Error" primaryColor="red" />}
					title="Failed to load project context"
					description={contextError}
				/>
			)}

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
				<Box as="label" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
					Add Repository
				</Box>
				<RepositoryAutocomplete onSelect={handleAddRepository} />
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
					isDisabled={isSaving || isContextLoading || repositories.length === 0 || selectedCount === 0}
				>
					{isSaving ? 'Saving...' : 'Save Configuration'}
				</Button>
				<Button appearance="default" onClick={() => window.history.back()} isDisabled={!hasActiveChanges}>
					Cancel
				</Button>
			</Flex>
		</Box>
	);
}
