-- Add unique constraint on workflow name (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workflows_name_key'
  ) THEN
    ALTER TABLE workflows ADD CONSTRAINT workflows_name_key UNIQUE (name);
  END IF;
END $$;
