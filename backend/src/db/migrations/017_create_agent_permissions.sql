-- Create agent_permissions table for path-based access control
CREATE TABLE IF NOT EXISTS agent_permissions (
  id SERIAL PRIMARY KEY,
  agent_id VARCHAR(20) REFERENCES agents(id) ON DELETE CASCADE,
  path_pattern VARCHAR(255) NOT NULL,  -- e.g., 'src/*', '__tests__/*', '*'
  permission VARCHAR(20) NOT NULL,     -- 'read', 'write', 'execute'
  is_allowed BOOLEAN DEFAULT true,     -- true = allow, false = deny
  priority INTEGER DEFAULT 0,          -- higher = checked first
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(agent_id, path_pattern, permission)
);

-- Default permissions for Tara: read src/*, write __tests__/*
INSERT INTO agent_permissions (agent_id, path_pattern, permission, is_allowed, priority) VALUES
  -- Tara: read everywhere
  ('tara', '*', 'read', true, 0),
  -- Tara: write only to __tests__
  ('tara', '__tests__/*', 'write', true, 10),
  ('tara', '*.test.js', 'write', true, 10),
  ('tara', '*.spec.js', 'write', true, 10),
  ('tara', '*.test.ts', 'write', true, 10),
  ('tara', '*.spec.ts', 'write', true, 10),
  -- Tara: deny write to src (higher priority)
  ('tara', 'src/*', 'write', false, 20)
ON CONFLICT (agent_id, path_pattern, permission) DO NOTHING;

-- Default permissions for Devon: write src/*, deny __tests__
INSERT INTO agent_permissions (agent_id, path_pattern, permission, is_allowed, priority) VALUES
  -- Devon: read everywhere
  ('devon', '*', 'read', true, 0),
  -- Devon: write to src
  ('devon', 'src/*', 'write', true, 10),
  -- Devon: deny write to tests
  ('devon', '__tests__/*', 'write', false, 20)
ON CONFLICT (agent_id, path_pattern, permission) DO NOTHING;

-- Default permissions for Orion: full access
INSERT INTO agent_permissions (agent_id, path_pattern, permission, is_allowed, priority) VALUES
  ('orion', '*', 'read', true, 0),
  ('orion', '*', 'write', true, 0),
  ('orion', '*', 'execute', true, 0)
ON CONFLICT (agent_id, path_pattern, permission) DO NOTHING;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_agent_permissions_agent ON agent_permissions(agent_id);

