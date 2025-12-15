// Test using official OpenAI SDK (not AI-SDK) as per user's example
const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');
const config = require('./config');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

// Define the writeFile function that will be called
function writeFile({ filePath, content }) {
  try {
    const fullPath = path.resolve(filePath);
    const dir = path.dirname(fullPath);
    
    // Create directory if it doesn't exist
    fs.mkdir(dir, { recursive: true }).then(() => {
      return fs.writeFile(fullPath, content, 'utf-8');
    });
    
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

// Define tools array as per OpenAI example
const tools = [
  {
    type: "function",
    name: "writeFile",
    description: "Write content to a file. Can create new files or overwrite existing ones.",
    parameters: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Path where the file should be written"
        },
        content: {
          type: "string",
          description: "Content to write to the file"
        }
      },
      required: ["filePath", "content"]
    }
  }
];

async function test() {
  console.log('Testing official OpenAI SDK with tool calling...\n');
  
  // Create input messages
  const input = [
    { role: "user", content: "Create a file named helloworld.js that prints 'Hello World!' to the console." }
  ];
  
  try {
    // Call OpenAI with tools
    const response = await openai.responses.create({
      model: "gpt-4o",
      tools: tools,
      input: input,
    });
    
    console.log('Response received from OpenAI:');
    console.log(JSON.stringify(response, null, 2));
    
    // Check for function calls in the output
    if (response.output && response.output.length > 0) {
      for (const item of response.output) {
        if (item.type === "function_call") {
          if (item.name === "writeFile") {
            console.log('\nFunction call detected:', item.name);
            console.log('Arguments:', item.arguments);
            
            // Parse arguments and execute function
            const args = JSON.parse(item.arguments);
            const result = writeFile(args);
            
            console.log('\nFunction execution result:', result);
            
            // Add function call output to input for next turn
            input.push({
              type: "function_call_output",
              call_id: item.call_id,
              output: JSON.stringify(result)
            });
            
            // Call OpenAI again with the function result
            const secondResponse = await openai.responses.create({
              model: "gpt-4o",
              tools: tools,
              input: input,
            });
            
            console.log('\nFinal response after function execution:');
            console.log(JSON.stringify(secondResponse.output, null, 2));
          }
        } else if (item.type === "message") {
          console.log('\nModel message:', item.content);
        }
      }
    }
    
    console.log('\n📁 Check if helloworld.js was created in the current directory.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('\nThe "openai" package is not installed.');
      console.error('Please install it with: npm install openai');
    } else {
      console.error(error.stack);
    }
  }
}

// Run the test
test();
