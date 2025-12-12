# Revised Architecture: Orion with Git Operations

## Problem Identified
Orion needs to perform Git operations (branch creation, commits, merges) but cannot use Cline-CLI with DeepSeek. Original design had Orion as external DeepSeek API service without direct Git access.

## Solution: Orion with Git Service Integration

### Revised Orion Design
- **Orion (DeepSeek External)**: Task analysis and decomposition using DeepSeek API
- **Git Service**: Node.js service on Orion VM that provides Git operations via API
- **Interaction**: Orion calls Git Service to read files, create branches, commit changes

### Architecture Diagram
```
┌─────────────────────────────────────────────────────┐
│                   Orion VM                          │
│  ┌─────────────┐      ┌──────────────────────┐    │
│  │   Orion     │◄────►│     Git Service      │    │
│  │ (DeepSeek)  │ API  │ (Node.js + git CLI)  │    │
│  └─────────────┘      └──────────────────────┘    │
│         │                       │                  │
│         ▼                       ▼                  │
│  Task Analysis           Git Operations            │
└─────────────────┬─────────────────┬────────────────┘
                  │                 │
            JSON to DB        Git to Repository
                  │                 │
           ┌──────▼─────┐   ┌──────▼─────┐
           │ PostgreSQL │   │   Git      │
           │   Database │   │ Repository │
           └────────────┘   └────────────┘
```

### Git Service Capabilities
1. **File Reading**: Read project files for Orion analysis
2. **Branch Management**: Create feature branches for tasks
3. **Commits**: Commit agent changes with proper messages
4. **Merges**: Handle merge operations when tasks complete
5. **History**: Provide git history for context

### Orion Workflow with Git
1. **Receive Task**: From dashboard or API
2. **Clone/Read Repository**: Via Git Service to get current code state
3. **Analyze Code**: DeepSeek analyzes files and structure
4. **Decompose Task**: Create 3-step subtasks with dependencies
5. **Create Feature Branch**: Via Git Service for the task
6. **Store in Database**: Subtasks, dependencies, branch info
7. **Coordinate Agents**: Assign subtasks to Tester/Developer

### Advantages of This Design
1. **No Cline Limitation**: Orion uses DeepSeek while still having Git access
2. **Consistent Git Operations**: Centralized Git service ensures proper workflow
3. **Simplified Architecture**: No need to split Orion into two components
4. **Maintains Reasoning Power**: DeepSeek for complex task decomposition
5. **Cost Effective**: GPT-4o-mini still used for Tester/Developer execution

### Database vs Git Storage
- **Database**: Stores tasks, subtasks, state, metadata, file hashes for conflict detection
- **Git**: Primary code storage with full history
- **Sync**: Database tracks file hashes and versions, Git holds actual content

### Updated Agent Responsibilities

#### Orion (Orchestrator)
- Task analysis using DeepSeek
- Git operations via Git Service API
- Subtask creation and dependency mapping
- State machine coordination
- Conflict resolution assistance

#### Git Service (New Component)
- REST API for Git operations
- Repository management per project
- Branch lifecycle management
- Commit history tracking
- Merge conflict handling

#### Tester & Developer (Unchanged)
- Use Cline-CLI with GPT-4o-mini
- Follow 3-step subtasks with explicit Git commands
- Return JSON with results
- Update database via wrapper

### Implementation Changes

#### Phase 1: Git Service
1. Create Node.js Git service with REST API
2. Implement core Git operations (clone, branch, commit, merge)
3. Add authentication and project isolation

#### Phase 2: Orion Integration
1. Update Orion to call Git Service API
2. Add file reading for task analysis
3. Implement branch creation for new tasks

#### Phase 3: Coordination Updates
1. Modify state machine to include Git branch states
2. Update dashboard to show Git branch information
3. Enhance conflict detection with Git history

### Code Example: Git Service API

```javascript
// Example endpoints
POST   /api/projects/:id/clone      // Clone repository
GET    /api/projects/:id/files/*    // Read file content
POST   /api/projects/:id/branch     // Create feature branch
POST   /api/projects/:id/commit     // Commit changes
GET    /api/projects/:id/log        // Get commit history
POST   /api/projects/:id/merge      // Merge branches
```

### Impact on Existing Requirements

1. **FR8 Modified**: Orion uses DeepSeek + Git Service (not just DeepSeek)
2. **New FR**: Git Service must provide secure Git operations API
3. **TR9 Modified**: Cline-CLI integration only for Tester/Developer
4. **IN1 Modified**: DeepSeek API + Git Service integration for Orion

### Success Metrics Updated
- Git operations complete within 10 seconds
- Branch creation and management without errors
- No Git repository corruption
- Proper isolation between project repositories

### Next Steps
1. Implement Git Service prototype
2. Update Orion to use Git Service
3. Test end-to-end Git workflow
4. Update dashboard for Git integration

---
*Revision: 1.0*  
*Date: December 11, 2025*  
*Based on realization that Orion needs Git operations capability*
