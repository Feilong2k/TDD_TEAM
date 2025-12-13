const express = require('express');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const OrionWrapperV2 = require("../agents/orion-wrapper-v2");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Data directory
const dataDir = path.join(__dirname, "..", "data");

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

    const wrapper = new OrionWrapperV2(projectId || "P-001", taskId || null);
    const response = await wrapper.sendMessage(message, mode);

    res.json(response);
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
 * Get the project structure with phases, tasks, and subtasks (lightweight)
 */
app.get("/api/project", (req, res) => {
  try {
    const projectPath = path.join(dataDir, "project.json");

    if (!fs.existsSync(projectPath)) {
      // Return empty structure if file doesn't exist
      return res.json({
        phases: [],
        tasks: {},
        subtasks: {},
      });
    }

    const data = readJSONFile(projectPath);
    res.json(data);
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
 * Get full subtask details from individual file
 */
app.get("/api/subtask/:subtaskId", (req, res) => {
  try {
    const { subtaskId } = req.params;
    const subtaskPath = path.join(dataDir, "subtasks", `${subtaskId}.json`);

    if (!fs.existsSync(subtaskPath)) {
      return res.status(404).json({
        error: "Subtask not found",
        details: `Subtask ${subtaskId} does not exist`,
      });
    }

    const data = readJSONFile(subtaskPath);
    res.json(data);
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
 * Add an activity log entry to a subtask
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
app.post("/api/subtask/:subtaskId/activity", (req, res) => {
  try {
    const { subtaskId } = req.params;
    const activity = req.body;
    const subtaskPath = path.join(dataDir, "subtasks", `${subtaskId}.json`);

    if (!fs.existsSync(subtaskPath)) {
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

    const subtask = readJSONFile(subtaskPath);
    if (!subtask.activity_log) {
      subtask.activity_log = [];
    }

    // Create new activity entry
    const newActivity = {
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: activity.type,
      agent: activity.agent,
      content: activity.content,
      timestamp: new Date().toISOString(),
      status: activity.status || "open",
      parent_id: activity.parent_id || null,
      replies: [],
      attachments: activity.attachments || [],
      metadata: activity.metadata || {},
    };

    // If there's a parent_id, add this activity's id to the parent's replies
    if (newActivity.parent_id) {
      const parentActivity = subtask.activity_log.find(
        (act) => act.id === newActivity.parent_id
      );
      if (parentActivity) {
        if (!parentActivity.replies) {
          parentActivity.replies = [];
        }
        parentActivity.replies.push(newActivity.id);
      }
    }

    subtask.activity_log.push(newActivity);
    subtask.updated_at = new Date().toISOString();
    subtask.updated_by = activity.agent;

    // Write updated subtask back to file
    fs.writeFileSync(subtaskPath, JSON.stringify(subtask, null, 2));

    res.json({
      success: true,
      activity: newActivity,
      updated_at: subtask.updated_at,
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
 * Request body: {
 *   task_updates: {
 *     task_id: string,
 *     status: "pending" | "in_progress" | "completed" | "blocked",
 *     phase: string,
 *     assignee: "orion" | "tara" | "devon"
 *   },
 *   cdp_analysis: {
 *     quick: {
 *       atomic_actions: array,
 *       resources_touched: array,
 *       resource_physics: array
 *     }
 *   },
 *   response_type: "quick_cdp" | "clarification" | "assignment" | "status_update" | "conversation",
 *   workflow_step: string,
 *   message: string
 * }
 */
app.post("/api/orion/response", async (req, res) => {
  try {
    const orionResponse = req.body;
    
    // Validate required fields
    if (!orionResponse.response_type) {
      return res.status(400).json({
        error: "Missing required field",
        required: "response_type",
      });
    }

    // Extract task ID from response
    let taskId = null;
    if (orionResponse.task_updates && orionResponse.task_updates.task_id) {
      taskId = orionResponse.task_updates.task_id;
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
      return res.status(400).json({
        error: "Could not determine task ID from response",
        details: "Include task_updates.task_id or reference a task ID in cdp_analysis",
      });
    }

    console.log(`Processing Orion response for task: ${taskId}`);

    // Define retry logic with exponential backoff
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // 1. Update subtask file
        const subtaskPath = path.join(dataDir, "subtasks", `${taskId}.json`);
        
        if (!fs.existsSync(subtaskPath)) {
          throw new Error(`Subtask file not found: ${taskId}.json`);
        }

        const subtask = readJSONFile(subtaskPath);
        
        // Update task status if provided
        if (orionResponse.task_updates) {
          subtask.status = orionResponse.task_updates.status || subtask.status;
          subtask.updated_at = new Date().toISOString();
          subtask.updated_by = "orion";
          
          // Update phase and assignee if needed
          if (orionResponse.task_updates.phase) {
            // You could store phase history in activity log
          }
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
            attempt: attempt,
            total_attempts: maxRetries
          }
        };

        // Include CDP analysis in metadata if present
        if (orionResponse.cdp_analysis) {
          activityEntry.metadata.cdp_analysis = orionResponse.cdp_analysis;
        }

        subtask.activity_log.push(activityEntry);

        // Write updated subtask back to file
        fs.writeFileSync(subtaskPath, JSON.stringify(subtask, null, 2));
        console.log(`Updated subtask file for ${taskId} (attempt ${attempt})`);

        // 2. Run synchronization scripts
        // First, run populate_subtask_details.js to ensure subtask details are current
        const populateScript = path.join(__dirname, "..", "populate_subtask_details.js");
        const lightweightScript = path.join(__dirname, "..", "add_lightweight_subtasks.js");

        // Run populate_subtask_details.js
        await new Promise((resolve, reject) => {
          exec(`node "${populateScript}"`, (error, stdout, stderr) => {
            if (error) {
              console.error(`Error running populate script: ${stderr}`);
              reject(new Error(`Populate script failed: ${error.message}`));
            } else {
              console.log(`Populate script output: ${stdout}`);
              resolve();
            }
          });
        });

        // Run add_lightweight_subtasks.js
        await new Promise((resolve, reject) => {
          exec(`node "${lightweightScript}"`, (error, stdout, stderr) => {
            if (error) {
              console.error(`Error running lightweight script: ${stderr}`);
              reject(new Error(`Lightweight script failed: ${error.message}`));
            } else {
              console.log(`Lightweight script output: ${stdout}`);
              resolve();
            }
          });
        });

        // Success - break out of retry loop
        console.log(`Successfully processed Orion response for ${taskId}`);
        
        return res.json({
          success: true,
          task_id: taskId,
          updated_at: subtask.updated_at,
          activity_id: activityEntry.id,
          attempts: attempt,
          message: "Orion response processed successfully"
        });

      } catch (error) {
        lastError = error;
        console.error(`Attempt ${attempt} failed for ${taskId}:`, error.message);
        
        if (attempt < maxRetries) {
          // Calculate exponential backoff delay
          const delay = baseDelay * Math.pow(2, attempt - 1);
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // If we get here, all retries failed
    // Log failure in activity log
    try {
      const subtaskPath = path.join(dataDir, "subtasks", `${taskId}.json`);
      if (fs.existsSync(subtaskPath)) {
        const subtask = readJSONFile(subtaskPath);
        if (!subtask.activity_log) {
          subtask.activity_log = [];
        }

        const errorActivity = {
          id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: "escalation",
          agent: "system",
          content: `Failed to process Orion response after ${maxRetries} attempts. Error: ${lastError.message}`,
          timestamp: new Date().toISOString(),
          status: "open",
          parent_id: null,
          replies: [],
          attachments: [],
          metadata: {
            error: lastError.message,
            attempts: maxRetries,
            response_type: orionResponse.response_type
          }
        };

        subtask.activity_log.push(errorActivity);
        fs.writeFileSync(subtaskPath, JSON.stringify(subtask, null, 2));
        console.log(`Logged failure in activity log for ${taskId}`);
      }
    } catch (logError) {
      console.error("Failed to log error in activity log:", logError.message);
    }

    throw new Error(`Failed to process Orion response after ${maxRetries} attempts: ${lastError.message}`);

  } catch (error) {
    console.error("Error in /api/orion/response:", error);
    res.status(500).json({
      error: "Failed to process Orion response",
      details: error.message,
      task_id: req.body.task_updates?.task_id || "unknown",
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
