# Minimum Requirements Details for TDD Coding Team

## 1. System Overview
- **Objective**: Automate Test-Driven Development (TDD) workflows using three AI agents (Orion, Tara, Devon) with JSON‑based state management.
- **Architecture**: Three agent processes (Orchestrator, Tester, Developer) plus a wrapper/coordinator and a web dashboard. No external databases; all state stored in JSON files.
- **Deployment**: Can run on a single machine or across multiple machines sharing a common directory (via network mount). Each agent is a standalone process.
- **AI Models**:
  - **Orion**: Uses Cline‑CLI with GPT‑4o for task analysis and decomposition.
  - **Tara & Devon**: Use Cline‑CLI with GPT‑4o‑mini for test generation and code implementation.
- **State Management**: JSON files (`tasks.json`, `state_rules.json`, logs) are the single source of truth. Agents read/write these files directly.
- **Coordination**: Wrapper process monitors JSON state changes and triggers agent assignments.
- **Dashboard**: Simple Vue 3 + Tailwind CSS frontend that polls the backend for updates.

## 2. Functional Requirements

### 2.1 Orion (Orchestrator)
- **FR‑OR‑1**: Accept a user requirement (text) via dashboard or API and store it in `tasks.json`.
- **FR‑OR‑2**: Use Cline‑CLI with GPT‑4o to analyze the requirement, ask clarification questions, and store the conversation in a JSON log.
- **FR‑OR‑3**: After clarification, break the requirement into features and tasks; present them in the dashboard for user review/approval.
- **FR‑OR‑4**: Once approved, decompose each task into subtasks with ≤3 steps. Store subtasks in `tasks.json` with dependencies.
- **FR‑OR‑5**: Create a Git feature branch for the task (using a script wrapper around `git`).
- **FR‑OR‑6**: Assign the first test subtask to Tara by updating the subtask’s `assigned_to` field and status in `tasks.json`.
- **FR‑OR‑7**: Handle clarification requests from Tara or Devon (store Q/A in JSON, re‑analyze if needed).
- **FR‑OR‑8**: When a subtask completes, ensure its status is updated (either by the agent or by Orion) and rely on the wrapper to assign the next available subtask (test→implementation→test…).
- **FR‑OR‑9**: After all subtasks are done, merge the feature branch (or handle conflicts) and clean up.

### 2.2 Tara (Tester)
- **FR‑TA‑1**: Poll `tasks.json` for subtasks where `type: "test"`, `assigned_to: "tara"`, and `status: "pending"`.
- **FR‑TA‑2**: For each assigned subtask, read its context (description, related files) from JSON.
- **FR‑TA‑3**: Use Cline‑CLI (GPT‑4o‑mini) to generate failing tests for the requirement. The CLI command must be wrapped in a script that captures output.
- **FR‑TA‑4**: If the requirement is unclear, ask Orion for clarification (write a clarification request to a JSON queue).
- **FR‑TA‑5**: After tests are written, run them to confirm they fail (red phase). Record the test output in the subtask’s `result` field.
- **FR‑TA‑6**: Commit the test code to the task’s Git branch (scripted `git add`, `git commit`).
- **FR‑TA‑7**: Update the subtask’s status to `completed` and write the commit hash, file list, and test results to `tasks.json`.
- **FR‑TA‑8**: Notify the wrapper (or directly update a coordination flag) that the test is ready for development.

### 2.3 Devon (Developer)
- **FR‑DE‑1**: Poll `tasks.json` for subtasks where `type: "implementation"`, `assigned_to: "devon"`, and `status: "pending"`.
- **FR‑DE‑2**: Pull the latest code from the task’s Git branch (including Tara’s tests).
- **FR‑DE‑3**: Use Cline‑CLI (GPT‑4o‑mini) to implement the minimum code needed to pass the failing tests (green phase).
- **FR‑DE‑4**: Run the tests to verify they pass; if not, iterate until green.
- **FR‑DE‑5**: Optionally refactor the code while keeping tests green.
- **FR‑DE‑6**: Commit the implementation code to the same branch (scripted `git add`, `git commit`).
- **FR‑DE‑7**: Update the subtask’s status to `completed` and write the commit hash, file list, and test results to `tasks.json`.
- **FR‑DE‑8**: Notify the wrapper that the implementation is complete.

