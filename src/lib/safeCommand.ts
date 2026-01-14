// src/lib/safeCommand.ts
// Dev-friendly command parsing + safety policy (no shell injection).

export type ParsedCommand = {
  original: string;
  program: string;
  args: string[];
};

export type CommandDecision =
  | { kind: 'allow'; parsed: ParsedCommand }
  | { kind: 'require_permission'; parsed: ParsedCommand; reason: string }
  | { kind: 'deny'; reason: string };

const MAX_COMMAND_LENGTH = 4_000;

const SHELL_METACHAR_RE = /[;&|<>]/;
const DISALLOWED_SUBSTRINGS = [
  '$(',
  '${',
  '`', // command substitution / backticks
  '\n',
  '\r',
  '\0',
];

const DEFAULT_DENY_PROGRAMS = new Set([
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

const DEFAULT_REQUIRE_PERMISSION_PROGRAMS = new Set([
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

const SAFE_ALLOW_PROGRAMS = new Set([
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

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

function containsDisallowedSubstring(input: string) {
  return DISALLOWED_SUBSTRINGS.some((token) => input.includes(token));
}

function looksLikePathTraversal(arg: string) {
  if (arg.includes('..')) return true;
  if (arg.startsWith('~')) return true;
  if (arg.startsWith('/etc')) return true;
  if (arg.startsWith('/proc')) return true;
  if (arg.startsWith('/sys')) return true;
  return false;
}

/**
 * Minimal argv tokenizer with support for single and double quotes.
 * - Rejects unbalanced quotes
 * - Does not implement shell expansions (and we block most shell metacharacters anyway)
 */
export function tokenizeCommandLine(input: string): { ok: true; argv: string[] } | { ok: false; error: string } {
  if (!isNonEmptyString(input)) return { ok: false, error: 'Empty command' };
  if (input.length > MAX_COMMAND_LENGTH) return { ok: false, error: 'Command too long' };

  const argv: string[] = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;
  let escaping = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (escaping) {
      current += ch;
      escaping = false;
      continue;
    }

    if (ch === '\\' && !inSingle) {
      escaping = true;
      continue;
    }

    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }

    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }

    if (!inSingle && !inDouble && /\s/.test(ch)) {
      if (current) {
        argv.push(current);
        current = '';
      }
      continue;
    }

    current += ch;
  }

  if (escaping) return { ok: false, error: 'Invalid trailing escape' };
  if (inSingle || inDouble) return { ok: false, error: 'Unbalanced quotes' };
  if (current) argv.push(current);

  return { ok: true, argv };
}

export function parseCommandLine(input: string): { ok: true; parsed: ParsedCommand } | { ok: false; error: string } {
  const tokenized = tokenizeCommandLine(input);
  if (!tokenized.ok) return tokenized;
  const [program, ...args] = tokenized.argv;
  if (!program) return { ok: false, error: 'Missing program' };
  return { ok: true, parsed: { original: input, program, args } };
}

/**
 * Dev-friendly policy:
 * - Deny obvious shell injection or destructive tools
 * - Allow common dev workflows (npm/npx/git/rg/etc.)
 * - Require explicit permission for "power tools" (shells, interpreters, network tools)
 */
export function decideCommand(input: string): CommandDecision {
  if (!isNonEmptyString(input)) return { kind: 'deny', reason: 'Empty command' };
  const trimmed = input.trim();

  if (containsDisallowedSubstring(trimmed)) {
    return { kind: 'deny', reason: 'Shell expansion/substitution is not allowed' };
  }

  if (SHELL_METACHAR_RE.test(trimmed)) {
    return { kind: 'deny', reason: 'Shell operators are not allowed (no pipes/redirects/&&/;)' };
  }

  const parsed = parseCommandLine(trimmed);
  if (!parsed.ok) return { kind: 'deny', reason: parsed.error };

  const program = parsed.parsed.program;

  if (DEFAULT_DENY_PROGRAMS.has(program)) {
    return { kind: 'deny', reason: `Program "${program}" is not allowed` };
  }

  if (DEFAULT_REQUIRE_PERMISSION_PROGRAMS.has(program)) {
    return { kind: 'require_permission', parsed: parsed.parsed, reason: `Program "${program}" requires permission` };
  }

  if (!SAFE_ALLOW_PROGRAMS.has(program)) {
    return { kind: 'require_permission', parsed: parsed.parsed, reason: `Unknown program "${program}" requires permission` };
  }

  // Light path-hardening: require permission if args look like traversal/outside access.
  if (parsed.parsed.args.some(looksLikePathTraversal)) {
    return { kind: 'require_permission', parsed: parsed.parsed, reason: 'Suspicious path argument requires permission' };
  }

  // NPM: allow common safe-ish subcommands without prompting.
  if (program === 'npm') {
    const [sub] = parsed.parsed.args;
    const allowedNpmSubcommands = new Set(['run', 'ci', 'install', 'start', 'test']);
    if (!sub || !allowedNpmSubcommands.has(sub)) {
      return { kind: 'require_permission', parsed: parsed.parsed, reason: 'npm subcommand requires permission' };
    }
  }

  // NPX: allow common dev tooling, prompt for everything else.
  if (program === 'npx') {
    const [tool] = parsed.parsed.args;
    const allowedTools = new Set(['tsc', 'eslint']);
    if (!tool || !allowedTools.has(tool)) {
      return { kind: 'require_permission', parsed: parsed.parsed, reason: 'npx tool requires permission' };
    }
  }

  // Git: allow read-only-ish defaults; prompt for anything that looks like it writes.
  if (program === 'git') {
    const [sub] = parsed.parsed.args;
    const allowedGitReadOnly = new Set(['status', 'diff', 'log', 'show', 'grep', 'rev-parse', 'branch']);
    if (!sub || !allowedGitReadOnly.has(sub)) {
      return { kind: 'require_permission', parsed: parsed.parsed, reason: 'git subcommand requires permission' };
    }
  }

  return { kind: 'allow', parsed: parsed.parsed };
}
