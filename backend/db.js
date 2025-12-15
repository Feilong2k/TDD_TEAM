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
  ssl: {
    rejectUnauthorized: false // Required for Neon and other cloud databases
  },
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

// Subtask CRUD operations
const subtasks = {
  async getAll() {
    const result = await query(`
      SELECT s.*, 
             COALESCE(json_agg(ss.state) FILTER (WHERE ss.state IS NOT NULL), '[]') as state,
             COALESCE(json_agg(sl) FILTER (WHERE sl.id IS NOT NULL), '[]') as logs
      FROM subtasks s
      LEFT JOIN subtask_state ss ON s.id = ss.subtask_id
      LEFT JOIN subtask_logs sl ON s.id = sl.subtask_id
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `);
    return result.rows;
  },

  async getById(id) {
    const result = await query(
      `SELECT s.*, 
              COALESCE(ss.state, '{}'::jsonb) as state,
              COALESCE(json_agg(sl) FILTER (WHERE sl.id IS NOT NULL), '[]') as logs
       FROM subtasks s
       LEFT JOIN subtask_state ss ON s.id = ss.subtask_id
       LEFT JOIN subtask_logs sl ON s.id = sl.subtask_id
       WHERE s.id = $1
       GROUP BY s.id, ss.state`,
      [id]
    );
    return result.rows[0];
  },

  async create(subtaskData) {
    const { id, title, phase, status, owner, priority, dependencies } = subtaskData;
    const result = await query(
      `INSERT INTO subtasks (id, title, phase, status, owner, priority, dependencies)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, title, phase, status, owner, priority, dependencies || []]
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
        `INSERT INTO subtask_logs (subtask_id, actor, kind, content, meta)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, agent, 'status_update', `Status changed to ${status}`, { old_status: 'pending', new_status: status }]
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
    const { actor, kind, content, meta } = activityData;
    const result = await query(
      `INSERT INTO subtask_logs (subtask_id, actor, kind, content, meta)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [subtaskId, actor, kind, content, meta || {}]
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

    if (filters.kind) {
      whereClause += ` AND kind = $${paramCount}`;
      params.push(filters.kind);
      paramCount++;
    }

    if (filters.status) {
      whereClause += ` AND meta->>'status' = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }

    const result = await query(
      `SELECT * FROM subtask_logs
       ${whereClause}
       ORDER BY created_at DESC`,
      params
    );
    return result.rows;
  },

  async getByPhase(phase) {
    const result = await query(
      `SELECT * FROM subtasks WHERE phase = $1 ORDER BY created_at`,
      [phase]
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
  subtasks,
  pool
};
