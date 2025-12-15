-- Migration: Create tasks table for Task Queue System
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  worker_id VARCHAR(50),
  result JSONB,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- Index for faster dequeuing by status
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
