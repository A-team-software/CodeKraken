export type Message = {
    content: string | null,
    sender: string,
    AiAgentName: string
}

export type ChatData = {
    question: Message | null,
    answer: Message | null,
}

export interface ActionData {
    action_name: string;
    shell_command: string;
}
export type AgentTask = {
    task_number: number,
    description: string,
    finished: boolean,
    subtasks: AgentTask[]
}
