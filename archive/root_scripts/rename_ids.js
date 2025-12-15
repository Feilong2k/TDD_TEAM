const fs = require('fs');
const path = require('path');

// Define the mapping from old IDs to new IDs
const idMap = {
  // Phase 1, Task 1 subtasks
  'P1-T1-S1': '1-1-1',
  'P1-T1-S2': '1-1-2', 
  'P1-T1-S3': '1-1-3',
  'P1-T1-S4': '1-1-4',
  'P1-T1-S5': '1-1-5',
  // Phase 1, Task 2 subtasks
  'P1-T2-S1': '1-2-1',
  'P1-T2-S2': '1-2-2',
  'P1-T2-S3': '1-2-3',
  // Phase 1, Task 3 subtasks
  'P1-T3-S1': '1-3-1',
  'P1-T3-S2': '1-3-2',
  // Phase 1, Task 4 subtasks
  'P1-T4-S1': '1-4-1',
  'P1-T4-S2': '1-4-2'
};

// Update task IDs in project.json
const projectPath = path.join(__dirname, 'data', 'project.json');
const project = JSON.parse(fs.readFileSync(projectPath, 'utf8'));

// Update task IDs (P1-T1 -> 1-1, etc.)
const taskIdMap = {};
Object.keys(project.tasks).forEach(oldTaskId => {
  const match = oldTaskId.match(/P(\d+)-T(\d+)/);
  if (match) {
    const newTaskId = `${match[1]}-${match[2]}`;
    taskIdMap[oldTaskId] = newTaskId;
  }
});

// Update phase task_ids
project.phases.forEach(phase => {
  phase.task_ids = phase.task_ids.map(oldId => taskIdMap[oldId] || oldId);
});

// Update tasks object keys and their internal ids
const newTasks = {};
Object.entries(project.tasks).forEach(([oldId, task]) => {
  const newId = taskIdMap[oldId] || oldId;
  task.id = newId;
  // Update subtask_ids in task
  task.subtask_ids = task.subtask_ids.map(oldSubId => idMap[oldSubId] || oldSubId);
  newTasks[newId] = task;
});
project.tasks = newTasks;

// Update subtasks object keys and their internal ids
const newSubtasks = {};
Object.entries(project.subtasks).forEach(([oldId, subtask]) => {
  const newId = idMap[oldId] || oldId;
  subtask.id = newId;
  subtask.task_id = taskIdMap[subtask.task_id] || subtask.task_id;
  newSubtasks[newId] = subtask;
});
project.subtasks = newSubtasks;

// Write updated project.json
fs.writeFileSync(projectPath, JSON.stringify(project, null, 2));
console.log('Updated project.json with new IDs');

// Now update individual subtask files
const subtasksDir = path.join(__dirname, 'data', 'subtasks');
fs.readdirSync(subtasksDir).forEach(filename => {
  if (filename.endsWith('.json')) {
    const filePath = path.join(subtasksDir, filename);
    const subtask = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Update the ID in the file
    const newId = idMap[subtask.id] || subtask.id;
    const oldId = subtask.id;
    subtask.id = newId;
    subtask.task_id = taskIdMap[subtask.task_id] || subtask.task_id;
    
    // Write back
    fs.writeFileSync(filePath, JSON.stringify(subtask, null, 2));
    
    // Rename the file if the ID changed
    if (newId !== oldId) {
      const newFilename = `${newId}.json`;
      const newFilePath = path.join(subtasksDir, newFilename);
      fs.renameSync(filePath, newFilePath);
      console.log(`Renamed ${filename} to ${newFilename}`);
    } else {
      console.log(`Updated ${filename} with new ID: ${newId}`);
    }
  }
});

console.log('ID rename completed successfully.');
