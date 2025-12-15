// Single test file: OpenAI AI-SDK + tool calling to create helloworld.js
const { createOpenAI } = require('@ai-sdk/openai');
const { generateText } = require('ai');
const config = require('./config');
const { writeFile } = require('./tools');

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