### 2.4 Wrapper / Coordinator
- **FR‑WR‑1**: Monitor `tasks.json` for state changes (e.g., via file watching or periodic polling).
- **FR‑WR‑2**: When a test subtask is completed by Tara, automatically assign the corresponding implementation subtask to Devon (update `assigned_to` and status in `tasks.json`).
- **FR‑WR‑3**: When an implementation subtask is completed by Devon, check if there are more test subtasks; if so, assign the next available test subtask to Tara (update `assigned_to` and status in `tasks.json`).
- **FR‑WR‑6**: Handle the continuous TDD cycle assignment: test→implementation→test→implementation until all subtasks are complete.
- **FR‑WR‑4**: If a subtask fails (tests not passing after several attempts), flag it for human review (write to an `errors.json` log).
- **FR‑WR‑5**: Provide a simple health‑check endpoint or log to confirm all agents are alive.

### 2.5 Dashboard (Web Interface)
- **FR‑DS‑1**: Show a list of all tasks with their current status (pending, in‑progress, completed, blocked).
- **FR‑DS‑2**: Allow the user to submit a new requirement via a text box; the requirement is sent to the backend and stored in `tasks.json`.
- **FR‑DS‑3**: Display the clarification conversation between Orion and the user, and allow the user to respond.
- **FR‑DS‑4**: Present the decomposed features/tasks for review and approval; provide Approve/Reject buttons.
- **FR‑DS‑5**: Show real‑time progress of each subtask (who is working on it, Git commit hashes, test results).
- **FR‑DS‑6**: Provide a simple chat interface for the user to communicate with Orion (questions, adjustments).
- **FR‑DS‑7**: Display any conflicts or errors that require human intervention.
- **FR‑DS‑8**: Poll the backend every 10‑30 seconds for updates (no WebSocket required).

## 3. Technical Requirements

### 3.1 Backend (Node.js Express)
- **TR‑BE‑1**: Provide REST endpoints for the dashboard to submit requirements, get task lists, and post user responses.
- **TR‑BE‑2**: All endpoints must read/write JSON files directly (no database). Use file‑locking (e.g., `fs‑extra` with lockfile) to avoid corruption.
- **TR‑BE‑3**: Include a simple script‑execution service that can run Cline‑CLI and Git commands safely.
- **TR‑BE‑4**: Log all actions (API calls, agent activities) to timestamped JSON files in a `logs/` directory.
- **TR‑BE‑5**: Serve static files for the Vue frontend.

### 3.2 Frontend (Vue 3 + Tailwind CSS)
- **TR‑FE‑1**: Single‑page application with a responsive layout (works on desktop and tablet).
- **TR‑FE‑2**: Use Axios or Fetch to communicate with the backend REST API.
- **TR‑FE‑3**: Display task status with color‑coded badges (green for completed, yellow for in‑progress, red for blocked).
- **TR‑FE‑4**: Implement a simple polling mechanism (setInterval) to refresh task lists and messages.
- **TR‑FE‑5**: Use Vue components for task list, task submission, and chat panels.

### 3.3 JSON File Schema
- **TR‑JSON‑1**: `tasks.json` – main state file. Structure must include:
  ```json
  {
    "tasks": {
      "P‑001‑T‑001": {
        "id": "P‑001‑T‑001",
        "project_id": "P‑001",
        "description": "User requirement text",
        "status": "pending|assigned|in‑progress|completed|blocked",
        "created_at": "ISO‑8601",
        "updated_at": "ISO‑8601",
        "subtasks": [
          {
            "id": "P‑001‑T‑001‑ST‑001",
            "description": "Subtask description",
            "type": "test|implementation",
            "status": "pending|assigned|in‑progress|completed|blocked",
            "assigned_to": "tara|devon",
            "result": {
              "commit_hash": "abc123",
              "files": ["path/to/file.js"],
              "test_results": { "total": 5, "passed": 5, "failed": 0 }
            }
          }
        ],
        "git_branch": "feature/P‑001‑T‑001",
        "conversation": [
          { "role": "orion", "content": "Clarification question" },
          { "role": "user", "content": "Answer" }
        ]
      }
    },
    "last_id": "P‑001‑T‑001"
  }
  ```
- **TR‑JSON‑5**: `projects.json` – project metadata file. Structure must include:
  ```json
  {
    "projects": {
      "P‑001": {
        "id": "P‑001",
        "name": "Project 1 TDD Team",
        "description": "First project using TDD automation",
        "created_at": "ISO‑8601",
        "updated_at": "ISO‑8601"
      }
    },
    "last_project_id": "P‑001"
  }
  ```
- **TR‑JSON‑2**: `state_rules.json` – defines allowed state transitions and optional scripts to run on transitions.
- **TR‑JSON‑3**: `logs/` directory – separate JSON files per day or per task for audit trails.
- **TR‑JSON‑4**: All JSON files must be human‑readable (pretty‑printed with indentation).

