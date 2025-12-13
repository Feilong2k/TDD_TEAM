# TDD_TEAM Roadmap v2 - Technical Specification

## 1. Overview

This document outlines the technical architecture, JSON schemas, and workflow for the TDD_TEAM system. The goal is to automate a single subtask from start to finish using a workflow of AI agents (Adam, Orion, Tara, Devon) with JSON-based state management and Git integration.

## 2. Architecture

```
┌─────────────────────────────────────┐
│            UI (Vue)                 │
└───────────────┬─────────────────────┘
                │ HTTP
┌───────────────▼─────────────────────┐
│         Backend (Express)           │
│  ┌─────────────────────────────┐    │
│  │    Workflow Coordinator     │    │
│  └───────────────┬─────────────┘    │
│                  │                   │
│  ┌───────────────▼─────────────┐    │
│  │     Task Log Manager        │    │
│  │  • Read/write task JSON     │    │
│  │  • Maintain workflow state  │    │
│  └───────────────┬─────────────┘    │
│                  │                   │
│  ┌───────────────▼─────────────┐    │
│  │      Orion Wrapper          │    │
│  │  • Prompt preparation (F2)  │    │
│  │  • Cline proxy (F3)         │    │
│  │  • Response validation (F4) │    │
│  └───────────────┬─────────────┘    │
│                  │                   │
│  ┌───────────────▼─────────────┐    │
│  │     Git Sync Module         │    │
│  │  • Pull before agent        │    │
│  │  • Commit after completion  │    │
│  └───────────────┬─────────────┘    │
│                  │                   │
│  ┌───────────────▼─────────────┐    │
│  │  Timeout & Heartbeat Monitor│    │
│  │  • 15-min timeout per phase │    │
│  │  • 5-min heartbeat checks   │    │
└─────────────────────────────────────┘
```

## 3. JSON Schemas

### 3.1 Task Log (`tasks/{task_id}.json`)

```json
{
  "task": {
    "id": "1-1-2",
    "title": "Implement user authentication",
    "status": "pending|planning|in_progress|completed|blocked",
    "phase": "adam_decomposition|user_review|orion_quick_cdp|clarification_stage|tara_pre_test_cdp|tara_test|devon_pre_impl_cdp|devon_implement|devon_refactor|tara_review_cdp|orion_log_updates",
    "owner": "adam|user|orion|tara|devon",
    "created_at": "ISO8601",
    "updated_at": "ISO8601"
  },
  "workflow": {
    "current_step": "adam_decomposition",
    "steps": [
      {"id": "adam_decomposition", "status": "in_progress", "owner": "adam"},
      {"id": "user_review", "status": "pending", "owner": "user"},
      {"id": "orion_quick_cdp", "status": "pending", "owner": "orion"},
      {"id": "clarification_stage", "status": "pending", "owner": "orion"},
      {"id": "tara_pre_test_cdp", "status": "pending", "owner": "tara"},
      {"id": "tara_test", "status": "pending", "owner": "tara"},
      {"id": "devon_pre_impl_cdp", "status": "pending", "owner": "devon"},
      {"id": "devon_implement", "status": "pending", "owner": "devon"},
      {"id": "devon_refactor", "status": "pending", "owner": "devon"},
      {"id": "tara_review_cdp", "status": "pending", "owner": "tara"},
      {"id": "orion_log_updates", "status": "pending", "owner": "orion"}
    ]
  },
  "conversation": [
    {
      "role": "user|assistant",
      "content": "string or JSON string for assistant",
      "timestamp": "ISO8601"
    }
  ],
  "cdp_analyses": {
    "quick": {},
    "pre_test": {},
    "pre_implementation": {},
    "code_review": {}
  },
  "git": {
    "base_branch": "1-1-base",
    "feature_branch": "1-1-2-orion",
    "commit_history": [
      {
        "hash": "abc123",
        "agent": "tara",
        "phase": "tara_test",
        "message": "[Tara] Write failing tests for login validation"
      }
    ]
  }
}
```

### 3.2 Workflow State (`workflow/state.json`)

```json
{
  "active_tasks": ["1-1-2"],
  "available_agents": {
    "orion": "idle|busy",
    "tara": "idle|busy",
    "devon": "idle|busy"
  },
  "system_health": {
    "last_heartbeat": "ISO8601",
    "wrapper_status": "running",
    "git_sync_status": "idle|syncing|error"
  }
}
```

### 3.3 Agent Assignment Queue (`workflow/queue.json`)

```json
{
  "pending_assignments": [
    {
      "task_id": "1-1-2",
      "subtask_id": "1-1-2.a",
      "agent": "tara",
      "phase": "tara_test",
      "created_at": "ISO8601"
    }
  ]
}
```

