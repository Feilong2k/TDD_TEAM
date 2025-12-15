// Test using the exact structure the user provided, adapted for current AI SDK
const { createOpenAI } = require('@ai-sdk/openai');
const { generateText } = require('ai');
const config = require('./config');
const path = require('path');
const fs = require('fs').promises;

// We need to convert the ES module tools_exact.js to CommonJS
// Since tools_exact.js uses ES modules, we'll create a simple wrapper
const tools = [
  {
    name: "write_file",
    description: "Write content to a file",
    schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path to the file" },
        content: { type: "string", description: "Content to write" },
        encoding: { 
          type: "string", 
          enum: ["utf8", "base64"],
          default: "utf8",
          description: "Encoding to use"
        }
      },
      required: ["path", "content"]
    },
    execute: async ({ path: filePath, content, encoding = "utf8" }) => {
      const dir = path.dirname(filePath);
      try {
        await fs.mkdir(dir, { recursive: true });
        const data = encoding === "base64" ? Buffer.from(content, "base64") : content;
        await fs.writeFile(filePath, data);
        return `Wrote file: ${filePath}`;
      } catch (error) {
        return `Failed to write file: ${error.message}`;
      }
    }
  }
];

async function run() {
  console.log('Testing with user-provided example structure...');
  
  // Create OpenAI provider with API key
  const openai = createOpenAI({
    apiKey: config.openaiApiKey,
  });
  
  const model = openai('gpt-4o-mini');
  
  try {
    // Use generateText with tools
    const { text, toolCalls, toolResults } = await generateText({
      model,
      messages: [
        { role: 'user', content: "Write a README.md with 'Hello World!'" }
      ],
      tools: {
        write_file: {
          description: tools[0].description,
          parameters: tools[0].schema,
          execute: tools[0].execute
        }
      },
      maxTokens: 500,
      temperature: 0.1,
    });
    
    console.log('\n✅ AI response received.');
    console.log('Text:', text);
    
    if (toolCalls && toolCalls.length > 0) {
      console.log('\nTool calls made by AI:');
      toolCalls.forEach((call, i) => {
        console.log(`  ${i+1}. Tool: ${call.toolName}`);
        console.log(`     Args: ${JSON.stringify(call.args, null, 2)}`);
      });
    }
    
    if (toolResults && toolResults.length > 0) {
      console.log('\nTool execution results:');
      toolResults.forEach((result, i) => {
        console.log(`  ${i+1}. ${result.toolName}: ${result.result}`);
      });
    }
    
    console.log('\n📁 Check if README.md was created in current directory.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

run();
