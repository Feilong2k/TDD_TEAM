# Subtask Workflow Stages (Canonical Process)

## Overview
Each subtask goes through a defined 8-stage workflow with specific roles and deliverables. This document captures the canonical process for all subtasks in the TDD_TEAM system.

## Workflow Stages

### Stage 1: Adam Decomposition & DB Upload
- **Agent**: Adam (Architect)
- **Trigger**: Human provides requirements
- **Actions**:
  1. Finalize subtask decomposition from Adam's analysis
  2. Upload subtasks to PostgreSQL database
  3. Include original implementation instructions for Tara and Devon
- **Deliverable**: Structured subtask records in database with full details

### Stage 2: Orion Pre-Start CDP Analysis
- **Agent**: Orion (Orchestrator)
- **Trigger**: Subtask is marked as ready in database
- **Actions**:
  1. Perform CDP (Constraint Discovery Protocol) analysis
  2. Identify gaps and clarification requirements
  3. Focus on: **Accuracy > Thoroughness > Security**
  4. Only escalate to human when Orion cannot resolve gaps
- **Deliverable**: CDP analysis stored in `details.stages.orion_pre_start`

### Stage 3: Tara Test Generation
- **Agent**: Tara (Tester) via Aider
- **Trigger**: Subtask status changes to `ready_for_tara`
- **Actions**:
  1. Use CDP analysis to identify test gaps
  2. Generate failing tests following: **Accuracy > Thoroughness > Security**
  3. Escalate to Orion if cannot fill gaps
  4. Document tests generated and what they test
- **Deliverable**: Tests stored in `details.stages.tara_test_generation`

### Stage 4: Devon Implementation
- **Agent**: Devon (Developer) via Aider
- **Trigger**: Subtask status changes to `ready_for_devon`
- **Actions**:
  1. Perform CDP analysis on implementation
  2. Fill gaps identified if possible
  3. Ask clarification questions to Orion if needed
  4. Implement minimum viable solution
  5. Document implementation notes
- **Deliverable**: Implementation stored in `details.stages.devon_implementation`

### Stage 5: Devon Refactoring
- **Agent**: Devon (Developer) via Aider
- **Trigger**: Implementation completed, tests passing
- **Actions**:
  1. Refactor code while keeping tests green
  2. Improve design, maintainability, and performance
  3. Follow refactoring best practices
- **Deliverable**: Refactored code stored in `details.stages.devon_refactoring`

### Stage 6: Tara Final Review
- **Agent**: Tara (Tester) via Aider
- **Trigger**: Subtask status changes to `ready_for_review`
- **Actions**:
  1. Ensure tests pass (if not, identify valid reasons: design error, mock data issues, etc.)
  2. Look for errors not covered by tests
  3. Perform comprehensive code review (see `.Docs/Prompts/tara_cdp_review.md`)
  4. Verify security, performance, and maintainability
- **Deliverable**: Review findings stored in `details.stages.tara_final_review`

### Stage 7: Rework (If Required)
- **Agent**: Devon (Developer) via Aider
- **Trigger**: Tara review identifies issues
- **Actions**:
  1. Address issues identified in Tara review
  2. Make necessary changes
  3. Pass task back to Orion
- **Deliverable**: Updated implementation

### Stage 8: Orion Closeout
- **Agent**: Orion (Orchestrator)
- **Trigger**: Subtask passes Tara review
- **Actions**:
  1. Close the subtask
  2. Perform Git operations (commit, merge, etc.)
  3. Execute any cleanup operations
  4. Move to next subtask
- **Deliverable**: Completed subtask with all artifacts

## UI Requirements

### Separate Panels for Each Agent's CDP Analysis
- **Orion CDP Panel**: Show gaps identified and mitigations
- **Tara CDP Panel**: Show test generation gaps and test coverage
- **Devon CDP Panel**: Show implementation gaps and implementation notes

