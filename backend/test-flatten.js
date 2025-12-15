// Simulate the API response for 2-1-2
const fullSubtask = {
  "id": "2-1-2",
  "task_id": "2-1",
  "feature_id": "F2",
  "title": "Implement safe-SQL tools with DDL restrictions",
  "description": "Create controlled schema evolution tools: db_add_column_to_table, db_create_table_from_migration. Block DROP TABLE, TRUNCATE, DELETE operations.",
  "status": "pending",
  "agent": "Devon",
  "dependencies": ["2-1-1"],
  "priority": "high",
  "estimated_time": "3h",
  "risk_level": "high",
  "created_at": "2025-12-15T15:57:52.712Z",
  "updated_at": "2025-12-15T16:19:41.568Z",
  "details": {
    "notes": "Safe-SQL tools enable controlled database evolution while preventing accidental or malicious data loss.",
    "stages": {},
    "activity_log": [],
    "instructions": {
      "tara": "Test safe-SQL tools: verify that DDL restrictions are enforced (no DROP, TRUNCATE, DELETE). Test schema evolution tools for safety and correctness.",
      "devon": "Implement safe-SQL tools: db_add_column_to_table, db_create_table_from_migration. Add validation to block dangerous operations. Ensure tools work with PostgreSQL syntax and handle errors gracefully.",
      "orion": "Review safe-SQL tool implementation for security and reliability. Ensure they provide enough flexibility for schema evolution while preventing destructive operations."
    },
    "key_considerations": [
      "Must prevent destructive operations (DROP, TRUNCATE, DELETE)",
      "Tools should validate SQL syntax before execution",
      "Implement proper error handling for database errors",
      "Consider concurrent schema modifications"
    ]
  },
  "metadata": {
    "populated_at": "2025-12-15T16:19:42.582Z",
    "details_populated": true
  },
  "activity_logs": []
};

// Placeholder object (like in the component)
const placeholder = {
  id: '2-1-2',
  title: 'Loading...',
  description: '',
  status: 'pending',
  agent: '',
  estimated_time: '',
  updated_at: '',
  instructions: {},
  notes: '',
  key_considerations: [],
  dependencies: [],
  activity_log: []
};

// Flattening logic from the component
let selectedSubtask = { ...placeholder };
if (fullSubtask.details) {
  const { details, activity_logs, ...rest } = fullSubtask;
  // Use activity_log from details if available, otherwise use activity_logs from root
  const activityLog = details.activity_log || activity_logs || [];
  selectedSubtask = { 
    ...selectedSubtask, 
    ...rest, 
    ...details,
    activity_log: activityLog
  };
} else {
  selectedSubtask = { ...selectedSubtask, ...fullSubtask };
}

console.log('Flattened object:');
console.log(JSON.stringify(selectedSubtask, null, 2));

console.log('\n--- Checking for instructions ---');
console.log('Has instructions?', !!selectedSubtask.instructions);
console.log('Instructions:', JSON.stringify(selectedSubtask.instructions, null, 2));

console.log('\n--- Checking for notes ---');
console.log('Has notes?', !!selectedSubtask.notes);
console.log('Notes:', selectedSubtask.notes);

console.log('\n--- Checking for key_considerations ---');
console.log('Has key_considerations?', selectedSubtask.key_considerations?.length > 0);
console.log('Key considerations:', selectedSubtask.key_considerations);

console.log('\n--- Checking for activity_log ---');
console.log('Activity log:', selectedSubtask.activity_log);
