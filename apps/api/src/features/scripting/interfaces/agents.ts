




import { z } from 'zod';





export const ShellAgentInstructionSchema = z.object({
    taskName: z.string({
        required_error: "The taskNumber is required", // Custom error message
        invalid_type_error: "The taskNumber must be a string",
    }).min(1, { message: "The taskNumber cannot be empty" }), // Enforce non-empty string

    instruction: z.string({
        required_error: "The instruction is required", // Custom error message
        invalid_type_error: "The instruction must be a string",
    }).min(1, { message: "The instruction cannot be empty" }), // Enforce non-empty string

});

export type ShellAgentInstruction = z.infer<typeof ShellAgentInstructionSchema>;



export const TerminatedTaskSchema = z.object({
    taskNumber: z.string({
        required_error: "The taskNumber is required", // Custom error message
        invalid_type_error: "The taskNumber must be a string",
    }).min(1, { message: "The taskNumber cannot be empty" }), // Enforce non-empty string

    finished: z.boolean({
        required_error: "The finished attribute is required",
        invalid_type_error: "The finished attribute must be a boolean",
    }),
});

export type TerminatedTask = z.infer<typeof TerminatedTaskSchema>;

// permissions: z.array(z.string(), {
//     required_error: "Permissions are required",
//     invalid_type_error: "Permissions must be an array of strings",
// }).nonempty({ message: "Permissions array cannot be empty" }), // Or remove if empty is allowed

//     // role: Mongoose Array, required: true
//     // Assuming it's an array of strings, adjust z.string() if elements have a different type
//     role: z.array(z.string(), {
//         required_error: "Role is required",
//         invalid_type_error: "Role must be an array of strings",
//     }).nonempty({ message: "Role array cannot be empty" }), // Or remove if empty is allowed


export const FileToEditSchema = z.object({
    fileName: z.string({
        required_error: "The file name is required", // Custom error message
        invalid_type_error: "The file name must be a string",
    }).min(1, { message: "The file name cannot be empty" }), // Enforce non-empty string

    filePath: z.string({
        required_error: "The file path is required", // Custom error message
        invalid_type_error: "The file path must be a string",
    }).min(1, { message: "The file path cannot be empty" }),

    fileContent: z.string({
        required_error: "The file's content is required", // Custom error message
        invalid_type_error: "file content must be as string",
    }).min(1, { message: "The file cannot be empty" }),
});

export type FileToEdit = z.infer<typeof FileToEditSchema>;


export type AgentShellLogs = {
    AgentInput: string,
    shellOutput: string,
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
