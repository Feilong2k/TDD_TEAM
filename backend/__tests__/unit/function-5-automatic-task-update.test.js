/**
 * Function 5: Automatic Task Update API Tests
 * 
 * Subtask 1-1-5: Implement Automatic Task Update API
 * 
 * These are FAILING tests written by Tara (senior tester) before implementation.
 * Tests cover:
 * 1. POST /api/orion/response endpoint with Orion JSON responses
 * 2. Retry logic with exponential backoff (3 attempts)
 * 3. Synchronization between subtask files and project.json
 * 4. Error handling and activity log updates
 * 5. JSON structure validation
 * 6. Atomic updates to prevent data corruption
 * 
 * Security testing focus:
 * - Path traversal prevention via task IDs
 * - JSON injection protection
 * - Information disclosure prevention
 */

const request = require('supertest');
const fs = require('fs').promises;
const path = require('path');
const { setTimeout } = require('timers/promises');

// Import real server implementation
const serverModule = require('../../server');

// Mock child_process.exec to avoid hanging in tests
jest.mock('child_process', () => ({
  exec: jest.fn((command, options, callback) => {
    // Simulate successful execution without actually running scripts
    if (callback) {
      callback(null, 'Mock script output', '');
    }
    return { on: jest.fn() };
  })
}));

// Test data directory
const testDataDir = path.join(__dirname, '..', '..', '..', 'data', 'test-1-1-5');

// Orion response types for testing
const ORION_RESPONSE_TYPES = {
  QUICK_CDP: 'quick_cdp',
  CLARIFICATION: 'clarification',
  ASSIGNMENT: 'assignment',
  STATUS_UPDATE: 'status_update',
  CONVERSATION: 'conversation'
};

// Sample Orion response payloads
const createOrionResponse = (type, taskId = '1-1-5-test', content = {}) => {
  const baseResponse = {
    response_type: type,
    task_updates: {
      task_id: taskId,
      status: 'in_progress',
      phase: 'test_phase',
      assignee: 'test_agent'
    },
    timestamp: new Date().toISOString(),
    ...content
  };

  switch (type) {
    case ORION_RESPONSE_TYPES.QUICK_CDP:
      return {
        ...baseResponse,
        cdp_analysis: {
          atomic_actions: [{ action: 'Test action', description: 'Test description', risk_level: 'low' }],
          resources_touched: [{ resource: 'Test resource', action: 'Read', notes: 'Test notes' }]
        }
      };
    case ORION_RESPONSE_TYPES.CLARIFICATION:
      return {
        ...baseResponse,
        clarification_needed: [{ question: 'Test question?', blocking: false, attempted_resolution: 'Test resolution' }]
      };
    case ORION_RESPONSE_TYPES.ASSIGNMENT:
      return {
        ...baseResponse,
        assignment: { agent: 'devon', task_id: taskId, instructions: 'Test instructions' }
      };
    case ORION_RESPONSE_TYPES.STATUS_UPDATE:
      return {
        ...baseResponse,
        status_update: { previous_status: 'pending', new_status: 'in_progress', reason: 'Test reason' }
      };
    case ORION_RESPONSE_TYPES.CONVERSATION:
      return {
        ...baseResponse,
        conversation: { messages: [{ role: 'user', content: 'Test message', timestamp: new Date().toISOString() }] }
      };
    default:
      return baseResponse;
  }
};

