# Enhanced Schema Analysis for TDD_TEAM

## Current Schema Review

### Existing Tables (from `backend/db/schema.sql`)

#### 1. `subtasks` table
- Basic metadata: id, title, phase, status, owner, priority, dependencies, timestamps
- **Limitations**: Only tracks basic workflow state, lacks structured sections for detailed TDD artifacts

#### 2. `subtask_state` table  
- JSONB field for unstructured state data
- **Limitations**: Unstructured, no schema enforcement for different artifact types

#### 3. `subtask_logs` table
- Chronological activity log with kind (type), actor, content, meta (JSONB)
- **Limitations**: Linear timeline, not organized by section type, difficult to query specific artifact types

### Historical JSON Analysis (from `archive/data/subtasks/1-1-5.json`)

The historical JSON reveals rich TDD workflow artifacts that need structured storage:

1. **Clarification Questions**: Questions from user to agents, with answers and status tracking
2. **CDP Analyses**: Multiple types (Orion pre-planning, Tara pre-test, Devon pre-implementation) with gaps and solutions
3. **Tests**: Written by Tara with test code, results (green/red), failure analysis
4. **Implementations**: Devon's implementation reports, refactoring details, code changes
5. **Reviews**: Tara's final reviews with findings and required fixes
6. **Fix Reports**: Devon's reports on addressing review findings

## Enhanced Schema Design

### New Priority Order: Accuracy > Thoroughness > Security

The schema design should prioritize:
1. **Accuracy**: Structured data validation, clear relationships, referential integrity
2. **Thoroughness**: Complete coverage of all TDD artifacts with proper metadata
3. **Security**: Proper access control, data validation, and audit trails

### Proposed New Tables

#### 1. `subtask_sections` - Main artifacts table
```sql
CREATE TABLE subtask_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subtask_id TEXT REFERENCES subtasks(id) ON DELETE CASCADE,
    section_type TEXT NOT NULL,  -- 'clarification', 'orion_cdp', 'tara_cdp', 'tara_test', 
                                -- 'devon_cdp', 'devon_implementation', 'tara_review', 'devon_fix'
    title TEXT,
    content JSONB NOT NULL DEFAULT '{}'::JSONB,
    agent TEXT,  -- 'user', 'orion', 'tara', 'devon'
    status TEXT DEFAULT 'draft',  -- 'draft', 'active', 'answered', 'resolved', 'escalated'
    parent_id UUID REFERENCES subtask_sections(id) ON DELETE SET NULL,
    order_index INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes for performance
    UNIQUE(subtask_id, section_type, order_index)  -- For ordering within type
);
```

