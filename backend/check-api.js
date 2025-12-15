const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/subtask/2-1-2',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('API Response for 2-1-2:');
      console.log(JSON.stringify(parsed, null, 2));
    } catch(e) {
      console.error('Parse error:', e.message);
    }
  });
});

req.on('error', (e) => console.error('Request error:', e.message));
req.end();
