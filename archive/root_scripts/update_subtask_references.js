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

// Update task IDs (P1-T1 -> 1-1, etc.)
const taskIdMap = {
  'P1-T1': '1-1',
  'P1-T2': '1-2',
  'P1-T3': '1-3',
  'P1-T4': '1-4'
};

// Function to recursively update IDs in an object
function updateIdsInObject(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => {
      if (typeof item === 'string') {
        // Check if it's an old ID and replace
        if (idMap[item]) return idMap[item];
        if (taskIdMap[item]) return taskIdMap[item];
        return item;
      }
      return updateIdsInObject(item);
    });
  }
  
  const newObj = {};
  for (const [key, value] of Object.entries(obj)) {
    let newKey = key;
    let newValue = value;
    
    // Update key if it's an ID
    if (idMap[key]) newKey = idMap[key];
    else if (taskIdMap[key]) newKey = taskIdMap[key];
    
    // Update value
    if (typeof value === 'string') {
      if (idMap[value]) newValue = idMap[value];
      else if (taskIdMap[value]) newValue = taskIdMap[value];
    } else if (typeof value === 'object') {
      newValue = updateIdsInObject(value);
    }
    
    newObj[newKey] = newValue;
  }
  return newObj;
}

// Update all subtask files
const subtasksDir = path.join(__dirname, 'data', 'subtasks');
const files = fs.readdirSync(subtasksDir).filter(f => f.endsWith('.json'));

files.forEach(filename => {
  const filePath = path.join(subtasksDir, filename);
  const content = fs.readFileSync(filePath, 'utf8');
  const subtask = JSON.parse(content);
  
  // Update IDs in the subtask object
  const updatedSubtask = updateIdsInObject(subtask);
  
  // Write back
  fs.writeFileSync(filePath, JSON.stringify(updatedSubtask, null, 2));
  console.log(`Updated IDs in ${filename}`);
});

console.log('Updated all subtask file references.');
