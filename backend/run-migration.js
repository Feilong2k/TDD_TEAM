const fs = require('fs');
const path = require('path');
const { pool, query } = require('./db.js');

async function runMigration() {
  const migrationFile = path.join(__dirname, 'src/db/migrations/001_create_features_and_tasks.sql');
  console.log(`Running migration: ${migrationFile}`);

  try {
    // Read the migration file
    const sql = fs.readFileSync(migrationFile, 'utf8');
    
    // Split by semicolon to get individual statements
    const statements = sql.split(';').filter(stmt => stmt.trim());
    
    // Run each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt.trim()) {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        await query(stmt);
      }
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    pool.end();
  }
}

runMigration();
