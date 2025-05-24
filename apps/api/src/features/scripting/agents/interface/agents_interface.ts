import { ActionData, ShellScripting, AgentIO } from '../../interfaces/agents';

type AgentMemory<T> = {
    // Memory management
    memory: T,
    insert: (io: AgentIO, mem: T) => void;
    clear: () => boolean;
}

export interface ShellAgentInterface extends AgentMemory<AgentIO[]> {
    // Agent Skills
    find: (input: string) => Promise<ActionData | null>,
    create: (input: string) => Promise<ActionData | null>,
    deleteAndUpdate: (input: string) => Promise<ActionData | null>
}

export type Agent<A> = {
    // Agent Router
    router: (input: string) => Promise<ShellScripting | null>,
    agent: A
}

