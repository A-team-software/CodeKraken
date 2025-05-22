import { ActionData } from '../../interfaces/agents';


type ShellScriptingAgentInterface = {
    // Agent Router
    shellScriptingAgentRouter: (input: string) => Promise<ActionData | null>,

    // Agent Skills
    shellScriptingAgentFind: (input: string) => Promise<ActionData | null>,
    shellScriptingAgentCreate: (input: string) => Promise<ActionData | null>,
    shellScriptingAgentDeleteAndUpdate: (input: string) => Promise<ActionData | null>,

}


export default ShellScriptingAgentInterface;
