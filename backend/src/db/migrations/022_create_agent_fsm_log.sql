-- Migration: Create agent_fsm_log table for Agent FSM transition logging
CREATE TABLE IF NOT EXISTS agent_fsm_log (
  id SERIAL PRIMARY KEY,
  subtask_id VARCHAR(50) NOT NULL,
  agent VARCHAR(50) NOT NULL,
  from_state VARCHAR(50) NOT NULL,
  to_state VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Index for querying by subtask_id (most common query)
CREATE INDEX IF NOT EXISTS idx_agent_fsm_log_subtask_id ON agent_fsm_log(subtask_id);

-- Index for timestamp ordering within a subtask
CREATE INDEX IF NOT EXISTS idx_agent_fsm_log_subtask_timestamp ON agent_fsm_log(subtask_id, timestamp);
