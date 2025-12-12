# TDD Coding Team System - Development Roadmap

## Overview
This roadmap outlines the step-by-step development of a JSON-based TDD automation system with three AI agents (Orion, Tara, Devon). The focus is **UI-first**, delivering visible value each week. Starting from an empty folder, we'll build incrementally.

**Target User**: Non-programmer who wants to automate coding tasks using AI agents.
**Core Philosophy**: Show working UI early, add AI capabilities progressively.

---

## Phase 1: Foundation & Chat UI (Week 1-2)
**Goal**: Get a working chat interface with Orion and basic Git integration.

### Week 1: Project Setup & Basic Chat
**Deliverable**: A web application where you can chat with Orion (DeepSeek AI) about coding tasks.

| Task | Description | Success Criteria |
|------|-------------|------------------|
| 1.1 | Create project structure | `mkdir` commands create all necessary directories |
| 1.2 | Set up Node.js Express backend | `npm install express` and server runs on port 3000 |
| 1.3 | Create empty JSON files | `projects.json`, `tasks.json`, `conversations/`, `state_rules.json` exist |
| 1.4 | Build basic Vue 3 + Tailwind CSS frontend | Browser shows "TDD Coding Team" header |
| 1.5 | Implement chat UI component | Chat bubbles appear, text input works |
| 1.6 | Create Cline wrapper script for Orion chat | Cline-CLI with GPT-4o processes messages, responses displayed |
| 1.7 | Store conversations in JSON | `conversations/project_P-001.json` saves project-scoped chat history |
| 1.8 | Add polling for new messages | Chat updates automatically every 10 seconds |
| 1.9 | Create default project structure | `projects.json` with "Project 1 TDD Team" exists |

**Week 1 Demo**: You can visit `http://localhost:3000`, type "How do I implement user login?" and get a response from Orion.

### Week 2: Git Integration & Task Basics
**Deliverable**: Git script to manage manual edits alongside Orion, plus task list UI.

| Task | Description | Success Criteria |
|------|-------------|------------------|
| 2.1 | Create `scripts/user-git-sync.sh` | Script runs without errors |
| 2.2 | Implement user-edits branch logic | Creates `user-edits/T-001-20251211` branch |
| 2.3 | Add Git conflict resolution in script | Script handles merge conflicts automatically |
| 2.4 | Create UI button to run Git script | Dashboard has "Sync My Changes" button |
| 2.5 | Build task list UI component | Shows empty "No tasks yet" message |
| 2.6 | Implement project-scoped task submission form | Text area + "Submit Task" button works, includes project selection |
| 2.7 | Connect task submission to backend | New tasks appear in `tasks.json` with `project_id: "P-001"` |
| 2.8 | Add task-specific chat storage | Conversations with `task_id` saved separately |

**Week 2 Demo**: 
1. You can submit a task "Add user authentication"
2. Click "Sync My Changes" to commit manual edits to a separate branch
3. See task appear in the dashboard
4. Chat about the specific task (conversation saved separately)

**Phase 1 Completion**: Working chat + basic task management + safe Git workflow.

---

## Phase 2: Task Decomposition & Approval (Week 3-4)
**Goal**: Orion analyzes tasks, breaks them down, and you approve the plan.

### Week 3: Task Analysis UI
**Deliverable**: Orion analyzes your requirements and asks clarification questions.

| Task | Description | Success Criteria |
|------|-------------|------------------|
| 3.1 | Enhance chat for task clarification | Orion asks "Should login support social auth?" |
| 3.2 | Build clarification Q/A interface | Questions appear with buttons for quick answers |
| 3.3 | Implement task decomposition logic | Orion breaks "user auth" into features/tasks |
| 3.4 | Create task approval UI | Shows "Implement login form" with Approve/Reject |
| 3.5 | Add task dependency visualization | Simple diagram showing task relationships |
| 3.6 | Store approved tasks in JSON | `tasks.json` includes `approved: true` flag |
| 3.7 | Implement task status badges | Green "approved", yellow "pending", red "blocked" |
| 3.8 | Add task search/filter | Filter by status, type, date |

**Week 3 Demo**: Submit task → Orion asks questions → You answer → Orion presents breakdown → You approve.

### Week 4: Subtask Creation & Git Branching
**Deliverable**: Orion creates 3-step subtasks and sets up Git branches.

