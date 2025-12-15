// Fixed version using installed packages
// The original code used '@ai/sdk' which is not installed.
// We have 'ai' and '@ai-sdk/openai' installed.

import fs from "fs";
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { z } from "zod";
import config from './config.js';

// --- Tool Schemas ---
const WriteFileSchema = z.object({
  path: z.string(),
  content: z.string(),
  encoding: z.enum(["utf8", "base64"]).default("utf8")
});

const ReadFileSchema = z.object({
  path: z.string(),
  encoding: z.enum(["utf8", "base64"]).default("utf8")
});

const ListFilesSchema = z.object({
  dir: z.string()
});

// --- Tool Implementations ---
const writeFileTool = {
  name: "write_file",
  description: "Write content to a file",
  schema: WriteFileSchema,
  execute: ({ path: filePath, content, encoding }) => {
    const dirPath = filePath.split("/").slice(0, -1).join("/");
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    const data = encoding === "base64" ? Buffer.from(content, "base64") : content;
    fs.writeFileSync(filePath, data);
    return `Wrote file: ${filePath}`;
  }
};

const readFileTool = {
  name: "read_file",
  description: "Read content from a file",
  schema: ReadFileSchema,
  execute: ({ path: filePath, encoding }) => {
    const data = fs.readFileSync(filePath, encoding === "base64" ? undefined : "utf8");
    return encoding === "base64" ? data.toString("base64") : data;
  }
};

const listFilesTool = {
  name: "list_files",
  description: "List files in a directory",
  schema: ListFilesSchema,
  execute: ({ dir }) => {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir);
  }
};

const tools = [writeFileTool, readFileTool, listFilesTool];

// --- AI Setup ---
const openai = createOpenAI({
  apiKey: config.openaiApiKey,
});
const model = openai('gpt-4o-mini');

// Execute a tool safely
function executeTool(toolName, args) {
  const tool = tools.find(t => t.name === toolName);
  if (!tool) throw new Error("Unknown tool: " + toolName);
  const validatedArgs = tool.schema.parse(args);
  return tool.execute(validatedArgs);
}

// Minimal agent loop using the current AI SDK (generateText with tools)
async function runAgent(prompt) {
  let messages = [{ role: "user", content: prompt }];
  let steps = 0;

  while (steps < 10) { // safety limit
    steps++;
    
    // Convert tools to the format expected by generateText
    const toolDefinitions = {};
    tools.forEach(tool => {
      toolDefinitions[tool.name] = {
        description: tool.description,
        parameters: tool.schema,
        execute: tool.execute
      };
    });

    try {
      const { text, toolCalls, toolResults } = await generateText({
        model,
        messages,
        tools: toolDefinitions,
        maxTokens: 500,
        temperature: 0.1,
      });

      // If there are tool calls, execute them
      if (toolCalls && toolCalls.length > 0) {
        for (const call of toolCalls) {
          console.log("AI selected tool:", call.toolName);
          console.log("Args:", call.args);
          
          const output = executeTool(call.toolName, call.args);
          console.log("Tool output:", output);
          
          messages.push({
            role: "tool",
            tool_call_id: call.toolName,
            content: output
          });
        }
      } else {
        console.log("AI response (no tool calls):", text);
        break;
      }
      
      // If there are tool results, we already handled them above
      // Continue loop for next turn
      
    } catch (error) {
      console.error("Error in AI call:", error.message);
      break;
    }
  }
}

// --- Example Usage ---
console.log("Starting agent test with fixed code...");
runAgent("Write a file README.md with 'Hello World!', then list files in ./");
