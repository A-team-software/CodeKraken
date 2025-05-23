import { ActionData, ShellScripting, AgentIO } from '../../interfaces/agents';



type ShellScriptingAgentInterface = {
    // Memory management
    memory: AgentIO[],
    insert: (io: AgentIO, mem: AgentIO[]) => void;
    clear: () => boolean;

    // Agent Router
    router: (input: string) => Promise<ShellScripting | null>,

    // Agent Skills
    find: (input: string) => Promise<ActionData | null>,
    create: (input: string) => Promise<ActionData | null>,
    deleteAndUpdate: (input: string) => Promise<ActionData | null>
}


export default ShellScriptingAgentInterface;