### Activity Log for Questions & Answers
- **Clarification Questions**: Orion's, Tara's, and Devon's questions
- **Human Responses**: Answers provided by human operator
- **Tracking**: Timestamps, agent, question type, responses

### Database Schema Extensions
The `details` JSONB column in subtasks should support:
```json
{
  "stages": {
    "orion_pre_start": {
      "cdp_analysis": {...},
      "gaps_identified": [...],
      "mitigations": [...]
    },
    "tara_test_generation": {
      "tests_created": [...],
      "coverage_gaps": [...],
      "test_summary": "..."
    },
    "devon_implementation": {
      "implementation_notes": "...",
      "code_artifacts": [...],
      "cdp_analysis": {...}
    },
    "devon_refactoring": {
      "refactoring_changes": [...],
      "design_improvements": [...]
    },
    "tara_final_review": {
      "review_findings": [...],
      "security_assessment": {...},
      "test_results": {...}
    }
  },
  "activity_log": [
    {
      "timestamp": "2025-12-15T10:30:00Z",
      "agent": "orion",
      "type": "clarification_question",
      "question": "...",
      "answer": "...",
      "status": "resolved"
    }
  ]
}
```

## Priority Order for CDP Analysis
1. **ACCURACY FIRST**: Ensure correct behavior
2. **THOROUGHNESS SECOND**: Comprehensive coverage
3. **SECURITY THIRD**: Address security risks
4. **EFFICIENCY LAST**: Optimize execution

## Solution-First Protocol
- Agents must attempt to resolve ambiguities themselves first
- Only escalate when critical issues cannot be understood or verified
- When asking, propose an interpretation and explain impact

## Git Workflow
- Branch-per-subtask approach
- All changes committed with descriptive messages
- Merge only after successful Tara review
- Cleanup branches after completion

## Aider Limitations & Workarounds

### Limitations of Aider for Multi-Agent Workflows
1. **Tool Execution Model**: Aider is not designed to natively use arbitrary external tools like a full agent would. It can only execute scripts or CLI tools that are part of the repository.
2. **Database Operations**: Aider cannot open direct database connections or handle interactive queries dynamically without pre-existing scripts.
3. **Scope Limitations**: Aider's scope is local to the repository or scripts provided. It cannot independently query external systems unless wrapped in a tool/script in the repo.
4. **Multi-Step Reasoning**: Aider processes tasks linearly, one question or task at a time. Complex multi-step reasoning requires sequential prompts or script wrapping.
5. **State Tracking**: Aider has limited state tracking across multiple CDP runs unless outputs are saved in files or committed to version control.

### Workarounds for TDD_TEAM Integration
1. **Database Operations**: Create scripts for DB operations (e.g., `update_status.sh`, `cdp_to_db.sh`) and place them in the repository. Aider can execute these scripts to update database statuses and details.
2. **Constraint Discovery Protocol (CDP)**: Implement CDP via sequential prompts or a script-wrapped CDP runner that:
   - Reads questions from a file
   - Feeds each question to Aider
   - Captures answers and stores them in the database via scripts
3. **Multi-Agent Safety**: For concurrent agent operations, use:
   - Branch-per-agent workflows
   - Cloned repositories for isolation
   - Queue systems for database writes to prevent collisions
4. **Hybrid Architecture**: Use Aider for standard code editing and test generation, while custom agents (Orion) handle orchestration, database interactions, and multi-agent coordination.

### Implementation Strategy
- **Aider-Friendly Tools**: Wrap all database operations in repository scripts with clear interfaces.
- **CDP Runner**: Develop a headless script that runs Aider through the CDP questions and updates the database automatically.
- **Orion Orchestration**: Use Orion to manage the overall workflow, invoke Aider when needed, and update the database with results.

---

**Document Version**: 1.1  
**Created**: 2025-12-15  
**Updated**: 2025-12-15 (Added Aider limitations & workarounds)  
**Source**: User-provided workflow and technical analysis  
**Status**: Active - For implementation in UI and database
