const express = require('express');
const path = require('path');
const fs = require('fs');
const OrionWrapper = require('../agents/orion-wrapper');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS - allow frontend (running on port 5179) to access backend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5179');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Data directory
const dataDir = path.join(__dirname, '..', 'data');

/**
 * Ensure data directories exist
 */
function ensureDataDirs() {
  const dirs = [
    dataDir,
    path.join(dataDir, 'conversations'),
    path.join(dataDir, 'logs')
  ];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

/**
 * Read a JSON file, stripping BOM if present
 */
function readJSONFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  let content = fs.readFileSync(filePath, 'utf8');
  // Remove BOM if present (UTF-8 BOM is EFBBBF, which becomes \uFEFF when read as a string)
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  // Also remove any other non-ASCII characters at the start (like zero-width spaces)
  content = content.replace(/^[\u00A0\u2000-\u200F\u2028\u2029\uFFEF]+/, '');
  content = content.trim();
  if (content === '') {
    return {};
  }
  try {
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error parsing JSON file ${filePath}:`, error.message);
    // Return an empty object as fallback
    return {};
  }
}

/**
 * Get project and task IDs from request
 */
function getIds(req) {
  // Use optional chaining to safely access properties
  const projectId = req?.params?.projectId || req?.body?.projectId || req?.query?.projectId || 'P-001';
  const taskId = req?.params?.taskId || req?.body?.taskId || req?.query?.taskId || null;
  return { projectId, taskId };
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Orion Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/chat
 * Send a message to Orion
 * Request body: { message: string, projectId?: string, taskId?: string, mode?: string }
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { message, projectId, taskId, mode = 'plan' } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid message',
        required: 'message (string)'
      });
    }

    // Validate mode
    if (mode !== 'plan' && mode !== 'act') {
      return res.status(400).json({
        error: 'Invalid mode',
        details: 'Mode must be either "plan" or "act"'
      });
    }

    const wrapper = new OrionWrapper(projectId || 'P-001', taskId || null);
    const response = await wrapper.sendMessage(message, mode);
    
    res.json(response);
  } catch (error) {
    console.error('Error in /api/chat:', error);
    res.status(500).json({
      error: 'Failed to process message',
      details: error.message
    });
  }
});

/**
 * GET /api/poll
 * GET /api/poll/:projectId
 * GET /api/poll/:projectId/:taskId
 * Poll for updates (Task 1.8 - frontend polls every 10 seconds)
 * Returns latest conversation updates and task status changes
 */
const handlePoll = (req, res) => {
  try {
    const { projectId, taskId } = getIds(req);
    
    // Determine conversation file path
    let conversationPath;
    if (taskId) {
      conversationPath = path.join(dataDir, 'conversations', `task_${taskId}.json`);
    } else {
      conversationPath = path.join(dataDir, 'conversations', `project_${projectId}.json`);
    }
    
    // Read conversation file to get latest messages
    let lastMessages = [];
    let lastUpdateTime = null;
    
    if (fs.existsSync(conversationPath)) {
      const data = readJSONFile(conversationPath);
      const conversations = data.conversations || [];
      // Get last 5 messages
      lastMessages = conversations.slice(-5);
      if (conversations.length > 0) {
        lastUpdateTime = conversations[conversations.length - 1].timestamp;
      }
    }
    
    // Read tasks.json for task status updates
    const tasksPath = path.join(dataDir, 'tasks.json');
    let taskUpdates = [];
    if (fs.existsSync(tasksPath)) {
      const tasksData = readJSONFile(tasksPath);
      const tasks = tasksData.tasks || {};
      
      // Filter tasks for this project/task if needed
      Object.values(tasks).forEach(task => {
        // If taskId is provided, only include that task
        if (taskId && task.id !== taskId) return;
        // If projectId is provided, only include tasks from that project
        // Assuming task.id format: P-001-T-001
        if (projectId && !task.id.startsWith(projectId)) return;
        
        taskUpdates.push({
          id: task.id,
          status: task.status,
          updated_at: task.updated_at,
          last_message: task.last_message
        });
      });
    }
    
    res.json({
      projectId,
      taskId,
      lastUpdateTime,
      messages: lastMessages,
      taskUpdates,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in /api/poll:', error);
    res.status(500).json({
      error: 'Failed to poll for updates',
      details: error.message
    });
  }
};

// Define poll routes
app.get('/api/poll', handlePoll);
app.get('/api/poll/:projectId', handlePoll);
app.get('/api/poll/:projectId/:taskId', handlePoll);

/**
 * GET /api/conversations
 * GET /api/conversations/:projectId
 * GET /api/conversations/:projectId/:taskId
 * Get conversation history for a project or task
 */
const handleConversations = (req, res) => {
  try {
    const { projectId, taskId } = getIds(req);
    
    let conversationPath;
    if (taskId) {
      conversationPath = path.join(dataDir, 'conversations', `task_${taskId}.json`);
    } else {
      conversationPath = path.join(dataDir, 'conversations', `project_${projectId}.json`);
    }
    
    if (!fs.existsSync(conversationPath)) {
      return res.json({
        projectId,
        taskId,
        conversations: [],
        count: 0
      });
    }
    
    const data = readJSONFile(conversationPath);
    const conversations = data.conversations || [];
    
    res.json({
      projectId,
      taskId,
      conversations,
      count: conversations.length
    });
  } catch (error) {
    console.error('Error in /api/conversations:', error);
    res.status(500).json({
      error: 'Failed to fetch conversations',
      details: error.message
    });
  }
};

// Define conversations routes
app.get('/api/conversations', handleConversations);
app.get('/api/conversations/:projectId', handleConversations);
app.get('/api/conversations/:projectId/:taskId', handleConversations);

/**
 * GET /api/projects
 * List all projects (based on conversation files)
 */
app.get('/api/projects', (req, res) => {
  try {
    const conversationsDir = path.join(dataDir, 'conversations');
    const files = fs.existsSync(conversationsDir) ? fs.readdirSync(conversationsDir) : [];
    
    const projects = files
      .filter(file => file.startsWith('project_') && file.endsWith('.json'))
      .map(file => ({
        id: file.replace('project_', '').replace('.json', ''),
        name: `Project ${file.replace('project_', '').replace('.json', '')}`,
        type: 'project'
      }));
    
    const tasks = files
      .filter(file => file.startsWith('task_') && file.endsWith('.json'))
      .map(file => ({
        id: file.replace('task_', '').replace('.json', ''),
        name: `Task ${file.replace('task_', '').replace('.json', '')}`,
        type: 'task'
      }));
    
    res.json({
      projects,
      tasks,
      count: projects.length + tasks.length
    });
  } catch (error) {
    console.error('Error in /api/projects:', error);
    res.status(500).json({
      error: 'Failed to list projects',
      details: error.message
    });
  }
});

// Start server
ensureDataDirs();
app.listen(PORT, () => {
  console.log(`Orion backend server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Chat endpoint: POST http://localhost:${PORT}/api/chat`);
  console.log(`Poll endpoint: GET http://localhost:${PORT}/api/poll`);
});
