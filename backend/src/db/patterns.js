const { getPool } = require('./connection');

/**
 * Creates a new pattern.
 * @param {Object} data
 * @returns {Promise<Object>}
 */
async function createPattern({ title, description, problem, solution, type, project_id, tags, metadata }) {
  const query = `
    INSERT INTO patterns (title, description, problem, solution, type, project_id, tags, metadata)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *;
  `;
  const values = [
    title, 
    description, 
    problem, 
    solution, 
    type || 'snippet', 
    project_id || null, 
    tags || [], 
    metadata || {}
  ];
  const result = await getPool().query(query, values);
  return result.rows[0];
}

/**
 * Search patterns by text (title/description) and/or tags.
 * @param {Object} criteria - { query, tags }
 * @returns {Promise<Array>}
 */
async function searchPatterns({ query, tags }) {
  let sql = 'SELECT * FROM patterns WHERE 1=1';
  const values = [];
  let paramCount = 1;

  if (query) {
    sql += ` AND (title ILIKE $${paramCount} OR description ILIKE $${paramCount} OR problem ILIKE $${paramCount} OR solution ILIKE $${paramCount})`;
    values.push(`%${query}%`);
    paramCount++;
  }

  if (tags && tags.length > 0) {
    sql += ` AND tags @> $${paramCount}::text[]`;
    values.push(tags);
    paramCount++;
  }

  sql += ' ORDER BY created_at DESC LIMIT 50;';

  const result = await getPool().query(sql, values);
  return result.rows;
}

/**
 * Get pattern by ID.
 */
async function getPattern(id) {
  const result = await getPool().query('SELECT * FROM patterns WHERE id = $1', [id]);
  return result.rows[0] || null;
}

/**
 * Update pattern.
 */
async function updatePattern(id, updates) {
  const allowed = ['title', 'description', 'problem', 'solution', 'type', 'project_id', 'tags', 'metadata'];
  const sets = [];
  const values = [];
  let count = 1;

  allowed.forEach(field => {
    if (updates[field] !== undefined) {
      sets.push(`${field} = $${count}`);
      values.push(updates[field]);
      count++;
    }
  });

  if (sets.length === 0) throw new Error('No fields to update');

  values.push(id);
  const sql = `UPDATE patterns SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${count} RETURNING *`;
  
  const result = await getPool().query(sql, values);
  return result.rows[0];
}

/**
 * Delete pattern.
 */
async function deletePattern(id) {
  const result = await getPool().query('DELETE FROM patterns WHERE id = $1 RETURNING id', [id]);
  return result.rows[0];
}

module.exports = {
  createPattern,
  searchPatterns,
  getPattern,
  updatePattern,
  deletePattern
};
