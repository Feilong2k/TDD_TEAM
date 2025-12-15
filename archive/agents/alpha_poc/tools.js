const fs = require('fs').promises;
const path = require('path');
const { tool } = require('ai');

/**
 * Read file tool - reads the contents of a file
 */
const readFile = tool({
  description: 'Read the contents of a file to inspect its content',
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
    try {
      const fullPath = path.resolve(filePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      return {
        success: true,
        content: content,
        filePath: fullPath,
        message: `Successfully read file: ${fullPath}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        filePath: filePath,
        message: `Failed to read file: ${error.message}`
      };
    }
  }
});

/**
 * Write file tool - writes content to a file
 */
const writeFile = tool({
  description: 'Write content to a file. Can create new files or overwrite existing ones.',
  parameters: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: 'Path where the file should be written'
      },
      content: {
        type: 'string',
        description: 'Content to write to the file'
      }
    },
    required: ['filePath', 'content']
  },
  execute: async ({ filePath, content }) => {
    try {
      const fullPath = path.resolve(filePath);
      const dir = path.dirname(fullPath);
      
      // Create directory if it doesn't exist
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(fullPath, content, 'utf-8');
      return {
        success: true,
        filePath: fullPath,
        message: `Successfully wrote to file: ${fullPath}`,
        contentPreview: content.length > 100 ? content.substring(0, 100) + '...' : content
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        filePath: filePath,
        message: `Failed to write file: ${error.message}`
      };
    }
  }
});

/**
 * List files tool - lists files in a directory
 */
const listFiles = tool({
  description: 'List files in a directory to understand the project structure',
  parameters: {
    type: 'object',
    properties: {
      directoryPath: {
        type: 'string',
        description: 'Path to the directory to list'
      }
    },
    required: ['directoryPath']
  },
  execute: async ({ directoryPath }) => {
    try {
      const fullPath = path.resolve(directoryPath);
      const files = await fs.readdir(fullPath, { withFileTypes: true });
      
      const fileList = files.map(file => ({
        name: file.name,
        type: file.isDirectory() ? 'directory' : 'file',
        path: path.join(fullPath, file.name)
      }));
      
      return {
        success: true,
        directory: fullPath,
        files: fileList,
        count: fileList.length,
        message: `Found ${fileList.length} items in directory: ${fullPath}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        directoryPath: directoryPath,
        message: `Failed to list directory: ${error.message}`
      };
    }
  }
});

module.exports = {
  readFile,
  writeFile,
  listFiles
};
