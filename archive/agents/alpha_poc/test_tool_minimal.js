// Minimal test for AI SDK tool definition
const { tool } = require('ai');

// Try a minimal tool definition
const minimalTool = tool({
  description: 'A minimal test tool',
  parameters: {
    type: 'object',
    properties: {
      testParam: {
        type: 'string',
        description: 'Test parameter'
      }
    },
    required: ['testParam']
  },
  execute: async ({ testParam }) => {
    return `Test successful with param: ${testParam}`;
  }
});

console.log('Tool definition:', minimalTool);
console.log('Tool parameters:', minimalTool.parameters);
console.log('Tool schema type:', typeof minimalTool.parameters);

// Try to use it with generateText
const { deepseek } = require('@ai-sdk/deepseek');
const { generateText } = require('ai');

async function testTool() {
  console.log('\n🧪 Testing tool with AI...');
  
  try {
    const model = deepseek('deepseek-chat', {
      apiKey: process.env.DEEPSEEK_API_KEY || 'sk-8d757b4f8d06411fa092dd0ad6771608',
    });
    
    const { text } = await generateText({
      model: model,
      messages: [
        { role: 'user', content: 'Use the test tool with param "hello"' }
      ],
      tools: {
        minimalTool
      },
      maxTokens: 100,
    });
    
    console.log('✅ Tool test successful!');
    console.log('Response:', text);
    
  } catch (error) {
    console.error('❌ Tool test failed:', error.message);
    console.error('Error stack:', error.stack);
  }
}

// Set environment variable and run test
process.env.DEEPSEEK_API_KEY = 'sk-8d757b4f8d06411fa092dd0ad6771608';
testTool();