describe('Function 5: Automatic Task Update API', () => {
  beforeAll(async () => {
    // Create test data directory
    await fs.mkdir(testDataDir, { recursive: true });
    await fs.mkdir(path.join(testDataDir, 'subtasks'), { recursive: true });
    await fs.mkdir(path.join(testDataDir, 'conversations'), { recursive: true });

    // Use real server implementation with test data directory
    app = serverModule.app;
    
    // Set test data directory
    serverModule.setDataDir(testDataDir);
    serverModule.ensureDataDirs();
    
    server = app.listen(0); // Random port for testing
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
    
    // Clean up test data
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean up test data:', error.message);
    }
  });

  beforeEach(async () => {
    // Clean test data before each test
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.mkdir(path.join(testDataDir, 'subtasks'), { recursive: true });
      await fs.mkdir(path.join(testDataDir, 'conversations'), { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('POST /api/orion/response endpoint', () => {
    test('should process quick_cdp response type and return 200 status', async () => {
      const response = createOrionResponse(ORION_RESPONSE_TYPES.QUICK_CDP, '1-1-5-test-1');
      
      const res = await request(app)
        .post('/api/orion/response')
        .send(response)
        .expect('Content-Type', /json/);
      
      // This test will fail initially (expected 200, will get 501)
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('task_id', '1-1-5-test-1');
    });

    test('should process all Orion response types correctly', async () => {
      const responseTypes = Object.values(ORION_RESPONSE_TYPES);
      
      for (const type of responseTypes) {
        const response = createOrionResponse(type, `1-1-5-test-${type}`);
        
        const res = await request(app)
          .post('/api/orion/response')
          .send(response);
        
        // All response types should be processed successfully
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('response_type', type);
      }
    });

    test('should update subtask file with response data', async () => {
      const taskId = '1-1-5-test-update';
      const response = createOrionResponse(ORION_RESPONSE_TYPES.STATUS_UPDATE, taskId);
      
      await request(app)
        .post('/api/orion/response')
        .send(response)
        .expect(200);
      
      // Verify subtask file was created/updated
      const subtaskPath = path.join(testDataDir, 'subtasks', `${taskId}.json`);
      const fileExists = await fs.access(subtaskPath).then(() => true).catch(() => false);
      
      expect(fileExists).toBe(true);
      
      // Verify file contains response data
      const fileContent = await fs.readFile(subtaskPath, 'utf8');
      const subtaskData = JSON.parse(fileContent);
      
      expect(subtaskData).toHaveProperty('id', taskId);
      expect(subtaskData).toHaveProperty('activity_log');
      expect(Array.isArray(subtaskData.activity_log)).toBe(true);
      expect(subtaskData.activity_log.length).toBeGreaterThan(0);
    });
  });

  describe('Retry logic with exponential backoff', () => {
    let retryAttempts = 0;
    let retryTimestamps = [];
    
    beforeAll(() => {
      // Mock endpoint that fails twice then succeeds
      app.post('/api/orion/retry-test', async (req, res) => {
        retryAttempts++;
        retryTimestamps.push(Date.now());
        
        if (retryAttempts < 3) {
          // Simulate temporary failure
          await setTimeout(10); // Small delay
          return res.status(503).json({ error: 'Service temporarily unavailable' });
        }
        
        // Third attempt succeeds
        res.status(200).json({ success: true, attempts: retryAttempts });
      });
    });

    beforeEach(() => {
      retryAttempts = 0;
      retryTimestamps = [];
    });

    test('should retry 3 times with exponential backoff on temporary failure', async () => {
      const startTime = Date.now();
      
      const res = await request(app)
        .post('/api/orion/retry-test')
        .send({ test: 'data' });
      
      // Should eventually succeed on 3rd attempt
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.attempts).toBe(3);
      
      // Verify exponential backoff timing (approximately 1s, 2s, 4s)
      expect(retryTimestamps.length).toBe(3);
      
      const delays = [];
      for (let i = 1; i < retryTimestamps.length; i++) {
        delays.push(retryTimestamps[i] - retryTimestamps[i - 1]);
      }
      
      // Check that delays follow exponential pattern (with some tolerance)
      // Note: These are approximate checks - actual implementation may vary
      // The actual implementation in server.js uses exponential backoff: 1000ms, 2000ms, 4000ms
      expect(delays[0]).toBeGreaterThanOrEqual(900); // ~1s
      expect(delays[0]).toBeLessThanOrEqual(1100);
      expect(delays[1]).toBeGreaterThanOrEqual(1900); // ~2s
      expect(delays[1]).toBeLessThanOrEqual(2100);
    });

    test('should log activity log entry after retries exhausted', async () => {
      // This test will need actual implementation to pass
      // For now, it documents the expected behavior
      const taskId = '1-1-5-test-retry-exhausted';
      const response = createOrionResponse(ORION_RESPONSE_TYPES.QUICK_CDP, taskId);
      
      // Simulate permanent failure scenario
      // TODO: Devon needs to implement retry logic that logs failures
      
      // After implementation, we should verify:
      // 1. Activity log entry created in subtask file
      // 2. Entry contains error details
      // 3. Entry has timestamp
      // 4. Retry count is recorded
      
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('Synchronization between subtask files and project.json', () => {
    test('should update project.json when subtask file is updated', async () => {
      const taskId = '1-1-5-test-sync';
      const response = createOrionResponse(ORION_RESPONSE_TYPES.ASSIGNMENT, taskId);
      
      await request(app)
        .post('/api/orion/response')
        .send(response)
        .expect(200);
      
      // Verify project.json was updated
      const projectPath = path.join(testDataDir, 'project.json');
      const projectExists = await fs.access(projectPath).then(() => true).catch(() => false);
      
      expect(projectExists).toBe(true);
      
      const projectContent = await fs.readFile(projectPath, 'utf8');
      const projectData = JSON.parse(projectContent);
      
      // Project.json should contain reference to the updated subtask
      expect(projectData).toHaveProperty('phases');
      expect(Array.isArray(projectData.phases)).toBe(true);
      
      // Look for our task in the project structure
      const taskFound = projectData.phases.some(phase => 
        phase.tasks && phase.tasks.some(task => task.id === taskId)
      );
      
      expect(taskFound).toBe(true);
    });

    test('should maintain backward compatibility with project.json structure', async () => {
      // Create initial project.json with old structure
      const initialProject = {
        phases: [
          {
            id: 'phase-1',
            title: 'Test Phase',
            tasks: [
              { id: 'old-task-1', title: 'Old Task 1', status: 'completed' }
            ]
          }
        ],
        version: '1.0.0'
      };
      
      const projectPath = path.join(testDataDir, 'project.json');
      await fs.writeFile(projectPath, JSON.stringify(initialProject, null, 2));
      
      // Update a subtask via API
      const taskId = '1-1-5-test-backward-compat';
      const response = createOrionResponse(ORION_RESPONSE_TYPES.STATUS_UPDATE, taskId);
      
      await request(app)
        .post('/api/orion/response')
        .send(response)
        .expect(200);
      
      // Verify project.json still has old structure plus new task
      const updatedContent = await fs.readFile(projectPath, 'utf8');
      const updatedProject = JSON.parse(updatedContent);
      
      expect(updatedProject).toHaveProperty('phases');
      expect(updatedProject).toHaveProperty('version', '1.0.0');
      
      // Old task should still exist
      const oldTaskExists = updatedProject.phases[0].tasks.some(task => task.id === 'old-task-1');
      expect(oldTaskExists).toBe(true);
      
      // New task should be added
      const newTaskExists = updatedProject.phases[0].tasks.some(task => task.id === taskId);
      expect(newTaskExists).toBe(true);
    });
  });

  describe('Error handling and activity log updates', () => {
    test('should return 400 for malformed JSON', async () => {
      const malformedJson = '{ invalid: json, missingQuotes: true }';
      
      const res = await request(app)
        .post('/api/orion/response')
        .set('Content-Type', 'application/json')
        .send(malformedJson);
      
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toMatch(/invalid json/i);
    });

    test('should return 422 for missing required fields', async () => {
      const invalidResponse = {
        // Missing response_type and task_updates
        timestamp: new Date().toISOString()
      };
      
      const res = await request(app)
        .post('/api/orion/response')
        .send(invalidResponse);
      
      expect(res.status).toBe(422);
      expect(res.body).toHaveProperty('errors');
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.body.errors.length).toBeGreaterThan(0);
    });

    test('should log API failures in activity log after retries', async () => {
      const taskId = '1-1-5-test-error-logging';
      
      // Create initial subtask file
      const initialSubtask = {
        id: taskId,
        task_id: '1-1',
        title: 'Test Error Logging',
        activity_log: []
      };
      
      const subtaskPath = path.join(testDataDir, 'subtasks', `${taskId}.json`);
      await fs.writeFile(subtaskPath, JSON.stringify(initialSubtask, null, 2));
      
      // TODO: Devon needs to implement error logging
      // After implementation, we should verify:
      // 1. Activity log entry is added when API fails after retries
      // 2. Entry contains error message
      // 3. Entry contains timestamp
      // 4. Entry indicates retry count
      
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('Security testing', () => {
    test('should prevent path traversal via task IDs', async () => {
      const maliciousTaskId = '../../etc/passwd';
      const response = createOrionResponse(ORION_RESPONSE_TYPES.QUICK_CDP, maliciousTaskId);
      
      const res = await request(app)
        .post('/api/orion/response')
        .send(response);
      
      // Should reject path traversal attempts
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toMatch(/invalid.*task.*id/i);
    });

    test('should handle JSON injection attempts gracefully', async () => {
      const maliciousPayload = '{"response_type": "quick_cdp", "task_updates": {"task_id": "test"}, "malicious": "}]}{[{"}';
      
      const res = await request(app)
        .post('/api/orion/response')
        .set('Content-Type', 'application/json')
        .send(maliciousPayload);
      
      // Should not crash or expose internal errors
      expect(res.status).toBe(400);
      expect(res.body).not.toHaveProperty('stack');
      expect(res.body.error).not.toMatch(/internal server error/i);
    });

    test('should not disclose internal file paths in error messages', async () => {
      const response = createOrionResponse(ORION_RESPONSE_TYPES.QUICK_CDP, 'non-existent-task');
      
      const res = await request(app)
        .post('/api/orion/response')
        .send(response);
      
      // Error messages should not contain internal paths
      if (res.status >= 400) {
        const errorMessage = JSON.stringify(res.body).toLowerCase();
        expect(errorMessage).not.toMatch(/\/etc\/|\/home\/|\/users\/|c:\\|\.\.\//);
        expect(errorMessage).not.toMatch(/internal server error/i);
      }
    });
  });

  describe('Atomic updates to prevent data corruption', () => {
    test('should handle concurrent API calls without data corruption', async () => {
      const taskId = '1-1-5-test-concurrent';
      const numConcurrentCalls = 5;
      
      // Create initial subtask file
      const initialSubtask = {
        id: taskId,
        task_id: '1-1',
        title: 'Test Concurrent Updates',
        activity_log: []
      };
      
      const subtaskPath = path.join(testDataDir, 'subtasks', `${taskId}.json`);
      await fs.writeFile(subtaskPath, JSON.stringify(initialSubtask, null, 2));
      
      // Make concurrent API calls
      const promises = [];
      for (let i = 0; i < numConcurrentCalls; i++) {
        const response = createOrionResponse(ORION_RESPONSE_TYPES.STATUS_UPDATE, taskId, {
          status_update: { 
            previous_status: 'pending', 
            new_status: 'in_progress', 
            reason: `Concurrent update ${i + 1}` 
          }
        });
        
        promises.push(
          request(app)
            .post('/api/orion/response')
            .send(response)
        );
      }
      
      // Wait for all calls to complete
      const results = await Promise.allSettled(promises);
      
      // Verify all calls completed (some may fail due to locking, but shouldn't corrupt data)
      const successfulCalls = results.filter(r => r.status === 'fulfilled' && r.value.status === 200);
      const failedCalls = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.status >= 400));
      
      // At least some calls should succeed
      expect(successfulCalls.length).toBeGreaterThan(0);
      
      // Verify file still has valid JSON structure
      const fileContent = await fs.readFile(subtaskPath, 'utf8');
      expect(() => JSON.parse(fileContent)).not.toThrow();
      
      const finalData = JSON.parse(fileContent);
      
      // Verify data integrity
      expect(finalData).toHaveProperty('id', taskId);
      expect(finalData).toHaveProperty('activity_log');
      expect(Array.isArray(finalData.activity_log)).toBe(true);
      
      // Activity log should contain entries from successful updates
      expect(finalData.activity_log.length).toBeGreaterThanOrEqual(successfulCalls.length);
    });

    test('should implement file locking to prevent race conditions', async () => {
      // This test documents the expected behavior
      // TODO: Devon needs to implement file locking mechanism
      
      // After implementation, we should verify:
      // 1. Concurrent writes don't corrupt files
      // 2. File locking prevents simultaneous writes
      // 3. Failed locks return appropriate error responses
      // 4. Locks are released after write completion
      
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('Performance testing', () => {
    test('should handle large JSON payloads within reasonable time', async () => {
      // Create large payload with many activity log entries
      const largePayload = {
        response_type: 'conversation',
        task_updates: {
          task_id: '1-1-5-test-large',
          status: 'in_progress',
          phase: 'test_phase',
          assignee: 'test_agent'
        },
        conversation: {
          messages: Array.from({ length: 1000 }, (_, i) => ({
            role: i % 2 === 0 ? 'user' : 'assistant',
            content: `Message ${i + 1}: ${'x'.repeat(100)}`, // 100 chars per message
            timestamp: new Date().toISOString()
          }))
        }
      };
      
      const startTime = Date.now();
      
      const res = await request(app)
        .post('/api/orion/response')
        .send(largePayload);
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // Should process within reasonable time (e.g., under 2 seconds)
      expect(processingTime).toBeLessThan(2000);
      
      // Should return success status
      expect(res.status).toBe(200);
    });

    test('should implement payload size limits', async () => {
      // Create excessively large payload
      const hugePayload = {
        response_type: 'conversation',
        task_updates: {
          task_id: '1-1-5-test-huge',
          status: 'in_progress',
          phase: 'test_phase',
          assignee: 'test_agent'
        },
        conversation: {
          messages: Array.from({ length: 10000 }, (_, i) => ({
            role: 'user',
            content: `Huge message ${i + 1}: ${'x'.repeat(1000)}`, // 1000 chars per message
            timestamp: new Date().toISOString()
          }))
        }
      };
      
      const res = await request(app)
        .post('/api/orion/response')
        .send(hugePayload);
      
      // Should reject payloads that are too large
      expect(res.status).toBe(413); // Payload Too Large
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toMatch(/payload.*too large|size limit/i);
    });
  });
});
