# Implementation Specifications for Devon: Context Aggregation (1-1-2)

## Overview
Implement context aggregation function for Orion wrapper that gathers project structure, subtask details, conversation history, and dependencies.

## Target File
`agents/orion-wrapper-v2.js`

## Current Implementation Status
The wrapper currently has `formatPrompt` method but lacks `aggregateContext` method.

## Required Methods to Implement

### 1. `_readProjectStructure()`
**Purpose**: Read and parse project.json
**Signature**: `_readProjectStructure()`
**Returns**: Object with project structure (phases, tasks, subtasks)
**Error Handling**: Returns empty object if file not found or invalid JSON
**Location**: Private method in OrionWrapper class

### 2. `_readSubtaskDetails(subtaskId)`
**Purpose**: Read and parse specific subtask JSON file
**Signature**: `_readSubtaskDetails(subtaskId)`
**Parameters**: 
  - `subtaskId` (string): e.g., "1-1-2"
**Returns**: Object with subtask details or null if not found
**Error Handling**: Returns null if file not found, logs warning

### 3. `aggregateContext(conversationHistory, taskId, options = {})`
**Purpose**: Main context aggregation method
**Signature**: `aggregateContext(conversationHistory, taskId, options)`
**Parameters**:
  - `conversationHistory` (array): Array of message objects
  - `taskId` (string, optional): Current subtask ID (e.g., "1-1-2")
  - `options` (object, optional): 
    - `historyLimit` (number): Default 10
    - `activityLogLimit` (number): Default 10
    - `includeDependencies` (boolean): Default true

**Returns**: Context object structure:
```javascript
{
  project: {
    phases: [...],
    tasks: {...},
    subtasks: {...}
  },
  subtask: {
    id: "1-1-2",
    title: "...",
    instructions: {...},
    key_considerations: [...],
    dependencies: [...],
    activity_log: [...]
  },
  conversationHistory: last N messages (array),
  activityLogs: filtered activity logs (array),
  dependencies: mapped dependency details (array),
  metadata: {
    aggregatedAt: timestamp,
    contextSize: estimated token count
  }
}
```

**Implementation Steps**:
1. Call `_readProjectStructure()` to get project data
2. If `taskId` provided, call `_readSubtaskDetails(taskId)`
3. Slice conversationHistory based on `historyLimit`
4. Extract recent activity logs from subtask (if available)
5. Map dependencies: for each dependency ID, load subtask details
6. Calculate estimated token count for context
7. Return structured context object

### 4. Update `formatPrompt` Method
**Changes Needed**:
- Accept optional `taskId` parameter
- Call `aggregateContext` if `taskId` provided
- Include aggregated context in the prompt template
- Maintain backward compatibility (works without taskId)

## File Structure Changes
```javascript
// In agents/orion-wrapper-v2.js

class OrionWrapper {
  constructor() {
    // Existing constructor
    this.dataPath = path.join(__dirname, '..', 'data');
  }

  // New private methods
  _readProjectStructure() { ... }
  
  _readSubtaskDetails(subtaskId) { ... }
  
  // New public method
  aggregateContext(conversationHistory, taskId, options = {}) { ... }
  
  // Updated method
  formatPrompt(messages, options = {}) {
    // Existing logic plus:
    if (options.taskId) {
      const context = this.aggregateContext(messages, options.taskId, {
        historyLimit: options.historyLimit || 10
      });
      // Include context in prompt
    }
    // Rest of existing logic
  }
}
```

## Dependencies to Add
- `fs` module (already available)
- `path` module (already available)
- No new npm packages required

## Error Handling Requirements
1. **Missing project.json**: Return empty project structure, log warning
2. **Missing subtask file**: Skip subtask details, log warning
3. **Invalid JSON**: Handle parse errors gracefully
4. **Large context**: Implement token estimation and truncation logic

## Performance Considerations
1. **Caching**: Consider caching project.json reads (file doesn't change often)
2. **Async**: Keep synchronous for simplicity (files are small)
3. **Memory**: Limit conversation history and activity logs to configurable limits

## Integration Points
1. **Orion Prompt**: Context will be included in system prompt
2. **API Endpoint**: The `/api/orion/chat` endpoint should pass taskId
3. **Task Updates**: Context aggregation triggers when taskId is in message

## Testing Integration
- Method should be unit testable (Tara will write tests)
- Mock file system for tests
- Export methods for testing if needed

## Example Usage
```javascript
const wrapper = new OrionWrapper();
const context = wrapper.aggregateContext(
  conversationHistory, 
  "1-1-2", 
  { historyLimit: 5 }
);

const prompt = wrapper.formatPrompt(messages, {
  taskId: "1-1-2",
  historyLimit: 5
});
```

## Token Limit Management
- Estimate tokens using simple character count / 4
- Provide warning if context exceeds threshold (e.g., 4000 tokens)
- Consider truncation strategies for long activity logs

## Version Compatibility
- Must work with existing code (no breaking changes)
- Add feature flag if needed for gradual rollout
