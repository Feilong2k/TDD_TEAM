#!/usr/bin/env node

/**
 * Manual test for sending a task with context to a Cline instance via proxy.
 * The instance is specified in the JSON payload, not as a CLI flag.
 */

const http = require('http');
const url = require('url');

const proxyUrl = 'http://192.168.0.4:9001/orion'; // your proxy
const instance = '127.0.0.1:38937';               // target instance
const contextText = 'You are Orion, the orchestrator for TDD Team. We are a team of AI agents working for Lei.';
const prompt = 'Write a simple hello world function in JavaScript';

// CLI command to run on the instance (do NOT include --instance)
const clineCommand = [
  'cline',
  'task', 'new',
  '-y',
  prompt
];

console.log('Command array that will be sent to proxy:');
console.log(JSON.stringify(clineCommand, null, 2));

// Payload includes the instance and the CLI command
const postData = JSON.stringify({ 
  instance, 
  context: contextText,,
  clineCommand 
});

const proxyUrlParsed = url.parse(proxyUrl);
const options = {
  hostname: proxyUrlParsed.hostname,
  port: proxyUrlParsed.port,
  path: proxyUrlParsed.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('\nSending task to instance', instance, 'via proxy at', proxyUrl);

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('\n--- Response from proxy ---');
    console.log('Status:', res.statusCode);
    try {
      const parsed = JSON.parse(data);
      console.log('Exit Code:', parsed.exitCode);
      console.log('stdout:', parsed.stdout);
      console.log('stderr:', parsed.stderr);
      if (parsed.error) console.log('error:', parsed.error);
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (err) => {
  console.error('Request error:', err.message);
});

req.setTimeout(30000, () => {
  req.destroy();
  console.error('Timeout');
});

req.write(postData);
req.end();
