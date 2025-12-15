# Architecture Shift Plan: TDD_TEAM v3

## Overview
This plan outlines the transition from the current JSON-based, Cline-dependent architecture to a PostgreSQL-backed, orchestrator-driven system with external code agents (Aider/OpenCode). The shift addresses the instability of Cline VMs and the cumbersomeness of JSON files.

## Core Changes

### 1. **Single Source of Truth**
- **Current:** JSON files (`data/project.json`, `data/tasks.json`, `data/subtasks/`)
- **New:** PostgreSQL database (hosted online)
- **Rationale:** Better consistency, transaction support, multi-project capability, and easier querying.

### 2. **Agent Execution Model**
- **Current:** Orion wrapper calls Cline via proxy (buggy VM installation)
- **New:** Orchestrator backend calls external code agents (Aider/OpenCode) via CLI adapters
- **Rationale:** Aider/OpenCode are more stable, purpose-built for code tasks, and can run locally or in containers.

### 3. **Workflow Control**
- **Current:** Orion orchestrates state transitions and agent assignments
- **New:** UI-driven status changes; scripts react to status updates and trigger appropriate agents/git operations
- **Rationale:** You act as the state machine, providing flexibility and control.

### 4. **Code Cleanup**
- **Current:** Messy codebase with many experimental files
- **New:** Clean backend/frontend separation, archive or delete unused code
- **Rationale:** Foundation for reliable development.

## High-Level Architecture

```
┌─────────────────┐    ┌─────────────────────────────────────┐    ┌──────────────────┐
│     Vue UI      │◄──►│       Orchestrator Backend          │◄──►│   PostgreSQL     │
│                 │    │  (Node.js/Express)                  │    │   (Online)       │
│ • Subtask Tree  │    │  • REST APIs for UI                 │    │ • Subtasks       │
│ • Chat Panel    │    │  • Status change handlers           │    │ • Subtask State  │
│ • Log Drawer    │    │  • Agent adapter dispatcher         │    │ • Logs           │
└─────────────────┘    │  • Git operation scripts            │    └──────────────────┘
                       └───────────────┬─────────────────────┘
                                       │
                               ┌───────▼────────┐
                               │ External Agents │
                               │  • Aider       │
                               │  • OpenCode    │
                               └─────────────────┘
```

## Subtask Decomposition

### Phase 1: Foundation & Cleanup
**Objective:** Clean slate for backend and frontend.

#### 1.1 Archive Current Codebase
- **Description:** Move experimental/unused code to an `archive/` directory; keep only essential backend/frontend files.
- **Relevant Files:** All root files, `agents/`, `data/`, `specs/`, `templates/`
- **Acceptance Criteria:**
  - `backend/` contains only server, routes, and essential utilities
  - `frontend/` contains only Vue components, styles, and config
  - `archive/` contains all other code with README explaining origin
- **Estimated Time:** 2h
- **Risk:** Low

#### 1.2 Set Up PostgreSQL Database
- **Description:** Create database schema matching the Phase1_DB_Orchestrator_Design spec.
- **Relevant Files:** `backend/db/schema.sql` (to be created)
- **Acceptance Criteria:**
  - Database hosted online (e.g., Supabase, AWS RDS, or DigitalOcean)
  - Three tables created: `subtasks`, `subtask_state`, `subtask_logs`
  - Connection tested from local Node.js
- **Estimated Time:** 3h
- **Risk:** Medium (network configuration, permissions)

#### 1.3 Implement DB Connection Layer
- **Description:** Create Node.js module to connect to PostgreSQL and provide CRUD operations.
- **Relevant Files:** `backend/db/connection.js`, `backend/db/queries.js`
- **Acceptance Criteria:**
  - Connection pooling configured
  - Functions for inserting/updating/querying subtasks, state, logs
  - Error handling and logging
- **Estimated Time:** 4h
- **Risk:** Low

### Phase 2: Orchestrator Backend
**Objective:** Backend APIs that replace JSON file operations and dispatch to agents.

#### 2.1 Implement Subtask REST APIs
- **Description:** Build Express routes for listing subtasks, getting subtask details, and updating status.
- **Relevant Files:** `backend/routes/subtasks.js`, `backend/server.js`
- **Acceptance Criteria:**
  - `GET /api/subtasks` returns list from DB
  - `GET /api/subtasks/:id` returns subtask with state and logs
  - `POST /api/subtasks/:id/status` updates status and triggers scripts
- **Estimated Time:** 5h
- **Dependencies:** 1.2, 1.3
- **Risk:** Low

#### 2.2 Status Change Hook Scripts
- **Description:** Create scripts that run when status changes (e.g., on "in_progress" call Aider, on "ready-for-review" run tests).
- **Relevant Files:** `backend/scripts/status-hooks.js`, `backend/scripts/git-ops.js`
- **Acceptance Criteria:**
  - Scripts can be triggered via event or direct call
  - Git operations (branch, commit, push) work
  - Can invoke external agents via CLI
