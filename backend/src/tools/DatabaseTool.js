const db = require('../db/connection');
const fs = require('fs');
const path = require('path');

/**
 * Database operations tool (Orion-only).
 * Requires role to be 'Orion' for all operations.
 * Safety: Blocks DROP, TRUNCATE, DELETE without WHERE
 */
class DatabaseTool {
  constructor(role) {
    if (!role) {
      throw new Error('DatabaseTool requires a role');
    }
    this.role = role;
    
    // Dangerous SQL patterns that could wipe data
    this.BLOCKED_PATTERNS = [
      /\bDROP\s+(TABLE|DATABASE|SCHEMA|INDEX)/i,
      /\bTRUNCATE\b/i,
      /\bDELETE\s+FROM\s+\w+\s*$/i,  // DELETE without WHERE
      /\bDELETE\s+FROM\s+\w+\s*;/i,  // DELETE without WHERE ending with ;
      /\bALTER\s+TABLE\s+\w+\s+DROP/i,
    ];
    
    // TDD_TEAM specific tables
    this.TDD_TEAM_TABLES = [
      'subtasks',
      'subtask_state',
      'subtask_logs',
      'projects',
      'tasks',
      'features'
    ];
    
    // Protected tables (read-only unless specific methods)
    this.PROTECTED_TABLES = [
      ...this.TDD_TEAM_TABLES,
      '_migrations',
      'agents',
      'tools'
    ];
  }

  /**
   * Check if the current role is Orion.
   * @throws {Error} If role is not Orion.
   */
  _checkRole() {
    if (this.role !== 'Orion') {
      throw new Error('DatabaseTool is only accessible to Orion');
    }
  }

  /**
   * Check if a SQL query is safe to execute.
   * @param {string} sql - SQL query
   * @throws {Error} If query is dangerous
   */
  _checkSafety(sql) {
    if (!sql || typeof sql !== 'string') {
      throw new Error('SQL query must be a non-empty string');
    }
    const normalizedSql = sql.trim();
    
    // Check for blocked patterns
    for (const pattern of this.BLOCKED_PATTERNS) {
      if (pattern.test(normalizedSql)) {
        throw new Error(`Blocked: Dangerous SQL pattern detected. Cannot DROP, TRUNCATE, or DELETE without WHERE clause.`);
      }
    }
    
    // Check for modifications to protected tables
    const modifyPatterns = [
      /\bINSERT\s+INTO\s+(\w+)/i,
      /\bUPDATE\s+(\w+)/i,
      /\bDELETE\s+FROM\s+(\w+)/i,
    ];
    
    for (const pattern of modifyPatterns) {
      const match = normalizedSql.match(pattern);
      if (match) {
        const tableName = match[1].toLowerCase();
        if (this.PROTECTED_TABLES.includes(tableName)) {
          throw new Error(`Blocked: Table "${tableName}" is protected. Use specific methods to modify.`);
        }
      }
    }
    
    return true;
  }

  /**
   * Get a specific subtask by its ID.
   * @param {string} subtask_id - The subtask ID (e.g., 'F1.1.1')
   * @returns {Promise<Object>} The subtask object
   */
  async get_subtask_by_id(subtask_id) {
    this._checkRole();
    const result = await db.query(
      'SELECT * FROM subtasks WHERE id = $1',
      [subtask_id]
    );
    if (result.rows.length === 0) {
      throw new Error(`Subtask with ID ${subtask_id} not found`);
    }
    return result.rows[0];
  }

  /**
   * List subtasks filtered by status.
   * @param {string} status - Status to filter by (e.g., 'pending', 'in_progress', 'completed')
   * @param {number} limit - Maximum number of results (default: 50)
   * @returns {Promise<Array>} Array of subtask objects
   */
  async list_subtasks_by_status(status, limit = 50) {
    this._checkRole();
    const result = await db.query(
      'SELECT * FROM subtasks WHERE status = $1 ORDER BY created_at DESC LIMIT $2',
      [status, limit]
    );
    return result.rows;
  }