## 4. Workflow Steps

### Phase 1: Planning & Decomposition
1. **Adam (Human + AI)**: Decompose task into subtasks
2. **User Review**: Approve/Reject decomposition
3. **Orion Quick CDP**: Analyze scope, identify constraints
4. **Clarification Stage**: Orion asks questions if needed

### Phase 2: Test-First Development
5. **Tara Pre-test CDP**: Analyze testing requirements
6. **Tara Test**: Write failing tests, commit to `1-1-2-tara` branch
7. **Devon Pre-implementation CDP**: Analyze implementation approach
8. **Devon Implement**: Write code to pass tests, commit to `1-1-2-devon` branch
9. **Devon Refactor**: Clean up code while keeping tests green

### Phase 3: Review & Completion
10. **Tara Review CDP**: Code review with security/performance scoring
11. **Orion Log Updates**: Update documentation, finalize task

## 5. Module Specifications

### 5.1 UI (Vue Component)
- Chat interface with message history
- Checkbox for "Include full context" (sends system prompt + conversation history)
- Task progress visualization
- Agent status indicators

### 5.2 Backend (Express)
- REST API for UI communication
- Workflow Coordinator: Routes tasks to appropriate agents
- Task Log Manager: CRUD operations for task JSON files
- Integration with Orion Wrapper

### 5.3 Orion Wrapper
- **Function 2 (formatPrompt)**: Prepares prompt with optional conversation history
- **Function 3 (executeCline)**: Calls Cline via HTTP proxy (`192.168.0.4:9001`)
- **Function 4 (validateJsonResponse)**: Extracts and validates JSON from response
- **Retry Logic**: 2 retries on failure
- **Timeout**: 3 minutes per request

### 5.4 Git Sync Module
- Pull latest from base branch before agent starts
- Create feature branch per subtask (`1-1-2-tara`, `1-1-2-devon`)
- Commit agent work with standardized messages
- Push to remote repository
- Handle merge conflicts (flag for manual intervention)

### 5.5 Timeout & Heartbeat Monitor
- **15-minute timeout** per workflow phase
- **5-minute heartbeat** from agents (update task log)
- Automatic kill of stalled processes
- Notification to UI when timeout occurs

## 6. ID and Branch Naming Conventions

### Task IDs
- Format: `{phase}-{task}-{subtask}`
- Example: `1-1-2` = Phase 1, Task 1, Subtask 2
- Sub-subtask: `1-1-2.a` = Subtask 2, part A

### Git Branches
- Base branch: `{phase}-{task}-base` (e.g., `1-1-base`)
- Feature branches: `{phase}-{task}-{subtask}-{agent}` (e.g., `1-1-2-tara`)
- Each agent works on its own branch
- Final merge to base branch after review

## 7. System Prompt v2

Location: `agents/system_prompt_orion_v2.md`

Key changes from v1:
- Focus on CDP (Constraint Discovery Protocol) at each phase
- Updated response format matching workflow steps
- Integration with JSON task logs
- Git branch awareness

## 8. Implementation Phases

### Week 1: Foundation
1. Create JSON schema templates
2. Implement Function 2 (formatPrompt) with tests
3. Update Orion prompt to v2
4. Add context checkbox to UI

### Week 2: Communication
5. Implement Function 3 (executeCline) - HTTP proxy integration
6. Implement Function 4 (validateJsonResponse)
7. Connect UI to real Orion responses
8. Basic task log creation

### Week 3: Task Management
9. Create Task Log Manager module
10. Implement Git Sync Module (basic pull/commit)
11. Add timeout and heartbeat monitoring
12. Workflow state tracking

### Week 4: Orchestration
13. Create agent launcher for Tara/Devon
14. Implement workflow coordinator
15. Complete one TDD cycle (test→implement→review)
16. End-to-end testing and bug fixes

## 9. Success Criteria

1. **UI Communication**: Chat with Orion through UI with real responses
2. **Task Log**: JSON task log created and updated throughout workflow
3. **Git Integration**: Agents commit to appropriate branches
4. **TDD Cycle**: One complete subtask (test→implement→review) automated
5. **Error Handling**: Timeouts, heartbeats, and retries work correctly

## 10. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Cline proxy failures | Mock responses for testing, fallback to local execution |
| JSON file corruption | Atomic writes, regular backups, file locking |
| Git merge conflicts | Simple auto-merge, flag for manual resolution |
| Agent process stalls | Heartbeat monitoring, kill after timeout |
| Token limits in prompts | Context checkbox lets user control what's sent |

---

**Document Version**: 2.0  
**Last Updated**: 2025-12-13  
**Based on**: User requirements from PLAN MODE discussion
