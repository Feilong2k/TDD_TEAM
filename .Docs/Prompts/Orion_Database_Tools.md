# Orion Database Tools Reference

## Overview
These are the database tools available to Orion in TDD_TEAM. They follow a hybrid semantic + safe-SQL approach, providing focused semantic tools for common operations and safe-SQL tools for controlled schema evolution.

## Tool Calling Convention
Tools are called using the OpenAI function calling format. Each tool name follows the pattern: `DatabaseTool_{action}`.

Example tool call in JSON:
```json
{
  "type": "function",
  "function": {
    "name": "DatabaseTool_get_subtask_by_id",
    "arguments": "{\"subtask_id\": \"F1.1.1\"}"
  }
}
```

## Semantic Tools (Focused Operations)

### 1. Get Subtask by ID
**Tool**: `DatabaseTool_get_subtask_by_id`  
**Description**: Get a specific subtask by its ID (e.g., 'F1.1.1', 'F1.2.3').  
**When to use**: When you know the exact subtask ID and need its details (status, title, dependencies, etc.).  
**Parameters**:
- `subtask_id` (string, required): The subtask ID (e.g., 'F1.1.1')

**Example**:
```json
{
  "subtask_id": "F1.1.1"
}
```

**Expected Response**:
```json
{
  "id": "F1.1.1",
  "title": "Install and configure local PostgreSQL",
  "status": "pending",
  "phase": "Feature 1: Local Database & Orion/Aider Setup",
  "owner": null,
  "priority": "high",
  "dependencies": [],
  "created_at": "2025-12-14T23:00:00.000Z",
  "updated_at": "2025-12-14T23:00:00.000Z"
}
```

### 2. List Subtasks by Status
**Tool**: `DatabaseTool_list_subtasks_by_status`  
**Description**: List subtasks filtered by status (e.g., 'pending', 'in_progress', 'completed').  
**When to use**: To see all subtasks in a particular state, for status dashboards or workflow management.  
**Parameters**:
- `status` (string, required): Status to filter by (e.g., 'pending', 'in_progress', 'completed', 'blocked')
- `limit` (number, optional): Maximum number of results (default: 50)

**Example**:
```json
{
  "status": "pending",
  "limit": 10
}
```

**Use Cases**:
- "Show me all pending subtasks"
- "What subtasks are currently in progress?"
- "List completed subtasks from the last day"

### 3. Update Subtask Status
**Tool**: `DatabaseTool_update_subtask_status`  
**Description**: Update a subtask's status (e.g., from 'pending' to 'in_progress').  
**When to use**: When moving a subtask through the TDD workflow (pending → in_progress → completed) or marking it as blocked.  
**Parameters**:
- `subtask_id` (string, required): The subtask ID (e.g., 'F1.1.1')
- `new_status` (string, required): New status (e.g., 'pending', 'in_progress', 'completed', 'blocked')

**Example**:
```json
{
  "subtask_id": "F1.1.1",
  "new_status": "in_progress"
}
```

**Status Flow**:
```
pending → in_progress → completed
          ↓
        blocked
```

### 4. Append Subtask Log
**Tool**: `DatabaseTool_append_subtask_log`  
**Description**: Add a log entry to a subtask (for audit trail and context).  
**When to use**: To record important events, decisions, errors, or notes about a subtask. Essential for maintaining context.  
**Parameters**:
- `subtask_id` (string, required): The subtask ID
- `actor` (string, required): Who performed the action (e.g., 'Orion', 'Tara', 'Devon', 'system')
- `kind` (string, required): Type of log entry (e.g., 'status_change', 'creation', 'note', 'error')
- `content` (string, required): Log message describing what happened
- `meta` (string, optional): Optional JSON metadata (e.g., '{"priority": "high"}')

**Example**:
```json
{
  "subtask_id": "F1.1.1",
  "actor": "Orion",
  "kind": "status_change",
  "content": "Started PostgreSQL installation",
  "meta": "{\"previous_status\": \"pending\", \"new_status\": \"in_progress\"}"
}
```

### 5. Search Subtasks by Keyword
**Tool**: `DatabaseTool_search_subtasks_by_keyword`  
**Description**: Search subtasks by keyword in title or description. Useful when you don't remember the exact subtask ID but know what it's about.  
**When to use**: When you need to find subtasks related to a topic (e.g., "database", "postgres", "tools") but don't have the exact ID.  
**Parameters**:
- `keyword` (string, required): Keyword to search for (e.g., 'database', 'postgres', 'tools')
- `limit` (number, optional): Maximum number of results (default: 20)

**Example**:
```json
{
  "keyword": "database",
  "limit": 5
}
```

**Use Cases**:
- "Find all subtasks about database tools"
- "What subtasks mention PostgreSQL?"
- "I need to find the subtask about Orion database tools but I forgot the ID"

## Safe-SQL Tools (Controlled Schema Evolution)

### 6. Add Column to Table
**Tool**: `DatabaseTool_add_column_to_table`  
**Description**: Safely add a new column to an existing table. Only allows adding columns, not removing or modifying existing ones.  
**When to use**: When you need to extend the database schema without risking data loss (e.g., adding a new field to track additional metadata).  
**Parameters**:
- `table_name` (string, required): Name of the table to modify
- `column_name` (string, required): Name of the new column
- `column_type` (string, required): PostgreSQL data type (e.g., 'text', 'integer', 'boolean', 'jsonb')
- `default_value` (string, optional): Default value for the column
- `nullable` (boolean, optional): Whether the column can be NULL (default: true)

