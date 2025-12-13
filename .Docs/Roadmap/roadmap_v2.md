# TDD_TEAM Roadmap v2 - Executive Summary

## 1. Vision Statement
Automate a complete TDD (Test-Driven Development) workflow from task decomposition to code review using specialized AI agents (Adam, Orion, Tara, Devon) with JSON-based state management and Git integration.

## 2. Core Principles
- **Agent Specialization**: Each agent has a strict, non-overlapping role
- **TDD Discipline**: Red → Green → Refactor → Review sequence is mandatory
- **JSON as Source of Truth**: All state in human-readable JSON files
- **Git-Centric Workflow**: Every code change tracked, branched, and reviewed
- **Constraint-Aware Development**: CDP (Constraint Discovery Protocol) at each phase

## 3. Agent Roles & Boundaries

### Adam (Architect)
- **Role**: Task decomposition and planning
- **Boundaries**: Cannot write code or tests
- **Deliverable**: Decomposed subtasks with clear acceptance criteria
- **Prompt Location**: `.Docs/Prompts/Adam_Architect.md`

### Orion (Orchestrator)
- **Role**: Workflow coordination and CDP analysis
- **Boundaries**: Cannot write code or tests
- **Deliverable**: Quick CDP analysis, task assignment, status updates
- **Prompt Location**: `agents/system_prompt_orion_v2.md`

### Tara (Tester)
- **Role**: Test creation and code review
- **Boundaries**: Can ONLY write tests and review code; cannot implement features
- **Deliverable**: Failing tests, security/performance scoring, review feedback
- **Prompt Location**: `.Docs/Prompts/tara_cdp_pre_test.md` (pre-test CDP)
- **Prompt Location**: `.Docs/Prompts/tara_cdp_review.md` (code review CDP)

### Devon (Developer)
- **Role**: Code implementation and refactoring
- **Boundaries**: Can ONLY implement features; cannot write or modify tests
- **Deliverable**: Working code that passes tests, refactored implementations
- **Prompt Location**: `.Docs/Prompts/devon_cdp_pre_impl.md`

## 4. Workflow Overview

### Phase 0: Planning (Adam + Human)
1. Human provides requirement
2. Adam decomposes into functions -> tasks -> subtasks (prefer <=3 steps)
3. Human reviews and approves decomposition
4. Output: Task log JSON with workflow steps

### Phase 1: Orion Orchestration
5. Orion performs Quick CDP (identifies constraints)
6. Orion assigns first test subtask to Tara
7. Git branch created: `{phase}-{task}-{subtask}-tara`

### Phase 2: Test-First Development (Tara → Devon → Tara)
8. **Tara Pre-test CDP**: Analyze testing requirements
9. **Tara Test**: Write failing tests, commit to branch
10. **Devon Pre-implementation CDP**: Analyze implementation approach
11. **Devon Implement**: Write code to pass tests, commit to branch
12. **Devon Refactor**: Clean up code while keeping tests green
13. **Tara Review CDP**: Code review with security/performance scoring

### Phase 3: Completion
14. Orion updates logs and documentation
15. Git merge to base branch (`{phase}-{task}-base`)
16. Task marked complete in JSON logs

## 5. Technical Architecture

### JSON State Management
- **Task Logs**: `tasks/{task_id}.json` - Complete workflow state
- **Workflow State**: `workflow/state.json` - System health and agent availability
- **Agent Queue**: `workflow/queue.json` - Pending assignments
- **Conversations**: `data/conversations/` - Chat history per project/task

### Git Strategy
- **Base Branch**: `{phase}-{task}-base` (e.g., `1-1-base`)
- **Agent Branches**: `{phase}-{task}-{subtask}-{agent}` (e.g., `1-1-2-tara`)
- **Commit Messages**: `[Agent] [Task-ID] Brief description`
- **Merge Policy**: After Tara review → merge to base branch

### Wrapper Components
1. **Orion Wrapper**: UI ↔ Orion communication (Functions 1-4)
2. **Task Log Manager**: JSON read/write operations
3. **Git Sync Module**: Branch management and commits
4. **Timeout & Heartbeat Monitor**: 15-min timeout, 5-min heartbeat
5. **Workflow Coordinator**: Orchestrates Tara → Devon → Tara flow

## 6. Success Metrics

