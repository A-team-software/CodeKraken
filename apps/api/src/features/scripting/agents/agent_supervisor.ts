import { SHELL_SCRIPT_AND_CODING_AGENTS_ROUTER_INSTRUCTIONS } from '../agents_instructions';
import LLM from '../ai';
import { AgentIO } from '../interfaces/agents';
import { Agent, ShellAgentSupervisorInterface } from './interface/agents_interface';
import ShellAgent from './shell_agent';


const inspectAgentMemory = async <E, K>(input: E, instruction: string): Promise<K | null> => {
    const agentMemory = JSON.stringify(input);
    let result = await LLM.buildAgent<K>(agentMemory, instruction)
    return result;
}

const sendInstruction = async (input: string, instruction: string) => await LLM.buildAgent<string>(input, instruction);

type memory = typeof ShellAgent.agent.memory;

const ShellAgentSupervisor: Agent<ShellAgentSupervisorInterface<memory>, undefined> = {
    agent: {
        inspectAgentMemory: inspectAgentMemory,
        sendInstruction: sendInstruction,
    }
} as const;

export default ShellAgentSupervisor;
