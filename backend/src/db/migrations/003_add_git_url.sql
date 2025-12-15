-- Migration 003: Add git_url to projects table

ALTER TABLE projects ADD COLUMN IF NOT EXISTS git_url TEXT;

