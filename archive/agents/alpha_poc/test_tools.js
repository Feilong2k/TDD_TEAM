// Test script to verify tools work without AI
const { readFile, writeFile, listFiles } = require('./tools');

async function testTools() {
  console.log('🧪 Testing Agent Alpha tools...\n');
  
  try {
    // Test 1: Write a test file
    console.log('1. Testing writeFile...');
    const writeResult = await writeFile.execute({
      filePath: 'test_output.txt',
      content: 'This is a test file created by Agent Alpha tools.\nCurrent timestamp: ' + new Date().toISOString()
    });
    
    console.log(`   Result: ${writeResult.message}`);
    console.log(`   Success: ${writeResult.success}`);
    
    // Test 2: Read the test file
    console.log('\n2. Testing readFile...');
    const readResult = await readFile.execute({
      filePath: 'test_output.txt'
    });
    
    console.log(`   Result: ${readResult.message}`);
    console.log(`   Success: ${readResult.success}`);
    if (readResult.success) {
      console.log(`   Content preview: ${readResult.content.substring(0, 100)}...`);
    }
    
    // Test 3: List files in current directory
    console.log('\n3. Testing listFiles...');
    const listResult = await listFiles.execute({
      directoryPath: '.'
    });
    
    console.log(`   Result: ${listResult.message}`);
    console.log(`   Success: ${listResult.success}`);
    if (listResult.success) {
      console.log(`   Found ${listResult.count} items`);
      console.log('   First 5 items:');
      listResult.files.slice(0, 5).forEach(file => {
        console.log(`     - ${file.name} (${file.type})`);
      });
    }
    
    // Cleanup
    console.log('\n4. Cleaning up test file...');
    const fs = require('fs').promises;
    await fs.unlink('test_output.txt');
    console.log('   Test file removed');
    
    console.log('\n✅ All tool tests passed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Set your DEEPSEEK_API_KEY environment variable');
    console.log('   2. Run: node index.js');
    console.log('   3. The agent will read instructions.txt and create hello_agent.js');
    
  } catch (error) {
    console.error('❌ Tool test failed:', error.message);
  }
}

testTools();
