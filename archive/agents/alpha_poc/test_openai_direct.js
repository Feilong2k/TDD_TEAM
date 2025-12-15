// Direct OpenAI API test without AI-SDK
const config = require('./config.local');
const https = require('https');

const apiKey = config.openaiApiKey;
console.log('Testing OpenAI API key directly...');
console.log('API Key length:', apiKey.length);
console.log('API Key first 10 chars:', apiKey.substring(0, 10) + '...');

const data = JSON.stringify({
  model: 'gpt-3.5-turbo',
  messages: [
    { role: 'user', content: 'Say "Hello from direct OpenAI test!"' }
  ],
  max_tokens: 100
});

const options = {
  hostname: 'api.openai.com',
  port: 443,
  path: '/v1/chat/completions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'Content-Length': data.length
  }
};

console.log('\nMaking request to OpenAI API...');
const req = https.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Status Message: ${res.statusMessage}`);
  
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    try {
      const parsed = JSON.parse(responseData);
      if (res.statusCode === 200) {
        console.log('\n✅ Success! OpenAI API responded.');
        console.log('Response:', parsed.choices[0].message.content);
      } else {
        console.log('\n❌ Error response from OpenAI API:');
        console.log(parsed);
      }
    } catch (e) {
      console.log('\n❌ Failed to parse response:', e.message);
      console.log('Raw response:', responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('\n❌ Request error:', error.message);
});

req.write(data);
req.end();
