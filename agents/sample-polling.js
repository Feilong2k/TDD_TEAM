const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

// File to monitor
const FILE = path.join(__dirname, '..', 'data', 'tasks.json');
let lastHash = null;

/**
 * Compute a simple hash of file content
 */
function getFileHash() {
  try {
    const content = fs.readFileSync(FILE, 'utf8');
    // Simple hash using base64
    return Buffer.from(content).toString('base64');
  } catch (err) {
    console.error("Cannot read file:", err);
    return null;
  }
}

/**
 * Run Cline with given prompt
 * Uses the syntax: cline task new -y "prompt" for non-interactive task creation
 * Assumes Cline is already configured with model and API keys
 */
function runCline(subtaskPrompt) {
  console.log(`🔧 Running Cline: ${subtaskPrompt.substring(0, 80)}...`);

  // Escape double quotes for command line
  const escapedPrompt = subtaskPrompt.replace(/"/g, '\\"');
  const command = `cline task new --instance 192.168.56.101:32977 -y "${escapedPrompt}"`;

  exec(command, (err, stdout, stderr) => {
    if (err) {
      console.error("Cline error:", err);
      return;
    }
    console.log("Cline output:", stdout);
    if (stderr) {
      console.error("Cline stderr:", stderr);
    }
  });
}

/**
 * Check for file changes and trigger Cline if changed
 */
function monitor() {
  const currentHash = getFileHash();

  if (currentHash && currentHash !== lastHash) {
    console.log(`⚡ File changed at ${new Date().toISOString()}`);

    // Read the file to extract meaningful data
    try {
      const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
      const taskCount = Object.keys(data.tasks || {}).length;
      const lastId = data.last_id;
      
      // Create a prompt based on the change
      const prompt = `The tasks.json file has been updated. There are now ${taskCount} tasks. Last task ID: ${lastId}. Please review the changes and proceed with any pending subtasks.`;
      runCline(prompt);
    } catch (err) {
      console.error("Error parsing JSON:", err);
      // Fallback prompt
      runCline(`The tasks file has changed. Unable to parse content. Please check manually.`);
    }

    lastHash = currentHash;
  }
}

console.log(`👀 File watcher starting for ${FILE}`);
lastHash = getFileHash();

// Check every 5 seconds
setInterval(monitor, 5000);

// Keep the script running
process.on('SIGINT', () => {
  console.log('Shutting down file watcher...');
  process.exit(0);
});
