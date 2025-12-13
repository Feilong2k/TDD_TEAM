# Updated Prompts Summary

## Overview
All agent prompts have been updated to enforce strict TDD role boundaries. Each agent now has clear "CAN ONLY" and "CANNOT" directives to prevent role boundary violations.

## Changes Made

### 1. Tara (Tester) - Updated for TDD Test-First Flow with JSON Output
- **File**: `tara_cdp_pre_test.md`
- **TDD Principle Section**:
  - Test-First Development: Always write failing tests before any implementation code exists
  - Specification by Example: Tests define expected behavior as executable specifications
  - Red-Green-Refactor: Follow RED (failing test) → GREEN (minimum code to pass) → REFACTOR cycle
- **Task Context**:
  - Writing **FAILING** tests for tasks not yet implemented
  - TDD Workflow Position: **RED** stage (tests that initially fail)
- **Output Format**: **JSON ONLY** (no YAML)
- **Task Log Integration**:
  - Output updates `data/tasks.json` under `tasks[task_id].phases.tara_pre_test_cdp`
  - No separate YAML/JSON files created
  - Includes `task_updates` with status, phase, assignee
- **Role Boundaries**:
  - CAN ONLY: Write tests, review code, perform security/performance analysis
  - CANNOT: Implement features, modify production code
  - STRICT RULE: Never touch implementation code - only test code and review comments

### 2. Devon (Developer) - Updated for TDD Implementation Flow with JSON Output
- **File**: `devon_cdp_pre_impl.md`
- **TDD Principle Section**:
  - Test-Driven Development: Write only enough code to make failing tests pass (GREEN stage)
  - Minimal Implementation: Implement simplest solution that satisfies test requirements
  - Refactoring: After tests pass, improve code structure without changing behavior (REFACTOR stage)
  - Never Touch Tests: Tests are written by Tara; only modify implementation code
- **Task Context**:
  - Implements based on **FAILING** tests written by Tara
  - Goal: Write minimum code to make tests pass (GREEN), then refactor (REFACTOR)
  - TDD Workflow Position: **GREEN** stage (make tests pass) → **REFACTOR** stage
- **Output Format**: **JSON ONLY** (no YAML)
- **Task Log Integration**:
  - Output updates `data/tasks.json` under `tasks[task_id].phases.devon_pre_impl_cdp`
  - No separate YAML/JSON files created
  - Includes `task_updates` with status, phase, assignee
- **Role Boundaries**:
  - CAN ONLY: Implement features, write production code, refactor code, fix bugs
  - CANNOT: Write tests, modify test files, or change test-related code
  - STRICT RULE: Never touch test code - only implementation code

### 3. Adam (Architect)
- **File**: `Adam_Architect.md`
- **Updated Role Boundaries**:
  - "STRICT RULE: Never write code or tests - only design, specifications, and task breakdowns"
  - Only does design, specs, and task breakdowns

### 4. Orion (Orchestrator)
- **File**: `agents/system_prompt_orion_v2.md` (new version)
- **Key Features**:
  - JSON response format with `workflow_step` and `task_updates`
  - Quick CDP analysis before task assignment
  - Git integration with branch naming conventions
  - Enforces TDD workflow: Tara (test) → Devon (implement) → Tara (review)

### 5. Executive Roadmap
- **File**: `.Docs/Roadmap/roadmap_v2.md`
- **Content**: Comprehensive executive summary with TDD workflow, agent boundaries, and implementation timeline

### 6. JSON Standardization
- **All agent outputs now in JSON format** (no YAML)
- **Centralized task log**: `data/tasks.json` is single source of truth
- **Consistent structure**: All outputs include `response_type`, `workflow_step`, `task_updates`, `cdp_analysis`, `message`
- **Task log updates**: Agents update status in `task_updates.status` ("in_progress", "completed", "blocked")

## Current Agent Boundaries Summary

| Agent | Can Do | Cannot Do |
|-------|--------|-----------|
| **Adam** | Design systems, create task breakdowns, define architecture, write specs | Write code or tests |
| **Orion** | Orchestrate workflow, perform quick CDP, assign tasks, update logs | Write code or tests |
| **Tara** | Write tests, review code, perform security/performance analysis | Implement features, modify production code |
| **Devon** | Implement features, write production code, refactor code | Write tests, modify test files |

## TDD Workflow Enforcement

1. **Adam Decomposition**: Breaks down requirements into subtasks (max 3 steps)
2. **Orion Quick CDP**: Performs constraint analysis before assignment
3. **Tara Test-First**: Writes failing tests (cannot touch implementation)
4. **Devon Implementation**: Writes code to pass tests (cannot touch tests)
5. **Devon Refactor**: Refactors while keeping tests green
6. **Tara Review**: Code review with security/performance scoring
7. **Orion Log Updates**: Updates task logs and documentation

## Next Steps for Review

1. **Review the updated prompts** for each agent:
   - [ ] `.Docs/Prompts/Adam_Architect.md`
   - [ ] `.Docs/Prompts/tara_cdp_pre_test.md`
   - [ ] `.Docs/Prompts/devon_cdp_pre_impl.md`
   - [ ] `agents/system_prompt_orion_v2.md`

2. **Review the executive roadmap**:
   - [ ] `.Docs/Roadmap/roadmap_v2.md`

3. **Test boundary enforcement**:
   - Run sample tasks to ensure agents respect boundaries
   - Verify Tara cannot modify implementation code
   - Verify Devon cannot modify test files
   - Verify Adam does not write code

4. **Implementation priorities** (per roadmap):
   - Complete Orion wrapper (Functions 3-4)
   - Create UI context checkbox
   - Implement Task Log Manager
   - Create Git Sync Module

## File Locations

- Adam Prompt: `.Docs/Prompts/Adam_Architect.md`
- Tara Pre-Test CDP: `.Docs/Prompts/tara_cdp_pre_test.md`
- Tara Review CDP: `.Docs/Prompts/tara_cdp_review.md`
- Devon Pre-Implementation CDP: `.Docs/Prompts/devon_cdp_pre_impl.md`
- Orion Prompt v2: `agents/system_prompt_orion_v2.md`
- Roadmap v2 Executive: `.Docs/Roadmap/roadmap_v2.md`
- Roadmap v2 Technical: `.Docs/Roadmap/roadmap_v2_technical.md`

## Status

All prompt updates completed as requested. The documentation is now ready for your review.

**Last Updated**: 2025-12-13  
**Updated By**: Adam (Architect)
