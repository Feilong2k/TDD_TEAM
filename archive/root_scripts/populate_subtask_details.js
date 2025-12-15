const fs = require('fs');
const path = require('path');

// Use DATA_DIR environment variable if set, otherwise default to ./data
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
const subtasksDir = path.join(dataDir, 'subtasks');

// Define the detailed information for each subtask
const subtaskDetails = {
  // Task 1: UI can chat with Orion (real responses)
  'P1-T1-S1': {
    instructions: {
      tara: 'Test the message validation and conversation saving. Ensure error handling works for invalid input.',
      devon: 'Implement message validation (check for empty, length, sanitization) and save to conversation file. Use the existing conversation file structure.',
      orion: 'Provide feedback on the validation logic and suggest improvements for security and performance.'
    },
    notes: 'This function is the entry point for the chat. Must be robust and secure.',
    key_considerations: [
      'Input sanitization to prevent injection attacks',
      'Conversation file structure must be maintained',
      'Error messages should be user-friendly but not expose system details'
    ],
    dependencies: []
  },
  'P1-T1-S2': {
    instructions: {
      tara: 'Test prompt formatting with various system prompts and conversation histories. Ensure it handles edge cases like empty history.',
      devon: 'Implement function that formats the prompt using the system prompt and conversation history. Follow the prompt template defined in the Orion wrapper.',
      orion: 'Review the prompt formatting for clarity and effectiveness. Suggest improvements for context handling.'
    },
    notes: 'The prompt format is critical for Orion to understand the context. Follow the template exactly.',
    key_considerations: [
      'Maintain proper formatting for the LLM',
      'Handle truncation of long conversation history',
      'Include relevant context without exceeding token limits'
    ],
    dependencies: ['P1-T1-S1']
  },
  'P1-T1-S3': {
    instructions: {
      tara: 'Test the proxy call with error conditions (timeout, network failure, invalid response). Verify retry logic works.',
      devon: 'Implement the proxy call to Cline with retry logic and error handling. Use exponential backoff for retries.',
      orion: 'Review the error handling and retry strategy. Suggest improvements for reliability.'
    },
    notes: 'This function makes the actual call to the LLM. Reliability is key.',
    key_considerations: [
      'Handle network timeouts and failures',
      'Implement retry with exponential backoff',
      'Log errors for monitoring'
    ],
    dependencies: ['P1-T1-S1', 'P1-T1-S2']
  },
  'P1-T1-S4': {
    instructions: {
      tara: 'Test JSON validation and error handling for various response formats (valid, invalid, malformed).',
      devon: 'Implement JSON validation using a schema (e.g., with AJV). Ensure the response matches the expected format.',
      orion: 'Review the validation schema and error handling. Suggest improvements for schema flexibility.'
    },
    notes: 'The response validation ensures we only process well-formed responses.',
    key_considerations: [
      'Define strict but flexible JSON schema',
      'Provide clear error messages for validation failures',
      'Consider logging validation errors for debugging'
    ],
    dependencies: ['P1-T1-S3']
  },

  // Task 2: Context checkbox works (send full context vs. minimal)
  'P1-T2-S1': {
    instructions: {
      tara: 'Test the checkbox UI component in various states (checked, unchecked, disabled). Ensure it works with keyboard navigation.',
      devon: 'Create a checkbox component in Vue that toggles between full context and minimal context. Use Tailwind for styling.',
      orion: 'Review the UI component for accessibility and usability. Suggest improvements.'
    },
    notes: 'The checkbox should be intuitive and accessible.',
    key_considerations: [
      'WCAG accessibility standards',
      'Consistent styling with the rest of the UI',
      'Clear labeling for the user'
    ],
    dependencies: []
  },
  'P1-T2-S2': {
    instructions: {
      tara: 'Test the Orion wrapper with the context parameter. Verify that the prompt changes appropriately.',
      devon: 'Modify the Orion wrapper to accept a context parameter (full/minimal) and adjust the prompt accordingly.',
      orion: 'Review the context handling logic. Suggest how to best structure the context for the LLM.'
    },
    notes: 'The context parameter should significantly affect the prompt sent to Orion.',
    key_considerations: [
      'Define what constitutes full vs. minimal context',
      'Ensure the system prompt adapts correctly',
      'Test with various conversation histories'
    ],
    dependencies: ['P1-T1-S2', 'P1-T2-S1']
  },
  'P1-T2-S3': {
    instructions: {
      tara: 'Test the integration by toggling the checkbox and verifying the backend receives the correct context parameter.',
      devon: 'Connect the frontend checkbox to the backend API. Pass the context parameter in the API call.',
      orion: 'Review the integration for any potential issues. Suggest improvements for the API design.'
    },
    notes: 'End-to-end testing is crucial for this feature.',
    key_considerations: [
      'API parameter naming and consistency',
      'Backward compatibility with existing calls',
      'Error handling for missing parameters'
    ],
    dependencies: ['P1-T2-S1', 'P1-T2-S2']
  },

  // Task 3: Basic task log creation
  'P1-T3-S1': {
    instructions: {
      tara: 'Verify the project.json structure is correct and can be loaded by the frontend.',
      devon: 'Create the project.json file with phases, tasks, and subtasks structure. Use the schema we designed.',
      orion: 'Review the project structure for scalability and clarity. Suggest improvements.'
    },
    notes: 'This file will be the source of truth for the project progress.',
    key_considerations: [
      'Schema design for easy extension',
      'Include all necessary metadata',
      'Ensure it can be easily parsed by both frontend and backend'
    ],
    dependencies: []
  },
  'P1-T3-S2': {
    instructions: {
      tara: 'Test the logging mechanism by simulating agent updates and checking the log files.',
      devon: 'Create a logging mechanism that updates the project.json and writes to log files in the logs directory.',
      orion: 'Review the logging format and mechanism. Suggest improvements for traceability.'
    },
    notes: 'Logs are essential for debugging and tracking progress.',
    key_considerations: [
      'Log format should be both human-readable and machine-parseable',
      'Include timestamps and agent identifiers',
      'Rotate logs to avoid large files'
    ],
    dependencies: ['P1-T3-S1']
  },

  // Task 4: Orion performs Quick CDP analysis
  'P1-T4-S1': {
    instructions: {
      tara: 'Test the Quick CDP analysis by providing sample tasks and checking the output.',
      devon: 'Integrate the Quick CDP analysis into Orion response flow. Call the CDP analysis function when appropriate.',
      orion: 'Review the CDP integration. Suggest improvements for the analysis quality.'
    },
    notes: 'Quick CDP is a core feature for task analysis.',
    key_considerations: [
      'Ensure the CDP analysis is triggered at the right time',
      'The analysis should be concise and actionable',
      'Handle errors gracefully'
    ],
    dependencies: ['P1-T1-S2', 'P1-T1-S3']
  },
  'P1-T4-S2': {
    instructions: {
      tara: 'Test the Quick CDP with a variety of sample tasks. Validate the analysis results.',
      devon: 'Create sample tasks and run the CDP analysis. Refine the analysis based on the results.',
      orion: 'Review the test results and suggest refinements for the CDP algorithm.'
    },
    notes: 'Testing with real-world tasks will improve the CDP analysis.',
    key_considerations: [
      'Use a diverse set of sample tasks',
      'Compare analysis results with expected outcomes',
      'Iterate on the algorithm based on test results'
    ],
    dependencies: ['P1-T4-S1']
  },
  // P1-T1-S5: Implement Automatic Task Update API
  'P1-T1-S5': {
    instructions: {
      tara: 'Test the API endpoint, retry logic (3 attempts with exponential backoff), and synchronization between subtask files and project.json. Verify error handling and activity log updates.',
      devon: 'Implement POST /api/orion/response endpoint that processes Orion\'s JSON responses, updates subtask files, synchronizes with project.json, and implements retry logic with exponential backoff. Log failures in activity log after retries.',
      orion: 'Review the API design and error handling strategy. Ensure the endpoint properly processes all response types (quick_cdp, clarification, assignment, status_update, conversation) and updates activity logs appropriately.'
    },
    notes: 'This API enables Orion\'s JSON responses to automatically update the subtask system. Must maintain backward compatibility with project.json for UI synchronization.',
    key_considerations: [
      'Handle all Orion response types appropriately',
      'Implement retry logic with exponential backoff (3 attempts)',
      'Update both individual subtask files and lightweight project.json entries',
      'Add activity log entries for API failures after retries',
      'Validate JSON structure before processing',
      'Ensure atomic updates to prevent data corruption'
    ],
    dependencies: ['P1-T1-S1', 'P1-T1-S2', 'P1-T1-S3', 'P1-T1-S4']
  }
};

