import React from 'react';
import { RepositoryResult } from './repository-finder';

export function GitHubIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 16 16" fill="#24292e" aria-label="GitHub">
			<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
		</svg>
	);
}

export function GitLabIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 380 380" fill="none" aria-label="GitLab">
			<path d="M190 340.1L264.5 109H115.5L190 340.1z" fill="#e24329" />
			<path d="M190 340.1L115.5 109H20.9L190 340.1z" fill="#fc6d26" />
			<path d="M20.9 109L4.2 160.7a11.5 11.5 0 004.2 12.9L190 340.1 20.9 109z" fill="#fca326" />
			<path d="M20.9 109h94.6L73.8 22.7c-1.7-5.2-9-5.2-10.7 0L20.9 109z" fill="#e24329" />
			<path d="M190 340.1L264.5 109H359L190 340.1z" fill="#fc6d26" />
			<path d="M359 109l16.7 51.7a11.5 11.5 0 01-4.2 12.9L190 340.1 359 109z" fill="#fca326" />
			<path d="M359 109h-94.6l41.7-86.3c1.7-5.2 9-5.2 10.7 0L359 109z" fill="#e24329" />
		</svg>
	);
}

export function BitbucketIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 32 32" fill="none" aria-label="Bitbucket">
			<path
				d="M2.117 2A1.1 1.1 0 001 3.222l4.37 25.602A1.494 1.494 0 006.844 30h18.573a1.1 1.1 0 001.1-.924L30.887 3.227A1.1 1.1 0 0029.77 2H2.117zm17.362 19.003h-6.957l-1.878-9.81h10.472l-1.637 9.81z"
				fill="#2684ff"
			/>
		</svg>
	);
}

export function SourceAvatar({ source }: { source: RepositoryResult['source'] }) {
	const bg: Record<RepositoryResult['source'], string> = {
		github: '#f6f8fa',
		gitlab: '#fafafa',
		bitbucket: '#f4f5f7',
	};
	return (
		<span
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				justifyContent: 'center',
				width: '24px',
				height: '24px',
				borderRadius: '4px',
				background: bg[source],
				border: '1px solid #e0e0e0',
				flexShrink: 0,
			}}
		>
			{source === 'github' && <GitHubIcon />}
			{source === 'gitlab' && <GitLabIcon />}
			{source === 'bitbucket' && <BitbucketIcon />}
		</span>
	);
}
