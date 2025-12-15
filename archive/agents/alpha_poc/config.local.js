// Local configuration file for OpenAI API key
// This file is not tracked by git (added to .gitignore)
// IMPORTANT: Replace 'your_actual_openai_api_key_here' with your real OpenAI API key

const config = {
  // OpenAI API Configuration
  // Get your API key from: https://platform.openai.com/
  // Your key should start with 'sk-'
  openaiApiKey: 'sk-your-actual-openai-api-key-here', // ⚠️ REPLACE THIS WITH YOUR KEY
  
  // Model to use - GPT-4o has excellent tool calling support
  model: 'gpt-4o',
  
  // Maximum tokens for response
  maxTokens: 4096,
  
  // Temperature for creativity (0.0 to 1.0)
  temperature: 0.1,
};

module.exports = config;
