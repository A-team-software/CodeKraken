import { type } from "os"; // Assuming you might use OS type somewhere, or just as example import

// Enum for project status for better type safety and clarity
export enum ProjectStatus {
    PLANNING = 'planning',
    ACTIVE = 'active',
    MAINTENANCE = 'maintenance',
    ARCHIVED = 'archived',
}

// Enum for primary coding language/framework to hint at tooling
export enum ProjectTechStack {
    NODE_TS = 'nodejs-typescript',
    PYTHON_FLASK = 'python-flask',
    REACT_VITE = 'react-vite',
    GO_GIN = 'go-gin',
    RUST_AXUM = 'rust-axum',
    JAVA_SPRING = 'java-spring',
    OTHER = 'other',
    UNKNOWN = 'unknown',
}

/**
 * Represents a team's project, linking code repositories and task boards.
 * Designed to facilitate automated processes like cloning, code generation,
 * and task monitoring.
 */
export interface Project {
    /** Unique identifier for the project (e.g., UUID). */
    id: string;

    /** Human-readable name of the project. */
    name: string;

    /** A brief description of the project's purpose. */
    description?: string;

    /** Current status of the project. */
    status: ProjectStatus;

    /** Identifier linking to the Team entity that owns this project. */
    teamId: string;

    /** Optional: Identifier linking to the primary User contact/lead for this project. */
    projectLeadId?: string;

    // --- Code Repository Details (GitHub focused) ---

    /** REQUIRED: Full HTTPS or SSH URL to the primary Git repository (e.g., GitHub, GitLab). */
    gitRepoUrl: string;

    /** The primary branch developers should clone or base feature branches on (e.g., 'main', 'master', 'develop'). */
    defaultBranch: string;

    /** Optional: Specific path within the repository where the main application code resides (e.g., 'src/', 'packages/core-lib'). Useful for monorepos or focused tooling. */
    codeRootPath?: string;

    /** Hints at the primary technology stack, useful for selecting build/generation tools. */
    primaryTechStack: ProjectTechStack;

    /** Optional: Specific commands needed to initialize the project after cloning (e.g., ['npm install', 'npm run bootstrap', 'make setup']). */
    setupCommands?: string[];

    /** Optional: Command to run code generation tasks within this repo (e.g., 'npm run generate:types', './scripts/generate-client.sh'). */
    codeGenCommand?: string;

    // --- Task Management Details (Trello focused) ---

    /** REQUIRED: Full URL to the project's primary Trello board. */
    trelloBoardUrl: string;

    /** Optional: The specific ID of the Trello board (can often be extracted from URL, but useful for direct API calls). */
    trelloBoardId?: string;

    /** Optional: Names or IDs of Trello lists that signify tasks ready for development or action (e.g., ['Ready for Dev', 'To Do', 'Next Up']). Helps focus monitoring. */
    trelloTriggerLists?: string[];

    /** Optional: Names or IDs of Trello labels that identify tasks relevant to specific processes (e.g., ['codegen', 'bug', 'feature-request', 'backend', 'frontend']). */
    trelloRelevantLabels?: string[];

    /** Optional: Trello username or ID of a bot or specific user whose assignments should be monitored (if applicable). */
    trelloMonitoredMemberId?: string;

    // --- Metadata ---

    /** Tags for categorization (e.g., ['internal-tool', 'customer-facing', 'library']). */
    tags?: string[];

    /** Timestamp when the project entity was created. */
    createdAt: Date;

    /** Timestamp when the project entity was last updated. */
    updatedAt: Date;
}
