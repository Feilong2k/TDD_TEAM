// Test AI-SDK communication with OpenAI
const { createOpenAI } = require('@ai-sdk/openai');
const { generateText } = require('ai');
const config = require('./config.local');

console.log('Testing AI-SDK with OpenAI...');
console.log('API Key length:', config.openaiApiKey.length);
console.log('API Key (first 10 chars):', config.openaiApiKey.substring(0, 10) + '...');

const openai = createOpenAI({
  apiKey: config.openaiApiKey,
});

const model = openai('gpt-4o');

async function test() {
  try {
    console.log('Sending test prompt to OpenAI...');
    const { text } = await generateText({
      model,
      prompt: 'Say "Hello from AI-SDK test!"',
      maxTokens: 100,
    });
    console.log('✅ Success! Response:', text);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

test();
