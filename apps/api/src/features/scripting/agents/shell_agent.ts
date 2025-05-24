import LLM from '../ai';
import { ActionData, ShellScripting, AgentIO } from '../interfaces/agents';
import { SHELL_SCRIPT_AGENT_INSTRUCTIONS, SHELL_SCRIPT_AGENT_FIND_INSTRUCTIONS, SHELL_SCRIPT_AGENT_CREATE_INSTRUCTIONS, SCRIPTING_AGENT_ROUTER_INSTRUCTIONS } from '../agents_instructions';
import { Agent, ShellAgentInterface } from './interface/agents_interface';




const shellScriptingAgentRouter = async (input: string) => await LLM.buildAgent<ShellScripting>(input, SCRIPTING_AGENT_ROUTER_INSTRUCTIONS);

const shellScriptingAgentDeleteAndUpdate = async (input: string) => await LLM.buildAgent<ActionData>(input, SHELL_SCRIPT_AGENT_INSTRUCTIONS);

const shellScriptingAgentFind = async (input: string) => await LLM.buildAgent<ActionData>(input, SHELL_SCRIPT_AGENT_FIND_INSTRUCTIONS);

const shellScriptingAgentCreate = async (input: string) => await LLM.buildAgent<ActionData>(input, SHELL_SCRIPT_AGENT_CREATE_INSTRUCTIONS);


const insert = (io: AgentIO, mem: AgentIO[]) => {
    mem.push(io);
}



const ShellAgent: Agent<ShellAgentInterface> = {
    agent: {
        memory: new Array<AgentIO>,
        insert: function insertHelper(io: AgentIO) {
            insert(io, this.memory)
        },

        clear: function () {
            this.memory = [];
            return this.memory.length === 0;
        },

        // Agent Skills
        find: shellScriptingAgentFind,
        create: shellScriptingAgentCreate,
        deleteAndUpdate: shellScriptingAgentDeleteAndUpdate,
    } as const,

    // Agent Router
    router: shellScriptingAgentRouter,
} as const;

export default ShellAgent;
