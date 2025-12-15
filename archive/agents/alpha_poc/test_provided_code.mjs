import fs from "fs";
import { AI } from "@ai/sdk";
import { z } from "zod";

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

// --- AI Agent Loop ---
const ai = new AI({ model: "gpt-4o-mini" });

// Execute a tool safely
function executeTool(toolName, args) {
  const tool = tools.find(t => t.name === toolName);
  if (!tool) throw new Error("Unknown tool: " + toolName);
  const validatedArgs = tool.schema.parse(args);
  return tool.execute(validatedArgs);
}

// Minimal agent loop
async function runAgent(prompt) {
  let messages = [{ role: "user", content: prompt }];
  let steps = 0;

  while (steps < 10) { // safety limit
    steps++;
    const response = await ai.call({
      messages,
      tools,
      zodSchema: z.object({
        tool: z.string(),
        args: z.any()
      })
    });

    const { tool, args } = response;

    if (!tool) {
      console.log("AI has no further tools to call. Done.");
      console.log("Final message:", response);
      break;
    }

    console.log("AI selected tool:", tool);
    console.log("Args:", args);

    const output = executeTool(tool, args);
    console.log("Tool output:", output);

    messages.push({
      role: "tool",
      tool_call_id: tool,
      content: output
    });
  }
}

// --- Example Usage ---
runAgent("Write a file README.md with 'Hello World!', then list files in ./");
