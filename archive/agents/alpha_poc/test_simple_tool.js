// Simple test using the same pattern as tools.js
const { createOpenAI } = require('@ai-sdk/openai');
const { generateText, tool } = require('ai');
const config = require('./config');
const fs = require('fs');
const path = require('path');

// Define tool exactly as in tools.js (which worked in test_tools.js)
const writeFileTool = tool({
  description: 'Write content to a file',
  parameters: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: 'Path to the file'
      },
      content: {
        type: 'string',
        description: 'Content to write'
      }
    },
    required: ['filePath', 'content']
  },
  execute: async ({ filePath, content }) => {
    const fullPath = path.resolve(filePath);
    const dir = path.dirname(fullPath);
    // Create directory if it doesn't exist
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(fullPath, content, 'utf-8');
    return `Successfully wrote to file: ${fullPath}`;
  }
});

async function runTest() {
  console.log('Testing with simple tool definition (same as tools.js)...');
  
  const openai = createOpenAI({
    apiKey: config.openaiApiKey,
  });
  
  const model = openai(config.model);
  
  try {
    const { text, toolCalls, toolResults } = await generateText({
      model,
      messages: [
        { role: 'user', content: 'Create a file named test_output.txt with the content "Hello from AI!"' }
      ],
      tools: {
        writeFileTool
      },
      maxTokens: 500
    });
    
    console.log('Text response:', text);
    
    if (toolCalls && toolCalls.length > 0) {
      console.log('Tool calls:', toolCalls);
    }
    
    if (toolResults && toolResults.length > 0) {
      console.log('Tool results:', toolResults);
    }
    
    // Check if file was created
    if (fs.existsSync('test_output.txt')) {
      const content = fs.readFileSync('test_output.txt', 'utf8');
      console.log('✅ File created successfully!');
      console.log('Content:', content);
    } else {
      console.log('❌ File was not created.');
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
}

runTest();
