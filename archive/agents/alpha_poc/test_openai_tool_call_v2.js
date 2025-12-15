// Single test file: OpenAI AI-SDK + tool calling to create helloworld.js
// Everything in one file - no imports from external tools

const { createOpenAI } = require('@ai-sdk/openai');
const { generateText, tool } = require('ai');
const config = require('./config');
const fs = require('fs').promises;
const path = require('path');

// Define writeFile tool directly in this file
const writeFile = tool({
  description: 'Write content to a file. Can create new files or overwrite existing ones.',
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
    try {
      const fullPath = path.resolve(filePath);
      const dir = path.dirname(fullPath);
      
      // Create directory if it doesn't exist
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(fullPath, content, 'utf-8');
      return {
        success: true,
        filePath: fullPath,
        message: `Successfully wrote to file: ${fullPath}`,
        contentPreview: content.length > 100 ? content.substring(0, 100) + '...' : content
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        filePath: filePath,
        message: `Failed to write file: ${error.message}`
      };
    }
  }
});

async function test() {
  console.log('Testing OpenAI AI-SDK with tool calling to create helloworld.js...\n');
  
  // 1. Create OpenAI provider with API key
  const openai = createOpenAI({
    apiKey: config.openaiApiKey,
  });
  
  const model = openai(config.model);
  
  // 2. Define the prompt that will trigger tool call
  const prompt = `Create a file named helloworld.js that prints "Hello World!" to the console.`;
  
  console.log('Sending prompt to OpenAI:', prompt);
  
  try {
    // 3. Generate text with tool calling
    const { text, toolCalls, toolResults } = await generateText({
      model,
      messages: [
        { 
          role: 'user', 
          content: prompt 
        }
      ],
      tools: {
        writeFile  // Only expose writeFile tool
      },
      maxTokens: 500,
      temperature: 0.1,
    });
    
    console.log('\n✅ OpenAI response received.');
    console.log('Text response:', text);
    
    if (toolCalls && toolCalls.length > 0) {
      console.log('\nTool calls made by OpenAI:');
      toolCalls.forEach((call, i) => {
        console.log(`  ${i+1}. ${call.toolName} with args:`, JSON.stringify(call.args, null, 2));
      });
    }
    
    if (toolResults && toolResults.length > 0) {
      console.log('\nTool execution results:');
      toolResults.forEach((result, i) => {
        console.log(`  ${i+1}. ${result.toolName}: ${result.result.message}`);
      });
    }
    
    console.log('\n📁 File should now be created. Check for helloworld.js in the current directory.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

// Run the test
test();
