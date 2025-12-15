// Test using AI SDK with tools_exact.js
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { z } from 'zod';
import { tools } from './tools_exact.js';
import config from './config.js';

// Create OpenAI provider with API key
const openai = createOpenAI({
  apiKey: config.openaiApiKey,
});

const model = openai('gpt-4o-mini');

async function run() {
  console.log('Testing AI SDK with tools...');
  console.log('Model: gpt-4o-mini');
  console.log('API Key present:', config.openaiApiKey ? 'Yes' : 'No');
  
  try {
    // Use generateText with tools
    const { text, toolCalls, toolResults } = await generateText({
      model,
      messages: [
        { role: 'user', content: "Write a README.md file with 'Hello World!'" }
      ],
      tools: {
        write_file: {
          description: 'Write content to a file',
          parameters: z.object({
            path: z.string(),
            content: z.string(),
            encoding: z.enum(['utf8', 'base64']).default('utf8')
          }),
          execute: async ({ path, content, encoding }) => {
            const fs = await import('fs');
            const pathModule = await import('path');
            const dir = pathModule.dirname(path);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            const data = encoding === 'base64' ? Buffer.from(content, 'base64') : content;
            fs.writeFileSync(path, data);
            return `Wrote file: ${path}`;
          }
        }
      },
      maxTokens: 500,
      temperature: 0.1,
    });
    
    console.log('\n✅ AI response received.');
    console.log('Text:', text);
    
    if (toolCalls && toolCalls.length > 0) {
      console.log('\nTool calls:', toolCalls);
    }
    
    if (toolResults && toolResults.length > 0) {
      console.log('\nTool results:', toolResults);
    }
    
    console.log('\n📁 Check if README.md was created.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

run();
