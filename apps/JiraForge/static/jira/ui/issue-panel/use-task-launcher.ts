import { useMemo } from 'react';
import { invoke } from '@forge/bridge';
import { MockTaskLauncher } from './mock-task-launcher';
import { RemoteTaskLauncher } from './remote-task-launcher';
import { TaskLauncher } from './task-launcher';

type UseTaskLauncherDeps = {
	invoke?: (functionName: string, payload?: Record<string, unknown>) => Promise<unknown>;
	invokeRemote?: (args: {
		path: string;
		method?: string;
		headers?: Record<string, string>;
		body?: string;
	}) => Promise<unknown>;
};

type LauncherMode = 'mock' | 'remote';

type UseTaskLauncherOptions = {
	mode?: LauncherMode;
	deps?: UseTaskLauncherDeps;
};

export function useTaskLauncher(options?: UseTaskLauncherOptions): TaskLauncher {
	const mode = options?.mode ?? 'mock';
	const deps = options?.deps;

	return useMemo(() => {
		if (mode === 'remote') {
			return new RemoteTaskLauncher({
				invoke: deps?.invoke ?? invoke,
				invokeRemote: deps?.invokeRemote,
			});
		}

		return new MockTaskLauncher({
			invoke: deps?.invoke ?? invoke,
			invokeRemote: deps?.invokeRemote,
		});
	}, [mode, deps]);
}