| Task | Description | Success Criteria |
|------|-------------|------------------|
| 4.1 | Implement subtask generation | Task broken into ≤3-step subtasks |
| 4.2 | Create feature branch automatically | `git checkout -b feature/T-001` runs |
| 4.3 | Build subtask visualization UI | Shows test→implementation→test flow |
| 4.4 | Add subtask assignment logic | First test subtask assigned to Tara |
| 4.5 | Implement subtask status tracking | Subtask shows "assigned", "pending", "completed" |
| 4.6 | Create Git branch viewer in UI | Shows current branch, last commit, status |
| 4.7 | Add manual task adjustment from chat | "Apply chat to task" button updates task |
| 4.8 | Implement error handling for Git ops | Failed merges logged, user notified |

**Week 4 Demo**: Approved task → Orion creates subtasks → Creates Git branch → Shows subtask flow → You can adjust via chat.

**Phase 2 Completion**: Full task decomposition workflow with approval.

---

## Phase 3: TDD Agents (Week 5-6)
**Goal**: Tara writes failing tests, Devon implements code.

### Week 5: Tara - Test Generation
**Deliverable**: Automated test writing with Cline-CLI.

| Task | Description | Success Criteria |
|------|-------------|------------------|
| 5.1 | Set up Cline-CLI on machine | `cline --version` returns correctly |
| 5.2 | Create Tara agent script | `node agents/tara.js` runs continuously |
| 5.3 | Implement test generation logic | Cline-CLI writes failing Jest tests |
| 5.4 | Add test execution & validation | Tests run and confirm they fail (red phase) |
| 5.5 | Build test results UI | Shows "8 tests, 0 passed, 8 failed" |
| 5.6 | Implement test commit automation | `git commit -m "[Tara] Tests for login validation"` |
| 5.7 | Add test file viewer | Click to see generated test code |
| 5.8 | Create Tara health monitoring | Dashboard shows "Tara: Online" |

**Week 5 Demo**: Tara picks up assigned test subtask → writes failing tests → commits them → dashboard shows red tests.

### Week 6: Devon - Implementation
**Deliverable**: Automated code implementation to pass tests.

| Task | Description | Success Criteria |
|------|-------------|------------------|
| 6.1 | Create Devon agent script | `node agents/devon.js` runs continuously |
| 6.2 | Implement code generation logic | Cline-CLI writes code to pass tests |
| 6.3 | Add test execution (green phase) | Runs tests, verifies they pass |
| 6.4 | Build implementation results UI | Shows "8 tests, 8 passed, 0 failed" |
| 6.5 | Implement code commit automation | `git commit -m "[Devon] Implement login validation"` |
| 6.6 | Add code file viewer | Click to see implemented code |
| 6.7 | Create refactoring logic (optional) | Code cleaned up while keeping tests green |
| 6.8 | Add Devon health monitoring | Dashboard shows "Devon: Online" |

**Week 6 Demo**: Devon picks up implementation subtask → writes code → tests pass → commits → dashboard shows green tests.

**Phase 3 Completion**: Full TDD cycle automated (red → green).

---

## Phase 4: Coordination & Polish (Week 7-8)
**Goal**: Automatic task assignment and production readiness.

### Week 7: Wrapper & Continuous Flow
**Deliverable**: Automatic test→implementation→test coordination.

| Task | Description | Success Criteria |
|------|-------------|------------------|
| 7.1 | Create wrapper/coordinator script | Monitors `tasks.json` for changes |
| 7.2 | Implement automatic subtask assignment | Test complete → assigns to Devon |
| 7.3 | Add continuous TDD cycle logic | Implementation complete → assigns next test |
| 7.4 | Build coordination dashboard | Shows "Tara → Devon → Tara" flow visually |
| 7.5 | Implement error/retry logic | Failed subtasks retried 3 times |
| 7.6 | Add human intervention queue | Blocked tasks appear in "Needs Help" section |
| 7.7 | Create performance metrics | Shows "Avg. subtask time: 4.5 minutes" |
| 7.8 | Implement task completion handling | All subtasks done → ready for merge |

**Week 7 Demo**: Tara finishes test → wrapper auto-assigns to Devon → Devon finishes → wrapper assigns next test.

### Week 8: Merge, Monitoring & Polish
**Deliverable**: Production-ready system with monitoring.

