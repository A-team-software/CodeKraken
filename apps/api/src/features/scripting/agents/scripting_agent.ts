import LLM from '../ai';
import { ActionData, ShellScripting, AgentIO } from '../interfaces/agents';
import { SHELL_SCRIPT_AGENT_INSTRUCTIONS, SHELL_SCRIPT_AGENT_FIND_INSTRUCTIONS, SHELL_SCRIPT_AGENT_CREATE_INSTRUCTIONS, SCRIPTING_AGENT_ROUTER_INSTRUCTIONS } from '../agents_instructions';
import ShellScriptingAgentInterface from './interface/agents_interface';




const shellScriptingAgentRouter = async (input: string) => await LLM.buildAgent<ShellScripting>(input, SCRIPTING_AGENT_ROUTER_INSTRUCTIONS);

const shellScriptingAgentDeleteAndUpdate = async (input: string) => await LLM.buildAgent<ActionData>(input, SHELL_SCRIPT_AGENT_INSTRUCTIONS);

const shellScriptingAgentFind = async (input: string) => await LLM.buildAgent<ActionData>(input, SHELL_SCRIPT_AGENT_FIND_INSTRUCTIONS);

const shellScriptingAgentCreate = async (input: string) => await LLM.buildAgent<ActionData>(input, SHELL_SCRIPT_AGENT_CREATE_INSTRUCTIONS);



const insert = (io: AgentIO, mem: AgentIO[]) => {
    mem.push(io);
}

const ShellScriptingAgent: ShellScriptingAgentInterface = {
    memory: [],
    insert: function insertHelper(io: AgentIO) {
        insert(io, this.memory)
    },
    clear: function () {
        this.memory = [];
        return this.memory.length === 0;
    },
    // Agent Router
    router: shellScriptingAgentRouter,

    // Agent Skills
    find: shellScriptingAgentFind,
    create: shellScriptingAgentCreate,
    deleteAndUpdate: shellScriptingAgentDeleteAndUpdate,
} as const;

export default ShellScriptingAgent;
