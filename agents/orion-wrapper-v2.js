#!/usr/bin/env node

/**
 * Orion Wrapper v2 - Incremental TDD Implementation
 * 
 * This is a minimal skeleton for TDD implementation.
 * Functions will be implemented one at a time with tests.
 */

const fs = require('fs').promises;
const path = require('path');

// Constants for validation and configuration
const VALID_MODES = ['plan', 'act'];
const DEFAULT_PROJECT_ID = 'P-001';
const ERROR_MESSAGES = {
  EMPTY_MESSAGE: 'Message cannot be empty',
  INVALID_MESSAGE_TYPE: 'Message must be a string',
  INVALID_MODE: 'Mode must be "plan" or "act"',
  INVALID_ID_FORMAT: 'projectId and taskId must contain only alphanumeric characters and hyphens'
};
const MESSAGE_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

// Simple file locking mechanism
class FileLock {
  constructor(filePath) {
    this.filePath = filePath;
    this.lockPath = filePath + '.lock';
  }

  async acquire() {
    const maxRetries = 10;
    const retryDelay = 100; // ms
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        await fs.writeFile(this.lockPath, process.pid.toString(), { flag: 'wx' });
        return true;
      } catch (error) {
        if (error.code === 'EEXIST') {
          // Lock exists, wait and retry
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
        throw error;
      }
    }
    
    throw new Error(`Could not acquire lock for ${this.filePath} after ${maxRetries} attempts`);
  }

  async release() {
    try {
      await fs.unlink(this.lockPath);
    } catch (error) {
      // Ignore errors when releasing lock
      if (error.code !== 'ENOENT') {
        console.warn(`Failed to release lock for ${this.filePath}:`, error.message);
      }
    }
  }
}

class OrionWrapperV2 {
  constructor(projectId = DEFAULT_PROJECT_ID, taskId = null) {
    // Validate IDs to prevent path traversal
    this._validateId(projectId, 'projectId');
    if (taskId !== null) {
      this._validateId(taskId, 'taskId');
    }
    
    this.projectId = projectId;
    this.taskId = taskId;
    this.dataDir = path.join(__dirname, '..', 'data');
  }

  /**
   * Validate ID format to prevent path traversal
   * @param {string} id - The ID to validate
   * @param {string} fieldName - Field name for error message
   * @throws {Error} If validation fails
   */
  _validateId(id, fieldName) {
    const idRegex = /^[a-zA-Z0-9-]+$/;
    if (!idRegex.test(id)) {
      throw new Error(`${ERROR_MESSAGES.INVALID_ID_FORMAT} (${fieldName}: "${id}")`);
    }
  }

  /**
   * Get the conversation file path based on projectId and taskId
   * @returns {string} File path
   */
  getConversationFilePath() {
    const conversationsDir = path.join(this.dataDir, 'conversations');
    
    let fullPath;
    if (this.taskId) {
      fullPath = path.join(conversationsDir, `task_${this.taskId}.json`);
    } else {
      fullPath = path.join(conversationsDir, `project_${this.projectId}.json`);
    }
    
    // Convert to forward slashes for consistent testing across platforms
    return fullPath.replace(/\\/g, '/');
  }

  /**
   * Validate user message input
   * @param {any} userMessage - The message to validate
   * @throws {Error} If validation fails
   */
  _validateMessage(userMessage) {
    if (!userMessage) {
      throw new Error(ERROR_MESSAGES.EMPTY_MESSAGE);
    }
    
    if (typeof userMessage !== 'string') {
      throw new Error(ERROR_MESSAGES.INVALID_MESSAGE_TYPE);
    }
    
    if (userMessage.trim() === '') {
      throw new Error(ERROR_MESSAGES.EMPTY_MESSAGE);
    }
  }

  /**
   * Validate mode parameter
   * @param {string} mode - The mode to validate
   * @throws {Error} If validation fails
   */
  _validateMode(mode) {
    if (!VALID_MODES.includes(mode)) {
      throw new Error(ERROR_MESSAGES.INVALID_MODE);
    }
  }

  /**
   * Create a user message object with proper structure
   * @param {string} userMessage - The message content
   * @returns {Object} Formatted message object
   */
  _createUserMessageObject(userMessage) {
    return {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
      status: MESSAGE_STATUS.PENDING
    };
  }

  /**
   * Create a mock response for testing
   * @param {string} userMessage - Original user message
   * @param {string} mode - Operation mode
   * @returns {Object} Mock response object
   */
  _createMockResponse(userMessage, mode) {
    return {
      response_type: 'conversation',
      content: {
        message: `Mock response for: ${userMessage}`
      },
      metadata: {
        task_id: this.taskId,
        project_id: this.projectId,
        requires_action: false,
        next_step: null,
        timestamp: new Date().toISOString(),
        mode: mode
      }
    };
  }

  /**
   * Function 1: Receives Messages
   * 
   * Purpose: Accepts user input along with project/task context and mode (Plan/Act).
   * 
   * @param {string} userMessage - The message from the user
   * @param {string} mode - 'plan' or 'act'
   * @returns {Promise<Object>} - Parsed JSON response from Orion
   */
  async sendMessage(userMessage, mode = 'plan') {
    // Input validation
    this._validateMessage(userMessage);
    this._validateMode(mode);
    
    // Save user message to conversation file
    const userMessageObj = this._createUserMessageObject(userMessage);
    this.saveConversationHistory([userMessageObj]);
    
    // For now, return a mock response that satisfies test expectations
    // This will be replaced with actual Orion communication later
    return this._createMockResponse(userMessage, mode);
  }

