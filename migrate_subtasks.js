const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const projectPath = path.join(dataDir, 'project.json');
const subtasksDir = path.join(dataDir, 'subtasks');

console.log('Project path:', projectPath);
console.log('Subtasks dir exists:', fs.existsSync(subtasksDir));

// Read current project.json
const project = JSON.parse(fs.readFileSync(projectPath, 'utf8'));
const { subtasks } = project;

console.log('Number of subtasks in project:', Object.keys(subtasks).length);

// Ensure subtasks directory exists
if (!fs.existsSync(subtasksDir)) {
  fs.mkdirSync(subtasksDir, { recursive: true });
  console.log('Created subtasks directory');
}

// Function to enhance a subtask with new fields
function enhanceSubtask(subtask) {
  return {
    ...subtask,
    instructions: subtask.instructions || {
      tara: '',
      devon: '',
      orion: ''
    },
    notes: subtask.notes || '',
    key_considerations: subtask.key_considerations || [],
    dependencies: subtask.dependencies || [],
    activity_log: subtask.activity_log || []
  };
}

// Write each subtask to individual file
let migratedCount = 0;
for (const [id, subtask] of Object.entries(subtasks)) {
  const enhancedSubtask = enhanceSubtask(subtask);
  const subtaskPath = path.join(subtasksDir, `${id}.json`);
  fs.writeFileSync(subtaskPath, JSON.stringify(enhancedSubtask, null, 2));
  migratedCount++;
}

console.log('Migrated', migratedCount, 'subtasks to individual files');

// Remove the subtasks object from project.json
delete project.subtasks;

// Write the lightweight project.json
fs.writeFileSync(projectPath, JSON.stringify(project, null, 2));
console.log('Updated project.json to lightweight version');

// Verify the new project.json
const updatedProject = JSON.parse(fs.readFileSync(projectPath, 'utf8'));
console.log('Updated project has subtasks?', 'subtasks' in updatedProject ? 'Yes' : 'No');
