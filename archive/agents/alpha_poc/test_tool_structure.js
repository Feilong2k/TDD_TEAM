// Test to see the actual structure of tools passed to generateText
const { tool } = require('ai');
const { deepseek } = require('@ai-sdk/deepseek');
const { generateText } = require('ai');

// Create a tool with explicit JSON Schema
const testTool = tool({
  description: 'Test tool',
  parameters: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: 'Path to the file to read'
      }
    },
    required: ['filePath']
  },
  execute: async ({ filePath }) => {
    return `Read file: ${filePath}`;
  }
});

console.log('=== Tool Object ===');
console.log('Tool:', testTool);
console.log('Tool description:', testTool.description);
console.log('Tool parameters:', testTool.parameters);
console.log('Tool parameters type:', typeof testTool.parameters);
console.log('Tool parameters JSON:', JSON.stringify(testTool.parameters, null, 2));

console.log('\n=== Checking tool structure ===');
console.log('Is function?', typeof testTool === 'function');
console.log('Has execute?', 'execute' in testTool);
console.log('Has parameters?', 'parameters' in testTool);
console.log('Has description?', 'description' in testTool);

// Now test with generateText
async function testWithAI() {
  console.log('\n=== Testing with AI SDK ===');
  
  try {
    const model = deepseek('deepseek-chat', {
      apiKey: process.env.DEEPSEEK_API_KEY || 'sk-8d757b4f8d06411fa092dd0ad6771608',
    });
    
    // Log what we're passing to generateText
    const toolsObject = { testTool };
    console.log('Tools object passed to generateText:', toolsObject);
    console.log('testTool in tools object:', toolsObject.testTool);
    
    const { text } = await generateText({
      model: model,
      messages: [
        { role: 'user', content: 'Say hello' }
      ],
      tools: toolsObject,
      maxTokens: 100,
    });
    
    console.log('✅ AI call successful!');
    console.log('Response:', text);
    
  } catch (error) {
    console.error('❌ AI call failed:', error.message);
    console.error('Error stack:', error.stack);
    
    // Check if it's the schema error
    if (error.message.includes('Invalid schema for function')) {
      console.log('\n=== SCHEMA ERROR DETAILS ===');
      console.log('This suggests the tool schema is not being serialized correctly');
      console.log('The tool() function might be returning an object that the DeepSeek provider cannot handle');
    }
  }
}

// Set environment variable and run test
process.env.DEEPSEEK_API_KEY = 'sk-8d757b4f8d06411fa092dd0ad6771608';
testWithAI();
