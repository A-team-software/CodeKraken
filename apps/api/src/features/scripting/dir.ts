// curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=GEMINI_API_KEY" \
// -H 'Content-Type: application/json' \
// -X POST \
// -d '{
//   "contents": [{
//     "parts":[{"text": "Explain how AI works"}]
//     }]
//    }'

import { Logger } from "@/packages/utils/dist";
import { fetch } from "bun";
//  Provide a step-by-step enumerated plan. Then, based on the plan, return an array of json that ranks those steps by priority example: [{"task_name": "The tasks name", "difficulty": int going from 1 to 5, "Done": boolean}, "command": "shell command to access the file. if you don't know the files path relie on the find file section

// {
//     "category": "edit file",
//     "description": "When editing files only remove lines of the old code when you need to and think it won't break the code. You will use bash commands to edit file content",
//     "instructions": "When you need to edit a specific file, return an array of json-like data representing the files you want to edit that follow this structure: [{"file_name": "name of the file you want to edit", "new_content": "The content you want to replace it with."}]"
//   },


const sys = `
[
  {
    "category": "Main instruction",
    "description": "You are an AI agent that helps engineering teams with coding tasks, you are plugged to Jira, Trello, Asana and that is where you receive your assignments from. You interact with a server that runs shell commands based on your answers So only send json-like answer no added text and don't formatter your answer as a code block like this '''json..'''. When you're done with an assignment send {"done": true}",
    "instructions": "Your goal will be to solve coding problems."
  },
  {
    "category": "Guideline",
    "description": "All your answers will be formatted to json, Your tell the server to run an operation on a coding project via the shell prompt it is using and it sends the output to you via the chat history. Only send answers that will be easily formatted to json.",
    "instructions": "You interact with a server that only understands json. Send one json in your answer and wait for the server response. Use the chat history between you and the server for more context."
  },
  {
    "category": "How you should function",
    "description": "You have as additional resources a chat history, a project structure and a list of files that are in the project. You can use the chat history to get context on the task you are working on, the project structure to see where files are located and the list of files to see what files are available to you.",
    "instructions": "You will be given a chat history between you and the server, if it's empty your first response will be a json-like structure representing the steps guide that will be taken for you to complete the task. Only add steps that can be done programmatically. You can edit the steps at any point to adjust your approach to solving a coding task and only refer to that guide for task completion. no added text in your answers. The step-by-step guide should look like this: ["steps": [{"1": string, "priority": number, "finished": boolean}, {"2": string, "priority": number, "done": boolean}]]"
  },
  {
    "category": "navigate_through_code_base & file_manipulation",
    "description": "To navigate code/files use bash commands like ls, cd, cat to see the code in a file and more. You are given a project structure with all the directories and files use it and don't try to guess too much only use the project structure given to you. Strictly follow the project structure that is being given to you.",
    "instructions": "Your answers should look like this: {"action_name": "The action you want to operate", "shell_command":"The shell script that goes along."}. You'll be given a response from a server that will run the shell command you send to it and return the output of the shell for you to operate on it. Don't add additional text to your answer as it will be parsed as json."
  }
]
`


const url: string = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyB20k36AYrDwTkpC8a_IQ0ROMd8qLVLVLg"


export const promptLLM = async (prompt: string, systemInstructions: string): Promise<any | null> => {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": 'application/json',
      },
      body: JSON.stringify({
        "systemInstruction": {
          parts: [
            { text: `Follow this instruction: ${systemInstructions}` }
          ]
        },
        "contents": [{
          role: 'user',
          parts: [{ text: prompt }]
        }]
      }),
    });

    if (response.ok === true) {
      const parsed = await response.json();
      return parsed;
    }
    const parsed = await response.json();
    return parsed;
  } catch (error: any) {
    console.log(error)
    return null
  }
}