  /**
   * Update a subtask's status.
   * @param {string} subtask_id - The subtask ID (e.g., 'F1.1.1')
   * @param {string} new_status - New status (e.g., 'pending', 'in_progress', 'completed', 'blocked')
   * @returns {Promise<Object>} The updated subtask
   */
  async update_subtask_status(subtask_id, new_status) {
    this._checkRole();
    const result = await db.query(
      `UPDATE subtasks 
       SET status = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [new_status, subtask_id]
    );
    if (result.rows.length === 0) {
      throw new Error(`Subtask with ID ${subtask_id} not found`);
    }
    return result.rows[0];
  }

  /**
   * Add a log entry to a subtask.
   * @param {string} subtask_id - The subtask ID
   * @param {string} actor - Who performed the action (e.g., 'Orion', 'Tara', 'Devon', 'system')
   * @param {string} kind - Type of log entry (e.g., 'status_change', 'creation', 'note', 'error')
   * @param {string} content - Log message describing what happened
   * @param {string} meta - Optional JSON metadata (e.g., '{"priority": "high"}')
   * @returns {Promise<Object>} The created log entry
   */
  async append_subtask_log(subtask_id, actor, kind, content, meta = null) {
    this._checkRole();
    const result = await db.query(
      `INSERT INTO subtask_logs (subtask_id, actor, kind, content, meta, created_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
       RETURNING *`,
      [subtask_id, actor, kind, content, meta]
    );
    return result.rows[0];
  }

  /**
   * Search subtasks by keyword in title or description.
   * @param {string} keyword - Keyword to search for (e.g., 'database', 'postgres', 'tools')
   * @param {number} limit - Maximum number of results (default: 20)
   * @returns {Promise<Array>} Array of subtask objects matching the keyword
   */
  async search_subtasks_by_keyword(keyword, limit = 20) {
    this._checkRole();
    const searchTerm = `%${keyword}%`;
    const result = await db.query(
      `SELECT * FROM subtasks 
       WHERE title ILIKE $1 OR description ILIKE $1
       ORDER BY created_at DESC 
       LIMIT $2`,
      [searchTerm, limit]
    );
    return result.rows;
  }

  /**
   * Safely add a new column to an existing table.
   * Only allows adding columns, not removing or modifying existing ones.
   * @param {string} table_name - Name of the table to modify
   * @param {string} column_name - Name of the new column
   * @param {string} column_type - PostgreSQL data type (e.g., 'text', 'integer', 'boolean', 'jsonb')
   * @param {string} default_value - Default value for the column (optional)
   * @param {boolean} nullable - Whether the column can be NULL (optional, default: true)
   * @returns {Promise<Object>} Query result
   */
  async add_column_to_table(table_name, column_name, column_type, default_value = null, nullable = true) {
    this._checkRole();
    
    // Validate table name to prevent SQL injection
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table_name)) {
      throw new Error('Invalid table name');
    }
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column_name)) {
      throw new Error('Invalid column name');
    }
    
    // Check if the table is in the protected list (we allow adding columns to any table except system tables)
    if (this.PROTECTED_TABLES.includes(table_name.toLowerCase())) {
      throw new Error(`Cannot modify protected table: ${table_name}`);
    }
    
    let sql = `ALTER TABLE ${table_name} ADD COLUMN ${column_name} ${column_type}`;
    if (!nullable) {
      sql += ' NOT NULL';
    }
    if (default_value !== null) {
      sql += ` DEFAULT ${default_value}`;
    }
    
    // Safety check
    this._checkSafety(sql);
    
    return db.query(sql);
  }

  /**
   * Create a new table using a migration SQL file.
   * Only allows CREATE TABLE, not DROP or ALTER.
   * @param {string} migration_file - Path to the migration SQL file
   * @returns {Promise<Object>} Query result
   */
  async create_table_from_migration(migration_file) {
    this._checkRole();
    
    const fullPath = path.join(process.cwd(), migration_file);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Migration file not found: ${migration_file}`);
    }
    
    const sql = fs.readFileSync(fullPath, 'utf8');
    
    // Safety check: only allow CREATE TABLE statements
    const normalizedSql = sql.trim().toUpperCase();
    if (!normalizedSql.startsWith('CREATE TABLE')) {
      throw new Error('Migration file must only contain CREATE TABLE statements');
    }
    
    // Check for dangerous patterns
    this._checkSafety(sql);
    
    return db.query(sql);
  }

  /**
   * List all tables in the database.
   * @returns {Promise<Array>} Array of table names.
   */
  async list_tables() {
    this._checkRole();
    const result = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    return result.rows.map(r => r.table_name);
  }

