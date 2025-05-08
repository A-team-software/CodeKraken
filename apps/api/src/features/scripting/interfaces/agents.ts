import { boolean } from "zod";

export type Message = {
    content: string | null,
    sender: string,
    AiAgentName: string
}

export type FileToEdit = {
    fileName: string,
    filePath: string,
    fileContent: string
}

export type TerminatedTask = {
    taskNumber: string,
    finished: boolean,
    explanation: string,
}

export type ShellAgentInstruction = {
    taskName: string,
    instruction: string,
}

export type AgentShellLogs = {
    AgentInput: string,
    shellOutput: string,
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
