import { invoke } from '@forge/bridge';
import { JiraIssueDescription } from './task-launcher';
import { Repository } from './repository-config-manager';

export async function normalizeIssueFromContext(context: any): Promise<JiraIssueDescription> {
	const issue = context?.extension?.issue ?? {};
	const issueFields = issue?.fields ?? {};

	const issueId = String(issue.id ?? issue.issueId ?? '').trim();
	const issueKey = String(issue.key ?? '').trim();
	const summary = String(issueFields.summary ?? issue.summary ?? issue.title ?? '').trim();
	const description = issueFields.description ?? issue.description ?? null;

	const issueType = issueFields.issuetype ?? issue.issuetype ?? null;

	if (!issueId && !issueKey) {
		throw new Error('Missing issue identifier in Forge context. Expected issue id or key.');
	}

	const shouldFetchIssueDetails = !summary || description == null;

	if (shouldFetchIssueDetails) {
		const fetched = (await invoke('getIssueDetails', {
			issueIdOrKey: issueKey || issueId,
		})) as Partial<JiraIssueDescription>;

		const fetchedSummary = String(fetched?.fields?.summary ?? '').trim();
		if (!fetchedSummary) {
			throw new Error('Missing issue summary. Could not resolve issue details from Jira.');
		}

		return {
			id: String(fetched?.id ?? issueId ?? '').trim(),
			key: String(fetched?.key ?? issueKey ?? '').trim(),
			fields: {
				summary: fetchedSummary,
				description: fetched?.fields?.description ?? description,
				issuetype: fetched?.fields?.issuetype ?? (issueType
					? {
						id: issueType.id,
						name: issueType.name,
					}
					: null),
			},
		};
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

export function resolveProjectIdOrKeyFromContext(context: any): string {
	const project = context?.extension?.project;
	if (project?.id) return String(project.id);
	if (project?.key) return String(project.key);
	throw new Error('Missing project context. Could not resolve project id or key.');
}

export function resolveTargetRepositoryUrlsFromProjectRepositories(repositories: Repository[]): string[] {
	const selectedUrls = repositories
		.filter((repo) => repo?.selected !== false && typeof repo?.url === 'string' && repo.url.trim())
		.map((repo) => repo.url.trim());

	if (selectedUrls.length > 0) {
		return selectedUrls;
	}

	const allUrls = repositories
		.filter((repo) => typeof repo?.url === 'string' && repo.url.trim())
		.map((repo) => repo.url.trim());

	if (allUrls.length > 0) {
		return allUrls;
	}

	return [];
}
