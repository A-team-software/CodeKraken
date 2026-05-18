import React, { useCallback, useState } from 'react';
import { showFlag } from '@forge/bridge';
import Button from '@atlaskit/button/new';
import SectionMessage from '@atlaskit/section-message';
import { Box, Flex, xcss } from '@atlaskit/primitives';
import { useResolvedContext } from '../shared/useResolvedContext';
import { useTaskLauncher } from './use-task-launcher';
import { useRepositoryConfigManager } from './use-repository-config-manager';
import { useIssuePanelTheme } from './use-issue-panel-theme';
import { useContextErrorFlag } from './use-context-error-flag';
import { useRepositoryConfigurationStatus } from './use-repository-configuration-status';
import { useIssuePanelHandleStart } from './use-issue-panel-handle-start';

import '@atlaskit/css-reset';

const REPOSITORY_NOT_CONFIGURED_MESSAGE =
	'Ask your project admin to configure the code repository for this Jira project in OliverAI Project Settings.';

const panelStyles = xcss({
	padding: 'space.200',
	alignItems: 'start',
});

const statusTextStyles = xcss({
	color: 'color.text.success',
});

export function IssuePanelPage() {
	const { context, isLoading: isContextLoading, error: contextError } = useResolvedContext();
	const taskLauncher = useTaskLauncher();
	const repositoryConfigManager = useRepositoryConfigManager();
	const [isStarting, setIsStarting] = useState(false);
	const [status, setStatus] = useState<string | null>(null);
	const [isRepositoryConfigured, setIsRepositoryConfigured] = useState<boolean | null>(null);

	const showErrorFlag = useCallback((message: string) => {
		showFlag({
			id: `issue-panel-error-${Date.now()}`,
			title: 'Operation failed',
			description: message,
			type: 'error',
			isAutoDismiss: true,
		});
	}, []);

	useIssuePanelTheme();
	useContextErrorFlag(contextError, showErrorFlag);
	useRepositoryConfigurationStatus({
		context,
		isContextLoading,
		contextError,
		repositoryConfigManager,
		setIsRepositoryConfigured,
		showErrorFlag,
	});

	const handleStart = useIssuePanelHandleStart({
		context,
		contextError,
		taskLauncher,
		repositoryConfigManager,
		setIsStarting,
		setStatus,
		setIsRepositoryConfigured,
		showErrorFlag,
	});

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

			{status && (
				<Box as="p" xcss={statusTextStyles}>
					{status}
				</Box>
			)}
		</Flex>
	);
}
