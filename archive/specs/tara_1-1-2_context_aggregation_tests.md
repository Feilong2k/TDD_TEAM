# Test Specifications for Tara: Context Aggregation (1-1-2)

## Overview
Test the context aggregation function for Orion wrapper that gathers project structure, subtask details, conversation history, and dependencies.

## Test File
`backend/__tests__/unit/function-2-prepares-prompt.test.js`

## Current Test Coverage
Existing tests cover prompt formatting but NOT context aggregation. Need to add tests for the new `aggregateContext` method.

## New Test Blocks to Add

### 1. `describe('aggregateContext method', ...)`

**Test Cases:**

1. **should read project structure from project.json**
   - Mock `fs.readFileSync` for `data/project.json`
   - Call `aggregateContext` with empty conversation history
   - Verify returned object includes `project` with phases, tasks, subtasks

2. **should load subtask details when taskId is set**
   - Mock `fs.readFileSync` for `data/subtasks/1-1-2.json`
   - Call `aggregateContext` with conversation history and taskId = "1-1-2"
   - Verify `subtask` object includes instructions, key_considerations, dependencies, activity_log

3. **should include conversation history with configurable limit (default 10)**
   - Provide 15 messages in conversationHistory
   - Call `aggregateContext` with default limit
   - Verify only last 10 messages included
   - Call with explicit `historyLimit: 5`, verify only last 5

4. **should extract activity logs from subtask**
   - Mock subtask file with activity_log entries
   - Verify `activityLogs` in returned context includes filtered entries (e.g., only recent 10)

5. **should map dependencies from subtask**
   - Mock subtask with dependencies ["1-1-1", "1-1-3"]
   - Verify `dependencies` in context includes mapped dependency details

6. **should return empty structure when project.json missing**
   - Mock `fs.readFileSync` to throw error (file not found)
   - Verify context returns empty project structure, handles gracefully

7. **should handle missing subtask file gracefully**
   - Mock subtask file not found
   - Verify context returns without subtask details, logs error

### 2. Update `describe('formatPrompt method', ...)`

**Additional Tests:**

8. **should include aggregated context in prompt when available**
   - Mock `aggregateContext` to return sample context
   - Call `formatPrompt` with taskId
   - Verify prompt includes context sections

9. **should format context for LLM consumption**
   - Verify context is formatted as JSON string or structured text
   - Check token length estimation

## Mock Data Requirements
- Sample `project.json` structure
- Sample `1-1-2.json` subtask file
- Sample conversation history (array of 15 messages)

## Edge Cases to Test
- Empty conversation history
- Missing taskId
- Malformed JSON in project or subtask files
- Large activity logs (truncation)
- Circular dependencies

## Integration with Existing Tests
- Maintain existing prompt formatting tests
- Add new context aggregation tests as separate describe block
- Update any existing tests that might be affected

## Dependencies
- Requires `fs` module mocking (jest.mock)
- Mock path resolution for data files

## Expected Test Output
- All new tests pass
- Existing tests continue to pass
- Test coverage for context aggregation > 90%
