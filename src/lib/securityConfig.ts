export const DEFAULT_DENY_PROGRAMS = new Set([
  'rm',
  'rmdir',
  'dd',
  'mkfs',
  'shutdown',
  'reboot',
  'poweroff',
  'killall',
  'chmod',
  'chown',
  'sudo',
]);

export const DEFAULT_REQUIRE_PERMISSION_PROGRAMS = new Set([
  // Interpreters / shells - too powerful for free-form input
  'sh',
  'bash',
  'zsh',
  'fish',
  'node',
  'python',
  'python3',
  'deno',
  'ruby',
  'perl',
  // Networking tools (can exfiltrate / fetch)
  'curl',
  'wget',
  'ssh',
  'scp',
]);

export const SAFE_ALLOW_PROGRAMS = new Set([
  'npm',
  'npx',
  'git',
  'ls',
  'cat',
  'rg',
  'sed',
  'pwd',
  'echo',
]);
