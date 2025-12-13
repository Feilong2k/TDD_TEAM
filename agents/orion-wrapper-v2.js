#!/usr/bin/env node

/**
 * Orion Wrapper v2 - Incremental TDD Implementation
 * 
 * This is a minimal skeleton for TDD implementation.
 * Functions will be implemented one at a time with tests.
 */

const fs = require('fs');
const path = require('path');

class OrionWrapperV2 {
  constructor(projectId = 'P-001', taskId = null) {
    this.projectId = projectId;
    this.taskId = taskId;
    this.dataDir = path.join(__dirname, '..', 'data');
  }

  /**
   * Get the conversation file path based on projectId and taskId
   * @returns {string} File path
   */
  getConversationFilePath() {
    const conversationsDir = path.join(this.dataDir, 'conversations');
    // Ensure directory exists
    if (!fs.existsSync(conversationsDir)) {
      fs.mkdirSync(conversationsDir, { recursive: true });
    }
    
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
    if (!userMessage) {
      throw new Error('Message cannot be empty');
    }
    
    if (typeof userMessage !== 'string') {
      throw new Error('Message must be a string');
    }
    
    if (userMessage.trim() === '') {
      throw new Error('Message cannot be empty');
    }
    
    const validModes = ['plan', 'act'];
    if (!validModes.includes(mode)) {
      throw new Error('Mode must be "plan" or "act"');
    }
    
    // Save user message to conversation file
    const userMessageObj = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };
    
    this.saveConversationHistory([userMessageObj]);
    
    // For now, return a mock response that satisfies test expectations
    // This will be replaced with actual Orion communication later
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
   * Function 2: Prepares the Prompt
   * 
   * @param {string} userMessage 
   * @param {Array} conversationHistory 
   * @returns {string}
   */
  formatPrompt(userMessage, conversationHistory = []) {
    // TODO: Implement Function 2
    throw new Error('Function 2 not implemented yet');
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
  saveConversationHistory(history) {
    const filePath = this.getConversationFilePath();
    
    let existingData = { conversations: [] };
    if (fs.existsSync(filePath)) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        existingData = JSON.parse(fileContent);
      } catch (error) {
        // If there's an error reading or parsing, start fresh
        existingData = { conversations: [] };
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
    fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2), 'utf8');
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
    // TODO: Implement Function 8
    throw new Error('Function 8 not implemented yet');
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
