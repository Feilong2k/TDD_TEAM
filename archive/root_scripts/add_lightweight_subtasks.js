const fs = require('fs');
const path = require('path');

// Use DATA_DIR environment variable if set, otherwise default to ./data
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
const projectPath = path.join(dataDir, 'project.json');
const subtasksDir = path.join(dataDir, 'subtasks');

console.log('Project path:', projectPath);
console.log('Subtasks dir:', subtasksDir);

// Read current project.json
const project = JSON.parse(fs.readFileSync(projectPath, 'utf8'));

// Get list of subtask files
const subtaskFiles = fs.readdirSync(subtasksDir).filter(file => file.endsWith('.json'));
console.log('Found', subtaskFiles.length, 'subtask files');

// Build lightweight subtasks object
const lightweightSubtasks = {};
subtaskFiles.forEach(filename => {
  const subtaskPath = path.join(subtasksDir, filename);
  const subtask = JSON.parse(fs.readFileSync(subtaskPath, 'utf8'));
  
  // Create lightweight version
  lightweightSubtasks[subtask.id] = {
    id: subtask.id,
    task_id: subtask.task_id,
    title: subtask.title,
    agent: subtask.agent,
    status: subtask.status,
    estimated_time: subtask.estimated_time,
    updated_at: subtask.updated_at,
    updated_by: subtask.updated_by
  };
});

// Add lightweight subtasks to project
project.subtasks = lightweightSubtasks;

// Write updated project.json
fs.writeFileSync(projectPath, JSON.stringify(project, null, 2));
console.log('Added lightweight subtasks to project.json');
console.log('Total subtasks added:', Object.keys(lightweightSubtasks).length);
