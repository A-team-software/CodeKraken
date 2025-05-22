import LLM from '../ai';
import { ActionData } from '../interfaces/agents';
import { SHELL_SCRIPT_AGENT_INSTRUCTIONS, SHELL_SCRIPT_AGENT_FIND_INSTRUCTIONS, SHELL_SCRIPT_AGENT_CREATE_INSTRUCTIONS, SCRIPTING_AGENT_ROUTER_INSTRUCTIONS } from '../agents_instructions';
import ShellScriptingAgentInterface from './interface/agents_interface';




const shellScriptingAgentRouter = async (input: string) => await LLM.buildAgent<ActionData>(input, SCRIPTING_AGENT_ROUTER_INSTRUCTIONS);

const shellScriptingAgentDeleteAndUpdate = async (input: string) => await LLM.buildAgent<ActionData>(input, SHELL_SCRIPT_AGENT_INSTRUCTIONS);

const shellScriptingAgentFind = async (input: string) => await LLM.buildAgent<ActionData>(input, SHELL_SCRIPT_AGENT_FIND_INSTRUCTIONS);

const shellScriptingAgentCreate = async (input: string) => await LLM.buildAgent<ActionData>(input, SHELL_SCRIPT_AGENT_CREATE_INSTRUCTIONS);



const shellScriptingAgent: ShellScriptingAgentInterface = {

    // Agent Router
    shellScriptingAgentRouter: shellScriptingAgentRouter,

    // Agent Skills
    shellScriptingAgentFind: shellScriptingAgentFind,
    shellScriptingAgentCreate: shellScriptingAgentCreate,
    shellScriptingAgentDeleteAndUpdate: shellScriptingAgentDeleteAndUpdate,

} as const;

export default shellScriptingAgent;
