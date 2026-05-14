import React, { useState } from 'react';
import Button from '@atlaskit/button';
import { RepositoryResult } from './repository-finder';
import { SourceAvatar } from './source-avatar';

export const PAGE_SIZE = 5;

export type Repository = {
	id: string;
	name: string;
	url: string;
	source: RepositoryResult['source'];
	selected: boolean;
};

// ─── Delete icon ─────────────────────────────────────────────────────────────

function TrashIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
			<path d="M2 4a1 1 0 011-1h10a1 1 0 011 1v1H2V4zm1.5 3h9v8a2 2 0 01-2 2h-5a2 2 0 01-2-2V7zM7 9a1 1 0 00-1 1v4a1 1 0 102 0v-4a1 1 0 00-1-1zm2 0a1 1 0 00-1 1v4a1 1 0 102 0v-4a1 1 0 00-1-1z" />
		</svg>
	);
}

// ─── Single repository row ────────────────────────────────────────────────────

type RepositoryRowProps = {
	repo: Repository;
	onToggle: (id: string) => void;
	onRemove: (id: string) => void;
};

function RepositoryRow({ repo, onToggle, onRemove }: RepositoryRowProps) {
	const [hovered, setHovered] = useState(false);
	const [confirming, setConfirming] = useState(false);

	return (
		<div
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				position: 'relative',
				borderBottom: '1px solid var(--ds-border-subtle, #f0f0f0)',
				borderRadius: '3px',
				background: hovered ? 'var(--ds-background-neutral-subtle-hovered, #f4f5f7)' : 'transparent',
				transition: 'background 0.1s ease',
			}}
		>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: '10px',
					padding: '10px 12px',
				}}
			>
				<input
					type="checkbox"
					checked={repo.selected}
					onChange={() => onToggle(repo.id)}
					id={repo.id}
					style={{ flexShrink: 0, cursor: 'pointer' }}
				/>
				<SourceAvatar source={repo.source} />
				<label
					htmlFor={repo.id}
					style={{
						flex: 1,
						cursor: 'pointer',
						display: 'flex',
						flexDirection: 'column',
						gap: '2px',
						minWidth: 0,
					}}
				>
					<span
						style={{
							fontWeight: 500,
							fontSize: '14px',
							color: 'var(--ds-text, #172b4d)',
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							whiteSpace: 'nowrap',
						}}
					>
						{repo.name}
					</span>
					<span
						style={{
							fontSize: '12px',
							color: 'var(--ds-text-subtlest, #6b778c)',
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							whiteSpace: 'nowrap',
						}}
					>
						{repo.url}
					</span>
				</label>
				<Button
					appearance="subtle"
					onClick={() => setConfirming(true)}
					spacing="compact"
					iconBefore={<TrashIcon />}
				>
					Delete
				</Button>
			</div>

			{confirming && (
				<>
					{/* Backdrop to dismiss on outside click */}
					<div
						onClick={() => setConfirming(false)}
						style={{
							position: 'fixed',
							inset: 0,
							zIndex: 49,
						}}
					/>
					<div
						style={{
							position: 'absolute',
							top: '100%',
							right: 0,
							background: 'var(--ds-surface-overlay, #fff)',
							border: '1px solid var(--ds-border, #ddd)',
							borderRadius: '4px',
							boxShadow: '0 8px 16px rgba(0,0,0,0.16)',
							padding: '14px 16px',
							zIndex: 50,
							minWidth: '240px',
							display: 'flex',
							flexDirection: 'column',
							gap: '10px',
						}}
					>
						<p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--ds-text, #172b4d)' }}>
							Remove repository?
						</p>
						<p style={{ margin: 0, fontSize: '13px', color: 'var(--ds-text-subtle, #44546f)' }}>
							<strong>{repo.name}</strong> will be removed from this project's configuration.
						</p>
						<div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
							<Button appearance="subtle" onClick={() => setConfirming(false)} spacing="compact">
								Cancel
							</Button>
							<Button appearance="danger" onClick={() => onRemove(repo.id)} spacing="compact">
								Remove
							</Button>
						</div>
					</div>
				</>
			)}
		</div>
	);
}

// ─── Repository list with pagination ─────────────────────────────────────────

export type RepositoryListProps = {
	repositories: Repository[];
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
	onToggle: (id: string) => void;
	onRemove: (id: string) => void;
};

export function RepositoryList({
	repositories,
	currentPage,
	totalPages,
	onPageChange,
	onToggle,
	onRemove,
}: RepositoryListProps) {
	if (repositories.length === 0) {
		return (
			<p style={{ margin: 0, fontSize: '14px', color: 'var(--ds-text-subtlest, #6b778c)' }}>
				No repositories added yet. Search above to get started.
			</p>
		);
	}

	const paged = repositories.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

	return (
		<div>
			{paged.map((repo) => (
				<RepositoryRow key={repo.id} repo={repo} onToggle={onToggle} onRemove={onRemove} />
			))}

			{totalPages > 1 && (
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						paddingTop: '12px',
						marginTop: '4px',
					}}
				>
					<span style={{ fontSize: '13px', color: 'var(--ds-text-subtlest, #6b778c)' }}>
						Page {currentPage} of {totalPages} &middot; {repositories.length} total
					</span>
					<div style={{ display: 'flex', gap: '4px' }}>
						<Button
							appearance="subtle"
							onClick={() => onPageChange(currentPage - 1)}
							isDisabled={currentPage === 1}
							spacing="compact"
						>
							← Previous
						</Button>
						<Button
							appearance="subtle"
							onClick={() => onPageChange(currentPage + 1)}
							isDisabled={currentPage === totalPages}
							spacing="compact"
						>
							Next →
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
