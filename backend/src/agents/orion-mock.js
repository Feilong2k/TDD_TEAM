/**
 * Mock Orion wrapper demonstrating database tool usage.
 * This file shows how Orion would use the new semantic database tools
 * in a TDD_TEAM workflow.
 */

const { DatabaseTool } = require('../tools/DatabaseTool');
const { getToolsForRole } = require('../tools/registry');

class OrionMock {
  constructor(mode = 'act') {
    this.mode = mode; // 'plan' or 'act'
    this.tools = getToolsForRole('Orion', mode);
    this.dbTool = this.tools.DatabaseTool ? new this.tools.DatabaseTool('Orion') : null;
  }

  /**
   * Example workflow: Starting a subtask
   */
  async startSubtask(subtaskId) {
    console.log(`Starting subtask: ${subtaskId}`);
    
    if (this.mode === 'plan') {
      console.log('In Plan mode: tools are locked, only planning allowed.');
      return { planned: true, subtaskId };
    }

    if (!this.dbTool) {
      throw new Error('DatabaseTool not available');
    }

    try {
      // 1. Get subtask details
      const subtask = await this.dbTool.get_subtask_by_id(subtaskId);
      console.log('Found subtask:', subtask.title);
      
      // 2. Update status to in_progress
      const updated = await this.dbTool.update_subtask_status(subtaskId, 'in_progress');
      console.log('Updated status to:', updated.status);
      
      // 3. Log the start
      const log = await this.dbTool.append_subtask_log(
        subtaskId,
        'Orion',
        'status_change',
        `Started work on subtask: ${subtask.title}`,
        JSON.stringify({ previous_status: 'pending', new_status: 'in_progress' })
      );
      console.log('Logged start:', log.content);
      
      return {
        success: true,
        subtask: updated,
        log
      };
    } catch (error) {
      console.error('Error starting subtask:', error.message);
      throw error;
    }
  }

  /**
   * Example workflow: Completing a subtask
   */
  async completeSubtask(subtaskId) {
    console.log(`Completing subtask: ${subtaskId}`);
    
    if (this.mode === 'plan') {
      console.log('In Plan mode: tools are locked, only planning allowed.');
      return { planned: true, subtaskId };
    }

    if (!this.dbTool) {
      throw new Error('DatabaseTool not available');
    }

    try {
      // 1. Update status to completed
      const updated = await this.dbTool.update_subtask_status(subtaskId, 'completed');
      console.log('Updated status to:', updated.status);
      
      // 2. Log completion
      const log = await this.dbTool.append_subtask_log(
        subtaskId,
        'Orion',
        'status_change',
        `Completed subtask: ${updated.title}`,
        JSON.stringify({ previous_status: 'in_progress', new_status: 'completed' })
      );
      console.log('Logged completion:', log.content);
      
      return {
        success: true,
        subtask: updated,
        log
      };
    } catch (error) {
      console.error('Error completing subtask:', error.message);
      throw error;
    }
  }

  /**
   * Example workflow: Searching for subtasks when you don't remember the ID
   */
  async searchSubtasks(keyword) {
    console.log(`Searching for subtasks with keyword: ${keyword}`);
    
    if (this.mode === 'plan') {
      console.log('In Plan mode: tools are locked, only planning allowed.');
      return { planned: true, keyword, results: [] };
    }

    if (!this.dbTool) {
      throw new Error('DatabaseTool not available');
    }

    try {
      const results = await this.dbTool.search_subtasks_by_keyword(keyword, 5);
      console.log(`Found ${results.length} subtasks`);
      
      return {
        success: true,
        keyword,
        results: results.map(r => ({ id: r.id, title: r.title, status: r.status }))
      };
    } catch (error) {
      console.error('Error searching subtasks:', error.message);
      throw error;
    }
  }

  /**
   * Example workflow: Safe schema evolution - adding a column
   */
  async addColumnToTable(tableName, columnName, columnType) {
    console.log(`Adding column ${columnName} to table ${tableName}`);
    
    if (this.mode === 'plan') {
      console.log('In Plan mode: tools are locked, only planning allowed.');
      return { planned: true, tableName, columnName };
    }

    if (!this.dbTool) {
      throw new Error('DatabaseTool not available');
    }

    try {
      // Note: This will fail for protected tables (like subtasks)
      // Example: adding an 'estimated_hours' column to a non-protected table
      const result = await this.dbTool.add_column_to_table(tableName, columnName, columnType, null, true);
      console.log('Column added successfully');
      
      return {
        success: true,
        tableName,
        columnName,
        result
      };
    } catch (error) {
      console.error('Error adding column:', error.message);
      throw error;
    }
  }

  /**
   * Example workflow: Using safe query for complex data retrieval
   */
  async runSafeQuery(sql) {
    console.log(`Running safe query: ${sql.substring(0, 50)}...`);
    
    if (this.mode === 'plan') {
      console.log('In Plan mode: tools are locked, only planning allowed.');
      return { planned: true, sql };
    }

    if (!this.dbTool) {
      throw new Error('DatabaseTool not available');
    }

    try {
      const result = await this.dbTool.safe_query(sql);
      console.log(`Query returned ${result.rows.length} rows`);
      
      return {
        success: true,
        rowCount: result.rowCount,
        rows: result.rows
      };
    } catch (error) {
      console.error('Error running safe query:', error.message);
      throw error;
    }
  }

  /**
   * Demonstration of Plan vs Act mode differences
   */
  async demonstrateModeDifferences() {
    console.log(`\n=== Demonstrating mode differences (current mode: ${this.mode}) ===`);
    
    // Try to get tools in current mode
    const tools = getToolsForRole('Orion', this.mode);
    console.log(`Tools available in ${this.mode} mode:`, Object.keys(tools));
    
    // Try to perform an action
    try {
      if (this.mode === 'plan') {
        console.log('In Plan mode: No tools available. Orion can only plan, not execute.');
        console.log('Example plan: "I would update subtask F1.1.1 to in_progress and log the start."');
        return { mode: 'plan', canExecute: false };
      } else {
        console.log('In Act mode: Tools available. Orion can execute database operations.');
        const tables = await this.dbTool.list_tables();
        console.log(`Database has ${tables.length} tables:`, tables.slice(0, 3));
        return { mode: 'act', canExecute: true, tableCount: tables.length };
      }
    } catch (error) {
      console.error('Error demonstrating mode differences:', error.message);
      throw error;
    }
  }
}

// Export for testing and demonstration
module.exports = OrionMock;

/**
 * Quick test/demo if run directly
 */
if (require.main === module) {
  (async () => {
    console.log('=== Orion Mock Demo ===\n');
    
    // Test Plan mode
    const planOrion = new OrionMock('plan');
    await planOrion.demonstrateModeDifferences();
    
    console.log('\n---\n');
    
    // Test Act mode (if database is available)
    const actOrion = new OrionMock('act');
    await actOrion.demonstrateModeDifferences();
    
    console.log('\n=== Demo Complete ===');
  })().catch(console.error);
}
