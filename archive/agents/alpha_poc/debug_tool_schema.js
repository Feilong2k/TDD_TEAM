// Debug script to inspect tool schema
const { tool } = require('ai');
const { z } = require('zod');

// Create a tool with Zod schema
const testTool = tool({
  description: 'Test tool',
  parameters: z.object({
    filePath: z.string().describe('Path to the file to read')
  }),
  execute: async ({ filePath }) => {
    return `Read file: ${filePath}`;
  }
});

console.log('=== Tool Object Structure ===');
console.log('Full tool object:', JSON.stringify(testTool, null, 2));

console.log('\n=== Tool Parameters ===');
console.log('Parameters property:', testTool.parameters);
console.log('Type of parameters:', typeof testTool.parameters);

console.log('\n=== Checking for JSON Schema compliance ===');
if (testTool.parameters) {
  console.log('Has type property?', 'type' in testTool.parameters);
  console.log('Type value:', testTool.parameters.type);
  console.log('Has properties?', 'properties' in testTool.parameters);
  console.log('Has required?', 'required' in testTool.parameters);
} else {
  console.log('ERROR: parameters is null or undefined');
}

// Also test with explicit JSON Schema
const explicitTool = tool({
  description: 'Explicit JSON Schema tool',
  parameters: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: 'Path to the file to read'
      }
    },
    required: ['filePath']
  },
  execute: async ({ filePath }) => {
    return `Read file: ${filePath}`;
  }
});

console.log('\n=== Explicit JSON Schema Tool ===');
console.log('Parameters:', JSON.stringify(explicitTool.parameters, null, 2));