  /**
   * Execute a safe SQL query (SELECT only, no DROP, TRUNCATE, DELETE without WHERE).
   * @param {string} sql - The SQL query to execute (must be a SELECT query)
   * @param {Array} params - Query parameters (for parameterized queries)
   * @returns {Promise<Object>} Query result { rows, rowCount }
   */
  async safe_query(sql, params = []) {
    this._checkRole();
    
    // Safety check
    this._checkSafety(sql);
    
    // Ensure it's a SELECT query (basic check)
    const normalizedSql = sql.trim().toUpperCase();
    if (!normalizedSql.startsWith('SELECT')) {
      throw new Error('Only SELECT queries are allowed in safe_query');
    }
    
    try {
      const result = await db.query(sql, params);
      return {
        rows: result.rows,
        rowCount: result.rowCount,
        command: result.command
      };
    } catch (error) {
      throw new Error(`Query failed: ${error.message}`);
    }
  }

  // ===== Legacy Methods (for backward compatibility) =====

  async savePattern(pattern) {
    this._checkRole();
    throw new Error('Method not implemented for TDD_TEAM. Use specific subtask methods.');
  }

  async updateWorkflow(name, definition) {
    this._checkRole();
    throw new Error('Method not implemented for TDD_TEAM. Use specific subtask methods.');
  }

  async getAgentPermissions(agentId) {
    this._checkRole();
    throw new Error('Method not implemented for TDD_TEAM. Use specific subtask methods.');
  }

  async getAgentRegistry() {
    this._checkRole();
    throw new Error('Method not implemented for TDD_TEAM. Use specific subtask methods.');
  }

  async query(sql, params = []) {
    this._checkRole();
    this._checkSafety(sql);

    try {
      const result = await db.query(sql, params);
      return {
        rows: result.rows,
        rowCount: result.rowCount,
        command: result.command
      };
    } catch (error) {
      throw new Error(`Query failed: ${error.message}`);
    }
  }

  async listTables() {
    return this.list_tables();
  }

  async describeTable(tableName) {
    this._checkRole();

    // Validate table name to prevent SQL injection
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      throw new Error('Invalid table name');
    }

    const result = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);
    return result.rows;
  }

  async searchLogs(query) {
    this._checkRole();

    if (!query || typeof query !== 'string') {
      throw new Error('Search query must be a non-empty string');
    }

    const searchTerm = `%${query}%`;
    const searchQuery = `
      SELECT id, level, message, timestamp, metadata
      FROM system_logs
      WHERE message ILIKE $1 OR metadata::text ILIKE $1
      ORDER BY timestamp DESC
      LIMIT 50
    `;

    try {
      const result = await db.query(searchQuery, [searchTerm]);
      return result.rows;
    } catch (error) {
      // If the system_logs table doesn't exist, return empty array
      if (error.message.includes('relation "system_logs" does not exist')) {
        return [];
      }
      throw new Error(`Failed to search logs: ${error.message}`);
    }
  }

  /**
   * Generic execute method for AgentExecutor compatibility.
   * Routes to specific methods based on action parameter.
   * @param {Object} params - { action, ...actionParams }
   * @returns {Promise<any>} Result of the action
   */
  async execute(params) {
    this._checkRole();
    
    const { action, ...actionParams } = params;
    
    // Convert action from functionDefinitions.js format (underscore) to method name
    // The functionDefinitions.js uses "DatabaseTool_get_subtask_by_id" which gets parsed to action = "get_subtask_by_id"
    // We'll map the action to the corresponding method.
    
    // Map of action names to method names
    const methodMap = {
      'get_subtask_by_id': 'get_subtask_by_id',
      'list_subtasks_by_status': 'list_subtasks_by_status',
      'update_subtask_status': 'update_subtask_status',
      'append_subtask_log': 'append_subtask_log',
      'search_subtasks_by_keyword': 'search_subtasks_by_keyword',
      'add_column_to_table': 'add_column_to_table',
      'create_table_from_migration': 'create_table_from_migration',
      'list_tables': 'list_tables',
      'safe_query': 'safe_query',
      // Legacy actions
      'query': 'query',
      'getAgentPermissions': 'getAgentPermissions',
      'getAgentRegistry': 'getAgentRegistry',
      'listTables': 'listTables',
      'describeTable': 'describeTable',
      'savePattern': 'savePattern',
      'updateWorkflow': 'updateWorkflow',
      'searchLogs': 'searchLogs',
    };
    
    if (!methodMap[action]) {
      throw new Error(`Unknown DatabaseTool action: ${action}`);
    }
    
    const methodName = methodMap[action];
    return this[methodName](...Object.values(actionParams));
  }
}

// Create a default instance with role 'Orion' for testing and general use
const defaultInstance = new DatabaseTool('Orion');

// Export the instance as default (for tests and direct use)
module.exports = defaultInstance;

// Also export the class for the registry and other uses
module.exports.DatabaseTool = DatabaseTool;
