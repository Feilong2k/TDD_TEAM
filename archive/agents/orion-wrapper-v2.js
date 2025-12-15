#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const http = require('http');

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
  constructor(projectId = DEFAULT_PROJECT_ID, taskId = null, proxyUrl = 'http://192.168.0.4:9001/orion') {
    // Validate IDs to prevent path traversal
    this._validateId(projectId, 'projectId');
    if (taskId !== null) {
      this._validateId(taskId, 'taskId');
    }
    
    this.projectId = projectId;
    this.taskId = taskId;
    this.proxyUrl = proxyUrl;
    this.dataDir = path.join(__dirname, '..', 'data');
    this.maxRetries = 2; // For JSON validation retries
    this.context = this.loadSystemPrompt(); // Use system prompt as context
  }

  /**
   * Validate IDs to prevent path traversal
   * @param {string} id - The ID to validate
   * @param {string} fieldName - Name of the field for error messages
   * @throws {Error} If validation fails
   */
  _validateId(id, fieldName) {
    // Basic validation - alphanumeric and hyphens only
    const validIdPattern = /^[a-zA-Z0-9\-]+$/;
    if (!validIdPattern.test(id)) {
      throw new Error(`${fieldName} contains invalid characters: ${id}`);
    }
  }

  /**
   * Get the path for the conversation file.
   * If taskId is provided, use task-specific conversation file.
   * Otherwise, use project-wide conversation file.
   */
  getConversationFilePath() {
    if (this.taskId) {
      return path.join(this.dataDir, 'conversations', `task_${this.taskId}.json`);
    } else {
      return path.join(this.dataDir, 'conversations', `project_${this.projectId}.json`);
    }
  }

  /**
   * Validate message parameter
   * @param {string} userMessage - The message to validate
   * @throws {Error} If validation fails
   */
  _validateMessage(userMessage) {
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
   * Send command to HTTP proxy
   * @param {Array} clineCommand - Array of command arguments starting with 'cline'
   * @param {string} context - Optional context to set on the default instance
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<string>} stdout from command
   */
  async sendToProxy(clineCommand, context = null, timeout = 10000) {
    if (!Array.isArray(clineCommand) || clineCommand[0] !== 'cline') {
      throw new Error('Invalid command format: must be array starting with "cline"');
    }

    const proxyUrl = new URL(this.proxyUrl);
    const postData = JSON.stringify({ 
      context: context || this.context,
      clineCommand 
    });
    
    const options = {
      hostname: proxyUrl.hostname,
      port: proxyUrl.port,
      path: proxyUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        
        // Check if response is JSON
        const contentType = res.headers['content-type'];
        if (!contentType || !contentType.includes('application/json')) {
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            reject(new Error(`Proxy returned non-JSON response (status: ${res.statusCode}): ${data.substring(0, 200)}`));
          });
          return;
        }
        
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode !== 200 || parsed.exitCode !== 0) {
              const errorMsg = parsed.error || parsed.stderr || `HTTP ${res.statusCode}`;
              reject(new Error(`Proxy error: ${errorMsg}`));
              return;
            }
            resolve(parsed.stdout);
          } catch (error) {
            reject(new Error(`Failed to parse proxy response: ${error.message}`));
          }
        });
      });
      
      req.on('error', (err) => {
        reject(new Error(`Failed to connect to proxy: ${err.message}`));
      });
      
      // Set timeout
      req.setTimeout(timeout, () => {
        req.destroy();
        reject(new Error(`Proxy request timeout (${timeout}ms)`));
      });
      
      req.write(postData);
      req.end();
    });
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
    
    // Format the prompt with conversation history
    const conversationHistory = await this._loadConversationHistory();
    const prompt = await this.formatPrompt(userMessage, conversationHistory);
    
    // Call Cline via proxy (Function 3)
    const response = await this.executeCline(prompt, mode);
    
    // Validate the response (Function 4)
    const validatedResponse = this.validateJsonResponse(JSON.stringify(response));
    if (!validatedResponse) {
      throw new Error('Invalid response format from Cline');
    }
    
    // Save Orion's response to conversation file
    const orionMessageObj = {
      role: 'assistant',
      content: JSON.stringify(validatedResponse),
      timestamp: new Date().toISOString(),
      status: MESSAGE_STATUS.COMPLETED
    };
    this.saveConversationHistory([orionMessageObj]);
    
    return validatedResponse;
  }

  /**
   * Function 2: Prepares the Prompt
   * 
   * @param {string} userMessage 
   * @param {Array} conversationHistory 
   * @param {number} [historyLimit] - Optional limit for conversation history in context aggregation
   * @returns {Promise<string>}
   */
  async formatPrompt(userMessage, conversationHistory = [], historyLimit = 10) {
    // Input validation (reuse validation from Function 1)
    this._validateMessage(userMessage);
    
    // Load system prompt
    const systemPrompt = this.loadSystemPrompt();
    
    // Aggregate project context
    const projectContext = await this.aggregateProjectContext(null, historyLimit);
    
    // Format conversation history
    const formattedHistory = this._formatConversationHistory(conversationHistory, historyLimit);
    
    // Build the complete prompt
    let prompt = systemPrompt + '\n\n';
    
    // Add project context if available
    if (projectContext && Object.keys(projectContext).length > 0) {
      prompt += '## Project Context\n';
      prompt += this._formatProjectContext(projectContext) + '\n\n';
    }
    
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
   * @param {string} prompt - The formatted prompt to send
   * @param {string} mode - 'plan' or 'act' mode
   * @param {Object} options - Optional configuration
   * @param {number} options.timeout - Request timeout in ms (default: 10000)
   * @param {number} options.maxRetries - Maximum retry attempts (default: 3)
   * @param {number} options.baseDelay - Base delay for exponential backoff (default: 1000)
   * @returns {Promise<Object>} - Parsed JSON response from Cline
   */
  async executeCline(prompt, mode = 'plan', options = {}) {
    // Validate inputs
    this._validateMessage(prompt);
    this._validateMode(mode);
    
    // Configuration with defaults
    const config = {
      timeout: options.timeout || 10000, // 10 seconds
      maxRetries: options.maxRetries || 3,
      baseDelay: options.baseDelay || 1000, // 1 second
    };
    
    let lastError = null;
    
    // Retry loop
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        // Build Cline command array
        const clineCommand = [
          'cline',
          'task', 'new',
          '--mode', mode,
          '--output-format', 'json',
          '--no-interactive',
          prompt
        ];
        
        // For act mode, also add -y flag (though --no-interactive already does similar)
        if (mode === 'act') {
          clineCommand.push('-y');
        }
        
        console.log(`Running Cline command via proxy (mode: ${mode})...`);
        
        // Send command to proxy
        const stdout = await this.sendToProxy(clineCommand, this.context, config.timeout);
        
        // Extract JSON using regex to handle any surrounding text
        const jsonMatch = stdout.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in Cline response');
        }
        
        const parsedResponse = JSON.parse(jsonMatch[0]);
        
        // Log success
        console.log(`Cline call successful (attempt ${attempt + 1}/${config.maxRetries + 1})`);
        
        return parsedResponse;
        
      } catch (error) {
        lastError = error;
        
        // Check if we should retry
        if (attempt < config.maxRetries) {
          // Calculate exponential backoff delay
          const delay = config.baseDelay * Math.pow(2, attempt);
          console.log(`Cline call failed (attempt ${attempt + 1}/${config.maxRetries + 1}): ${error.message}. Retrying in ${delay}ms...`);
          
          // Wait for backoff delay
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        } else {
          // No more retries
          break;
        }
      }
    }
    
    // If we get here, all retries failed
    throw new Error(`Failed after ${config.maxRetries} retries: ${lastError.message}`);
  }

  /**
   * Function 4: Validates Responses
   * 
   * @param {string|Object} response 
   * @returns {Object|null}
   */
  validateJsonResponse(response) {
    // If response is already an object, check its structure
    if (typeof response === 'object' && response !== null) {
      // Basic validation: check for required fields if any
      // For now, just return the object
      return response;
    }
    
    // If it's a string, try to parse it
    if (typeof response === 'string') {
      try {
        const parsed = JSON.parse(response);
        // Again, check if it's an object
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed;
        } else {
          console.error('Parsed response is not an object');
          return null;
        }
      } catch (error) {
        console.error('Failed to parse JSON response:', error.message);
        return null;
      }
    }
    
    // If it's neither object nor string, return null
    console.error('Response must be an object or a JSON string');
    return null;
  }

  /**
   * Function 5: Handles Retries
   * 
   * @param {string} prompt - The original prompt
   * @param {number} retryCount - Current retry attempt (0 = first attempt)
   * @returns {string} - Enhanced prompt for retry
   */
  getRetryPrompt(prompt, retryCount) {
    if (retryCount === 0) {
      return prompt; // First attempt, no modification needed
    }
    
    const retryMessages = [
      "Previous attempt failed. Please try again with the same prompt.",
      "Second attempt: The previous response was invalid or incomplete. Please provide a complete JSON response.",
      "Third attempt: Critical - we need a valid JSON response. Ensure your response includes all required fields and is properly formatted."
    ];
    
    const retryIndex = Math.min(retryCount - 1, retryMessages.length - 1);
    const retryInstruction = retryMessages[retryIndex];
    
    return `${prompt}\n\nIMPORTANT RETRY INSTRUCTION (Attempt ${retryCount + 1}): ${retryInstruction}`;
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
    const systemPromptPath = path.join(__dirname, 'system_prompt_orion_v2.md');
    
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
   * @param {number} [limit] - Optional limit for conversation history
   * @returns {string}
   */
  _formatConversationHistory(conversationHistory, limit = 10) {
    if (!conversationHistory || conversationHistory.length === 0) {
      return '';
    }
    
    // Limit history to specified number of messages to avoid token limits
    const limitedHistory = conversationHistory.slice(-limit);
    
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

  /**
   * Function 2 Extension: Aggregates Project Context
   * 
   * Gathers project structure, subtask details, conversation history, activity logs, and dependencies
   * 
   * @param {string} [taskId] - Optional task ID to filter context
   * @param {number} [historyLimit] - Optional limit for conversation history (default: 10)
   * @returns {Promise<Object>} Aggregated context object with structure:
   *   {
   *     project_structure: Object,
   *     subtask_details: Array,
   *     conversation_history: Array,
   *     dependencies: Array,
   *     activity_logs: Array
   *   }
   */
  async aggregateProjectContext(taskId = null, historyLimit = 10) {
    try {
      const context = {
        project_structure: await this._loadProjectStructure(),
        subtask_details: await this._loadSubtaskDetails(taskId),
        conversation_history: await this._loadConversationHistory(historyLimit),
        dependencies: await this._loadDependencies(),
        activity_logs: await this._loadActivityLogs(taskId)
      };
      
      // Filter out empty sections
      const filteredContext = {};
      for (const [key, value] of Object.entries(context)) {
        if (Array.isArray(value) && value.length > 0) {
          filteredContext[key] = value;
        } else if (value && typeof value === 'object' && Object.keys(value).length > 0) {
          filteredContext[key] = value;
        }
      }
      
      return filteredContext;
    } catch (error) {
      // Log error but return empty object to avoid breaking the prompt
      // Use generic error message to avoid information disclosure
      console.warn('Failed to aggregate project context');
      return {};
    }
  }

  /**
   * Format project context for inclusion in prompt
   * @param {Object} projectContext 
   * @returns {string}
   */
  _formatProjectContext(projectContext) {
    if (!projectContext || Object.keys(projectContext).length === 0) {
      return '';
    }
    
    const sections = [];
    
    if (projectContext.project_structure) {
      sections.push('### Project Structure\n' + 
        JSON.stringify(projectContext.project_structure, null, 2));
    }
    
    if (projectContext.subtask_details && projectContext.subtask_details.length > 0) {
      const subtaskSummary = projectContext.subtask_details
        .map(subtask => `- ${subtask.id}: ${subtask.title || 'No title'}`)
        .join('\n');
      sections.push('### Subtask Details\n' + subtaskSummary);
    }
    
    if (projectContext.conversation_history && projectContext.conversation_history.length > 0) {
      const historySummary = `Recent conversations: ${projectContext.conversation_history.length} messages`;
      sections.push('### Conversation History\n' + historySummary);
    }
    
    if (projectContext.dependencies && projectContext.dependencies.length > 0) {
      const depsSummary = projectContext.dependencies
        .map(dep => `- ${dep}`)
        .join('\n');
      sections.push('### Dependencies\n' + depsSummary);
    }
    
    if (projectContext.activity_logs && projectContext.activity_logs.length > 0) {
      const recentLogs = projectContext.activity_logs
        .slice(-5) // Last 5 activities
        .map(log => `- ${log.timestamp || 'Unknown time'}: ${log.action || 'Activity'}`)
        .join('\n');
      sections.push('### Recent Activity\n' + recentLogs);
    }
    
    return sections.join('\n\n');
  }

  /**
   * Load project structure from project.json
   * @returns {Promise<Object>} Project structure
   * @private
   */
  async _loadProjectStructure() {
    try {
      const projectPath = path.join(this.dataDir, 'project.json');
      const projectData = await fs.readFile(projectPath, 'utf8');
      return JSON.parse(projectData);
    } catch (error) {
      // Return empty object if file doesn't exist or can't be parsed
      return {};
    }
  }

  /**
   * Load subtask details for the current or specified task
   * @param {string} taskId - Optional task ID to filter
   * @returns {Promise<Array>} Subtask details
   * @private
   */
  async _loadSubtaskDetails(taskId = null) {
    const targetTaskId = taskId || this.taskId;
    if (!targetTaskId) {
      return [];
    }
    
    try {
      const subtaskPath = path.join(this.dataDir, 'subtasks', `${targetTaskId}.json`);
      const subtaskData = await fs.readFile(subtaskPath, 'utf8');
      const subtask = JSON.parse(subtaskData);
      
      return [{
        id: targetTaskId,
        title: subtask.notes || 'No title',
        instructions: subtask.instructions || {},
        key_considerations: subtask.key_considerations || [],
        dependencies: subtask.dependencies || []
      }];
    } catch (error) {
      // Return empty array if subtask file doesn't exist
      return [];
    }
  }

  /**
   * Load conversation history
   * @param {number} [limit] - Optional limit for conversation history
   * @returns {Promise<Array>} Conversation history
   * @private
   */
  async _loadConversationHistory(limit = null) {
    try {
      const conversationPath = this.getConversationFilePath();
      const conversationData = await fs.readFile(conversationPath, 'utf8');
      const conversation = JSON.parse(conversationData);
      
      const conversations = conversation.conversations || [];
      
      // Apply limit if specified
      if (limit !== null && limit > 0) {
        return conversations.slice(-limit);
      }
      
      return conversations;
    } catch (error) {
      // Return empty array if conversation file doesn't exist
      return [];
    }
  }

  /**
   * Load dependencies from project structure
   * @returns {Promise<Array>} Dependencies
   * @private
   */
  async _loadDependencies() {
    try {
      const projectStructure = await this._loadProjectStructure();
      if (projectStructure.dependencies) {
        return projectStructure.dependencies;
      }
      
      // Extract dependencies from phases/tasks if available
      const dependencies = [];
      if (projectStructure.phases) {
        projectStructure.phases.forEach(phase => {
          if (phase.tasks) {
            phase.tasks.forEach(task => {
              if (task.dependencies) {
                dependencies.push(...task.dependencies);
              }
            });
          }
        });
      }
      
      return [...new Set(dependencies)]; // Remove duplicates
    } catch (error) {
      return [];
    }
  }

  /**
   * Load activity logs for the current or specified task
   * @param {string} taskId - Optional task ID to filter
   * @returns {Promise<Array>} Activity logs
   * @private
   */
  async _loadActivityLogs(taskId = null) {
    const targetTaskId = taskId || this.taskId;
    if (!targetTaskId) {
      return [];
    }
    
    try {
      const subtaskPath = path.join(this.dataDir, 'subtasks', `${targetTaskId}.json`);
      const subtaskData = await fs.readFile(subtaskPath, 'utf8');
      const subtask = JSON.parse(subtaskData);
      
      return subtask.activity_log || [];
    } catch (error) {
      return [];
    }
  }
}

module.exports = OrionWrapperV2;
