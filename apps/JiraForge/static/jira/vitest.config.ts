import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
	test: {
		globals: true,
		environment: 'jsdom',
		include: ['ui/**/*.test.ts', 'ui/**/*.test.tsx'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			include: ['ui/**/*.ts', 'ui/**/*.tsx'],
			exclude: ['node_modules/', 'ui/**/*.test.ts', 'ui/**/*.test.tsx'],
		},
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './ui'),
		},
	},
});
