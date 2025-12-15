CREATE TABLE IF NOT EXISTS locks (
  id SERIAL PRIMARY KEY,
  task_id VARCHAR(50) NOT NULL,
  concern VARCHAR(50) NOT NULL,
  agent_id VARCHAR(50) NOT NULL,
  locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one lock per concern per task
  UNIQUE(task_id, concern)
);

