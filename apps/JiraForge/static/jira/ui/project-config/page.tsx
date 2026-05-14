import React, { useState, useCallback } from 'react';
import { invoke } from '@forge/bridge';
import Button from '@atlaskit/button';
import { Box, Flex, xcss } from '@atlaskit/primitives';
import { useProjectDetails } from '../shared/useProjectDetails';
import Flag, { FlagGroup } from '@atlaskit/flag';
import ErrorIcon from '@atlaskit/icon/glyph/error';
import SuccessIcon from '@atlaskit/icon/glyph/check-circle';
import InfoIcon from '@atlaskit/icon/glyph/info';
import '@atlaskit/css-reset';

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

const repositoryItemStyles = xcss({
	padding: 'space.100',
	display: 'flex',
	alignItems: 'center',
	gap: 'space.100',
	borderBottom: '1px solid var(--ds-border-neutral-subtle)',
});

const statusTextStyles = xcss({
	color: 'color.text.success',
	marginTop: 'space.100',
});

const errorTextStyles = xcss({
	color: 'color.text.danger',
	marginTop: 'space.100',
});

const warningTextStyles = xcss({
	color: 'color.text.warning',
	marginTop: 'space.100',
});

const inputStyles = xcss({
	marginBottom: 'space.200',
});

const buttonGroupStyles = xcss({
	display: 'flex',
	gap: 'space.100',
	marginTop: 'space.200',
});

type Repository = {
	id: string;
	url: string;
	selected: boolean;
};

type Flag = {
	id: string;
	title: string;
	description?: string;
	type: 'error' | 'success' | 'info' | 'warning';
};

export function ProjectConfigPage() {
	const { project, isLoading: isContextLoading, error: contextError } = useProjectDetails();
	const [repositories, setRepositories] = useState<Repository[]>([]);
	const [baselineRepositories, setBaselineRepositories] = useState<Repository[]>([]);
	const [newRepoUrl, setNewRepoUrl] = useState('');
	const [isSaving, setIsSaving] = useState(false);
	const [flags, setFlags] = useState<Flag[]>([]);

	const projectKey = project.key;
	const projectName = project.name;
	const projectIconUrl = project.iconUrl;

	const addFlag = useCallback((title: string, description: string | undefined, type: 'error' | 'success' | 'info' | 'warning') => {
		const id = `flag-${Date.now()}`;
		setFlags((prev) => [...prev, { id, title, description, type }]);

		// Auto-remove flags after 6 seconds
		setTimeout(() => {
			setFlags((prev) => prev.filter((f) => f.id !== id));
		}, 6000);
	}, []);

	const removeFlag = useCallback((id: string) => {
		setFlags((prev) => prev.filter((f) => f.id !== id));
	}, []);

	const handleAddRepository = () => {
		const url = newRepoUrl.trim();

		if (!url) {
			addFlag('Repository URL Required', 'Please enter a valid repository URL.', 'error');
			return;
		}

		if (repositories.some((repo) => repo.url === url)) {
			addFlag('Duplicate Repository', 'This repository has already been added.', 'error');
			return;
		}

		setRepositories((prev) => [
			...prev,
			{
				id: `repo-${Date.now()}`,
				url,
				selected: true,
			},
		]);

		setNewRepoUrl('');
	};

	const handleToggleRepository = (id: string) => {
		setRepositories((prev) => prev.map((repo) => (repo.id === id ? { ...repo, selected: !repo.selected } : repo)));
	};

	const handleRemoveRepository = (id: string) => {
		setRepositories((prev) => prev.filter((repo) => repo.id !== id));
	};

	const handleSave = async () => {
		setIsSaving(true);

		try {
			if (!projectKey) {
				throw new Error('Project key not found in context.');
			}

			const selectedRepos = repositories.filter((repo) => repo.selected).map((repo) => repo.url);

			if (selectedRepos.length === 0) {
				throw new Error('Please select at least one repository.');
			}

			await invoke('saveProjectRepositories', {
				projectKey,
				repositories: selectedRepos,
			});

			setBaselineRepositories(repositories);
			addFlag(
				'Configuration Saved',
				`Successfully saved ${selectedRepos.length} repository(ies) for project ${projectKey}.`,
				'success'
			);
		} catch (e: any) {
			addFlag('Save Failed', e?.message || 'Failed to save repositories.', 'error');
		} finally {
			setIsSaving(false);
		}
	};

	const serializeRepositories = (list: Repository[]) =>
		JSON.stringify(
			list.map((repo) => ({
				url: repo.url,
				selected: repo.selected,
			}))
		);

	const selectedCount = repositories.filter((repo) => repo.selected).length;
	const hasActiveChanges =
		newRepoUrl.trim().length > 0 || serializeRepositories(repositories) !== serializeRepositories(baselineRepositories);

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
				<Box as="label">Add Repository URL</Box>
				<Flex gap="space.100" xcss={inputStyles}>
					<input
						type="text"
						placeholder="https://github.com/owner/repo"
						value={newRepoUrl}
						onChange={(e) => setNewRepoUrl(e.currentTarget.value)}
						onKeyPress={(e) => {
							if (e.key === 'Enter') {
								handleAddRepository();
							}
						}}
						style={{
							padding: '8px',
							border: '1px solid #cccccc',
							borderRadius: '3px',
							flex: 1,
							fontFamily: 'inherit',
						}}
					/>
					<Button appearance="primary" onClick={handleAddRepository}>
						Add
					</Button>
				</Flex>
			</Box>

			<Box xcss={sectionStyles}>
				<Box as="label">Selected Repositories ({selectedCount})</Box>
				<Box xcss={repositoriesListStyles}>
					{repositories.length === 0 ? (
						<Box as="p">
							No repositories added yet. Add one above to get started.
						</Box>
					) : (
						repositories.map((repo) => (
							<Flex key={repo.id} xcss={repositoryItemStyles}>
								<input
									type="checkbox"
									checked={repo.selected}
									onChange={() => handleToggleRepository(repo.id)}
									id={repo.id}
									style={{
										marginRight: '8px',
										cursor: 'pointer',
										flexShrink: 0,
									}}
								/>
								<label
									htmlFor={repo.id}
									style={{
										flex: 1,
										wordBreak: 'break-word',
										cursor: 'pointer',
										display: 'flex',
										alignItems: 'center',
									}}
								>
									{repo.url}
								</label>
								<Button
									appearance="subtle"
									onClick={() => handleRemoveRepository(repo.id)}
									spacing="compact"
									iconBefore={
										<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
											<path d="M2 4a1 1 0 011-1h10a1 1 0 011 1v1H2V4zm1.5 3h9v8a2 2 0 01-2 2h-5a2 2 0 01-2-2V7zM7 9a1 1 0 00-1 1v4a1 1 0 102 0v-4a1 1 0 00-1-1zm2 0a1 1 0 00-1 1v4a1 1 0 102 0v-4a1 1 0 00-1-1z" />
										</svg>
									}
								>
									Delete
								</Button>
							</Flex>
						))
					)}
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
