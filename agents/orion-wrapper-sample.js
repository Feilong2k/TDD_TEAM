#!/usr/bin/env node

/**
 * Orion Wrapper for TDD Team - Advanced Version
 * 
 * This script wraps Cline-CLI to communicate with Orion (AI agent).
 * It ensures Orion responds in valid JSON format and handles retries.
 * It also manages conversation history and updates task status.
 * 
 * Usage:
 *   node orion-wrapper-advanced.js --message "Your message here" [--project P-001] [--task T-001]
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class OrionWrapper {
  constructor(projectId = 'P-001', taskId = null, instanceAddress = '127.0.0.1:38937') {
    this.projectId = projectId;
    this.taskId = taskId;
    this.systemPrompt = this.loadSystemPrompt();
    this.context = this.systemPrompt; // Use system prompt as context for Cline instance
    this.maxRetries = 2;
    this.dataDir = path.join(__dirname, '..', 'data');
    this.proxyUrl = 'http://192.168.0.4:9001/orion';
    this.instanceAddress = instanceAddress; // Use provided instance address
  }

  loadSystemPrompt() {
    const promptPath = path.join(__dirname, 'system_prompt_orion.md');
    try {
      return fs.readFileSync(promptPath, 'utf8');
    } catch (error) {
      console.error(`Error loading system prompt: ${error.message}`);
      return `You are Orion, an expert in TDD and software engineering. You must respond only in JSON format with the structure: { "response_type": "...", "content": {...}, "metadata": {...} }`;
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
   * Format the full prompt for Cline-CLI
   * @param {string} userMessage 
   * @param {Array} conversationHistory 
   * @returns {string}
   */
  formatPrompt(userMessage, conversationHistory = []) {
    let prompt = this.systemPrompt + '\n\n';
    
    // Add conversation history
    if (conversationHistory.length > 0) {
      prompt += 'Previous conversation:\n';
      conversationHistory.forEach(msg => {
        const role = msg.role === 'user' ? 'User' : 'Orion';
        prompt += `${role}: ${msg.content}\n`;
      });
      prompt += '\n';
    }

    // Add current message
    prompt += `User: ${userMessage}\n`;
    prompt += 'Orion (respond in JSON only):';

    return prompt;
  }

  /**
   * Send command to HTTP proxy
   * @param {Array} clineCommand - Array of command arguments starting with 'cline'
   * @param {string} instance - Instance address (e.g., '127.0.0.1:38937')
   * @param {string} context - Optional context to set on the instance
   * @returns {Promise<string>} stdout from command
   */
  async sendToProxy(clineCommand, instance = null, context = null) {
    if (!Array.isArray(clineCommand) || clineCommand[0] !== 'cline') {
      throw new Error('Invalid command format: must be array starting with "cline"');
    }

    // Use Node.js http module to avoid dependency on node-fetch
    const http = require('http');
    
    const proxyUrl = new URL(this.proxyUrl);
    const postData = JSON.stringify({ 
      instance: instance || this.instanceAddress,
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
      
      // Increase timeout for longer-running tasks
      req.setTimeout(120000, () => {
        req.destroy();
        reject(new Error('Proxy request timeout (120s)'));
      });
      
      req.write(postData);
      req.end();
    });
  }


  /**
   * Execute Cline-CLI command via HTTP proxy with automatic instance management
   * @param {string} prompt 
   * @param {string} mode - 'plan' or 'act'
   * @returns {Promise<string>}
   */
  async executeCline(prompt, mode = 'plan') {
    // Don't escape quotes - pass as raw string, the proxy will handle quoting
    const clineCommand = [
      'cline',
      'task', 'new',
      '--mode', mode,
      '--output-format', 'json',
      '--no-interactive'
    ];
    
    // For act mode, also add -y flag (though --no-interactive already does similar)
    if (mode === 'act') {
      clineCommand.push('-y');
    }
    
    clineCommand.push(prompt);
    
    console.log(`Running Cline command via proxy (mode: ${mode})...`);
    const stdout = await this.sendToProxy(clineCommand, this.instanceAddress, this.context);
    
    // Extract JSON using regex to handle any surrounding text
    const jsonMatch = stdout.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return jsonMatch[0];
    }
    
    // If no JSON found, return the whole stdout
    return stdout;
  }

  /**
   * Validate content based on response_type
   * @param {Object} parsed 
   * @returns {boolean}
   */
  validateContentByType(parsed) {
    const { response_type, content } = parsed;

    switch (response_type) {
      case 'clarification':
        return Array.isArray(content.questions) && content.questions.length > 0;
      case 'decomposition':
        return Array.isArray(content.subtasks) && content.subtasks.every(subtask =>
          subtask.id && subtask.title && subtask.description && subtask.assignee && subtask.status
        );
      case 'instruction':
        return typeof content.instructions === 'string' && content.instructions.trim().length > 0;
      case 'status_update':
        return Array.isArray(content.updates) && content.updates.every(update =>
          update.id && update.status
        );
      case 'conversation':
        return typeof content.message === 'string' && content.message.trim().length > 0;
      default:
        return false;
    }
  }

  /**
   * Validate and parse JSON response
   * @param {string} response 
   * @returns {Object|null} Parsed JSON or null if invalid
   */
  validateJsonResponse(response) {
    try {
      // Clean the response: remove any non-JSON text before/after
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('No JSON found in response');
        return null;
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Basic validation of required fields
      if (!parsed.response_type || !parsed.content || !parsed.metadata) {
        console.warn('JSON missing required fields');
        return null;
      }

      // Validate response_type
      const validTypes = ['clarification', 'decomposition', 'instruction', 'status_update', 'conversation'];
      if (!validTypes.includes(parsed.response_type)) {
        console.warn(`Invalid response_type: ${parsed.response_type}`);
        return null;
      }

      // Validate content based on type
      if (!this.validateContentByType(parsed)) {
        console.warn(`Invalid content for response_type: ${parsed.response_type}`);
        return null;
      }

      return parsed;
    } catch (error) {
      console.warn(`Invalid JSON: ${error.message}`);
      return null;
    }
  }

  /**
   * Load conversation history from file
   * @returns {Array}
   */
  loadConversationHistory() {
    const filePath = this.getConversationFilePath();
    try {
      if (!fs.existsSync(filePath)) {
        return [];
      }
      const data = fs.readFileSync(filePath, 'utf8');
      // Remove UTF-8 BOM if present
      const content = data.replace(/^\uFEFF/, '');
      const json = JSON.parse(content);
      return json.conversations || [];
    } catch (error) {
      console.error(`Error loading conversation history: ${error.message}`);
      console.error(`File path: ${filePath}`);
      console.error(`File content (first 200 chars): ${data ? data.substring(0, 200) : 'empty'}`);
      return [];
    }
  }

  /**
   * Save conversation history to file
   * @param {Array} history 
   */
  saveConversationHistory(history) {
    const filePath = this.getConversationFilePath();
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
      }
      const data = JSON.stringify({ conversations: history }, null, 2);
      fs.writeFileSync(filePath, data, 'utf8');
    } catch (error) {
      console.error(`Error saving conversation history: ${error.message}`);
    }
  }

  /**
   * Update task status in tasks.json
   * @param {Array} updates - Array of {id, status, message?}
   */
  updateTaskStatus(updates) {
    const tasksPath = path.join(this.dataDir, 'tasks.json');
    try {
      let tasksData = { tasks: {}, last_id: 'P-001-T-000' };
      if (fs.existsSync(tasksPath)) {
        const raw = fs.readFileSync(tasksPath, 'utf8');
        tasksData = JSON.parse(raw);
      }

      updates.forEach(update => {
        if (tasksData.tasks[update.id]) {
          tasksData.tasks[update.id].status = update.status;
          tasksData.tasks[update.id].updated_at = new Date().toISOString();
          if (update.message) {
            tasksData.tasks[update.id].last_message = update.message;
          }
        } else {
          // If task doesn't exist, create a minimal entry
          tasksData.tasks[update.id] = {
            id: update.id,
            status: update.status,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...(update.message && { last_message: update.message })
          };
        }
      });

      fs.writeFileSync(tasksPath, JSON.stringify(tasksData, null, 2), 'utf8');
      console.log(`Updated task status for: ${updates.map(u => u.id).join(', ')}`);
    } catch (error) {
      console.error(`Error updating task status: ${error.message}`);
    }
  }

  /**
   * Send a message to Orion with retry logic for JSON validation
   * @param {string} userMessage 
   * @param {string} mode - 'plan' or 'act'
   * @returns {Promise<Object>} Parsed JSON response
   */
  async sendMessage(userMessage, mode = 'plan') {
    // Load conversation history
    const conversationHistory = this.loadConversationHistory();
    let prompt = this.formatPrompt(userMessage, conversationHistory);
    
    let retries = 0;
    let lastError = null;

    while (retries <= this.maxRetries) {
      try {
        const rawResponse = await this.executeCline(prompt, mode);
        const parsedResponse = this.validateJsonResponse(rawResponse);

        if (parsedResponse) {
          // Save the new messages to conversation history
          const newHistory = [
            ...conversationHistory,
            { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
            { role: 'assistant', content: JSON.stringify(parsedResponse), timestamp: new Date().toISOString() }
          ];
          this.saveConversationHistory(newHistory);

          // If the response is a status_update, update tasks.json
          if (parsedResponse.response_type === 'status_update' && parsedResponse.content.updates) {
            this.updateTaskStatus(parsedResponse.content.updates);
          }

          return parsedResponse;
        } else {
          lastError = new Error('Invalid JSON response');
          console.warn(`Invalid JSON response, retry ${retries + 1}/${this.maxRetries}`);
        }
      } catch (error) {
        lastError = error;
        console.warn(`Error during Cline execution: ${error.message}`);
      }

      retries++;
      
      // If we're going to retry, modify the prompt to include a reminder
      if (retries <= this.maxRetries) {
        // Add a reminder about JSON format to the prompt for the next retry
        prompt = prompt + '\n\nRemember: You must respond with valid JSON only. Use the exact structure specified in the system prompt. If your previous response was not valid JSON, correct it.';
        console.log('Retrying with JSON reminder...');
      }
    }

    // If we've exhausted retries, log the failure and return a fallback response
    const errorMsg = `Failed to get valid JSON after ${this.maxRetries} retries. Last error: ${lastError?.message}`;
    console.error(errorMsg);
    
    // Log to a file for debugging
    const logPath = path.join(this.dataDir, 'logs', 'orion_errors.log');
    const logEntry = `${new Date().toISOString()} - ${errorMsg}\n`;
    try {
      const logDir = path.dirname(logPath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true, mode: 0o755 });
      }
      fs.appendFileSync(logPath, logEntry, { flag: 'a', mode: 0o644 });
    } catch (logError) {
      console.error(`Failed to write to log file: ${logError.message}`);
    }
    
    // Return a fallback response
    return {
      response_type: 'conversation',
      content: {
        message: `I apologize, but I'm having trouble formatting my response correctly. Please try again. (Error: ${lastError?.message})`
      },
      metadata: {
        task_id: this.taskId,
        project_id: this.projectId,
        requires_action: false,
        next_step: null,
        error: lastError?.message
      }
    };
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  let message = '';
  let projectId = 'P-001';
  let taskId = null;

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
    } else if (args[i] === '--help') {
      console.log(`
Usage: node orion-wrapper.js --message "Your message" [options]

Options:
  --message <text>    The message to send to Orion (required)
  --project <id>      Project ID (default: P-001)
  --task <id>         Task ID (optional)
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

  const wrapper = new OrionWrapper(projectId, taskId);
  
  wrapper.sendMessage(message)
    .then(response => {
      console.log(JSON.stringify(response, null, 2));
    })
    .catch(error => {
      console.error(`Fatal error: ${error.message}`);
      process.exit(1);
    });
}

module.exports = OrionWrapper;