### 3.4 State Management
- **TR‑STATE‑1**: State transitions must be validated against `state_rules.json`. For example, a subtask cannot go from `pending` directly to `completed`.
- **TR‑STATE‑2**: On every state change, a log entry is appended to the task’s history (within the JSON) and to a global log file.
- **TR‑STATE‑3**: If a script is defined for a transition (e.g., `on_enter_assigned`), the wrapper must execute it (e.g., a shell script that notifies an agent).

### 3.5 Script Requirements
- **TR‑SCRIPT‑1**: Each agent (Orion, Tara, Devon) is a Node.js script that loops indefinitely, polling JSON files and executing CLI commands.
- **TR‑SCRIPT‑2**: Git operations must be wrapped in scripts that handle errors (e.g., merge conflicts) and write results back to JSON.
- **TR‑SCRIPT‑3**: Cline‑CLI commands must be templated so that the agent can inject the subtask description and context.
- **TR‑SCRIPT‑4**: All scripts must log their stdout/stderr to a dedicated log file in `logs/`.

## 4. Workflow‑Specific Requirements

### 4.1 Task Decomposition Workflow
1. User submits requirement → backend writes to `tasks.json` with status `pending`.
2. Orion process picks up pending tasks, uses Cline‑CLI (GPT‑4o) to analyze, and writes clarification questions to `tasks.json`.
3. Dashboard shows questions, user answers → answer stored in `tasks.json`.
4. Orion decomposes requirement into features/tasks, writes them to `tasks.json` with status `awaiting_review`.
5. User reviews tasks in dashboard, clicks Approve → status changes to `approved`.
6. Orion breaks each approved task into ≤3‑step subtasks, writes them to `tasks.json`, creates Git branch.
7. Orion assigns first test subtask to Tara (status `assigned`).

### 4.2 TDD Execution Workflow
1. Tara polls for assigned test subtasks, runs Cline‑CLI to generate failing tests.
2. Tara runs the tests to confirm they fail, commits the test code, updates subtask status to `completed`.
3. Wrapper notices the completion (via monitoring `tasks.json`), assigns the corresponding implementation subtask to Devon.
4. Devon pulls the branch, writes implementation code to pass tests, commits, updates subtask status.
5. Wrapper checks for next test subtask, assigns to Tara, and the cycle repeats until all subtasks are done.
6. After final subtask, Orion merges the branch (or handles conflicts) and marks the whole task `completed`.

### 4.3 Git Integration Workflow
1. Orion creates a feature branch: `git checkout -b feature/P‑001‑T‑001`.
2. Tara and Devon always work on that branch: `git checkout feature/P‑001‑T‑001` before starting a subtask.
3. Each agent commits with a consistent message format: `[Agent] [Subtask‑ID] Brief description`.
4. Orion attempts to merge the branch when the task is complete: `git merge feature/P‑001‑T‑001`.
5. If merge fails, Orion logs the conflict in `tasks.json` and notifies the dashboard for manual resolution.

## 5. Non‑Functional Requirements

### 5.1 Performance
- **NFR‑PER‑1**: Dashboard updates within 10 seconds of a state change (polling interval ≤10 s).
- **NFR‑PER‑2**: Task decomposition by Orion should complete within 60 seconds (including API calls).
- **NFR‑PER‑3**: Agent subtask execution (test generation or implementation) should complete within 5 minutes.
- **NFR‑PER‑4**: JSON file reads/writes must not block for more than 100 ms under normal load.

### 5.2 Reliability
- **NFR‑REL‑1**: No silent overwrites of JSON data; use file locking or atomic writes (write to temp file then rename).
- **NFR‑REL‑2**: If an agent crashes, it should restart and resume from the last known state (idempotent operations).
- **NFR‑REL‑3**: Git operations must be atomic and logged; if a commit fails, the subtask status must reflect the error.
- **NFR‑REL‑4**: All external API calls (Cline‑CLI) must have timeouts and retries (max 3 attempts).

### 5.3 Security
- **NFR‑SEC‑1**: JSON files containing sensitive data (e.g., Git credentials) must be kept outside the web‑accessible directory.
- **NFR‑SEC‑2**: All shell commands executed by scripts must sanitize inputs to prevent injection.
- **NFR‑SEC‑3**: The dashboard must not expose internal file paths or system details.
- **NFR‑SEC‑4**: Use environment variables for API keys and credentials; never hard‑code them.

### 5.4 Usability
- **NFR‑USAB‑1**: Dashboard must be intuitive enough for a non‑technical user to submit a requirement and review tasks.
- **NFR‑USAB‑2**: Task status should be clearly visualized with icons and colors.
- **NFR‑USAB‑3**: Error messages must be plain English, indicating what went wrong and how to recover.
- **NFR‑USAB‑4**: The system should require minimal setup (clone repo, run `npm install`, start processes).

