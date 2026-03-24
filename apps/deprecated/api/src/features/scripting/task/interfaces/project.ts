
/**
 * Represents the structural metadata of a project including directory layout,
 * file organization, and technology stack information.
 * Used by AI agents to understand project scope and navigate the codebase.
 */
export interface ProjectStructure {
    /** Root directory path of the project */
    rootPath: string;

    /** Directory tree structure as a string (from ls -lR or tree command) */
    directoryTree: string;

    /** Primary technology stack of the project */
    techStack: string[];

    /** Source code root directory (e.g., 'src', 'packages/core', 'apps/api/src') */
    srcRootPath: string;

    /** Key directories identified in the project */
    keyDirectories: KeyDirectory[];

    /** Configuration files found in the project */
    configFiles: ConfigFile[];

    /** Package/dependency information */
    packageInfo: PackageInfo;

    /** Build and script commands available */
    buildScripts: BuildScript[];

    /** File extensions commonly used in this project */
    fileExtensions: string[];

    /** Main entry points identified */
    entryPoints: EntryPoint[];

    /** Monorepo structure if applicable */
    monorepoInfo?: MonorepoInfo;

    /** Metadata about the scan */
    scanMetadata: ScanMetadata;
}

/**
 * Represents a significant directory in the project structure
 */
export interface KeyDirectory {
    /** Relative path from project root */
    path: string;

    /** Type of directory (src, tests, config, etc.) */
    type: 'src' | 'tests' | 'config' | 'docs' | 'build' | 'scripts' | 'assets' | 'other';

    /** Brief description of what this directory contains */
    description?: string;

    /** Number of files in this directory (approximate) */
    fileCount?: number;
}

/**
 * Represents configuration files in the project
 */
export interface ConfigFile {
    /** File name (e.g., 'package.json', 'tsconfig.json') */
    name: string;

    /** Relative path from project root */
    path: string;

    /** Type of configuration */
    configType: 'package' | 'typescript' | 'build' | 'lint' | 'env' | 'docker' | 'ci' | 'other';

    /** Parsed content (if applicable and safe to expose) */
    content?: Record<string, any>;
}

/**
 * Package/dependency information
 */
export interface PackageInfo {
    /** Package manager used (npm, yarn, pnpm, etc.) */
    packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun' | 'unknown';

    /** Package name */
    name?: string;

    /** Package version */
    version?: string;

    /** Main entry file */
    main?: string;

    /** Number of dependencies */
    dependencyCount?: number;

    /** Number of dev dependencies */
    devDependencyCount?: number;

    /** List of key dependencies relevant to AI understanding */
    keyDependencies?: string[];
}

/**
 * Build and script commands available in the project
 */
export interface BuildScript {
    /** Script name (e.g., 'build', 'dev', 'test') */
    name: string;

    /** Command to execute */
    command: string;

    /** Description of what the script does */
    description?: string;
}

/**
 * Entry point or main file in the project
 */
export interface EntryPoint {
    /** File path relative to project root */
    filePath: string;

    /** Type of entry point */
    type: 'main' | 'server' | 'client' | 'cli' | 'library' | 'other';

    /** Language/extension */
    language: string;
}

/**
 * Information about monorepo structure if applicable
 */
export interface MonorepoInfo {
    /** Monorepo type (yarn, lerna, pnpm, nx, other) */
    type: 'yarn' | 'lerna' | 'pnpm' | 'nx' | 'turborepo' | 'other';

    /** List of workspace/package paths */
    workspaces: string[];

    /** Root configuration file path */
    configPath: string;
}

/**
 * Metadata about the structure scan
 */
export interface ScanMetadata {
    /** When the scan was performed */
    scannedAt: Date;

    /** Total files counted */
    totalFiles: number;

    /** Total directories counted */
    totalDirectories: number;

    /** Approximate project size in MB */
    sizeInMB?: number;

    /** Scan duration in milliseconds */
    scanDurationMs: number;

    /** Any warnings or issues encountered during scan */
    warnings?: string[];
}
