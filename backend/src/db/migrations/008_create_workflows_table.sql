CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  version VARCHAR(50) DEFAULT '1.0.0',
  states JSONB NOT NULL DEFAULT '{}',
  transitions JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add index for active lookups
CREATE INDEX IF NOT EXISTS idx_workflows_active ON workflows(is_active);

