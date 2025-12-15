const express = require('express');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
// OrionWrapperV2 removed - archived
// const OrionWrapperV2 = require("../agents/orion-wrapper-v2");
const { features, tasks, subtasks } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Make dataDir configurable via environment variable or parameter
// Note: data directory is now in archive/data (temporary)
let dataDir = process.env.DATA_DIR || path.join(__dirname, "..", "archive", "data");

// Custom error handling middleware for JSON parsing errors
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: "Invalid JSON",
      details: "The request body contains malformed JSON"
    });
  }
  
  // Handle payload too large errors
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: "Payload too large",
      details: "The request body exceeds the size limit"
    });
  }
  
  next(err);
});

// Middleware with payload size limit (1MB)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// CORS - allow frontend (running on any port) to access backend
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header("Access-Control-Allow-Origin", origin);
  } else {
    res.header("Access-Control-Allow-Origin", "*");
  }
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

/**
 * Set data directory (for testing)
 */
function setDataDir(newDataDir) {
  dataDir = newDataDir;
}

/**
 * Ensure data directories exist
 */
function ensureDataDirs() {
  const dirs = [
    dataDir,
    path.join(dataDir, "conversations"),
    path.join(dataDir, "logs"),
  ];
  dirs.forEach((dir) => {
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
  let content = fs.readFileSync(filePath, "utf8");
  // Remove BOM if present (UTF-8 BOM is EFBBBF, which becomes \uFEFF when read as a string)
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
  }
  // Also remove any other non-ASCII characters at the start (like zero-width spaces)
  content = content.replace(/^[\u00A0\u2000-\u200F\u2028\u2029\uFFEF]+/, "");
  content = content.trim();
  if (content === "") {
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
  const projectId =
    req?.params?.projectId ||
    req?.body?.projectId ||
    req?.query?.projectId ||
    "P-001";
  const taskId =
    req?.params?.taskId || req?.body?.taskId || req?.query?.taskId || null;
  return { projectId, taskId };
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Orion Backend",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/chat
 * Send a message to Orion
 * Request body: { message: string, projectId?: string, taskId?: string, mode?: string }
 */
app.post("/api/chat", async (req, res) => {
  try {
    const { message, projectId, taskId, mode = "plan" } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Missing or invalid message",
        required: "message (string)",
      });
    }

    // Validate mode
    if (mode !== "plan" && mode !== "act") {
      return res.status(400).json({
        error: "Invalid mode",
        details: 'Mode must be either "plan" or "act"',
      });
    }

    // Placeholder response during architecture shift
    res.json({
      response_type: "conversation",
      message: "The system is currently being upgraded to a new architecture. Chat functionality will return soon.",
      note: "Architecture shift in progress - moving to PostgreSQL and external agents (Aider/OpenCode)",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error in /api/chat:", error);
    res.status(500).json({
      error: "Failed to process message",
      details: error.message,
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
      conversationPath = path.join(
        dataDir,
        "conversations",
        `task_${taskId}.json`
      );
    } else {
      conversationPath = path.join(
        dataDir,
        "conversations",
        `project_${projectId}.json`
      );
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
    const tasksPath = path.join(dataDir, "tasks.json");
    let taskUpdates = [];
    if (fs.existsSync(tasksPath)) {
      const tasksData = readJSONFile(tasksPath);
      const tasks = tasksData.tasks || {};

      // Filter tasks for this project/task if needed
      Object.values(tasks).forEach((task) => {
        // If taskId is provided, only include that task
        if (taskId && task.id !== taskId) return;
        // If projectId is provided, only include tasks from that project
        // Assuming task.id format: P-001-T-001
        if (projectId && !task.id.startsWith(projectId)) return;

        taskUpdates.push({
          id: task.id,
          status: task.status,
          updated_at: task.updated_at,
          last_message: task.last_message,
        });
      });
    }

    res.json({
      projectId,
      taskId,
      lastUpdateTime,
      messages: lastMessages,
      taskUpdates,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in /api/poll:", error);
    res.status(500).json({
      error: "Failed to poll for updates",
      details: error.message,
    });
  }
};

// Define poll routes
app.get("/api/poll", handlePoll);
app.get("/api/poll/:projectId", handlePoll);
app.get("/api/poll/:projectId/:taskId", handlePoll);

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
      conversationPath = path.join(
        dataDir,
        "conversations",
        `task_${taskId}.json`
      );
    } else {
      conversationPath = path.join(
        dataDir,
        "conversations",
        `project_${projectId}.json`
      );
    }

    if (!fs.existsSync(conversationPath)) {
      return res.json({
        projectId,
        taskId,
        conversations: [],
        count: 0,
      });
    }

    const data = readJSONFile(conversationPath);
    const conversations = data.conversations || [];

    res.json({
      projectId,
      taskId,
      conversations,
      count: conversations.length,
    });
  } catch (error) {
    console.error("Error in /api/conversations:", error);
    res.status(500).json({
      error: "Failed to fetch conversations",
      details: error.message,
    });
  }
};

// Define conversations routes
app.get("/api/conversations", handleConversations);
app.get("/api/conversations/:projectId", handleConversations);
app.get("/api/conversations/:projectId/:taskId", handleConversations);

/**
 * GET /api/projects
 * List all projects (based on conversation files)
 */
app.get("/api/projects", (req, res) => {
  try {
    const conversationsDir = path.join(dataDir, "conversations");
    const files = fs.existsSync(conversationsDir)
      ? fs.readdirSync(conversationsDir)
      : [];

    const projects = files
      .filter((file) => file.startsWith("project_") && file.endsWith(".json"))
      .map((file) => ({
        id: file.replace("project_", "").replace(".json", ""),
        name: `Project ${file.replace("project_", "").replace(".json", "")}`,
        type: "project",
      }));

    const tasks = files
      .filter((file) => file.startsWith("task_") && file.endsWith(".json"))
      .map((file) => ({
        id: file.replace("task_", "").replace(".json", ""),
        name: `Task ${file.replace("task_", "").replace(".json", "")}`,
        type: "task",
      }));

    res.json({
      projects,
      tasks,
      count: projects.length + tasks.length,
    });
  } catch (error) {
    console.error("Error in /api/projects:", error);
    res.status(500).json({
      error: "Failed to list projects",
      details: error.message,
    });
  }
});

/**
 * GET /api/project
 * Get the project structure with features, tasks, and subtasks from database
 */
app.get("/api/project", async (req, res) => {
  try {
    // Get all features with their tasks and subtasks
    const allFeatures = await features.getAll();
    
    // Get all tasks (they are already included in features.getAll() but we need them for subtasks)
    const allTasks = await tasks.getAll();
    
    // Get all subtasks
    const allSubtasks = await subtasks.getAll();

    // Transform the data to match the frontend expected structure
    const transformedData = {
      features: allFeatures.map(feature => ({
        id: feature.id,
        title: feature.title,
        description: feature.description,
        status: feature.status,
        order_index: feature.order_index,
        created_at: feature.created_at,
        updated_at: feature.updated_at,
        // Include tasks from the feature object (already aggregated by the query)
        tasks: feature.tasks || []
      })),
      tasks: {},
      subtasks: {}
    };

    // Populate tasks map
    allTasks.forEach(task => {
      transformedData.tasks[task.id] = {
        id: task.id,
        feature_id: task.feature_id,
        title: task.title,
        description: task.description,
        status: task.status,
        agent: task.agent,
        created_at: task.created_at,
        updated_at: task.updated_at,
        subtasks: task.subtasks || []
      };
    });

    // Populate subtasks map
    allSubtasks.forEach(subtask => {
      transformedData.subtasks[subtask.id] = {
        id: subtask.id,
        task_id: subtask.task_id,
        feature_id: subtask.feature_id,
        title: subtask.title,
        description: subtask.description,
        status: subtask.status,
        agent: subtask.agent,
        dependencies: subtask.dependencies || [],
        priority: subtask.priority,
        estimated_time: subtask.estimated_time,
        risk_level: subtask.risk_level,
        created_at: subtask.created_at,
        updated_at: subtask.updated_at,
        activity_log: subtask.activity_logs || []
      };
    });

    res.json(transformedData);
  } catch (error) {
    console.error("Error in /api/project:", error);
    res.status(500).json({
      error: "Failed to fetch project data",
      details: error.message,
    });
  }
});

/**
 * GET /api/subtask/:subtaskId
 * Get full subtask details from database
 */
app.get("/api/subtask/:subtaskId", async (req, res) => {
  try {
    const { subtaskId } = req.params;

    const subtask = await subtasks.getById(subtaskId);
    if (!subtask) {
      return res.status(404).json({
        error: "Subtask not found",
        details: `Subtask ${subtaskId} does not exist`,
      });
    }

    res.json(subtask);
  } catch (error) {
    console.error("Error in /api/subtask:", error);
    res.status(500).json({
      error: "Failed to fetch subtask data",
      details: error.message,
    });
  }
});

/**
 * POST /api/subtask/:subtaskId/activity
 * Add an activity log entry to a subtask (database version)
 * Request body: {
 *   type: "clarification_question" | "progress_update" | "test_result" | "escalation" | "general",
 *   agent: string,
 *   content: string,
 *   status?: "open" | "answered" | "resolved" | "escalated",
 *   parent_id?: string,
 *   attachments?: string[],
 *   metadata?: object
 * }
 */
app.post("/api/subtask/:subtaskId/activity", async (req, res) => {
  try {
    const { subtaskId } = req.params;
    const activity = req.body;

    // Check if subtask exists
    const subtask = await subtasks.getById(subtaskId);
    if (!subtask) {
      return res.status(404).json({
        error: "Subtask not found",
        details: `Subtask ${subtaskId} does not exist`,
      });
    }

    // Validate required fields
    if (!activity.type || !activity.agent || !activity.content) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["type", "agent", "content"],
      });
    }

    // Prepare activity data for database
    const activityData = {
      type: activity.type,
      agent: activity.agent,
      content: activity.content,
      status: activity.status || "open",
      parent_id: activity.parent_id || null,
      attachments: activity.attachments || [],
      metadata: activity.metadata || {}
    };

    // Add to database
    const newActivity = await subtasks.addActivityLog(subtaskId, activityData);

    // Return response
    res.json({
      success: true,
      activity: {
        id: newActivity.id,
        type: newActivity.type,
        agent: newActivity.agent,
        content: newActivity.content,
        timestamp: newActivity.timestamp,
        status: newActivity.status,
        parent_id: newActivity.parent_id,
        attachments: newActivity.attachments,
        metadata: newActivity.metadata
      },
      updated_at: newActivity.timestamp,
    });
  } catch (error) {
    console.error("Error in /api/subtask/:subtaskId/activity:", error);
    res.status(500).json({
      error: "Failed to add activity",
      details: error.message,
    });
  }
});

/**
 * POST /api/orion/response
 * Process Orion's JSON responses and update subtask system
 * Note: Temporarily simplified during architecture shift
 */
app.post("/api/orion/response", async (req, res) => {
  try {
    const orionResponse = req.body;
    
    // Validate required fields
    if (!orionResponse.response_type) {
      return res.status(422).json({
        error: "Missing required field",
        required: "response_type",
        errors: ["response_type is required"]
      });
    }
    
    // Validate task ID to prevent path traversal
    let taskId = null;
    if (orionResponse.task_updates && orionResponse.task_updates.task_id) {
      taskId = orionResponse.task_updates.task_id;
      
      // Check for path traversal attempts
      if (taskId.includes('..') || taskId.includes('/') || taskId.includes('\\')) {
        return res.status(400).json({
          error: "Invalid task ID",
          details: "Task ID contains invalid characters"
        });
      }
    }

    // If no task ID in response, try to extract from cdp_analysis or message
    if (!taskId && orionResponse.cdp_analysis && orionResponse.cdp_analysis.quick) {
      // Look for task ID in atomic actions or resources touched
      const quick = orionResponse.cdp_analysis.quick;
      const allText = JSON.stringify(quick).toLowerCase();
      const taskIdMatch = allText.match(/p\d+-t\d+-s\d+/i);
      if (taskIdMatch) {
        taskId = taskIdMatch[0];
      }
    }

    if (!taskId) {
      return res.status(422).json({
        error: "Could not determine task ID from response",
        details: "Include task_updates.task_id or reference a task ID in cdp_analysis",
        errors: ["task_id is required"]
      });
    }

    console.log(`Processing Orion response for task: ${taskId}`);

    // Update subtask file
    const subtaskPath = path.join(dataDir, "subtasks", `${taskId}.json`);
    
    let subtask;
    if (!fs.existsSync(subtaskPath)) {
      // Create new subtask if it doesn't exist
      subtask = {
        id: taskId,
        task_id: taskId.split('-').slice(0, 2).join('-'), // Extract parent task ID
        title: `Task ${taskId}`,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: 'orion',
        activity_log: []
      };
    } else {
      subtask = readJSONFile(subtaskPath);
    }
    
    // Update task status if provided
    if (orionResponse.task_updates) {
      subtask.status = orionResponse.task_updates.status || subtask.status;
      subtask.updated_at = new Date().toISOString();
      subtask.updated_by = "orion";
    }

    // Add activity log entry for this response
    if (!subtask.activity_log) {
      subtask.activity_log = [];
    }

    const activityEntry = {
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: "progress_update",
      agent: "orion",
      content: `Orion response processed: ${orionResponse.response_type}. ${orionResponse.message || ''}`,
      timestamp: new Date().toISOString(),
      status: "resolved",
      parent_id: null,
      replies: [],
      attachments: [],
      metadata: {
        response_type: orionResponse.response_type,
        workflow_step: orionResponse.workflow_step,
        note: "Script execution skipped during architecture shift"
      }
    };

    // Include CDP analysis in metadata if present
    if (orionResponse.cdp_analysis) {
      activityEntry.metadata.cdp_analysis = orionResponse.cdp_analysis;
    }

    subtask.activity_log.push(activityEntry);

    // Write updated subtask back to file
    fs.writeFileSync(subtaskPath, JSON.stringify(subtask, null, 2));
    console.log(`Updated subtask file for ${taskId}`);

    // Note: Script execution (populate_subtask_details.js, add_lightweight_subtasks.js) 
    // is temporarily disabled during architecture shift
    
    return res.json({
      success: true,
      task_id: taskId,
      response_type: orionResponse.response_type,
      updated_at: subtask.updated_at,
      activity_id: activityEntry.id,
      note: "Orion response recorded (scripts skipped during architecture shift)"
    });

  } catch (error) {
    console.error("Error in /api/orion/response:", error);
    res.status(500).json({
      error: "Failed to process Orion response",
      details: error.message,
      task_id: req.body.task_updates?.task_id || "unknown",
    });
  }
});

// Start server if this file is run directly
if (require.main === module) {
  ensureDataDirs();
  app.listen(PORT, () => {
    console.log(`Orion backend server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log(`Chat endpoint: POST http://localhost:${PORT}/api/chat`);
    console.log(`Poll endpoint: GET http://localhost:${PORT}/api/poll`);
  });
}

// Export app and functions for testing
module.exports = {
  app,
  setDataDir,
  ensureDataDirs
};
