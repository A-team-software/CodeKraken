import React, { useState, useRef } from 'react';
import { MockRepositoryFinder, RepositoryResult } from './repository-finder';
import { SourceAvatar } from './source-avatar';

const finder = new MockRepositoryFinder();

type Props = {
	onSelect: (repo: RepositoryResult) => void;
};

export function RepositoryAutocomplete({ onSelect }: Props) {
	const [query, setQuery] = useState('');
	const [results, setResults] = useState<RepositoryResult[]>([]);
	const [isOpen, setIsOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	const handleChange = (value: string) => {
		setQuery(value);
		if (debounceRef.current) clearTimeout(debounceRef.current);

		if (!value.trim()) {
			setResults([]);
			setIsOpen(false);
			return;
		}

		setIsLoading(true);
		debounceRef.current = setTimeout(async () => {
			const found = await finder.search(value);
			setResults(found);
			setIsOpen(true);
			setIsLoading(false);
		}, 200);
	};

	const handleSelect = (repo: RepositoryResult) => {
		onSelect(repo);
		setQuery('');
		setResults([]);
		setIsOpen(false);
	};

	const handleBlur = () => {
		setTimeout(() => setIsOpen(false), 150);
	};

	return (
		<div ref={containerRef} style={{ position: 'relative', flex: 1 }}>
			<input
				type="text"
				placeholder="Search repositories across GitHub, GitLab and Bitbucket…"
				value={query}
				onChange={(e) => handleChange(e.currentTarget.value)}
				onFocus={() => results.length > 0 && setIsOpen(true)}
				onBlur={handleBlur}
				style={{
					width: '100%',
					padding: '8px 10px',
					border: '2px solid var(--ds-border-input, #ccc)',
					borderRadius: '3px',
					fontFamily: 'inherit',
					fontSize: '14px',
					boxSizing: 'border-box',
					outline: 'none',
				}}
			/>

			{isOpen && (
				<div
					style={{
						position: 'absolute',
						top: '100%',
						left: 0,
						right: 0,
						background: 'var(--ds-surface-overlay, #fff)',
						border: '1px solid var(--ds-border, #ccc)',
						borderRadius: '3px',
						boxShadow: '0 4px 8px rgba(0,0,0,.12)',
						zIndex: 100,
						maxHeight: '300px',
						overflowY: 'auto',
					}}
				>
					{isLoading ? (
						<div style={{ padding: '12px 16px', color: 'var(--ds-text-subtlest, #888)', fontSize: '13px' }}>
							Searching…
						</div>
					) : results.length === 0 ? (
						<div style={{ padding: '12px 16px', color: 'var(--ds-text-subtlest, #888)', fontSize: '13px' }}>
							No repositories found.
						</div>
					) : (
						results.map((repo) => (
							<button
								key={repo.id}
								onMouseDown={() => handleSelect(repo)}
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: '10px',
									width: '100%',
									padding: '10px 14px',
									background: 'none',
									border: 'none',
									borderBottom: '1px solid var(--ds-border-subtle, #f0f0f0)',
									cursor: 'pointer',
									textAlign: 'left',
									fontFamily: 'inherit',
								}}
								onMouseEnter={(e) => {
									(e.currentTarget as HTMLButtonElement).style.background =
										'var(--ds-background-neutral-subtle-hovered, #f4f5f7)';
								}}
								onMouseLeave={(e) => {
									(e.currentTarget as HTMLButtonElement).style.background = 'none';
								}}
							>
								<SourceAvatar source={repo.source} />
								<div style={{ flex: 1, minWidth: 0 }}>
									<div
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
									</div>
									<div
										style={{
											fontSize: '12px',
											color: 'var(--ds-text-subtlest, #6b778c)',
											overflow: 'hidden',
											textOverflow: 'ellipsis',
											whiteSpace: 'nowrap',
										}}
									>
										{repo.url}
									</div>
								</div>
							</button>
						))
					)}
				</div>
			)}
		</div>
	);
}
