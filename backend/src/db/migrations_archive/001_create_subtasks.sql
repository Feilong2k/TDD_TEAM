-- Migration 001: Create subtasks table
-- Also creates logs, agents, and events tables

-- Subtasks table
CREATE TABLE IF NOT EXISTS subtasks (
    id VARCHAR(10) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    branch VARCHAR(100),
    dependencies TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Logs table (for subtask logs)
CREATE TABLE IF NOT EXISTS logs (
    id SERIAL PRIMARY KEY,
    subtask_id VARCHAR(10) REFERENCES subtasks(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    level VARCHAR(20) DEFAULT 'info',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Agents table (for agent information)
CREATE TABLE IF NOT EXISTS agents (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'idle',
    last_active TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Events table (for system events)
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    source VARCHAR(100),
    payload JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX idx_subtasks_status ON subtasks(status);
CREATE INDEX idx_subtasks_created_at ON subtasks(created_at);
CREATE INDEX idx_logs_subtask_id ON logs(subtask_id);
CREATE INDEX idx_events_created_at ON events(created_at);
