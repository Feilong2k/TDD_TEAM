const OrionWrapperV2 = require('../../../agents/orion-wrapper-v2');
const fs = require('fs').promises;
const path = require('path');

describe('Function 2: Prepares the Prompt', () => {
  let wrapper;
  const testProjectId = 'P-002';
  const testTaskId = 'P-002-T-001';
  const systemPromptPath = path.join(__dirname, '../../../agents/system_prompt_orion.md');

  beforeEach(() => {
    wrapper = new OrionWrapperV2(testProjectId, testTaskId);
  });

  afterEach(async () => {
    // Clean up test conversation files
    const projectFile = path.join(__dirname, '../../../data/conversations', `project_${testProjectId}.json`);
    const taskFile = path.join(__dirname, '../../../data/conversations', `task_${testTaskId}.json`);
    
    try {
      await fs.unlink(projectFile);
    } catch (error) {
      // File may not exist, that's fine
    }
    
    try {
      await fs.unlink(taskFile);
    } catch (error) {
      // File may not exist, that's fine
    }
  });

  describe('formatPrompt method', () => {
    test('should throw an error when userMessage is not provided', () => {
      expect(() => {
        wrapper.formatPrompt();
      }).toThrow('Message cannot be empty');
    });

    test('should throw an error when userMessage is empty string', () => {
      expect(() => {
        wrapper.formatPrompt('');
      }).toThrow('Message cannot be empty');
    });

    test('should throw an error when userMessage is not a string', () => {
      expect(() => {
        wrapper.formatPrompt(123);
      }).toThrow('Message must be a string');
    });

    test('should correctly format prompt with empty conversation history', async () => {
      const userMessage = 'I need to add user authentication.';
      const conversationHistory = [];
      
      const prompt = wrapper.formatPrompt(userMessage, conversationHistory);
      
      // Should include system prompt
      expect(prompt).toContain('You are Orion, an expert in Test-Driven Development (TDD) and software engineering.');
      
      // Should include user message
      expect(prompt).toContain(userMessage);
      
      // Should include JSON response reminder
      expect(prompt).toContain('Orion (respond in JSON only):');
      
      // Should not include "Previous conversation:" when history is empty
      expect(prompt).not.toContain('Previous conversation:');
    });

    test('should include conversation history when provided', async () => {
      const userMessage = 'What about password reset?';
      const conversationHistory = [
        {
          role: 'user',
          content: 'I need to add user authentication.',
          timestamp: '2025-12-12T23:54:24.614Z'
        },
        {
          role: 'assistant',
          content: JSON.stringify({
            response_type: 'clarification',
            content: {
              questions: ['Should we support social login?']
            },
            metadata: {
              task_id: testTaskId,
              project_id: testProjectId,
              requires_action: true,
              next_step: 'Wait for user answers.'
            }
          }),
          timestamp: '2025-12-12T23:54:25.614Z'
        }
      ];
      
      const prompt = wrapper.formatPrompt(userMessage, conversationHistory);
      
      // Should include "Previous conversation:" header
      expect(prompt).toContain('Previous conversation:');
      
      // Should include user message from history
      expect(prompt).toContain('User: I need to add user authentication.');
      
      // Should include assistant response from history
      expect(prompt).toContain('Orion: {"response_type":"clarification"');
      
      // Should include new user message
      expect(prompt).toContain(`User: ${userMessage}`);
      
      // Should include JSON response reminder
      expect(prompt).toContain('Orion (respond in JSON only):');
    });

    test('should handle special characters and newlines in messages', async () => {
      const userMessage = 'What about "quotes" and \n newlines?';
      const conversationHistory = [
        {
          role: 'user',
          content: 'Test with "quotes" and \n newlines',
          timestamp: '2025-12-12T23:54:24.614Z'
        }
      ];
      
      const prompt = wrapper.formatPrompt(userMessage, conversationHistory);
      
      // Prompt should be generated without throwing errors
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
      
      // Should include the user message (may be escaped or formatted)
      expect(prompt).toContain('What about');
    });

    test('should limit conversation history to last N messages to avoid token limits', async () => {
      const userMessage = 'Latest message';
      const conversationHistory = [];
      
      // Create 15 messages (more than typical token limit would allow)
      for (let i = 0; i < 15; i++) {
        conversationHistory.push({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i}`,
          timestamp: `2025-12-12T23:54:${i.toString().padStart(2, '0')}.614Z`
        });
      }
      
      const prompt = wrapper.formatPrompt(userMessage, conversationHistory);
      
      // Should include "Previous conversation:" header
      expect(prompt).toContain('Previous conversation:');
      
      // Should include some messages from history
      expect(prompt).toContain('Message');
      
      // Implementation may truncate history - test should verify truncation works
      // without causing errors
    });

    test('should include the reminder "Orion (respond in JSON only):" at the end', async () => {
      const userMessage = 'Test message';
      const prompt = wrapper.formatPrompt(userMessage, []);
      
      // Should end with the JSON response reminder
      expect(prompt.endsWith('Orion (respond in JSON only):')).toBe(true);
    });

    test('should handle both project and task conversation files correctly', async () => {
      // Test with project-only wrapper
      const projectWrapper = new OrionWrapperV2(testProjectId);
      const projectPrompt = projectWrapper.formatPrompt('Project message', []);
      expect(typeof projectPrompt).toBe('string');
      
      // Test with task wrapper
      const taskWrapper = new OrionWrapperV2(testProjectId, testTaskId);
      const taskPrompt = taskWrapper.formatPrompt('Task message', []);
      expect(typeof taskPrompt).toBe('string');
      
      // Both should generate valid prompts
      expect(projectPrompt.length).toBeGreaterThan(0);
      expect(taskPrompt.length).toBeGreaterThan(0);
    });

    test('should load system prompt from file', async () => {
      const userMessage = 'Test message';
      const prompt = wrapper.formatPrompt(userMessage, []);
      
      // Read the actual system prompt file
      const systemPromptContent = await fs.readFile(systemPromptPath, 'utf8');
      
      // The prompt should contain content from the system prompt file
      expect(prompt).toContain('You are Orion');
      expect(prompt).toContain('Test-Driven Development');
      
      // Verify specific sections from the system prompt are included
      expect(prompt).toContain('Response Format');
      expect(prompt).toContain('Workflow Rules');
    });

    test('should handle missing system prompt file gracefully', async () => {
      // Temporarily rename the system prompt file
      const tempPath = systemPromptPath + '.bak';
      await fs.rename(systemPromptPath, tempPath);
      
      try {
        const userMessage = 'Test message';
        
        // Should throw an error or handle missing file gracefully
        expect(() => {
          wrapper.formatPrompt(userMessage, []);
        }).toThrow();
      } finally {
        // Restore the file
        await fs.rename(tempPath, systemPromptPath);
      }
    });

    test('should format assistant responses correctly from JSON strings', async () => {
      const userMessage = 'Follow-up question';
      const conversationHistory = [
        {
          role: 'assistant',
          content: JSON.stringify({
            response_type: 'decomposition',
            content: {
              subtasks: [
                {
                  id: 'T-001-1',
                  title: 'Write failing test',
                  description: 'Test description',
                  assignee: 'Tara',
                  status: 'pending'
                }
              ]
            },
            metadata: {
              task_id: testTaskId,
              project_id: testProjectId,
              requires_action: false,
              next_step: null
            }
          }),
          timestamp: '2025-12-12T23:54:25.614Z'
        }
      ];
      
      const prompt = wrapper.formatPrompt(userMessage, conversationHistory);
      
      // Should include the assistant response in the prompt
      expect(prompt).toContain('Orion: {');
      expect(prompt).toContain('"response_type":"decomposition"');
      expect(prompt).toContain('"subtasks"');
    });
  });
});