**Example**:
```json
{
  "table_name": "subtasks",
  "column_name": "estimated_hours",
  "column_type": "integer",
  "default_value": "1",
  "nullable": true
}
```

**Safety Restrictions**:
- Cannot add columns to protected tables (subtasks, subtask_state, subtask_logs, etc.)
- Cannot remove or modify existing columns
- Blocked operations: DROP, TRUNCATE, DELETE without WHERE

### 7. Create Table from Migration
**Tool**: `DatabaseTool_create_table_from_migration`  
**Description**: Create a new table using a migration SQL file. Only allows CREATE TABLE, not DROP or ALTER.  
**When to use**: When you need to create a completely new table as part of a schema migration.  
**Parameters**:
- `migration_file` (string, required): Path to the migration SQL file (e.g., 'backend/src/db/migrations/001_create_subtasks.sql')

**Example**:
```json
{
  "migration_file": "backend/src/db/migrations/023_create_new_feature_table.sql"
}
```

**Safety Restrictions**:
- Only CREATE TABLE statements allowed
- File must exist and be readable
- All safety checks applied to SQL content

## General Database Tools

### 8. List Tables
**Tool**: `DatabaseTool_list_tables`  
**Description**: List all tables in the database.  
**When to use**: To explore the database schema or verify table existence.  
**Parameters**: None

### 9. Safe Query
**Tool**: `DatabaseTool_safe_query`  
**Description**: Execute a safe SQL query (SELECT only, no DROP, TRUNCATE, DELETE without WHERE, or other destructive operations).  
**When to use**: For complex queries that aren't covered by semantic tools, but only for reading data.  
**Parameters**:
- `sql` (string, required): The SQL query to execute (must be a SELECT query)
- `params` (array, optional): Query parameters (for parameterized queries)

**Example**:
```json
{
  "sql": "SELECT id, title, status FROM subtasks WHERE status = 'completed' ORDER BY updated_at DESC LIMIT 5",
  "params": []
}
```

**Safety Restrictions**:
- Only SELECT queries allowed
- Blocked: DROP, TRUNCATE, DELETE without WHERE, ALTER TABLE DROP

## Tool Usage Patterns

### Common Workflows

#### Starting a Subtask
1. **Get subtask details**: `DatabaseTool_get_subtask_by_id`
2. **Update status to in_progress**: `DatabaseTool_update_subtask_status`
3. **Log the start**: `DatabaseTool_append_subtask_log`

#### Completing a Subtask
1. **Update status to completed**: `DatabaseTool_update_subtask_status`
2. **Log completion**: `DatabaseTool_append_subtask_log`
3. **Optional**: Search for dependent subtasks using `DatabaseTool_search_subtasks_by_keyword`

#### Finding Context
When you need information but don't have the exact ID:
1. **Search by keyword**: `DatabaseTool_search_subtasks_by_keyword`
2. **Filter by status**: `DatabaseTool_list_subtasks_by_status`
3. **Examine results**: Use `DatabaseTool_get_subtask_by_id` on interesting IDs

#### Schema Evolution
1. **Check existing tables**: `DatabaseTool_list_tables`
2. **Add column if needed**: `DatabaseTool_add_column_to_table`
3. **Create new table if needed**: `DatabaseTool_create_table_from_migration`

## Safety Features

### Blocked Operations
The following operations are completely blocked:
- `DROP TABLE`, `DROP DATABASE`, `DROP SCHEMA`, `DROP INDEX`
- `TRUNCATE TABLE`
- `DELETE FROM table` (without WHERE clause)
- `ALTER TABLE ... DROP`

### Protected Tables
These tables have additional protection (read-only unless using specific semantic tools):
- `subtasks`, `subtask_state`, `subtask_logs`
- `projects`, `tasks`, `features`
- `_migrations`, `agents`, `tools`

### Plan Mode Locking
In Plan mode, no database tools are available. This follows the Cline pattern where planning happens without tool execution.

## Error Handling

Common errors and how to handle them:

| Error | Likely Cause | Solution |
|-------|-------------|----------|
| `Subtask with ID X not found` | Invalid subtask ID | Use `DatabaseTool_search_subtasks_by_keyword` to find the correct ID |
| `Blocked: Dangerous SQL pattern` | Attempted unsafe operation | Use semantic tools instead of raw SQL |
| `Table "X" is protected` | Attempted to modify protected table | Use specific semantic tools for that table type |
| `Only SELECT queries are allowed` | Tried to use `safe_query` for non-SELECT | Use appropriate semantic tool or reconsider approach |

## Best Practices

1. **Prefer semantic tools** over raw SQL when available
2. **Log important actions** using `DatabaseTool_append_subtask_log` for audit trail
3. **Search before guessing IDs** using `DatabaseTool_search_subtasks_by_keyword`
4. **Respect status flow** (pending → in_progress → completed)
5. **Use safe-SQL tools only for schema evolution**, not data manipulation

## Integration with Orion Prompt

This reference should be included in Orion's system prompt. When Orion needs to work with the database, it should:
1. Check if a semantic tool exists for the operation
2. Use safe-SQL tools only when necessary
3. Always log significant changes
4. Handle errors gracefully by reading error messages and adjusting approach

---
*Last updated: 2025-12-15*  
*For TDD_TEAM Orion implementation*
