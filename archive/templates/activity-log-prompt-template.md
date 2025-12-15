# Activity Log Prompt Templates for Agents

## Overview
This document provides ready-to-use commands for Tara and Devon to update activity logs via the `POST /api/subtask/:subtaskId/activity` API endpoint. These are temporary, simple solutions that work with the current MVP.

## Prerequisites
1. Ensure the backend server is running on `localhost:3000`
2. Verify the subtask ID you're updating exists

## General Template

```bash
node -e "
const http = require('http');
const data = JSON.stringify({
  type: '[ACTIVITY_TYPE]',
  agent: '[AGENT_NAME]',
  content: '[YOUR_MESSAGE]',
  status: '[STATUS]',
  parent_id: null,
  attachments: [],
  metadata: {}
});
const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/subtask/[SUBTASK_ID]/activity',
  method: 'POST',
  headers: {'Content-Type': 'application/json'}
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', body);
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('✅ Activity logged successfully');
    } else {
      console.log('❌ Failed to log activity');
    }
  });
});
req.on('error', (e) => console.error('Error:', e.message));
req.write(data);
req.end();
"
```

## Specific Templates

### 1. Test Result (for Tara)

```bash
node -e "
const http = require('http');
const data = JSON.stringify({
  type: 'test_result',
  agent: 'Tara',
  content: 'Wrote [NUMBER] tests for subtask [SUBTASK_ID]. All tests pass/fail.',
  status: 'resolved',
  parent_id: null,
  attachments: [],
  metadata: { test_count: [NUMBER], coverage: '[COVERAGE_LEVEL]' }
});
const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/subtask/[SUBTASK_ID]/activity',
  method: 'POST',
  headers: {'Content-Type': 'application/json'}
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', body);
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('✅ Test results logged successfully');
    } else {
      console.log('❌ Failed to log test results');
    }
  });
});
req.on('error', (e) => console.error('Error:', e.message));
req.write(data);
req.end();
"
```

### 2. Progress Update (for Devon)

```bash
node -e "
const http = require('http');
const data = JSON.stringify({
  type: 'progress_update',
  agent: 'Devon',
  content: 'Implemented [FEATURE] for subtask [SUBTASK_ID].',
  status: 'in_progress',
  parent_id: null,
  attachments: [],
  metadata: { files_modified: ['[FILE1]', '[FILE2]'], lines_added: [NUMBER] }
});
const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/subtask/[SUBTASK_ID]/activity',
  method: 'POST',
  headers: {'Content-Type': 'application/json'}
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', body);
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('✅ Progress update logged successfully');
    } else {
      console.log('❌ Failed to log progress update');
    }
  });
});
req.on('error', (e) => console.error('Error:', e.message));
req.write(data);
req.end();
"
```

### 3. Clarification Question (for any agent)

```bash
node -e "
const http = require('http');
const data = JSON.stringify({
  type: 'clarification_question',
  agent: '[AGENT_NAME]',
  content: '[YOUR_QUESTION]',
  status: 'open',
  parent_id: null,
  attachments: [],
  metadata: { question_type: '[TYPE]', urgency: '[LOW/MEDIUM/HIGH]' }
});
const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/subtask/[SUBTASK_ID]/activity',
  method: 'POST',
  headers: {'Content-Type': 'application/json'}
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', body);
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('✅ Question logged successfully');
    } else {
      console.log('❌ Failed to log question');
    }
  });
});
req.on('error', (e) => console.error('Error:', e.message));
req.write(data);
req.end();
"
```

### 4. CDP Analysis (for Tara or Orion)

```bash
node -e "
const http = require('http');
const data = JSON.stringify({
  type: 'cdp_analysis',
  agent: '[AGENT_NAME]',
  content: 'Completed CDP analysis for subtask [SUBTASK_ID].',
  status: 'resolved',
  parent_id: null,
  attachments: [],
  metadata: {
    atomic_actions: [NUMBER],
    resources_touched: [NUMBER],
    physical_constraints: [NUMBER],
    test_scenarios: [NUMBER]
  }
});
const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/subtask/[SUBTASK_ID]/activity',
  method: 'POST',
  headers: {'Content-Type': 'application/json'}
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', body);
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('✅ CDP analysis logged successfully');
    } else {
      console.log('❌ Failed to log CDP analysis');
    }
  });
});
req.on('error', (e) => console.error('Error:', e.message));
req.write(data);
req.end();
"
```

## Usage Instructions

1. **Copy** the appropriate template
2. **Replace** the bracketed placeholders:
   - `[SUBTASK_ID]`: The subtask ID (e.g., `1-1-2`)
   - `[AGENT_NAME]`: `Tara` or `Devon`
   - `[YOUR_MESSAGE]`: The actual content of the activity
   - `[STATUS]`: `open`, `answered`, `resolved`, or `escalated`
   - Other metadata fields as needed
3. **Run** the command in your terminal

## Notes
- This is a temporary solution for the MVP
- The backend server must be running on port 3000
- Always verify the response status code
- For errors, check that the subtask file exists in `data/subtasks/`
