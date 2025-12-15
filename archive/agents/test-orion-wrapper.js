#!/usr/bin/env node

/**
 * Test script for OrionWrapper
 * 
 * This script tests the OrionWrapper class directly.
 * It demonstrates both Plan and Act modes.
 * 
 * Usage:
 *   node test-orion-wrapper.js --message "Your test message" [--project P-001] [--task T-001] [--mode plan|act]
 */

const OrionWrapper = require('./orion-wrapper.js');

async function runTest() {
  const args = process.argv.slice(2);
  let message = '';
  let projectId = 'P-001';
  let taskId = null;
  let mode = 'plan';

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--message' && args[i + 1]) {
      message = args[i + 1];
      i++;
    } else if (args[i] === '--project' && args[i + 1]) {
      projectId = args[i + 1];
      i++;
    } else if (args[i] === '--task' && args[i + 1]) {
      taskId = args[i + 1];
      i++;
    } else if (args[i] === '--mode' && args[i + 1]) {
      mode = args[i + 1];
      i++;
    } else if (args[i] === '--help') {
      console.log(`
Test Orion Wrapper

Usage: node test-orion-wrapper.js --message "Your message" [options]

Options:
  --message <text>    The message to send to Orion (required)
  --project <id>      Project ID (default: P-001)
  --task <id>         Task ID (optional)
  --mode <plan|act>   Mode: plan or act (default: plan)
  --help              Show this help
      `);
      process.exit(0);
    }
  }

  if (!message) {
    console.error('Error: --message argument is required');
    console.log('Use --help for usage information');
    process.exit(1);
  }

  if (mode !== 'plan' && mode !== 'act') {
    console.error('Error: --mode must be either "plan" or "act"');
    process.exit(1);
  }

  console.log(`Testing OrionWrapper with:`);
  console.log(`  Project ID: ${projectId}`);
  console.log(`  Task ID: ${taskId || 'None'}`);
  console.log(`  Mode: ${mode}`);
  console.log(`  Message: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);
  console.log('---');

  try {
    const wrapper = new OrionWrapper(projectId, taskId);
    console.log('Sending message to Orion...');
    const response = await wrapper.sendMessage(message, mode);
    
    console.log('\n✅ Success! Response:');
    console.log(JSON.stringify(response, null, 2));
    
    // Also log some metadata
    console.log('\n📊 Response Summary:');
    console.log(`  Response Type: ${response.response_type}`);
    console.log(`  Project ID in metadata: ${response.metadata.project_id}`);
    console.log(`  Task ID in metadata: ${response.metadata.task_id || 'None'}`);
    console.log(`  Requires Action: ${response.metadata.requires_action}`);
    
    // If it's a decomposition, list subtasks
    if (response.response_type === 'decomposition' && response.content.subtasks) {
      console.log(`  Subtasks: ${response.content.subtasks.length}`);
      response.content.subtasks.forEach((subtask, index) => {
        console.log(`    ${index + 1}. ${subtask.title} (${subtask.assignee}, ${subtask.status})`);
      });
    }
    
    // If it's a clarification, list questions
    if (response.response_type === 'clarification' && response.content.questions) {
      console.log(`  Questions: ${response.content.questions.length}`);
      response.content.questions.forEach((question, index) => {
        console.log(`    ${index + 1}. ${question}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error(error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
runTest();
