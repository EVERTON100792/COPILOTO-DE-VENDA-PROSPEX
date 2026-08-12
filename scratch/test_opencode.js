const fs = require('fs');

const key = process.env.VITE_AI_API_KEY || 'REPLACE_ME';

console.log('Testing key format:', key.slice(0, 15));

// Check if opencode desktop or CLI is running locally
const ports = [3000, 3001, 4000, 4096, 5000, 7000, 8000, 8080, 11434, 1234];

async function checkLocalPorts() {
  for (const port of ports) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/v1/models`);
      console.log(`Port ${port} /v1/models -> Status: ${res.status}`);
    } catch {
      // closed port
    }
  }
}

checkLocalPorts();
