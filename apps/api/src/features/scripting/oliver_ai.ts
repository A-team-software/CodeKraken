import { ActionData, AgentTask, FileToEdit, TerminatedTask, ShellAgentInstruction, TerminatedTaskSchema, ShellAgentInstructionSchema, FileToEditSchema, AgentTaskSchema } from './interfaces/agents';
import { extractJsonFromString } from "./validation";
import LLM from './ai';
import { SHELL_SCRIPT_AGENT_INSTRUCTIONS, CODING_AGENT_INSTRUCTIONS, TASK_PLANNER_AGENT_INSTRUCTIONS, SHELL_SCRIPT_AGENT_FIND_INSTRUCTIONS, SHELL_SCRIPT_AGENT_CREATE_INSTRUCTIONS } from './agents_instructions';








const shellScriptingAgentRouter = async (input: string) => await LLM.buildAgent<ActionData>(input, SHELL_SCRIPT_AGENT_INSTRUCTIONS);
const shellScriptingAgentDeleteAndUpdate = async (input: string) => await LLM.buildAgent<ActionData>(input, SHELL_SCRIPT_AGENT_INSTRUCTIONS);
const shellScriptingAgentFind = async (input: string) => await LLM.buildAgent<ActionData>(input, SHELL_SCRIPT_AGENT_FIND_INSTRUCTIONS);
const shellScriptingAgentCreate = async (input: string) => await LLM.buildAgent<ActionData>(input, SHELL_SCRIPT_AGENT_CREATE_INSTRUCTIONS);

export const shellScriptingAgent = {

    // Agent Router
    shellScriptingAgentRouter: shellScriptingAgentRouter,

    // Agent Skills
    shellScriptingAgentFind: shellScriptingAgentFind,
    shellScriptingAgentCreate: shellScriptingAgentCreate,
    shellScriptingAgentDeleteAndUpdate: shellScriptingAgentDeleteAndUpdate,

} as const;


const generateCodingTasks = async (input: string) => await LLM.buildAgent<AgentTask[]>(input, TASK_PLANNER_AGENT_INSTRUCTIONS);

const OliverAI = {
    generateCodingTasks: generateCodingTasks
} as const;

export default OliverAI;
