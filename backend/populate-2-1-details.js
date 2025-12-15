const { subtasks, query } = require('./db.js');

async function populate2_1Details() {
  try {
    console.log('Populating details for task 2-1 subtasks...');

    // Details for subtask 2-1-1
    const details2_1_1 = {
      instructions: {
        tara: "Test the semantic tool schemas: validate that each tool schema includes required parameters, return types, and proper descriptions. Ensure tools are discoverable and usable by Orion.",
        devon: "Define tool schemas for: db_get_subtask_by_id, db_list_subtasks_by_status, db_update_subtask_status, db_append_subtask_log, db_search_subtasks_by_keyword. Each schema must include parameter validation, return type definitions, and clear descriptions.",
        orion: "Review tool schemas for completeness and usability. Ensure they cover common database operations needed for planning and CDP analysis."
      },
      notes: "Tool schemas are foundational for Orion's database interaction. They must be well-defined and follow consistent patterns.",
      key_considerations: [
        "Tool schemas must be compatible with DeepSeek's tool-calling format",
        "Each tool should have clear error handling and validation",
        "Schemas should be extensible for future tools",
        "Consider security implications of each tool's data access"
      ],
      activity_log: []
    };

    // Details for subtask 2-1-2
    const details2_1_2 = {
      instructions: {
        tara: "Test safe-SQL tools: verify that DDL restrictions are enforced (no DROP, TRUNCATE, DELETE). Test schema evolution tools for safety and correctness.",
        devon: "Implement safe-SQL tools: db_add_column_to_table, db_create_table_from_migration. Add validation to block dangerous operations. Ensure tools work with PostgreSQL syntax and handle errors gracefully.",
        orion: "Review safe-SQL tool implementation for security and reliability. Ensure they provide enough flexibility for schema evolution while preventing destructive operations."
      },
      notes: "Safe-SQL tools enable controlled database evolution while preventing accidental or malicious data loss.",
      key_considerations: [
        "Must prevent destructive operations (DROP, TRUNCATE, DELETE)",
        "Tools should validate SQL syntax before execution",
        "Implement proper error handling for database errors",
        "Consider concurrent schema modifications"
      ],
      activity_log: []
    };

    // Details for subtask 2-1-3
    const details2_1_3 = {
      instructions: {
        tara: "Test DeepSeek API integration: verify API calls, response parsing, error handling, and token usage. Test prompt templates for completeness.",
        devon: "Integrate DeepSeek API with tool-calling support. Create prompt templates for planning and CDP. Implement conversation management with database logging.",
        orion: "Review API integration and prompt templates. Ensure they provide adequate context and follow best practices for LLM interactions."
      },
      notes: "DeepSeek API integration is critical for Orion's planning capabilities. Prompt templates must be well-structured.",
      key_considerations: [
        "API rate limiting and cost management",
        "Token usage optimization",
        "Conversation context management",
        "Error handling for API failures"
      ],
      activity_log: []
    };

    // Details for subtask 2-1-4
    const details2_1_4 = {
      instructions: {
        tara: "Test Orion wrapper: verify Plan/Act mode tool locking works correctly. Test context aggregation from database and files.",
        devon: "Build Orion wrapper with mode-based tool restrictions (Cline-style). Implement context aggregation from database and files. Ensure wrapper handles tool calling and response parsing.",
        orion: "Review wrapper implementation for proper mode handling and context aggregation. Ensure it aligns with Orion's workflow requirements."
      },
      notes: "Orion wrapper enables Cline-style interaction with database tools and context-aware planning.",
      key_considerations: [
        "Tool locking must be enforced based on mode",
        "Context aggregation should be efficient and comprehensive",
        "Wrapper should handle tool execution errors gracefully",
        "Consider performance implications of context aggregation"
      ],
      activity_log: []
    };

    // Details for subtask 2-1-5
    const details2_1_5 = {
      instructions: {
        tara: "Test end-to-end planning workflow: create mock Orion tests that verify database interaction, CDP analysis, and planning completion within 2 minutes.",
        devon: "Not applicable - this is a testing subtask",
        orion: "Participate in end-to-end testing to verify planning workflow works correctly with the implemented tools."
      },
      notes: "End-to-end testing validates the complete Orion planning workflow with database integration.",
      key_considerations: [
        "Test planning completion within time constraints",
        "Verify CDP analysis identifies constraints accurately",
        "Ensure database operations work correctly during planning",
        "Test error handling and recovery scenarios"
      ],
      activity_log: []
    };

    // Update each subtask in database
    const subtaskUpdates = [
      { id: '2-1-1', details: details2_1_1 },
      { id: '2-1-2', details: details2_1_2 },
      { id: '2-1-3', details: details2_1_3 },
      { id: '2-1-4', details: details2_1_4 },
      { id: '2-1-5', details: details2_1_5 }
    ];

    for (const update of subtaskUpdates) {
      console.log(`Updating subtask ${update.id}...`);
      
      // Get current subtask to preserve other fields
      const current = await subtasks.getById(update.id);
      if (!current) {
        console.error(`Subtask ${update.id} not found!`);
        continue;
      }

      // Merge existing details with new details (preserve any existing data)
      const mergedDetails = {
        ...(current.details || {}),
        ...update.details,
        // Preserve stages if they exist
        stages: {
          ...(current.details?.stages || {}),
          ...(update.details.stages || {})
        }
      };

      // Update subtask with merged details
      await subtasks.update(update.id, { 
        details: mergedDetails,
        metadata: {
          ...(current.metadata || {}),
          details_populated: true,
          populated_at: new Date().toISOString()
        }
      });

      console.log(`  Updated subtask ${update.id} with enriched details`);
    }

    console.log('Successfully populated details for all task 2-1 subtasks!');
    
  } catch (error) {
    console.error('Error populating details:', error);
    process.exit(1);
  }
}

// Run the function
populate2_1Details().then(() => {
  console.log('Population script finished.');
  process.exit(0);
}).catch(error => {
  console.error('Population script failed:', error);
  process.exit(1);
});