// Read each subtask file, update with details, and write back
const subtaskFiles = fs.readdirSync(subtasksDir).filter(file => file.endsWith('.json'));

subtaskFiles.forEach(filename => {
  const filePath = path.join(subtasksDir, filename);
  const subtask = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const subtaskId = subtask.id;

  if (subtaskDetails[subtaskId]) {
    // Update the subtask with the predefined details
    subtask.instructions = subtaskDetails[subtaskId].instructions;
    subtask.notes = subtaskDetails[subtaskId].notes;
    subtask.key_considerations = subtaskDetails[subtaskId].key_considerations;
    subtask.dependencies = subtaskDetails[subtaskId].dependencies;

    // If activity_log is empty, we can optionally add a sample activity
    if (!subtask.activity_log || subtask.activity_log.length === 0) {
      subtask.activity_log = [
        {
          id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'progress_update',
          agent: 'System',
          content: `Details populated for ${subtaskId}.`,
          timestamp: new Date().toISOString(),
          status: 'resolved',
          parent_id: null,
          replies: [],
          attachments: [],
          metadata: {}
        }
      ];
    }

    // Write the updated subtask back to the file
    fs.writeFileSync(filePath, JSON.stringify(subtask, null, 2));
    console.log(`Updated ${filename}`);
  } else {
    console.log(`No details defined for ${subtaskId}, skipping.`);
  }
});

console.log('Done populating subtask details.');
