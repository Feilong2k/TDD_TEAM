// Database connection module for PostgreSQL
const { Pool } = require('pg');
require('dotenv').config();

// Clean the DATABASE_URL by removing "psql " and any surrounding quotes
function cleanDatabaseUrl(url) {
  if (!url) return url;
  
  // Remove the "psql " prefix if present
  let cleaned = url.replace(/^psql\s+/, '');
  
  // Remove surrounding single or double quotes
  cleaned = cleaned.replace(/^['"]|['"]$/g, '');
  
  return cleaned;
}

const rawUrl = process.env.DATABASE_URL || '';
const cleanedUrl = cleanDatabaseUrl(rawUrl);

// Log the cleaned URL (without password for security)
const safeUrl = cleanedUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
console.log(`Database URL (cleaned): ${safeUrl}`);

const pool = new Pool({
  connectionString: cleanedUrl,
  ssl: false,
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test the connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Database connected successfully at:', res.rows[0].now);
  }
});

// Export query function
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Query error', { text, error: error.message });
    throw error;
  }
}

// Export getClient for transactions
async function getClient() {
  const client = await pool.connect();
  const query = client.query;
  const release = client.release;
  
  // Set a timeout of 5 seconds
  const timeout = setTimeout(() => {
    console.error('A client has been checked out for more than 5 seconds!');
  }, 5000);
  
  // Monkey patch the query method to track the last query executed
  client.query = (...args) => {
    client.lastQuery = args;
    return query.apply(client, args);
  };
  
  client.release = () => {
    // Clear the timeout
    clearTimeout(timeout);
    
    // Reset the methods
    client.query = query;
    client.release = release;
    
    // Release the client
    return release.apply(client);
  };
  
  return client;
}

// Features CRUD operations
const features = {
  async getAll() {
    const result = await query(`
      SELECT f.*, 
             COALESCE(json_agg(t) FILTER (WHERE t.id IS NOT NULL), '[]') as tasks
      FROM features f
      LEFT JOIN tasks t ON f.id = t.feature_id
      GROUP BY f.id
      ORDER BY f.order_index, f.created_at
    `);
    return result.rows;
  },

  async getById(id) {
    const result = await query(
      `SELECT f.*, 
              COALESCE(json_agg(t) FILTER (WHERE t.id IS NOT NULL), '[]') as tasks
       FROM features f
       LEFT JOIN tasks t ON f.id = t.feature_id
       WHERE f.id = $1
       GROUP BY f.id`,
      [id]
    );
    return result.rows[0];
  },

  async create(featureData) {
    const { id, title, description, status, order_index } = featureData;
    const result = await query(
      `INSERT INTO features (id, title, description, status, order_index)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, title, description, status || 'pending', order_index || 0]
    );
    return result.rows[0];
  },

  async update(id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      if (key !== 'id') {
        fields.push(`${key} = $${paramCount}`);
        values.push(updates[key]);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);
    const result = await query(
      `UPDATE features SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );
    return result.rows[0];
  },

  async delete(id) {
    await query('DELETE FROM features WHERE id = $1', [id]);
    return true;
  }
};

// Tasks CRUD operations
const tasks = {
  async getAll() {
    const result = await query(`
      SELECT t.*, 
             COALESCE(json_agg(s) FILTER (WHERE s.id IS NOT NULL), '[]') as subtasks
      FROM tasks t
      LEFT JOIN subtasks s ON t.id = s.task_id
      GROUP BY t.id
      ORDER BY t.created_at
    `);
    return result.rows;
  },

  async getById(id) {
    const result = await query(
      `SELECT t.*, 
              COALESCE(json_agg(s) FILTER (WHERE s.id IS NOT NULL), '[]') as subtasks
       FROM tasks t
       LEFT JOIN subtasks s ON t.id = s.task_id
       WHERE t.id = $1
       GROUP BY t.id`,
      [id]
    );
    return result.rows[0];
  },

  async getByFeature(featureId) {
    const result = await query(
      `SELECT t.*, 
              COALESCE(json_agg(s) FILTER (WHERE s.id IS NOT NULL), '[]') as subtasks
       FROM tasks t
       LEFT JOIN subtasks s ON t.id = s.task_id
       WHERE t.feature_id = $1
       GROUP BY t.id
       ORDER BY t.created_at`,
      [featureId]
    );
    return result.rows;
  },

  async create(taskData) {
    const { id, feature_id, title, description, status, agent } = taskData;
    const result = await query(
      `INSERT INTO tasks (id, feature_id, title, description, status, agent)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, feature_id, title, description, status || 'pending', agent]
    );
    return result.rows[0];
  },

  async update(id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      if (key !== 'id') {
        fields.push(`${key} = $${paramCount}`);
        values.push(updates[key]);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);
    const result = await query(
      `UPDATE tasks SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );
    return result.rows[0];
  },

  async delete(id) {
    await query('DELETE FROM tasks WHERE id = $1', [id]);
    return true;
  }
};

