-- Widen the type column to allow longer task type names
ALTER TABLE tasks ALTER COLUMN type TYPE VARCHAR(100);
ALTER TABLE tasks ALTER COLUMN worker_id TYPE VARCHAR(100);

