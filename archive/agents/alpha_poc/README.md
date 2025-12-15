# Agent Alpha - AI SDK Proof of Concept

This is a proof-of-concept AI agent built with the Vercel AI SDK and DeepSeek API. The agent can read instructions from a file and execute them using file system tools.

## Features

- 🤖 AI-powered agent using DeepSeek model
- 🔧 Tool calling with Zod schemas
- 📁 File system operations (read, write, list)
- 📝 Instruction-based execution

## Prerequisites

1. Node.js 18+ installed
2. DeepSeek API key (get from https://platform.deepseek.com/)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set your DeepSeek API key:
   ```bash
   # Option 1: Set environment variable
   export DEEPSEEK_API_KEY=your_api_key_here
   
   # Option 2: Create config.local.js (copy from config.js and add your key)
   ```

3. Edit `instructions.txt` with your desired task.

## Usage

Run the agent:
```bash
node index.js
```

The agent will:
1. Read `instructions.txt`
2. Process the instructions using AI
3. Execute appropriate tools (readFile, writeFile, listFiles)
4. Display results

## Example Task

The default `instructions.txt` contains:
```
Create a simple Node.js script called "hello_agent.js" that does the following:

1. Prints "Hello from AI Agent Alpha!" to the console
2. Creates an array of programming languages: ["JavaScript", "Python", "TypeScript", "Go", "Rust"]
3. Loops through the array and prints each language with its index
4. Calculates and prints the total number of languages

The script should be well-commented and follow best practices for Node.js code.

After creating the file, verify that it works correctly by reading it back and checking its contents.
```

## Project Structure

- `index.js` - Main agent script
- `tools.js` - Tool definitions (readFile, writeFile, listFiles)
- `config.js` - Configuration (API key, model settings)
- `instructions.txt` - Task instructions for the agent
- `README.md` - This file

## Extending

To add more tools:
1. Define new tool in `tools.js` using Zod schema
2. Export the tool
3. Import and add to tools object in `index.js`

## Notes

- The agent uses DeepSeek's OpenAI-compatible API
- Tool calling requires modern models (DeepSeek-V3, GPT-4, Claude 3.5, etc.)
- File paths are resolved relative to the agent's working directory