// Subtask CRUD operations (updated for new schema with task_id and feature_id)
const subtasks = {
  async getAll() {
    const result = await query(`
      SELECT s.*, 
             COALESCE(json_agg(sal) FILTER (WHERE sal.id IS NOT NULL), '[]') as activity_logs
      FROM subtasks s
      LEFT JOIN subtask_activity_logs sal ON s.id = sal.subtask_id
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `);
    return result.rows;
  },

  async getById(id) {
    const result = await query(
      `SELECT s.*, 
              COALESCE(json_agg(sal) FILTER (WHERE sal.id IS NOT NULL), '[]') as activity_logs
       FROM subtasks s
       LEFT JOIN subtask_activity_logs sal ON s.id = sal.subtask_id
       WHERE s.id = $1
       GROUP BY s.id`,
      [id]
    );
    return result.rows[0];
  },

  async create(subtaskData) {
    const { id, task_id, feature_id, title, description, status, agent, dependencies, priority, estimated_time, risk_level, details, metadata } = subtaskData;
    const result = await query(
      `INSERT INTO subtasks (id, task_id, feature_id, title, description, status, agent, dependencies, priority, estimated_time, risk_level, details, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [id, task_id, feature_id, title, description, status, agent, dependencies || [], priority, estimated_time, risk_level, details || {}, metadata || {}]
    );
    return result.rows[0];
  },

  async update(id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      if (key !== 'id') {
        fields.push(`${key} = $${paramCount}`);
        values.push(updates[key]);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);
    const result = await query(
      `UPDATE subtasks SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );
    return result.rows[0];
  },

  async delete(id) {
    await query('DELETE FROM subtasks WHERE id = $1', [id]);
    return true;
  },

  async updateStatus(id, status, agent = 'system') {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      
      // Update subtask status
      const subtaskResult = await client.query(
        `UPDATE subtasks SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [status, id]
      );
      
      // Add to activity log
      await client.query(
        `INSERT INTO subtask_activity_logs (subtask_id, type, agent, content, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, 'status_update', agent, `Status changed to ${status}`, 'open']
      );
      
      await client.query('COMMIT');
      return subtaskResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async addActivityLog(subtaskId, activityData) {
    const { type, agent, content, status, parent_id, attachments, metadata } = activityData;
    const result = await query(
      `INSERT INTO subtask_activity_logs (subtask_id, type, agent, content, status, parent_id, attachments, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [subtaskId, type, agent, content, status || 'open', parent_id, attachments || [], metadata || {}]
    );
    
    // Update subtask's updated_at
    await query(
      `UPDATE subtasks SET updated_at = NOW() WHERE id = $1`,
      [subtaskId]
    );
    
    return result.rows[0];
  },

  async getActivityLogs(subtaskId, filters = {}) {
    let whereClause = 'WHERE subtask_id = $1';
    const params = [subtaskId];
    let paramCount = 2;

    if (filters.type) {
      whereClause += ` AND type = $${paramCount}`;
      params.push(filters.type);
      paramCount++;
    }

    if (filters.status) {
      whereClause += ` AND status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }

    const result = await query(
      `SELECT * FROM subtask_activity_logs
       ${whereClause}
       ORDER BY timestamp DESC`,
      params
    );
    return result.rows;
  },

  async getByStatus(status) {
    const result = await query(
      `SELECT * FROM subtasks WHERE status = $1 ORDER BY created_at`,
      [status]
    );
    return result.rows;
  }
};

module.exports = {
  query,
  getClient,
  features,
  tasks,
  subtasks,
  pool
};
