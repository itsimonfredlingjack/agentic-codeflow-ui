// src/lib/safeCommand.ts
// Dev-friendly command parsing + safety policy (no shell injection).

import { parse } from 'shell-quote';
import {
  DEFAULT_DENY_PROGRAMS,
  DEFAULT_REQUIRE_PERMISSION_PROGRAMS,
  SAFE_ALLOW_PROGRAMS
} from './securityConfig';

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

// Still check for these as an extra safety layer against expansion attacks
// even though we don't run in a shell.
const DISALLOWED_SUBSTRINGS = [
  '$(',
  '${',
  '`', // command substitution / backticks
  '\n',
  '\r',
  '\0',
];

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

export function parseCommandLine(input: string): { ok: true; parsed: ParsedCommand } | { ok: false; error: string } {
  if (!isNonEmptyString(input)) return { ok: false, error: 'Empty command' };
  if (input.length > MAX_COMMAND_LENGTH) return { ok: false, error: 'Command too long' };

  let entries;
  try {
    entries = parse(input);
  } catch (e) {
    return { ok: false, error: 'Failed to parse command' };
  }

  // Check for shell operators (detected by shell-quote as objects like { op: '|' })
  const hasOperators = entries.some(e => typeof e !== 'string');
  if (hasOperators) {
    return { ok: false, error: 'Shell operators are not allowed' };
  }

  const argv = entries as string[];
  if (argv.length === 0) return { ok: false, error: 'Empty command' };

  // Environment variable assignments (e.g. VAR=val cmd) are parsed as separate args by shell-quote
  // But we treat the first non-assignment as the program.
  // Actually, shell-quote parses `VAR=val cmd` as `['VAR=val', 'cmd']`.
  // If we only support simple commands, we assume the first arg is the program.
  // If the user tries `VAR=val cmd`, `program` will be `VAR=val`.
  // This will likely fail the allow-list check, which is fine (safe).

  const [program, ...args] = argv;

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

  // Note: We removed the regex check for metachars because shell-quote handles them
  // (returning operators) and handles quoted strings correctly (e.g. echo "foo; bar").

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
