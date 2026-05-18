import React, { useEffect, useState } from 'react';
import { invoke, showFlag } from '@forge/bridge';
import Button from '@atlaskit/button/new';
import SectionMessage from '@atlaskit/section-message';
import { Box, Flex, xcss } from '@atlaskit/primitives';
import { setGlobalTheme } from '@atlaskit/tokens';
import { useResolvedContext } from '../shared/useResolvedContext';

import '@atlaskit/css-reset';

type Repository = {
	id: string;
	name: string;
	url: string;
	source: string;
	selected: boolean;
};

const REPOSITORY_NOT_CONFIGURED_MESSAGE =
	'Ask your project admin to configure the code repository for this Jira project in OliverAI Project Settings.';

type JiraIssuePayload = {
	id: string;
	key: string;
	fields: {
		summary: string;
		description: unknown;
		issuetype: {
			id?: string;
			name?: string;
		} | null;
	};
};

const panelStyles = xcss({
	padding: 'space.200',
	alignItems: 'start',
});

const statusTextStyles = xcss({
	color: 'color.text.success',
});

const errorTextStyles = xcss({
	color: 'color.text.danger',
});

function normalizeIssueFromContext(context: any): JiraIssuePayload {
	const issue = context?.extension?.issue ?? {};
	const issueFields = issue?.fields ?? {};

	const issueId = String(issue.id ?? issue.issueId ?? '').trim();
	const issueKey = String(issue.key ?? '').trim();
	const summary = String(issueFields.summary ?? issue.summary ?? issue.title ?? '').trim();
	const description = issueFields.description ?? issue.description ?? null;

	const issueType = issueFields.issuetype ?? issue.issuetype ?? null;

	if (!issueId || !issueKey || !summary) {
		throw new Error('Missing issue details in Forge context. Expected issue id, key, and summary.');
	}

	return {
		id: issueId,
		key: issueKey,
		fields: {
			summary,
			description,
			issuetype: issueType
				? {
					id: issueType.id,
					name: issueType.name,
				}
				: null,
		},
	};
}

function resolveProjectIdOrKeyFromContext(context: any): string {
	const project = context?.extension?.project;
	if (project?.id) return String(project.id);
	if (project?.key) return String(project.key);
	throw new Error('Missing project context. Could not resolve project id or key.');
}

function resolveRepoUrlFromProjectRepositories(repositories: Repository[]): string {
	const selected = repositories.find((repo) => repo?.selected !== false && typeof repo?.url === 'string' && repo.url.trim());
	if (selected) {
		return selected.url.trim();
	}

	const fallback = repositories.find((repo) => typeof repo?.url === 'string' && repo.url.trim());
	if (fallback) {
		return fallback.url.trim();
	}

	throw new Error('No repository URL found in project configuration.');
}

export function IssuePanelPage() {
	const { context, isLoading: isContextLoading, error: contextError } = useResolvedContext();
	const [isStarting, setIsStarting] = useState(false);
	const [status, setStatus] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isRepositoryConfigured, setIsRepositoryConfigured] = useState<boolean | null>(null);

	useEffect(() => {
		setGlobalTheme({ colorMode: 'light', dark: 'dark', light: 'light', spacing: 'spacing' });
	}, []);

	useEffect(() => {
		let isMounted = true;

		async function loadRepositoryConfiguration() {
			if (isContextLoading || contextError) {
				return;
			}

			if (!context) {
				setIsRepositoryConfigured(null);
				return;
			}

			try {
				const projectIdOrKey = resolveProjectIdOrKeyFromContext(context);
				const configuredRepositories = (await invoke('getProjectRepositories', { projectIdOrKey })) as Repository[];

				if (!isMounted) {
					return;
				}

				setIsRepositoryConfigured(Array.isArray(configuredRepositories) && configuredRepositories.length > 0);
			} catch {
				if (!isMounted) {
					return;
				}

				setIsRepositoryConfigured(null);
			}
		}

		loadRepositoryConfiguration();

		return () => {
			isMounted = false;
		};
	}, [context, isContextLoading, contextError]);

	async function handleStart() {
		setIsStarting(true);
		setStatus(null);
		setError(null);

		try {
			if (!context) {
				throw new Error(contextError || 'Forge context has not been resolved yet.');
			}

			const projectIdOrKey = resolveProjectIdOrKeyFromContext(context);
			const configuredRepositories = (await invoke('getProjectRepositories', { projectIdOrKey })) as Repository[];
			if (!Array.isArray(configuredRepositories) || configuredRepositories.length === 0) {
				showFlag({
					id: `repository-not-configured-${projectIdOrKey}`,
					title: 'Repository not configured',
					description: REPOSITORY_NOT_CONFIGURED_MESSAGE,
					type: 'warning',
					isAutoDismiss: true,
				});
				setIsRepositoryConfigured(false);
				return;
			}

			setIsRepositoryConfigured(true);

			const issue = normalizeIssueFromContext(context);
			const repoUrl = resolveRepoUrlFromProjectRepositories(configuredRepositories);

			await invoke('startTaskDevelopment', {
				repoUrl,
				webhookEvent: 'jira:issue_created',
				issue,
			});

			setStatus('Task started successfully.');
		} catch (e: any) {
			setError(e?.message || 'Failed to start task development.');
		} finally {
			setIsStarting(false);
		}
	}

	return (
		<Flex direction="column" gap="space.100" xcss={panelStyles}>
			{isRepositoryConfigured === false && (
				<Box style={{ width: '100%' }}>
					<SectionMessage title="Repository not configured" appearance="warning">
						{REPOSITORY_NOT_CONFIGURED_MESSAGE}
					</SectionMessage>
				</Box>
			)}

			<Button
				appearance="primary"
				onClick={handleStart}
				isDisabled={isStarting || isContextLoading || !!contextError}
			>
				{isStarting ? 'Starting...' : 'Develop with Oliver AI'}
			</Button>

			{isContextLoading && <Box as="p">Resolving issue context...</Box>}
			{contextError && (
				<Box as="p" xcss={errorTextStyles}>
					{contextError}
				</Box>
			)}

			{status && (
				<Box as="p" xcss={statusTextStyles}>
					{status}
				</Box>
			)}
			{error && (
				<Box as="p" xcss={errorTextStyles}>
					{error}
				</Box>
			)}
		</Flex>
	);
}
