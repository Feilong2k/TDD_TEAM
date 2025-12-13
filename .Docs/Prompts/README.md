# CDP-Integrated Agent Prompts

This directory contains specialized prompts for integrating Constraint Discovery Protocol (CDP) into agent workflows. Each prompt is designed for a specific agent and phase of development.

## Prompt Files

### 1. `tara_cdp_pre_test.md`
**Purpose**: For Tara to analyze implementation plans before writing tests using CDP Basic.
**When to Use**: After Devon completes implementation plan, before Tara writes tests.
**Output**: Structured JSON analysis of atomic actions, resources touched, and resource physics for testing.
**Key Focus**: Security-first test design based on atomic actions and physical constraints.

### 2. `devon_cdp_pre_impl.md`
**Purpose**: For Devon to analyze implementation plans before coding using CDP Basic.
**When to Use**: After receiving task requirements, before writing code.
**Output**: Structured JSON analysis of atomic actions, resources touched, and resource physics for implementation.
**Key Focus**: Security-first implementation planning based on atomic actions and physical constraints.

### 3. `tara_cdp_review.md`
**Purpose**: For Tara to review implemented code using CDP Basic.
**When to Use**: After Devon implements code and tests pass, for deep adversarial review.
**Output**: Structured JSON analysis of atomic actions, resources touched, and resource physics in code.
**Key Focus**: Security-first code review to find what tests missed, focusing on physical constraints.

## Common Features

All prompts share these core components:

### A. CDP Basic Protocol Integration
- **Atomic Actions Analysis**: Identification of specific actions the code or plan will perform
- **Resources Touched Analysis**: Listing of systems, files, and data with access patterns (Read/Write/Lock/Execute)
- **Resource Physics Analysis**: Identification of physical constraints (race conditions, network latency, etc.) and mitigations
- **Risk Assessment**: Security, performance, maintainability, integration risks based on physical constraints

### B. Output Requirements
- **Format**: Structured JSON for machine readability
- **Required Fields**: Agent, phase, task_id, timestamp, cdp_tier
- **Consistency**: Same top-level structure across all prompts
- **Logging**: Outputs update the central task log in `data/tasks.json`

### C. Priority Order for Decision Making
1. **SECURITY FIRST**: Address security risks before all else
2. **ACCURACY SECOND**: Ensure correct behavior and edge case handling
3. **THOROUGHNESS THIRD**: Comprehensive coverage of all identified issues
4. **EFFICIENCY LAST**: Optimize for performance and maintainability

### D. Clarification Protocol (Solution-First)

**Core Principle**: Try to solve first, ask only when necessary.

**When to Ask for Clarification**:
- Critical security assumption cannot be verified
- High-risk ambiguity in requirements or implementation
- Missing required information that cannot be inferred
- Multiple interpretations with significantly different risk profiles

**How to Ask for Clarification**:
1. **Propose a Solution**: State what you think the answer should be
2. **Explain Need**: Explain why clarification is needed
3. **Specify Impact**: Describe impact if not clarified
4. **Document Attempts**: Show what you tried to resolve it yourself

**Clarification Format in Output**:
```json
"clarification_needed": [
  {
    "question": "specific, actionable question",
    "blocking": true,
    "attempted_resolution": "what you tried to resolve this yourself",
    "impact_if_unanswered": "what happens if this isn't clarified"
  }
]
```

## Workflow Integration

### Recommended Workflow
```
1. Orion creates task plan
2. Devon runs `devon_cdp_pre_impl.md` on plan
3. Devon implements code based on CDP analysis
4. Tara runs `tara_cdp_pre_test.md` on implementation plan
5. Tara writes tests based on CDP analysis
6. Tests run (pass/fail)
7. Tara runs `tara_cdp_review.md` on implemented code
8. Issues are addressed, cycle repeats if needed
```

### Tiered Application
- **Simple Tasks (1-3 steps)**: Skip CDP or use light version
- **Medium Tasks (4-6 steps)**: Use CDP Basic as described
- **Complex Tasks (7+ steps)**: Consider CDP LITE v3 or Full v3

