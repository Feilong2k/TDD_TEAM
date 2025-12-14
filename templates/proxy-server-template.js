#!/usr/bin/env node

const express = require('express');
const { spawn } = require('child_process');

const app = express();
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Orion Proxy',
    version: '1.1.0',
    timestamp: new Date().toISOString()
  });
});

// Ensure default instance exists and is running
function ensureDefaultInstance() {
  return new Promise((resolve, reject) => {
    const check = spawn('cline', ['instance', 'list']);
    let output = '';
    check.stdout.on('data', (data) => output += data.toString());
    check.stderr.on('data', (data) => console.error('Instance check stderr:', data.toString()));

    check.on('close', (code) => {
      // Check if any instance is running (output contains an address)
      if (output.includes('127.0.0.1')) {
        return resolve(); // An instance is already running
      }

      console.log('No instance running, creating default instance...');
      const start = spawn('cline', ['instance', 'new', '--default']);
      start.stdout.on('data', (data) => console.log('Creating instance:', data.toString()));
      start.stderr.on('data', (data) => console.error('Instance creation stderr:', data.toString()));
      start.on('close', (code) => {
        if (code === 0) {
          console.log('Default instance created.');
          resolve();
        } else {
          reject(new Error(`Failed to create default instance, exit code ${code}`));
        }
      });
      start.on('error', (err) => reject(err));
    });

    check.on('error', (err) => reject(err));
  });
}

// Set context on the default instance
function setInstanceContext(context) {
  return new Promise((resolve, reject) => {
    if (!context) return resolve();

    console.log('Setting context on default instance...');
    // We don't specify --instance because we rely on the default instance
    const setCtx = spawn('cline', ['context', 'add', context]);
    setCtx.stdout.on('data', (data) => console.log('Context stdout:', data.toString()));
    setCtx.stderr.on('data', (data) => console.error('Context stderr:', data.toString()));
    setCtx.on('close', (code) => {
      if (code === 0) {
        console.log('Context added successfully.');
        resolve();
      } else {
        reject(new Error(`Failed to add context, exit code ${code}`));
      }
    });
    setCtx.on('error', (err) => reject(err));
  });
}

// Execute the CLI command
function executeClineCommand(clineCommand) {
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${clineCommand.join(' ').substring(0, 150)}...`);

    const child = spawn(clineCommand[0], clineCommand.slice(1), {
      timeout: 60000,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => stdout += data.toString());
    child.stderr.on('data', (data) => stderr += data.toString());

    child.on('close', (code) => resolve({ code, stdout: stdout.trim(), stderr: stderr.trim() }));
    child.on('error', (err) => reject(err));
  });
}

// Main endpoint
app.post('/orion', async (req, res) => {
  const { context, clineCommand } = req.body;

  if (!clineCommand) {
    return res.status(400).json({ error: 'Missing required field: clineCommand' });
  }
  if (!Array.isArray(clineCommand) || clineCommand[0] !== 'cline') {
    return res.status(400).json({ error: 'Invalid clineCommand format. Must be array starting with "cline"' });
  }

  try {
    await ensureDefaultInstance();
    await setInstanceContext(context);
    const result = await executeClineCommand(clineCommand);
    res.json({
      exitCode: result.code,
      stdout: result.stdout,
      stderr: result.stderr,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Proxy execution failed', message: err.message });
  }
});

// Start server
const PORT = 9001;
app.listen(PORT, () => {
  console.log(`Orion proxy listening on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Orion endpoint: POST http://localhost:${PORT}/orion`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down Orion proxy...');
  process.exit(0);
});
