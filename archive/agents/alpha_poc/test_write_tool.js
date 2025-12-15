// Test the writeFile tool to create a simple helloworld.js
const { writeFile } = require('./tools');
const fs = require('fs').promises;

async function testWriteTool() {
  console.log('Testing writeFile tool to create helloworld.js...\n');
  
  const filePath = 'helloworld.js';
  const content = `// Hello World from Agent Alpha
console.log('Hello from helloworld.js!');

// Simple function to demonstrate
function greet(name) {
  return \`Hello, \${name}!\`;
}

// Export if needed
module.exports = {
  greet
};

// Run if this is the main module
if (require.main === module) {
  console.log(greet('World'));
}`;

  try {
    // Use the writeFile tool
    const result = await writeFile.execute({
      filePath,
      content
    });

    console.log('Result:', result.message);
    console.log('Success:', result.success);
    
    if (result.success) {
      console.log('\n✅ File created successfully!');
      console.log('File path:', result.filePath);
      console.log('Content preview:', result.contentPreview);
      
      // Read the file back to verify
      console.log('\nVerifying file contents...');
      const fileContent = await fs.readFile(filePath, 'utf-8');
      console.log('File contents (first 200 chars):', fileContent.substring(0, 200) + '...');
      
      // Run the file to test it
      console.log('\nRunning the created file...');
      require('./' + filePath);
      
      // Cleanup
      console.log('\nCleaning up...');
      await fs.unlink(filePath);
      console.log('Test file removed.');
    } else {
      console.error('❌ Failed to create file:', result.error);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testWriteTool();
