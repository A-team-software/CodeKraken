import { AgentIO } from "../../interfaces/agents";
import { AgentMemory } from "../interface/agents_interface";


const agentMemoryArrayType: AgentMemory<AgentIO[]> = {
    memory: new Array<AgentIO>(),
    insert: (io, mem) => {
        mem.push(io);
    },
    clear: (mem) => {
        mem = [];
        return mem.length === 0;
    },
} as const;


export default agentMemoryArrayType;
