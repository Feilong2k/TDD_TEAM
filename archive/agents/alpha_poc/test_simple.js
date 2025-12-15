// Simple test to check if DeepSeek API works
const { deepseek } = require('@ai-sdk/deepseek');
const { generateText } = require('ai');

async function testSimple() {
  console.log('🧪 Testing DeepSeek API connection...');
  
  try {
    const model = deepseek('deepseek-chat', {
      apiKey: process.env.DEEPSEEK_API_KEY || 'sk-8d757b4f8d06411fa092dd0ad6771608',
    });
    
    const { text } = await generateText({
      model: model,
      prompt: 'Say "Hello, world!"',
    });
    
    console.log('✅ DeepSeek API test successful!');
    console.log('Response:', text);
    
  } catch (error) {
    console.error('❌ DeepSeek API test failed:', error.message);
    console.error(error.stack);
  }
}

testSimple();
