import { ActionData, ShellScripting, AgentIO } from '../../interfaces/agents';

export type AgentMemory<T> = {
    // Memory management
    memory?: T,
    insert: (io: AgentIO, mem: T) => void;
    clear: (mem: T) => boolean;
}

export interface ShellAgentInterface extends AgentMemory<AgentIO[]> {
    // Agent Skills
    find: (input: string) => Promise<ActionData | null>,
    create: (input: string) => Promise<ActionData | null>,
    deleteAndUpdate: (input: string) => Promise<ActionData | null>
}

export interface ShellAgentSupervisorInterface<E> {
    // Skills
    inspectAgentMemory: <K>(input: E, instruction: string) => Promise<K | null>,
    sendInstruction: (input: string, instruction: string) => Promise<string | null>,
}

export type Agent<A, S extends unknown> = {
    // Agent Router
    router?: (input: string) => Promise<ShellScripting | null>,
    agent: A
    agentSupervisor?: Agent<A, S>,
}

