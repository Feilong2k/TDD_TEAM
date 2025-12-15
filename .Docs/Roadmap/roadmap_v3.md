# TDD_TEAM Roadmap v3 - Architecture Shift & Orion/Aider Integration

## 1. Executive Summary
This roadmap combines the Architecture Shift Plan (moving from JSON files to PostgreSQL) with the newly validated Orion/Aider separation. Orion will function as a dedicated planning agent with database tools, while Aider will handle code and test execution for Tara and Devon roles. We'll transition from Neon to a local PostgreSQL instance for reliability and control.

## 2. Core Principles (Updated)
- **Agent Specialization**: Orion (planning/CDP), Aider (code/tests via Tara/Devon roles)
- **TDD Discipline**: Red → Green → Refactor → Review sequence remains mandatory
- **PostgreSQL as Source of Truth**: All state in structured database tables
- **Git-Centric Workflow**: Every code change tracked, branched, and reviewed
- **Constraint-Aware Development**: CDP (Constraint Discovery Protocol) at each phase
- **Local Infrastructure**: Self-hosted database for reliability and speed

## 3. Agent Roles & Boundaries (Revised)

### Orion (Orchestrator & Planner)
- **Role**: Workflow coordination, CDP analysis, task decomposition, database updates
- **Boundaries**: Cannot write code or tests; has direct database access via tools
- **Deliverable**: Quick CDP analysis, task assignment, status updates, subtask creation
- **Tools**: Database CRUD operations, Git status checks, file reading for context
- **Model**: Direct LLM calls (DeepSeek/Anthropic/etc.) via Node.js

### Aider (Code Executor for Tara/Devon)
- **Role**: Code generation and test execution via CLI
- **Boundaries**: Executes only when triggered by status changes; no planning capability
- **Deliverable**: Code changes, test results, implementation artifacts
- **Usage**: 
  - **Tara Mode**: Write failing tests, perform code review
  - **Devon Mode**: Implement features, refactor code
- **JSON Handling**: Natural language JSON extraction with validation layer

## 4. Workflow Overview (Updated)

**Canonical Subtask Workflow**: Each subtask follows an 8-stage process documented in `.Docs/Workflow/subtask_workflow_stages.md`:
1. Adam Decomposition & DB Upload
2. Orion Pre-Start CDP Analysis  
3. Tara Test Generation
4. Devon Implementation
5. Devon Refactoring
6. Tara Final Review
7. Rework (If Required)
8. Orion Closeout

### Phase 0: Planning (Orion + Human)
1. Human provides requirement via UI
2. Orion decomposes into functions → tasks → subtasks (prefer ≤3 steps)
3. Orion writes subtasks to PostgreSQL database
4. Human reviews and approves via UI

### Phase 1: Database-Driven Orchestration
5. Orion performs Quick CDP (identifies constraints)
6. Orion updates subtask status in database
7. Status change triggers appropriate agent adapter

### Phase 2: Test-First Development (Aider Executing Tara → Devon → Tara)
8. **Status "ready_for_tara"** → Aider (Tara mode) writes failing tests
9. **Status "ready_for_devon"** → Aider (Devon mode) implements code to pass tests
10. **Status "ready_for_review"** → Aider (Tara mode) performs code review
11. All results logged to database via Orion or adapter layer

### Phase 3: Completion
12. Orion updates logs and documentation in database
13. Git merge to base branch
14. Task marked complete in database

## 5. Technical Architecture

### Database Layer (Local PostgreSQL)
- **Hosting**: Local PostgreSQL instance (Docker or native installation)
- **Tables**: 
  - `subtasks`: Core task details, status, dependencies
  - `subtask_state`: JSONB state storage for each subtask
  - `subtask_logs`: Activity log for audit trail
- **Connection**: Node.js/Express with connection pooling
- **Migration Path**: Export current JSON data, import to PostgreSQL

### Backend Orchestrator
- **Express Server**: REST APIs for UI and agent communication
- **Status Hooks**: Trigger Aider execution based on database status changes
- **Agent Adapters**: 
  - `aider-adapter.js`: Wrapper for Aider CLI with JSON extraction
  - `orion-wrapper.js`: Direct LLM calls for Orion with database tools
- **Git Integration**: Branch management, commits, and merges

### Frontend Updates
- **Vue.js UI**: Connect to new PostgreSQL-backed APIs
- **Real-time Updates**: Poll database for status changes
- **Action Buttons**: Trigger planning, testing, implementation workflows

### Aider Integration Layer
- **CLI Wrapper**: Execute Aider with proper context and model configuration
- **JSON Extraction**: Parse natural language JSON output with validation
- **Error Handling**: Retry logic and fallback to natural language parsing
- **Context Management**: Provide relevant files and task requirements

## 6. Implementation Features

### Feature 1: Local Database Foundation (Days 1-3)
**Objective**: Set up local PostgreSQL and migrate from Neon; create basic orchestrator.