| Task | Description | Success Criteria |
|------|-------------|------------------|
| 8.1 | Implement automatic merge logic | Orion merges feature branch when task complete |
| 8.2 | Add conflict resolution UI | Merge conflicts shown with resolution options |
| 8.3 | Create comprehensive logging | All actions logged to JSON with timestamps |
| 8.4 | Build system health dashboard | Shows all agents, disk space, API status |
| 8.5 | Implement backup/restore | JSON files backed up automatically |
| 8.6 | Add user documentation | Help section with screenshots |
| 8.7 | Performance optimization | JSON reads < 100ms, polling efficient |
| 8.8 | Final testing & bug fixes | End-to-end test of complete workflow |

**Week 8 Demo**: Task complete → Orion merges branch → cleanup → all logs available → system health visible.

**Phase 4 Completion**: Fully automated TDD coding team.

---

## Setup Instructions (Starting from Empty Folder)

### Initial Setup (Day 1)
```bash
# 1. Create project structure
mkdir tdd-coding-team
cd tdd-coding-team
mkdir -p data/conversations data/logs scripts agents backend frontend/src

# 2. Initialize JSON files
echo '{"projects": {"P-001": {"id": "P-001", "name": "Project 1 TDD Team", "description": "First project using TDD automation", "created_at": "'$(date -Iseconds)'", "updated_at": "'$(date -Iseconds)'"}}, "last_project_id": "P-001"}' > data/projects.json
echo '{"tasks": {}, "last_id": "P-001-T-000"}' > data/tasks.json
echo '{"conversations": []}' > data/conversations/project_P-001.json
echo '{"states": {}}' > data/state_rules.json

# 3. Setup backend
cd backend
npm init -y
npm install express
cd ..

# 4. Setup frontend
cd frontend
npm init -y
npm install vue @vue/server-renderer
npm install -D @vue/compiler-sfc vue-loader @tailwindcss/postcss tailwindcss postcss autoprefixer
npx tailwindcss init -p
cd ..
```

### Running the System
```bash
# Terminal 1: Backend
cd backend
node server.js

# Terminal 2: Frontend (after Week 1)
cd frontend
npm run dev

# Terminal 3: Orion agent (after Week 2)
cd agents
node orion.js

# Terminal 4: Tara agent (after Week 5)
node tara.js

# Terminal 5: Devon agent (after Week 6)
node devon.js

# Terminal 6: Wrapper (after Week 7)
node wrapper.js
```

---

## Success Metrics

### Phase 1 Success (Week 2)
- ✅ Chat with Orion about coding questions
- ✅ Submit a task and see it in dashboard
- ✅ Run Git sync script without errors
- ✅ Conversations saved in JSON

### Phase 2 Success (Week 4)
- ✅ Orion decomposes task into ≤3-step subtasks
- ✅ Approve/reject task breakdown via UI
- ✅ Git branches created automatically
- ✅ Task-specific chat working

### Phase 3 Success (Week 6)
- ✅ Tara writes failing tests automatically
- ✅ Devon implements code to pass tests
- ✅ Full TDD cycle (red → green) complete
- ✅ All commits properly tagged with agent names

### Phase 4 Success (Week 8)
- ✅ Wrapper coordinates test→implementation→test automatically
- ✅ Orion merges completed tasks
- ✅ System runs for 24 hours without crashing
- ✅ Dashboard shows real-time progress of multiple concurrent tasks

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Cline-CLI downtime/errors | Process monitoring, automatic retries, fallback prompt templates |
| Cline-CLI changes | Version pinning, regular compatibility checks |
| JSON file corruption | Atomic writes, regular backups, file locking |
| Git merge conflicts | Script-based resolution, manual override option |
| Agent process crashes | Process monitoring (PM2), auto-restart |
| Performance with many tasks | JSON file partitioning, indexing by task ID |

---

## Future Enhancements (Post-Roadmap)

1. **Multi-project support**: Work on multiple codebases simultaneously
2. **Team collaboration**: Multiple users, role-based access
3. **Advanced AI models**: Custom fine-tuned models for specific domains
4. **CI/CD integration**: Automatic deployment after successful tasks
5. **Mobile app**: iOS/Android app for monitoring on the go
6. **Plugin system**: Third-party extensions for additional tools

---

**Roadmap Version**: 1.0  
**Last Updated**: December 11, 2025  
**Based on**: `minimum_requirements_details.md` and user feedback

*This roadmap prioritizes UI-first delivery, giving you working software each week while building toward full automation.*
