const { spawn } = require('child_process');
const fs = require('fs');

const out = fs.openSync('./serve.log', 'a');
const err = fs.openSync('./serve.log', 'a');

const child = spawn('npm', ['run', 'serve'], {
  detached: true,
  stdio: ['ignore', out, err]
});

child.unref();
console.log(child.pid);
