// Test using JSON Schema directly for tool parameters
const { createOpenAI } = require('@ai-sdk/openai');
const { generateText, tool } = require('ai');
const config = require('./config');
const fs = require('fs');
const path = require('path');

// Define the write_file tool using JSON Schema
const writeFileTool = tool({
  description: 'Write content to a file',
  parameters: {
    type: 'object',
    properties: {
      path: { 
        type: 'string', 
        description: 'Path to the file' 
      },
      content: { 
        type: 'string', 
        description: 'Content to write' 
      },
      encoding: { 
        type: 'string', 
        enum: ['utf8', 'base64'],
        default: 'utf8',
        description: 'Encoding to use'
      }
    },
    required: ['path', 'content']
  },
  execute: async ({ path: filePath, content, encoding }) => {
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    const data = encoding === 'base64' ? Buffer.from(content, 'base64') : content;
    fs.writeFileSync(filePath, data);
    return `Wrote file: ${filePath}`;
  }
});

// Create OpenAI provider
const openai = createOpenAI({
  apiKey: config.openaiApiKey,
});

const model = openai(config.model);

async function runTest() {
  console.log('Testing AI SDK tool calling with JSON Schema...');
  console.log('Using API key:', config.openaiApiKey ? 'Present' : 'Missing');
  
  try {
    const { text, toolCalls, toolResults } = await generateText({
      model,
      messages: [
        { role: 'user', content: "Write a file named README.md with the content 'Hello World!'" }
      ],
      tools: {
        write_file: writeFileTool,
      },
      maxTokens: 500,
      temperature: 0.1,
    });

    console.log('\nAI Response text:', text);

    if (toolCalls && toolCalls.length > 0) {
      console.log('\nTool calls:');
      toolCalls.forEach((call, i) => {
        console.log(`  ${i + 1}. ${call.toolName}:`, call.args);
      });
    }

    if (toolResults && toolResults.length > 0) {
      console.log('\nTool results:');
      toolResults.forEach((result, i) => {
        console.log(`  ${i + 1}. ${result.toolName}: ${result.result}`);
      });
    }

    // Check if file was created
    if (fs.existsSync('README.md')) {
      const content = fs.readFileSync('README.md', 'utf8');
      console.log('\n✅ README.md created successfully!');
      console.log('File content:', content);
    } else {
      console.log('\n❌ README.md was not created.');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }
}

runTest();