### Phase 1 Success (Week 1-2)
- [ ] UI can chat with Orion (real responses, not mock)
- [ ] Context checkbox works (send full context vs. minimal)
- [ ] Basic task log creation
- [ ] Orion performs Quick CDP analysis

### Phase 2 Success (Week 3-4)
- [ ] Tara writes failing tests for a simple feature
- [ ] Devon implements code to pass those tests
- [ ] Tara performs code review with scoring
- [ ] Git branches created and commits logged

### Phase 3 Success (Week 5-6)
- [ ] Complete TDD cycle automated (test→implement→review)
- [ ] JSON logs track entire workflow
- [ ] Timeout and heartbeat monitoring works
- [ ] Error handling and retry logic implemented

### Final Success (Week 7-8)
- [ ] One complete subtask from start to finish without human intervention
- [ ] All agents respect their role boundaries
- [ ] Git history shows clean TDD progression
- [ ] JSON logs provide audit trail of decisions

## 7. Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Agent role boundary violation | Medium | High | Strict prompts, wrapper validation |
| Git merge conflicts | High | Medium | Simple auto-merge, manual override flag |
| JSON file corruption | Low | High | Atomic writes, regular backups, file locking |
| Cline proxy failures | Medium | High | Retry logic (3 attempts), mock responses |
| Token limit exhaustion | High | Medium | Context checkbox, history truncation |
| Agent process stalls | Medium | Medium | 15-min timeout, 5-min heartbeat |

## 8. Implementation Timeline

### Week 1-2: Foundation
- Complete Orion wrapper (Functions 1-4)
- Update all agent prompts with strict boundaries
- Create JSON template files
- Basic UI integration

### Week 3-4: Core Workflow
- Implement Task Log Manager
- Create Git Sync Module
- Basic Tara/Devon agent scripts
- Manual workflow testing

### Week 5-6: Automation
- Implement Workflow Coordinator
- Add timeout and heartbeat monitoring
- Automated Tara → Devon → Tara sequence
- End-to-end testing

### Week 7-8: Polish
- Error handling and retry logic
- Performance optimization
- Documentation and examples
- Production readiness testing

## 9. Key Decisions

### 1. Agent Boundaries
- **Adam**: Decomposition only, no code
- **Orion**: Orchestration only, no code/tests
- **Tara**: Tests and reviews only, no implementation
- **Devon**: Implementation only, no tests

### 2. State Management
- JSON files only, no database
- Human-readable for debugging
- Atomic writes to prevent corruption
- Regular backups

### 3. Git Strategy
- One base branch per task
- Feature branch per subtask per agent
- Clean commit history showing TDD flow
- Merge after successful review

### 4. Error Handling
- 15-minute timeout per phase
- 5-minute heartbeat checks
- 3 retry attempts for failed operations
- Manual intervention queue for blocked tasks

## 10. Next Steps

### Immediate (This Week)
1. Review and approve this roadmap
2. Update Tara prompt: "Cannot touch outside of test"
3. Update Devon prompt: "Cannot touch test items"
4. Test agent boundary enforcement

### Short-term (Next 2 Weeks)
5. Complete Orion wrapper implementation
6. Create UI context checkbox
7. Implement basic task log management
8. Test simple user → Orion communication

### Medium-term (Month 1)
9. Implement Git sync module
10. Create Tara and Devon agent scripts
11. Test basic TDD cycle manually
12. Add timeout and heartbeat monitoring

## 11. Success Criteria Checkpoints

### Checkpoint 1: Week 2
- [ ] All prompts updated with strict boundaries
- [ ] Orion wrapper communicates with real Cline
- [ ] Basic task log creation works
- [ ] UI shows real Orion responses

### Checkpoint 2: Week 4
- [ ] Tara can write failing tests for simple feature
- [ ] Devon can implement to pass those tests
- [ ] Git commits show proper agent attribution
- [ ] JSON logs track test→implement progression

### Checkpoint 3: Week 6
- [ ] Automated Tara → Devon → Tara sequence
- [ ] Code review with security/performance scoring
- [ ] Timeout and heartbeat monitoring works
- [ ] One complete subtask automated end-to-end

### Checkpoint 4: Week 8
- [ ] Production-ready system
- [ ] All error handling implemented
- [ ] Documentation complete
- [ ] Ready for scaling to multiple tasks

---

**Document Version**: 2.0  
**Created By**: Adam (Architect)  
**Date**: 2025-12-13  
**Status**: For Review