  /**
   * Function 2: Prepares the Prompt
   * 
   * @param {string} userMessage 
   * @param {Array} conversationHistory 
   * @returns {string}
   */
  formatPrompt(userMessage, conversationHistory = []) {
    // Input validation (reuse validation from Function 1)
    this._validateMessage(userMessage);
    
    // Load system prompt
    const systemPrompt = this.loadSystemPrompt();
    
    // Format conversation history
    const formattedHistory = this._formatConversationHistory(conversationHistory);
    
    // Build the complete prompt
    let prompt = systemPrompt + '\n\n';
    
    if (formattedHistory) {
      prompt += 'Previous conversation:\n' + formattedHistory + '\n\n';
    }
    
    prompt += `User: ${userMessage}\n`;
    prompt += 'Orion (respond in JSON only):';
    
    return prompt;
  }

  /**
   * Function 3: Calls Cline via Proxy
   * 
   * @param {string} prompt 
   * @param {string} mode 
   * @returns {Promise<string>}
   */
  async executeCline(prompt, mode = 'plan') {
    // TODO: Implement Function 3
    throw new Error('Function 3 not implemented yet');
  }

  /**
   * Function 4: Validates Responses
   * 
   * @param {string} response 
   * @returns {Object|null}
   */
  validateJsonResponse(response) {
    // TODO: Implement Function 4
    throw new Error('Function 4 not implemented yet');
  }

  /**
   * Function 5: Handles Retries
   * 
   * @param {string} prompt 
   * @param {number} retryCount 
   * @returns {string}
   */
  getRetryPrompt(prompt, retryCount) {
    // TODO: Implement Function 5
    throw new Error('Function 5 not implemented yet');
  }

  /**
   * Function 6: Saves Conversations
   * 
   * @param {Array} history - Array of message objects to save
   */
  async saveConversationHistory(history) {
    const filePath = this.getConversationFilePath();
    const lock = new FileLock(filePath);
    
    try {
      // Acquire lock to prevent race conditions
      await lock.acquire();
      
      // Ensure directory exists
      const conversationsDir = path.join(this.dataDir, 'conversations');
      await fs.mkdir(conversationsDir, { recursive: true });
      
      let existingData = { conversations: [] };
      try {
        const fileContent = await fs.readFile(filePath, 'utf8');
        existingData = JSON.parse(fileContent);
      } catch (error) {
        if (error.code === 'ENOENT') {
          // File doesn't exist, that's fine - we'll create it
          existingData = { conversations: [] };
        } else if (error instanceof SyntaxError) {
          // JSON parse error - corrupted file
          throw new Error('Corrupted conversation file detected');
        } else {
          // Other read error
          throw error;
        }
      }
      
      // Ensure conversations array exists
      if (!existingData.conversations) {
        existingData.conversations = [];
      }
      
      // Add metadata if it doesn't exist
      if (!existingData.metadata) {
        existingData.metadata = {
          project_id: this.projectId,
          task_id: this.taskId,
          last_updated: new Date().toISOString(),
          message_count: 0
        };
      }
      
      // Add new messages
      existingData.conversations.push(...history);
      
      // Update metadata
      existingData.metadata.last_updated = new Date().toISOString();
      existingData.metadata.message_count = existingData.conversations.length;
      
      // Write to file
      await fs.writeFile(filePath, JSON.stringify(existingData, null, 2), 'utf8');
      
    } finally {
      // Always release the lock
      await lock.release();
    }
  }

  /**
   * Function 7: Updates Task Status
   * 
   * @param {Array} updates 
   */
  updateTaskStatus(updates) {
    // TODO: Implement Function 7
    throw new Error('Function 7 not implemented yet');
  }

  /**
   * Function 8: Manages Context
   * 
   * @returns {string}
   */
  loadSystemPrompt() {
    const systemPromptPath = path.join(__dirname, 'system_prompt_orion.md');
    
    try {
      // Read the system prompt file synchronously for simplicity
      // In production, this could be cached or loaded asynchronously
      const systemPrompt = require('fs').readFileSync(systemPromptPath, 'utf8');
      return systemPrompt;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`System prompt file not found at: ${systemPromptPath}`);
      }
      throw new Error(`Failed to load system prompt: ${error.message}`);
    }
  }

  /**
   * Format conversation history into readable text
   * @param {Array} conversationHistory 
   * @returns {string}
   */
  _formatConversationHistory(conversationHistory) {
    if (!conversationHistory || conversationHistory.length === 0) {
      return '';
    }
    
    // Limit history to last 10 messages to avoid token limits
    const limitedHistory = conversationHistory.slice(-10);
    
    return limitedHistory.map(message => {
      const role = message.role === 'user' ? 'User' : 'Orion';
      return `${role}: ${message.content}`;
    }).join('\n');
  }

  /**
   * Function 9: Manages Errors
   * 
   * @param {Error} error 
   * @param {string} context 
   */
  logError(error, context = '') {
    // TODO: Implement Function 9
    throw new Error('Function 9 not implemented yet');
  }
}

module.exports = OrionWrapperV2;