## Logging System

### Centralized Task Log
- **Single Source of Truth**: `data/tasks.json` contains all task state
- **JSON Structure**: Each task has phases with agent outputs
- **Automatic Updates**: Agent JSON outputs are merged into task log
- **No Separate Files**: Agents do NOT create separate YAML/JSON files

### Task Log Structure
```json
{
  "tasks": {
    "P-001-T-001": {
      "id": "P-001-T-001",
      "title": "Task title",
      "phases": {
        "adam_decomposition": { /* Adam's JSON output */ },
        "tara_pre_test_cdp": { /* Tara's JSON output */ },
        "devon_pre_impl_cdp": { /* Devon's JSON output */ },
        "tara_review_cdp": { /* Tara's review JSON output */ }
      },
      "status": "in_progress",
      "created_at": "2025-12-13T00:00:00Z",
      "updated_at": "2025-12-13T00:00:00Z"
    }
  }
}
```

### Agent Integration
- **Adam**: Updates `tasks[task_id].phases.adam_decomposition`
- **Tara (Pre-Test)**: Updates `tasks[task_id].phases.tara_pre_test_cdp`
- **Devon**: Updates `tasks[task_id].phases.devon_pre_impl_cdp`
- **Tara (Review)**: Updates `tasks[task_id].phases.tara_review_cdp`
- **Orion**: Updates task status and coordinates workflow

### Log Content Requirements
Each phase update must contain:
1. **Task Identification**: task_id, agent, phase, timestamp
2. **CDP Analysis**: Complete structured JSON output
3. **Status Update**: Current task status ("in_progress", "completed", "blocked")
4. **Next Steps**: Clear indication of what should happen next

## Success Criteria

### For Devon (Pre-Implementation)
- Identifies at least 5 assumptions
- Discovers at least 3 implementation constraints
- Proposes at least 2 implementation strategies
- Prioritizes security risks appropriately

### For Tara (Pre-Test)
- Identifies at least 5 assumptions
- Discovers at least 3 testing constraints
- Derives at least 3 test scenarios from constraints
- Prioritizes security testing appropriately

### For Tara (Code Review)
- Identifies at least 5 assumptions in code
- Discovers at least 3 constraint violations
- Finds at least 2 security risks (if present)
- Proposes specific fixes for identified issues

## Customization Guidelines

### For Different CDP Tiers
- **CDP Basic**: Use these prompts as-is
- **CDP LITE v3**: Expand assumptions audit to 10+ items
- **CDP Full v3**: Add physical vs. logical checks and gap analysis

### For Different Risk Profiles
- **High Security Tasks**: Increase security focus, add threat modeling
- **High Performance Tasks**: Add detailed performance constraint analysis
- **Legacy Integration Tasks**: Add compatibility and migration constraints

## Maintenance

### Version Control
- Track prompt changes in git
- Include version numbers in prompts if they evolve significantly
- Document breaking changes in this README

### Performance Tracking
- Monitor time spent on CDP analysis vs. benefits gained
- Track issues caught by CDP vs. missed issues
- Adjust CDP application based on empirical results

## Getting Started

1. **First Use**: Start with medium-complexity tasks
2. **Initial Setup**: Create log directory for each task
3. **Execution**: Run prompts in sequence as described in workflow
4. **Review**: Examine outputs for completeness and actionable insights
5. **Iterate**: Adjust prompts based on team feedback and results

## Troubleshooting

### Common Issues
- **Output Not Structured**: Ensure YAML formatting is correct
- **Missing Assumptions**: Look for implicit assumptions in requirements
- **Vague Risks**: Be specific about impact and scenarios
- **Over-Clarification**: Remember solution-first protocol

### Quality Indicators
- **Good Output**: Specific, actionable, prioritized findings
- **Poor Output**: Vague, generic, unprioritized lists
- **Optimal Balance**: Enough detail to act, not so much it paralyzes

---

*These prompts create a constraint-aware, security-first, solution-oriented development process that catches issues early and improves software quality.*
