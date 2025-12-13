const OrionWrapperV2 = require('../../../agents/orion-wrapper-v2');
const fs = require('fs');
const path = require('path');

describe('OrionWrapperV2 - Function 1: Receives Messages', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = new OrionWrapperV2();
  });

  describe('sendMessage method', () => {
    test('should throw an error when message is not provided', async () => {
      // Currently throws "Function 1 not implemented yet" but we want it to throw a validation error
      await expect(wrapper.sendMessage()).rejects.toThrow();
    });

    test('should throw an error when message is empty string', async () => {
      await expect(wrapper.sendMessage('')).rejects.toThrow('Message cannot be empty');
    });

    test('should throw an error when mode is invalid', async () => {
      await expect(wrapper.sendMessage('Hello', 'invalid-mode')).rejects.toThrow('Mode must be "plan" or "act"');
    });

    test('should accept valid message with default mode (plan) and save message to conversation file', async () => {
      // This test should FAIL (red) because the function doesn't save messages yet
      const result = await wrapper.sendMessage('Hello');
      // We expect the function to return a response object
      expect(result).toHaveProperty('response_type');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('metadata');
    });

    test('should accept valid message with act mode', async () => {
      const result = await wrapper.sendMessage('Hello', 'act');
      expect(result.metadata).toHaveProperty('mode', 'act');
    });

    test('should save user message to conversation file with pending status', async () => {
      // This test will fail because saveConversationHistory is not implemented
      await wrapper.sendMessage('hello');
      // Check that a message was saved to the conversation file
      const conversationPath = wrapper.getConversationFilePath(); // This method doesn't exist yet
      expect(fs.existsSync(conversationPath)).toBe(true);
      const data = JSON.parse(fs.readFileSync(conversationPath, 'utf8'));
      const lastMessage = data.conversations[data.conversations.length - 1];
      expect(lastMessage.role).toBe('user');
      expect(lastMessage.content).toBe('hello');
      expect(lastMessage.status).toBe('pending');
    });
  });

  describe('constructor', () => {
    test('should default projectId to P-001', () => {
      expect(wrapper.projectId).toBe('P-001');
    });

    test('should allow taskId to be null', () => {
      expect(wrapper.taskId).toBe(null);
    });

    test('should use provided projectId and taskId', () => {
      const customWrapper = new OrionWrapperV2('P-002', 'P-002-T-001');
      expect(customWrapper.projectId).toBe('P-002');
      expect(customWrapper.taskId).toBe('P-002-T-001');
    });
  });

  describe('conversation file path', () => {
    test('should generate correct file path for project conversations', () => {
      const projectWrapper = new OrionWrapperV2('P-003');
      const filePath = projectWrapper.getConversationFilePath();
      // Check that the path ends with the expected relative path (with forward slashes)
      expect(filePath).toMatch(/data\/conversations\/project_P-003\.json$/);
    });

    test('should generate correct file path for task conversations', () => {
      const taskWrapper = new OrionWrapperV2('P-003', 'P-003-T-001');
      const filePath = taskWrapper.getConversationFilePath();
      // Check that the path ends with the expected relative path (with forward slashes)
      expect(filePath).toMatch(/data\/conversations\/task_P-003-T-001\.json$/);
    });
  });
});
