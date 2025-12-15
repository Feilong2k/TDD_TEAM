// Test script to check configuration loading
const config = require('./config');
const fs = require('fs');

console.log('Testing configuration loading...');
console.log('config object:', config);
console.log('openaiApiKey present?', !!config.openaiApiKey);
console.log('openaiApiKey length:', config.openaiApiKey.length);
console.log('openaiApiKey first 10 chars:', config.openaiApiKey.substring(0, 10) + '...');

// Check if config.local.js exists
const localConfigPath = './config.local.js';
console.log('config.local.js exists?', fs.existsSync(localConfigPath));

// Try to load config.local.js directly
try {
  const localConfig = require('./config.local');
  console.log('Direct load of config.local.js:', localConfig);
} catch (e) {
  console.error('Error loading config.local.js directly:', e.message);
}

// Check environment variable
console.log('OPENAI_API_KEY env var:', process.env.OPENAI_API_KEY ? 'Set' : 'Not set');
