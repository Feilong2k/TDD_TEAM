# FT0002: Test Tracking in Subtasks

## Problem
Currently, when Tara creates tests for a subtask, there's no structured way to record which tests were created and track their completion status. When Devon implements the feature, Tara reviews the work and marks tests as passed, but this process is not captured in the subtask data structure.

## Opportunity
By adding a test tracking section to the subtask JSON, we can:
1. Provide a clear list of tests Tara creates for each subtask
2. Allow Tara to mark tests as passed after reviewing Devon's work
3. Create a historical record of test coverage and results
4. Enable automated reporting on test progress

## Proposed Solution

### 1. Extend Subtask JSON Schema

Add a new `tests` section below `dependencies` in the subtask JSON structure:

```json
{
  "id": "1-1-5",
  ... existing fields ...,
  "dependencies": ["1-1-1", "1-1-2"],
  "tests": [
    {
      "id": "test-001",
      "name": "API endpoint validation",
      "description": "Test POST /api/orion/response with quick_cdp response type",
      "created_by": "Tara",
      "created_at": "2025-12-13T15:53:45.000Z",
      "status": "pending", // pending, passed, failed, skipped
      "passed_at": null,
      "passed_by": null,
      "test_file": "backend/__tests__/unit/function-5-automatic-task-update.test.js",
      "test_function": "testOrionResponseQuickCDP",
      "metadata": {}
    }
  ]
}
```

### 2. Workflow

1. **Test Creation (Tara)**:
   - Tara creates tests for a subtask
   - She adds test entries to the `tests` array via API or manually
   - Each test starts with `status: "pending"`

2. **Implementation (Devon)**:
   - Devon implements the feature to satisfy the tests
   - Tests remain in `pending` status

3. **Test Review (Tara)**:
   - Tara reviews Devon's implementation
   - She runs the tests or verifies manually
   - For each passing test, she updates `status: "passed"`, sets `passed_at` and `passed_by`

4. **Completion Tracking**:
   - When all tests are marked as `passed`, the subtask can be considered complete
   - Optionally, a test coverage percentage can be calculated

### 3. API Endpoints

Add new endpoints to manage tests:

- `GET /api/subtask/:subtaskId/tests` - List all tests for a subtask
- `POST /api/subtask/:subtaskId/tests` - Add a new test
- `PUT /api/subtask/:subtaskId/tests/:testId` - Update test status
- `DELETE /api/subtask/:subtaskId/tests/:testId` - Remove a test

### 4. Integration with Activity Log

Each test status change could generate an activity log entry, e.g.:
- "Tara created test 'API endpoint validation'"
- "Tara marked test 'API endpoint validation' as passed"

## Implementation Considerations

### MVP Version
1. Simple `tests` array in subtask JSON
2. Manual updates via API or direct file editing
3. Basic status tracking (pending/passed)

### Enhanced Version
1. Test categories (unit, integration, security)
2. Test dependencies and order
3. Automatic test discovery from test files
4. Integration with test runners (Jest, Mocha)
5. Visual indicators in UI

## Benefits
- **Transparency**: Clear visibility into which tests exist and their status
- **Accountability**: Record of who created and passed each test
- **Quality**: Encourages comprehensive test coverage
- **Progress Tracking**: Percentage of tests passed as a completion metric

## Related Features
- FT0001: Task context attachment (could link test results to specific context)
- Future: Automated test result ingestion from CI/CD pipelines

## Notes
This feature should be implemented after the TDD tasks panel is functional (as per FT0001) to ensure a smooth user experience for test tracking.
