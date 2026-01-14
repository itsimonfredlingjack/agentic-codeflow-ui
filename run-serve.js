// eslint-disable-next-line @typescript-eslint/no-require-imports
const { spawn } = require('child_process');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');

const out = fs.openSync('./serve.log', 'a');
const err = fs.openSync('./serve.log', 'a');

const child = spawn('npm', ['run', 'serve'], {
  detached: true,
  stdio: ['ignore', out, err]
});

child.unref();
console.log(child.pid);