#### F1.1. Set Up Local PostgreSQL
- Install and configure local PostgreSQL instance (Docker or native)
- Create database schema matching `backend/db/schema.sql`
- Migrate data from current Neon database (or start fresh)
- Update `.env` with local connection string

#### F1.2. Implement Enhanced Database Layer
- Create connection pool with better error handling
- Implement retry logic for connection issues
- Add database health checks to server startup

#### F1.3. Create Orion Database Tools (Hybrid Semantic + Safe-SQL Approach)
- **Semantic Tools**: Build focused, discoverable tools for common operations:
  - `db_get_subtask_by_id`, `db_list_subtasks_by_status`, `db_update_subtask_status`
  - `db_append_subtask_log`, `db_search_subtasks_by_keyword`
- **Safe-SQL Tools**: Allow controlled schema evolution without dangerous operations:
  - `db_add_column_to_table`, `db_create_table_from_migration`
  - Block `DROP TABLE`, `TRUNCATE`, `DELETE *` operations
- **Context Gathering**: Implement intelligent context aggregation from database
- **Plan Mode Locking**: Restrict tools based on Plan/Act mode (Cline-style)

### Feature 2: Orion/Aider Separation & Adapters (Days 4-7)
**Objective**: Implement Orion as separate LLM agent and create Aider adapter.

#### F2.1. Implement Orion as Direct LLM Agent
- Create Orion wrapper that calls DeepSeek API directly
- Integrate database tools for context and updates
- Implement CDP analysis and planning functions

#### F2.2. Build Aider Adapter with JSON Extraction
- Create wrapper for Aider CLI execution
- Implement natural language JSON extraction and validation
- Add retry logic for failed JSON parsing
- Integrate with status change hooks

#### F2.3. Status-Driven Workflow Triggers
- Create webhook system for status changes
- Implement agent dispatch based on subtask status
- Add logging and error handling for failed executions

### Feature 3: Frontend Integration & Testing (Days 8-10)
**Objective**: Update UI and test end-to-end workflow.

#### F3.1. Connect Frontend to PostgreSQL APIs
- Update Vue components to use new database endpoints
- Implement real-time status polling
- Add action buttons for triggering workflows

#### F3.2. End-to-End Test with Sample Task
- Create sample subtask for database setup
- Test Orion planning and subtask creation
- Test Aider execution for simple code task
- Verify database logging and Git integration

#### F3.3. Error Handling & Monitoring
- Implement comprehensive error logging
- Add UI notifications for failed operations
- Create dashboard for system health monitoring

### Feature 4: Production Readiness & Optimization (Days 11-14)
**Objective**: Polish system and prepare for scaling.

#### F4.1. Performance Optimization
- Database query optimization
- Connection pooling tuning
- Caching for frequently accessed data

#### F4.2. Security Hardening
- Secure database credentials
- API authentication and rate limiting
- Input validation and sanitization

#### F4.3. Documentation & Deployment
- Create deployment guide for local setup
- Document API endpoints and agent interfaces
- Prepare for potential cloud deployment options

## 7. Success Metrics

### Feature 1 Success (Local Database)
- [ ] Local PostgreSQL instance running and accessible
- [ ] Database schema created with sample data
- [ ] Backend server connects successfully to local DB
- [ ] All existing JSON data migrated or recreated

### Feature 2 Success (Orion/Aider Integration)
- [ ] Orion can create subtasks in database via LLM calls
- [ ] Aider adapter successfully executes code tasks
- [ ] JSON extraction works with validation and retry
- [ ] Status changes trigger appropriate agent execution

### Feature 3 Success (End-to-End Workflow)
- [ ] UI displays subtasks from database
- [ ] Complete TDD cycle: planning → test → implement → review
- [ ] All actions logged to database
- [ ] Git integration works with automatic commits

### Feature 4 Success (Production Ready)
- [ ] System handles errors gracefully with retry logic
- [ ] Performance meets expectations (sub-2s response times)
- [ ] Security measures implemented
- [ ] Documentation complete for ongoing maintenance

## 8. Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Local PostgreSQL setup issues | Medium | High | Use Docker container; detailed setup guide |
| Aider JSON extraction failures | High | Medium | Multiple fallback strategies; natural language parsing |
| Database connection latency | Low | Medium | Connection pooling; query optimization |
| Orion LLM cost overruns | Medium | Medium | Token budgeting; caching of common responses |
| Git merge conflicts | Medium | Medium | Simple merge strategy; manual override option |
| Agent role boundary violations | Low | High | Strict prompt engineering; wrapper validation |

## 9. Implementation Timeline

### Feature 1: Local Database Foundation (Days 1-3)
- **Day 1**: Install and configure local PostgreSQL (Docker/native)
- **Day 2**: Create database schema and migrate data from Neon
- **Day 3**: Implement enhanced database layer with error handling

### Feature 2: Orion/Aider Separation & Adapters (Days 4-7)
- **Day 4**: Create Orion database tools and context aggregation
- **Day 5**: Implement Orion as direct LLM agent with DeepSeek API
- **Day 6**: Build Aider CLI wrapper with JSON extraction layer
- **Day 7**: Integrate status-driven workflow triggers and test