- **Estimated Time:** 6h
- **Dependencies:** 2.1
- **Risk:** Medium (external command integration)

#### 2.3 Agent Adapters (Aider/OpenCode)
- **Description:** Create wrappers that call Aider or OpenCode with proper context and parse responses.
- **Relevant Files:** `backend/agents/aider-adapter.js`, `backend/agents/opencode-adapter.js`
- **Acceptance Criteria:**
  - Can invoke Aider/OpenCode CLI with project context
  - Capture structured output (JSON + Markdown)
  - Update DB with results
- **Estimated Time:** 8h
- **Dependencies:** 2.2
- **Risk:** High (new tools, output format uncertainty)

### Phase 3: Frontend Updates
**Objective:** Update UI to use new APIs and support status-driven workflow.

#### 3.1 Connect Frontend to New APIs
- **Description:** Modify Vue components to fetch from new `/api/subtasks` endpoints instead of JSON files.
- **Relevant Files:** `frontend/src/components/TaskList.vue`, `frontend/src/components/ChatPanel.vue`
- **Acceptance Criteria:**
  - Subtask tree loads from DB
  - Log drawer shows state and logs from DB
  - Status change buttons call new API
- **Estimated Time:** 6h
- **Dependencies:** 2.1
- **Risk:** Low

#### 3.2 Enhance UI for Status-Driven Workflow
- **Description:** Add UI elements to trigger agent actions (Plan, Test, Implement) that change status and trigger scripts.
- **Relevant Files:** `frontend/src/components/SubtaskActions.vue` (new)
- **Acceptance Criteria:**
  - Buttons for "Plan with Orion", "Send to Tara", "Send to Devon"
  - Status changes visible in real-time
  - Logs update automatically
- **Estimated Time:** 4h
- **Dependencies:** 3.1, 2.2
- **Risk:** Low

### Phase 4: Integration & Testing
**Objective:** End-to-end workflow with a sample task.

#### 4.1 End-to-End Test with Sample Task
- **Description:** Create a simple subtask and run through full TDD cycle using new system.
- **Relevant Files:** Test scripts, sample task definition
- **Acceptance Criteria:**
  - Subtask created in DB via UI
  - Orion planning triggers Aider/OpenCode, updates plan
  - Tara test phase runs tests, updates state
  - Devon implementation passes tests
  - Git commits recorded
- **Estimated Time:** 8h
- **Dependencies:** 2.3, 3.2
- **Risk:** High (many moving parts)

#### 4.2 Error Handling & Monitoring
- **Description:** Add logging, retry logic, and UI notifications for failures.
- **Relevant Files:** `backend/middleware/error-handler.js`, `frontend/src/components/Notifications.vue`
- **Acceptance Criteria:**
  - Failed agent calls are retried (max 3 times)
  - Errors logged to DB and shown in UI
  - Timeout handling for long-running operations
- **Estimated Time:** 5h
- **Dependencies:** 4.1
- **Risk:** Medium

## Dependencies Graph

```
1.1 Archive Code
     ↓
1.2 DB Setup → 1.3 DB Layer
                 ↓
             2.1 REST APIs → 2.2 Status Hooks → 2.3 Agent Adapters
                 ↓                               ↓
             3.1 Frontend APIs → 3.2 UI Enhancements
                                   ↓
                                4.1 E2E Test → 4.2 Error Handling
```

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Aider/OpenCode CLI unstable | High | Have fallback to direct LLM calls; mock during development |
| PostgreSQL connection latency | Medium | Use connection pooling; cache frequent queries |
| Status hook scripts race conditions | Medium | Use job queue (Bull) or simple locking |
| Git operations fail | Medium | Validate git state before operations; manual override option |
| Agent output parsing fails | High | Start with simple Markdown; gradually add JSON schema validation |

## Success Criteria

1. **Database as Source of Truth:** All subtask data resides in PostgreSQL; JSON files are archived.
2. **External Agents:** Aider or OpenCode successfully invoked for code generation/testing.
3. **UI-Driven Workflow:** You can change subtask status via UI and scripts automatically trigger next steps.
4. **Git Integration:** Each phase commits to appropriate branch with descriptive messages.
5. **End-to-End TDD Cycle:** One sample subtask completes planning → tests → implementation → review without manual intervention beyond status clicks.

## Next Steps

1. **Review this plan** – adjust scope, priorities, and estimates.
2. **Begin with Phase 1** – archive code and set up database.
3. **Iterate** – complete each phase before moving to the next, with testing at each stage.

Once you approve this plan, we can proceed with implementation. The first task would be cleaning up the codebase (1.1).

---
*Generated by Adam (Architect) on 2025-12-14*