#### 2. `clarification_threads` - Dedicated table for Q&A
```sql
CREATE TABLE clarification_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subtask_id TEXT REFERENCES subtasks(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    asked_by TEXT NOT NULL,  -- 'user', 'orion', 'tara', 'devon'
    asked_to TEXT NOT NULL,  -- Target agent
    status TEXT DEFAULT 'open',  -- 'open', 'answered', 'resolved'
    priority TEXT DEFAULT 'medium',
    context JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE clarification_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID REFERENCES clarification_threads(id) ON DELETE CASCADE,
    answer TEXT NOT NULL,
    answered_by TEXT NOT NULL,
    attachments TEXT[],  -- File paths or URLs
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3. `cdp_analyses` - Structured CDP storage
```sql
CREATE TABLE cdp_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subtask_id TEXT REFERENCES subtasks(id) ON DELETE CASCADE,
    analysis_type TEXT NOT NULL,  -- 'orion_pre_plan', 'tara_pre_test', 'devon_pre_impl', 'tara_post_review'
    agent TEXT NOT NULL,
    gaps JSONB NOT NULL DEFAULT '[]'::JSONB,  -- Array of gap objects
    solutions JSONB NOT NULL DEFAULT '[]'::JSONB,  -- Array of solution objects
    atomic_actions INTEGER,
    resources_touched INTEGER,
    physical_constraints INTEGER,
    security_concerns TEXT[],
    recommendations TEXT[],
    raw_content TEXT,  -- Original markdown/CDP text
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4. `test_artifacts` - Test-related artifacts
```sql
CREATE TABLE test_artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subtask_id TEXT REFERENCES subtasks(id) ON DELETE CASCADE,
    test_type TEXT NOT NULL,  -- 'unit', 'integration', 'e2e', 'security'
    title TEXT NOT NULL,
    test_code TEXT,  -- Actual test code
    expected_result TEXT,
    actual_result TEXT,
    status TEXT NOT NULL,  -- 'pass', 'fail', 'skipped', 'flaky'
    failure_analysis TEXT,  -- Why it failed (test wrong, mock data wrong, implementation wrong, etc.)
    fix_required BOOLEAN DEFAULT FALSE,
    fix_description TEXT,
    agent TEXT NOT NULL,  -- Usually 'tara' for tests
    file_path TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 5. `implementation_reports` - Implementation tracking
```sql
CREATE TABLE implementation_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subtask_id TEXT REFERENCES subtasks(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL,  -- 'devon_implementation', 'devon_refactor', 'tara_implementation', 'final'
    agent TEXT NOT NULL,
    changes_made TEXT NOT NULL,  -- Description of changes
    files_modified TEXT[],
    code_snippets JSONB DEFAULT '{}'::JSONB,  -- Key: file_path, Value: code
    dependencies_added TEXT[],
    dependencies_removed TEXT[],
    challenges_encountered TEXT[],
    solutions_applied TEXT[],
    tests_passed INTEGER,
    tests_failed INTEGER,
    review_notes TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Enhanced `subtasks` Table Updates

```sql
-- Add new columns to subtasks
ALTER TABLE subtasks 
ADD COLUMN IF NOT EXISTS feature_id TEXT,  -- For Features/Epics instead of phases
ADD COLUMN IF NOT EXISTS epic_id TEXT,
ADD COLUMN IF NOT EXISTS accuracy_score INTEGER,
ADD COLUMN IF NOT EXISTS thoroughness_score INTEGER,
ADD COLUMN IF NOT EXISTS security_score INTEGER,
ADD COLUMN IF NOT EXISTS completion_criteria JSONB DEFAULT '{}'::JSONB;
```

### Enhanced `subtask_logs` Table Updates

```sql
-- Add reference to subtask_sections for better traceability
ALTER TABLE subtask_logs 
ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES subtask_sections(id) ON DELETE SET NULL;
```

## JSON Schema Examples

### Clarification Question Schema
```json
{
  "question": "Should we support social login?",
  "context": "User authentication implementation",
  "urgency": "high",
  "related_files": ["backend/auth.js", "frontend/Login.vue"],
  "asked_by": "user",
  "asked_to": "orion",
  "thread_status": "open"
}
```

### CDP Analysis Schema (Orion)
```json
{
  "gaps": [
    {
      "id": "gap-1",
      "description": "Missing test coverage for OAuth flow",
      "severity": "high",
      "solution": "Add mock OAuth provider in tests"
    }
  ],
  "solutions": [
    {
      "id": "sol-1",
      "description": "Use jest-mock-oauth2 library",
      "implementation_hint": "See examples in /tests/auth/oauth.test.js"
    }
  ],
  "atomic_actions": 6,
  "resources_touched": 5,
  "physical_constraints": 3,
  "security_concerns": ["token_storage", "redirect_uri_validation"]
}
```

### Test Artifact Schema
```json
{
  "test_code": "describe('login', () => {\n  it('should reject invalid credentials', async () => {\n    const res = await request(app).post('/login').send({user: 'bad', pass: 'wrong'});\n    expect(res.status).toBe(400);\n  });\n});",
  "expected_result": "Status 400 for invalid credentials",
  "actual_result": "Status 200 (unexpected success)",
  "failure_analysis": "Mock user data is incorrect - test database has wrong fixture",
  "fix_required": true,
  "fix_responsibility": "devon",
  "test_file": "backend/__tests__/auth.test.js"
}
```

### Implementation Report Schema
```json
{
  "changes_made": "Implemented JWT token validation middleware",
  "files_modified": ["backend/middleware/auth.js", "backend/routes/protected.js"],
  "code_snippets": {
    "backend/middleware/auth.js": "function verifyToken(req, res, next) {\n  // implementation\n}"
  },
  "dependencies_added": ["jsonwebtoken", "bcryptjs"],
  "challenges_encountered": ["Token expiration handling", "Refresh token rotation"],
  "solutions_applied": ["Added token refresh endpoint", "Implemented token blacklist"],
  "tests_passed": 12,
  "tests_failed": 1
}
```

## Migration Strategy

### Phase 1: Schema Creation
1. Create new tables alongside existing ones
2. Update existing tables with new columns
3. Create foreign key relationships

### Phase 2: Data Migration
1. Write migration scripts to convert JSON activity logs to structured sections
2. Preserve all historical data in new schema
3. Validate data integrity after migration

### Phase 3: API Updates
1. Update backend APIs to use new schema
2. Create new endpoints for section-specific operations
3. Maintain backward compatibility during transition

### Phase 4: UI Updates
1. Update frontend to display structured sections
2. Implement new UI components for each section type
3. Add filtering/sorting by section type

## Benefits of Enhanced Schema

1. **Accuracy**: Strong typing and validation for each artifact type
2. **Query Efficiency**: Fast queries for specific section types (e.g., "show all failed tests")
3. **Flexibility**: Easy to add new section types without schema changes
4. **Rich UI**: Structured data enables rich display and interaction
5. **Analytics**: Enable metrics on TDD process (e.g., time spent in clarification vs implementation)

## Implementation Priorities

1. **Immediate**: Create `subtask_sections` table and migrate clarification questions
2. **Short-term**: Implement CDP and test artifact tables
3. **Medium-term**: Update APIs and frontend to use new schema
4. **Long-term**: Analytics and reporting on structured data

## Next Steps

1. Review and approve this enhanced schema design
2. Create migration scripts for existing data
3. Update backend database module (`backend/db.js`) to support new tables
4. Update API endpoints to use structured sections
5. Update frontend UI to display new section types

---
*Generated by Adam (Architect) on 2025-12-14*  
*Based on analysis of historical JSON files and user requirements for rich TDD artifact tracking*
