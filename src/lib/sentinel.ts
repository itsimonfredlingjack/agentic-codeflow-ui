
const ALLOWED_COMMANDS = [
    'npm install',
    'npm run',
    'git status',
    'git add',
    'git commit',
    'ls',
    'echo',
    'mkdir',
    'touch'
];

const BLOCKED_PATTERNS = [
    'rm -rf',
    'sudo',
    'chmod',
    'chown',
    '> /dev/',
    '| bash'
];

export interface PolicyCheckResult {
    allowed: boolean;
    reason?: string;
}

export function checkCommand(command: string): PolicyCheckResult {
    const normalized = command.trim();

    // 1. Check Blocklist (Explicit Danger)
    for (const pattern of BLOCKED_PATTERNS) {
        if (normalized.includes(pattern)) {
            return { allowed: false, reason: `Blocked by Security Policy: Contains restricted pattern '${pattern}'` };
        }
    }

    // 2. Check Whitelist (Safe Prefixes)
    const isAllowed = ALLOWED_COMMANDS.some(prefix => normalized.startsWith(prefix));

    if (!isAllowed) {
        return { allowed: false, reason: 'Command not in approved whitelist.' };
    }

    return { allowed: true };
}
