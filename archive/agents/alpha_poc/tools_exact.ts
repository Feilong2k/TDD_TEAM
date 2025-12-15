import fs from "fs";
import path from "path";
import { z } from "zod";

// --- Schemas ---
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

// --- Tool implementations ---
export const writeFileTool = {
  name: "write_file",
  description: "Write content to a file",
  schema: WriteFileSchema,
  execute: ({ path, content, encoding }: z.infer<typeof WriteFileSchema>) => {
    const dir = path.split("/").slice(0, -1).join("/");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const data = encoding === "base64" ? Buffer.from(content, "base64") : content;
    fs.writeFileSync(path, data);
    return `Wrote file: ${path}`;
  }
};

export const readFileTool = {
  name: "read_file",
  description: "Read content from a file",
  schema: ReadFileSchema,
  execute: ({ path, encoding }: z.infer<typeof ReadFileSchema>) => {
    const data = fs.readFileSync(path, encoding === "base64" ? undefined : "utf8");
    return encoding === "base64" ? data.toString("base64") : data;
  }
};

export const listFilesTool = {
  name: "list_files",
  description: "List files in a directory",
  schema: ListFilesSchema,
  execute: ({ dir }: z.infer<typeof ListFilesSchema>) => {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir);
  }
};

export const tools = [writeFileTool, readFileTool, listFilesTool];
