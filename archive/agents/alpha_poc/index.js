#!/usr/bin/env node

const { createOpenAI } = require('@ai-sdk/openai');
const { generateText } = require('ai');
const config = require('./config');
const { readFile, writeFile, listFiles } = require('./tools');

// Create OpenAI provider with explicit API key
const openai = createOpenAI({
  apiKey: config.openaiApiKey,
});

// Create model instance
const openaiModel = openai(config.model);

/**
 * Main agent function that reads instructions and executes them
 */
async function runAgent() {
  console.log('🤖 Agent Alpha starting...');
  console.log(`📝 Model: ${config.model}`);
  console.log('---');
  
  try {
    // Step 1: Read the instructions file
    console.log('📖 Reading instructions from instructions.txt...');
    const instructionsResult = await readFile.execute({ filePath: 'instructions.txt' });
    
    if (!instructionsResult.success) {
      console.error('❌ Failed to read instructions:', instructionsResult.message);
      process.exit(1);
    }
    
    const instructions = instructionsResult.content;
    console.log('📋 Instructions received:');
    console.log('---');
    console.log(instructions);
    console.log('---');
    
    // Step 2: Create system prompt for the agent
    const systemPrompt = `You are Agent Alpha, an AI coding assistant with access to file system tools.
    
Your task is to read the instructions provided and execute them step by step using the available tools.

Available tools:
1. readFile - Read contents of a file
2. writeFile - Write content to a file (can create new files)
3. listFiles - List files in a directory

Instructions from user:
${instructions}

Please execute these instructions carefully. Think step by step and use the appropriate tools.
If you need to create a new file, use writeFile.
If you need to examine existing code, use readFile.
Always verify your work after making changes.`;

    // Step 3: Run the agent with tools
    console.log('🧠 Processing instructions with AI...');
    
    const { text, toolCalls, toolResults } = await generateText({
      model: openaiModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Please execute the instructions using the available tools.' }
      ],
      tools: {
        readFile,
        writeFile,
        listFiles
      },
      maxTokens: config.maxTokens,
      temperature: config.temperature,
    });
    
    // Step 4: Display results
    console.log('\n✅ Agent execution complete!');
    console.log('---');
    console.log('📝 Final response from agent:');
    console.log(text);
    
    if (toolCalls && toolCalls.length > 0) {
      console.log('\n🔧 Tools used during execution:');
      toolCalls.forEach((call, index) => {
        console.log(`  ${index + 1}. ${call.toolName}(${JSON.stringify(call.args)})`);
      });
    }
    
    if (toolResults && toolResults.length > 0) {
      console.log('\n📊 Tool execution results:');
      toolResults.forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.toolName}: ${result.result.message || 'Success'}`);
      });
    }
    
    console.log('\n🎉 Agent Alpha finished successfully!');
    
  } catch (error) {
    console.error('❌ Agent execution failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the agent
runAgent();
