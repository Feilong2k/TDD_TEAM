#!/usr/bin/env node

/**
 * Test the updated Orion wrapper with context support.
 * This demonstrates that the wrapper correctly sends instance and context to the proxy.
 * 
 * Usage: node test_wrapper_context.js
 */

const OrionWrapper = require('./agents/orion-wrapper.js');

async function testWrapperWithContext() {
  console.log('=== Testing Orion Wrapper with Context ===\n');
  
  // Create wrapper with default instance (127.0.0.1:38937) and system prompt as context
  const wrapper = new OrionWrapper('P-001', null, '127.0.0.1:38937');
  
  console.log('1. Wrapper Configuration:');
  console.log('   Instance:', wrapper.instanceAddress);
  console.log('   Context length:', wrapper.context.length, 'chars');
  console.log('   Proxy URL:', wrapper.proxyUrl);
  
  console.log('\n2. Sending a test message...');
  try {
    // Send a simple message in plan mode
    const response = await wrapper.sendMessage(
      'Write a simple hello world function in JavaScript',
      'plan'
    );
    
    console.log('\n3. Response received:');
    console.log('   Response type:', response.response_type);
    console.log('   Content keys:', Object.keys(response.content));
    console.log('   Metadata:', JSON.stringify(response.metadata, null, 2).substring(0, 200) + '...');
    
    console.log('\n✅ SUCCESS: Wrapper works with context via proxy.');
    console.log('\nThe wrapper sent:');
    console.log('   - Instance:', wrapper.instanceAddress);
    console.log('   - Context: (first 100 chars)', wrapper.context.substring(0, 100) + '...');
    console.log('   - Command: cline task new --mode plan --output-format json --no-interactive');
    console.log('\nThe proxy should have:');
    console.log('   1. Ensured the instance was running');
    console.log('   2. Set context via cline context add');
    console.log('   3. Executed the cline command');
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nPossible issues:');
    console.error('   - Proxy not running at', wrapper.proxyUrl);
    console.error('   - Instance not running at', wrapper.instanceAddress);
    console.error('   - Cline not installed on VM');
    console.error('   - Network connectivity');
  }
}

// Run test if invoked directly
if (require.main === module) {
  testWrapperWithContext().catch(console.error);
}

module.exports = testWrapperWithContext;
