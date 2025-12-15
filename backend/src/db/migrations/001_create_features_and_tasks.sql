-- Migration 001: Create clean features, tasks, and subtasks tables for UI
-- This replaces the old phase-based structure with feature-based structure

-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS subtasks CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS features CASCADE;

-- Features table (replaces phases)
CREATE TABLE features (
    id VARCHAR(10) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table (tasks within features)
CREATE TABLE tasks (
    id VARCHAR(10) PRIMARY KEY,
    feature_id VARCHAR(10) REFERENCES features(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    agent VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subtasks table (detailed work items within tasks)
CREATE TABLE subtasks (
    id VARCHAR(10) PRIMARY KEY,
    task_id VARCHAR(10) REFERENCES tasks(id) ON DELETE CASCADE,
    feature_id VARCHAR(10) REFERENCES features(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    agent VARCHAR(50),
    dependencies TEXT[] DEFAULT '{}',
    priority VARCHAR(20) DEFAULT 'medium',
    estimated_time VARCHAR(20),
    risk_level VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity logs for subtasks
CREATE TABLE subtask_activity_logs (
    id SERIAL PRIMARY KEY,
    subtask_id VARCHAR(10) REFERENCES subtasks(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    agent VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'open',
    parent_id VARCHAR(10),
    attachments TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_features_status ON features(status);
CREATE INDEX idx_features_order ON features(order_index);
CREATE INDEX idx_tasks_feature_id ON tasks(feature_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_subtasks_task_id ON subtasks(task_id);
CREATE INDEX idx_subtasks_feature_id ON subtasks(feature_id);
CREATE INDEX idx_subtasks_status ON subtasks(status);
CREATE INDEX idx_subtask_activity_logs_subtask_id ON subtask_activity_logs(subtask_id);
CREATE INDEX idx_subtask_activity_logs_timestamp ON subtask_activity_logs(timestamp DESC);

-- Insert current features from roadmap_v3.md
INSERT INTO features (id, title, description, status, order_index) VALUES
('F1', 'Local Database & Orion/Aider Setup', 'Set up local PostgreSQL database, implement Orion as direct LLM agent, and create Aider adapter with JSON extraction.', 'completed', 1),
('F2', 'Orion/Aider Separation & Adapters', 'Implement Orion as separate LLM agent and create Aider adapter with JSON extraction.', 'in_progress', 2),
('F3', 'Frontend Integration & Testing', 'Update UI and test end-to-end workflow.', 'pending', 3),
('F4', 'Production Readiness & Optimization', 'Polish system and prepare for scaling.', 'pending', 4);

-- Insert tasks for Feature 1 (completed)
INSERT INTO tasks (id, feature_id, title, description, status, agent) VALUES
('1-1', 'F1', 'Set Up Local PostgreSQL Database', 'Install and configure local PostgreSQL, create database schema, migrate data, update backend configuration.', 'completed', 'Devon'),
('1-2', 'F1', 'Implement Orion as Direct LLM Agent', 'Create Orion database tools, integrate DeepSeek API, build Orion wrapper with database tool calling.', 'completed', 'Devon'),
('1-3', 'F1', 'Create Aider Adapter with JSON Extraction', 'Build Aider CLI wrapper, implement JSON extraction layer, integrate with database status change hooks.', 'completed', 'Devon');

-- Insert Task 2.4 (UI-DB Integration) as a task under Feature 2
INSERT INTO tasks (id, feature_id, title, description, status, agent) VALUES
('2-4', 'F2', 'UI-Database Integration', 'Connect frontend to PostgreSQL database, update backend APIs, test end-to-end data flow.', 'completed', 'Devon');

-- Insert subtasks for Task 2.4 (from decomposition)
INSERT INTO subtasks (id, task_id, feature_id, title, description, status, agent, estimated_time, risk_level) VALUES
('2-4-1', '2-4', 'F2', 'Analyze current API endpoints and database schema for UI integration', 'Review frontend TaskList.vue API calls, examine backend server.js endpoints, check database schema for missing tables, identify gaps between current JSON structure and database schema.', 'pending', 'Devon', '1h', 'low'),
('2-4-2', '2-4', 'F2', 'Create database tables for features and tasks if missing', 'Create migration for features table, create migration for tasks table, update subtasks table to include task_id and feature_id foreign keys, run migrations to update database schema.', 'pending', 'Devon', '2h', 'medium'),
('2-4-3', '2-4', 'F2', 'Implement database queries for project structure', 'Create db.features module with getAll, getById methods, create db.tasks module with getByFeature, getAll methods, create db.subtasks module with getByTask, getAllWithDetails methods, implement joint query to fetch full project structure.', 'pending', 'Devon', '3h', 'medium'),
('2-4-4', '2-4', 'F2', 'Update backend API endpoints to use database', 'Update /api/project endpoint to fetch from database instead of JSON file, create /api/features endpoint for feature-specific data, create /api/tasks endpoint for task management, ensure /api/subtask/:id endpoint works with database, add error handling and validation.', 'pending', 'Devon', '2h', 'medium'),
('2-4-5', '2-4', 'F2', 'Update frontend to use enhanced APIs and test integration', 'Verify frontend TaskList.vue works with updated /api/project endpoint, test subtask modal with /api/subtask/:id endpoint, add loading states and error handling in UI, test end-to-end data flow from database to UI.', 'pending', 'Devon', '3h', 'high');