## 6. Integration Requirements

### 6.1 External Services
- **INT‑1**: Cline‑CLI with GPT‑4o for Orion’s task analysis and clarification.
- **INT‑2**: Cline‑CLI installed on the same machine, configured with GPT‑4o‑mini for Tara and Devon.
- **INT‑3**: Git repository (local or remote) that all agents can read/write.
- **INT‑4**: (Optional) Remote storage for JSON state files if agents run on separate machines (e.g., NFS mount).

### 6.2 Development Tools
- **INT‑5**: Jest (or similar) for running tests generated by Tara.
- **INT‑6**: ESLint/Prettier for code quality checks (can be run as part of the agent’s commit script).
- **INT‑7**: Simple logging/monitoring (e.g., `tail -f` on log files) for debugging.

## 7. JSON Schema Requirements (Examples)

### 7.1 `tasks.json` (abbreviated)
```json
{
  "tasks": {
    "P‑001‑T‑001": {
      "id": "P‑001‑T‑001",
      "project_id": "P‑001",
      "description": "Implement user login with email and password",
      "status": "in‑progress",
      "created_at": "2025‑12‑11T10:00:00Z",
      "updated_at": "2025‑12‑11T10:05:00Z",
      "subtasks": [
        {
          "id": "P‑001‑T‑001‑ST‑01",
          "description": "Write tests for login form validation",
          "type": "test",
          "status": "completed",
          "assigned_to": "tara",
          "result": {
            "commit_hash": "a1b2c3d",
            "files": ["tests/login.test.js"],
            "test_results": { "total": 8, "passed": 0, "failed": 8 }
          }
        },
        {
          "id": "P‑001‑T‑001‑ST‑02",
          "description": "Implement login form validation",
          "type": "implementation",
          "status": "assigned",
          "assigned_to": "devon",
          "result": null
        }
      ],
      "git_branch": "feature/P‑001‑T‑001",
      "conversation": [
        { "role": "orion", "content": "Should the login support social logins?" },
        { "role": "user", "content": "No, only email/password for now." }
      ]
    }
  },
  "last_id": "P‑001‑T‑001"
}
```

### 7.2 `state_rules.json`
```json
{
  "states": {
    "pending": {
      "allowed_transitions": ["assigned", "cancelled"],
      "on_enter": "scripts/on_pending.sh"
    },
    "assigned": {
      "allowed_transitions": ["in‑progress", "failed"],
      "on_enter": "scripts/notify_agent.sh"
    },
    "in‑progress": {
      "allowed_transitions": ["completed", "failed", "blocked"]
    },
    "completed": {
      "allowed_transitions": [],
      "on_enter": "scripts/cleanup.sh"
    }
  }
}
```

## 8. Success Criteria
- **SC‑1**: A user can submit a requirement, get clarifications, approve decomposed tasks, and see the system automatically write tests and implement code without human coding.
- **SC‑2**: The entire TDD cycle (test red → implementation green) completes for a simple task (e.g., a single function) within 10 minutes.
- **SC‑3**: JSON state files remain consistent even if two agents try to update simultaneously (no corruption).
- **SC‑4**: Dashboard reflects the current state within 10 seconds of any change.
- **SC‑5**: Generated code passes all generated tests and follows basic code style (linted).

## 9. Constraints
- **CON‑1**: Must use JSON files for state; no external databases allowed.
- **CON‑2**: Must run on a single Linux/macOS machine (or multiple machines with shared storage).
- **CON‑3**: Agents must be separate processes (can be PM2, systemd, or simple background scripts).
- **CON‑4**: Git must be used for version control; agents must not break the repository.
- **CON‑5**: Total cost of AI API calls (Cline‑CLI GPT‑4o + GPT‑4o‑mini) must be below $X per month (to be defined).

## 10. Assumptions
- **ASM‑1**: The user has basic Git knowledge and can resolve merge conflicts if needed.
- **ASM‑2**: The codebase is in JavaScript/Node.js (or another language that Jest and Cline‑CLI can handle).
- **ASM‑3**: The system will be used for small‑ to medium‑sized tasks (≤20 subtasks per requirement).
- **ASM‑4**: Network and API services (Cline‑CLI, Git remote) are stable and have low latency.
- **ASM‑5**: The machine has sufficient resources to run three agent processes plus the backend and frontend.

---
*Version: 1.0*  
*Date: December 11, 2025*  
*Based on Minimum_Requirements.md and barebone JSON‑script architecture.*
