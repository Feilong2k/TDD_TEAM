-- Migration 012: Create features table for feature backlog
CREATE TABLE IF NOT EXISTS features (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20),
    phase VARCHAR(50),
    status VARCHAR(20) DEFAULT 'planned',
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_features_priority ON features(priority);
CREATE INDEX idx_features_phase ON features(phase);
CREATE INDEX idx_features_status ON features(status);
CREATE INDEX idx_features_tags ON features USING GIN(tags);
