import React, { useState } from 'react';
import { invoke } from '@forge/bridge';
import Button from '@atlaskit/button';
import { Box, Flex, xcss } from '@atlaskit/primitives';
import { useResolvedContext } from '../shared/useResolvedContext';
import '@atlaskit/css-reset';

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
	fontFamily:
		'var(--ds-font-family-body, "Atlassian Sans", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif)',
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

function resolveRepoUrlFromContext(context: any): string {
	const extension = context?.extension ?? {};
	const issue = extension?.issue ?? {};
	const fields = issue?.fields ?? {};

	const candidates = [
		extension.repoUrl,
		extension.repositoryUrl,
		issue.repoUrl,
		issue.repositoryUrl,
		fields.repoUrl,
		fields.repositoryUrl,
		fields.customfield_repoUrl,
		fields.customfield_repositoryUrl,
	];

	for (const value of candidates) {
		if (typeof value === 'string' && value.trim()) {
			return value.trim();
		}
	}

	throw new Error('Missing repoUrl in Forge context. Configure a repository URL on the issue context before starting development.');
}

export function IssuePanelPage() {
	const { context, isLoading: isContextLoading, error: contextError } = useResolvedContext();
	const [isStarting, setIsStarting] = useState(false);
	const [status, setStatus] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	async function handleStart() {
		setIsStarting(true);
		setStatus(null);
		setError(null);

		try {
			if (!context) {
				throw new Error(contextError || 'Forge context has not been resolved yet.');
			}

			const issue = normalizeIssueFromContext(context);
			const repoUrl = resolveRepoUrlFromContext(context);

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
