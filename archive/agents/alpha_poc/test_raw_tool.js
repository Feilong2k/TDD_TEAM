// Test using raw tool definition (without the `tool` function)
const { createOpenAI } = require('@ai-sdk/openai');
const { generateText } = require('ai');
const config = require('./config');
const fs = require('fs');
const path = require('path');

// Raw tool definition (without the `tool` function)
const writeFileTool = {
  description: 'Write content to a file',
  parameters: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: 'Path where the file should be written'
      },
      content: {
        type: 'string',
        description: 'Content to write to the file'
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
};

async function runTest() {
  console.log('Testing with raw tool definition (without `tool` function)...');
  
  const openai = createOpenAI({
    apiKey: config.openaiApiKey,
  });
  
  const model = openai(config.model);
  
  try {
    const { text, toolCalls, toolResults } = await generateText({
      model,
      messages: [
        { role: 'user', content: 'Create a file named test_raw.txt with the content "Hello from raw tool!"' }
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
    if (fs.existsSync('test_raw.txt')) {
      const content = fs.readFileSync('test_raw.txt', 'utf8');
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