### Feature 3: Frontend Integration & Testing (Days 8-10)
- **Day 8**: Connect frontend to PostgreSQL APIs
- **Day 9**: End-to-end test with sample task
- **Day 10**: Implement error handling and monitoring

### Feature 4: Production Readiness & Optimization (Days 11-14)
- **Day 11**: Performance optimization and database tuning
- **Day 12**: Security hardening and API authentication
- **Day 13**: Documentation and deployment preparation
- **Day 14**: Final testing and production readiness verification

### Accelerated Timeline (With AI Assistance)
- **Option**: Complete all features in 5-7 days with parallel AI execution
- **Parallel Tracks**: Database setup + Orion tools + Aider adapter concurrently
- **AI Speed**: Each subtask estimated at 2-8 hours with focused AI assistance

## 10. Feature 1: Local Database & Orion/Aider Setup

### Feature 1.1: Set Up Local PostgreSQL Database
**ID**: F1.1  
**Owner**: System  
**Priority**: Critical  
**Dependencies**: None  
**Estimated Time**: 1-2 days with AI assistance

#### Subtasks:
1. **F1.1.1**: Install and configure local PostgreSQL (Docker or native)
2. **F1.1.2**: Create database schema from `backend/db/schema.sql`
3. **F1.1.3**: Migrate data from Neon or initialize fresh database
4. **F1.1.4**: Update backend configuration with local connection

### Feature 1.2: Implement Orion as Direct LLM Agent with Hybrid Tools
**ID**: F1.2  
**Owner**: System  
**Priority**: High  
**Dependencies**: F1.1  
**Estimated Time**: 1-2 days with AI assistance

#### Subtasks:
1. **F1.2.1**: Define semantic tool schemas (get/list/search/update/log operations)
2. **F1.2.2**: Implement safe-SQL tools with DDL restrictions (no DROP/TRUNCATE)
3. **F1.2.3**: Integrate DeepSeek API with tool-calling prompt templates
4. **F1.2.4**: Build Orion wrapper with Plan/Act mode tool locking
5. **F1.2.5**: Test end-to-end planning workflow with mock Orion

### Feature 1.3: Create Aider Adapter with JSON Extraction
**ID**: F1.3  
**Owner**: System  
**Priority**: High  
**Dependencies**: None (can run parallel to F1.2)
**Estimated Time**: 1-2 days with AI assistance

#### Subtasks:
1. **F1.3.1**: Build Aider CLI wrapper with timeout handling
2. **F1.3.2**: Implement JSON extraction layer with validation
3. **F1.3.3**: Integrate with database status change hooks
4. **F1.3.4**: Test Tara → Devon → Tara execution cycle

## 11. Next Steps

### Immediate (Next 24-48 Hours)
1. Review and approve this roadmap
2. Begin Feature 1.1 (Local PostgreSQL Setup)
3. Install PostgreSQL locally and test connection
4. Update backend configuration to use local database

### Short-term (Days 3-5)
5. Complete Feature 1.1 (Database foundation)
6. Start parallel development: Feature 1.2 (Orion) and Feature 1.3 (Aider)
7. Test basic Orion planning with database interaction
8. Test Aider CLI wrapper with simple code tasks

### Medium-term (Days 6-10)
9. Complete Orion/Aider integration (Feature 2)
10. Test end-to-end workflow with sample task
11. Connect frontend to new database APIs (Feature 3)
12. Implement error handling and monitoring (Feature 4)

### Accelerated Timeline
**With focused AI assistance**: All features could be completed in 5-7 days
- Database setup: 1 day
- Orion implementation: 1-2 days  
- Aider adapter: 1-2 days
- Integration & testing: 1-2 days

## 12. Success Criteria

### Database Success
- [ ] Local PostgreSQL running with <100ms query times
- [ ] All subtask data accessible via REST API
- [ ] Database connection errors handled gracefully
- [ ] Migration from Neon completed without data loss

### Orion Success
- [ ] Orion can create subtasks in database via LLM calls
- [ ] Database tools provide adequate context for planning
- [ ] CDP analysis identifies constraints accurately
- [ ] Planning workflow completes within 2 minutes

### Aider Success
- [ ] Aider executes code tasks within 5 minutes
- [ ] JSON extraction success rate >90%
- [ ] Tara/Devon role switching works correctly
- [ ] Results logged to database automatically

### System Success
- [ ] Complete TDD cycle automated end-to-end
- [ ] UI reflects real-time status changes
- [ ] Error recovery works without manual intervention
- [ ] System ready for production use

---

**Document Version**: 3.0  
**Created By**: Adam (Architect)  
**Date**: 2025-12-14  
**Status**: For Implementation

*Note: This roadmap supersedes roadmap_v2.md and incorporates the Architecture Shift Plan with Orion/Aider separation. All previous roadmap files should be archived.*
