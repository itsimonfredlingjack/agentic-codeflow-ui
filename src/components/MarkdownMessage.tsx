"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy, Play, Zap, FileCode2, FileJson, Terminal, Palette, Code2, Braces, FileCode } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { agencyClient } from '@/lib/client';
import type { AgentIntent } from '@/types';
import { ThinkingBlock } from './ThinkingBlock';

// Parse thinking blocks from content
function parseThinkingBlocks(content: string): { thinking: string | null; rest: string } {
    const thinkingRegex = /<thinking>([\s\S]*?)<\/thinking>/gi;
    const matches = content.match(thinkingRegex);

    if (!matches || matches.length === 0) {
        return { thinking: null, rest: content };
    }

    // Extract thinking content (without tags)
    const thinkingContent = matches
        .map(match => match.replace(/<\/?thinking>/gi, '').trim())
        .join('\n');

    // Remove thinking blocks from content
    const rest = content.replace(thinkingRegex, '').trim();

    return { thinking: thinkingContent, rest };
}

// Language to icon mapping
function getLanguageIcon(language: string | undefined) {
    const lang = (language || '').toLowerCase();
    const iconProps = { size: 14, className: 'code-lang-icon' };

    switch (lang) {
        case 'typescript':
        case 'tsx':
            return <FileCode2 {...iconProps} />;
        case 'javascript':
        case 'jsx':
            return <FileJson {...iconProps} />;
        case 'python':
        case 'py':
            return <FileCode {...iconProps} />;
        case 'bash':
        case 'sh':
        case 'shell':
        case 'zsh':
            return <Terminal {...iconProps} />;
        case 'css':
        case 'scss':
        case 'sass':
            return <Palette {...iconProps} />;
        case 'html':
            return <Code2 {...iconProps} />;
        case 'json':
            return <Braces {...iconProps} />;
        default:
            return <FileCode {...iconProps} />;
    }
}

// Get CSS class for language-specific glow
function getGlowClass(language: string | undefined): string {
    const lang = (language || '').toLowerCase();
    if (['typescript', 'ts'].includes(lang)) return 'code-glow-typescript';
    if (['tsx'].includes(lang)) return 'code-glow-tsx';
    if (['javascript', 'js'].includes(lang)) return 'code-glow-javascript';
    if (['jsx'].includes(lang)) return 'code-glow-jsx';
    if (['python', 'py'].includes(lang)) return 'code-glow-python';
    if (['bash', 'sh', 'shell', 'zsh'].includes(lang)) return 'code-glow-bash';
    if (['css', 'scss', 'sass'].includes(lang)) return 'code-glow-css';
    if (['html'].includes(lang)) return 'code-glow-html';
    if (['json'].includes(lang)) return 'code-glow-json';
    return '';
}

type MarkdownMessageProps = {
    content: string;
    className?: string;
};

const normalizeLanguage = (language: string | undefined) => {
    const lower = (language || '').toLowerCase();
    if (!lower) return '';
    if (lower === 'ts') return 'typescript';
    if (lower === 'tsx') return 'tsx';
    if (lower === 'js') return 'javascript';
    if (lower === 'jsx') return 'jsx';
    if (lower === 'sh') return 'bash';
    if (lower === 'shell') return 'bash';
    if (lower === 'py') return 'python';
    return lower;
};

const getStringProp = (value: unknown, key: string): string | undefined => {
    if (!value || typeof value !== 'object') return undefined;
    const record = value as Record<string, unknown>;
    const prop = record[key];
    return typeof prop === 'string' ? prop : undefined;
};

const looksLikeRelativeFilePath = (value: string) => {
    if (!value) return false;
    if (value.includes('\0')) return false;
    if (value.startsWith('/')) return false;
    if (value.startsWith('~')) return false;
    if (value.includes('..')) return false;
    return /^[a-zA-Z0-9._/-]+$/.test(value);
};

const extractInlineFileDirective = (value: string) => {
    const lines = value.split('\n');
    if (lines.length === 0) return { filePath: undefined as string | undefined, cleanedValue: value };

    const firstLine = lines[0].trim();
    const match = firstLine.match(/^(?:\/\/|#|\/\*+|<!--)\s*(?:file|path|filename)\s*[:=]\s*([^\s*]+)\s*(?:\*\/|-->)?\s*$/i);
    if (!match) return { filePath: undefined as string | undefined, cleanedValue: value };

    const candidate = match[1]?.trim();
    if (!candidate || !looksLikeRelativeFilePath(candidate)) {
        return { filePath: undefined as string | undefined, cleanedValue: value };
    }

    return { filePath: candidate, cleanedValue: lines.slice(1).join('\n') };
};

const parseCodeFenceMeta = (meta: string | undefined) => {
    if (!meta) return { filePath: undefined as string | undefined };
    const tokens = meta.split(/\s+/).map((t) => t.trim()).filter(Boolean);

    for (const token of tokens) {
        const match = token.match(/^(file|path|filename)=(.+)$/i);
        if (match) {
            const candidate = match[2]?.trim();
            if (candidate && looksLikeRelativeFilePath(candidate)) return { filePath: candidate };
        }
    }

    for (const token of tokens) {
        if (looksLikeRelativeFilePath(token)) return { filePath: token };
    }

    return { filePath: undefined as string | undefined };
};

const SHELL_LANGS = new Set(['bash', 'sh', 'shell', 'zsh', 'fish', 'cmd', 'powershell', 'ps']);
const COMMAND_START_RE = /^(npm|pnpm|yarn|bun|npx|node|python|pip|cargo|git|rg|ls|cat|cd|mkdir|rm|mv|cp)\b/i;

type CommandLine = {
    raw: string;
    command: string;
};

const parseCommandLines = (value: string): CommandLine[] => {
    const lines = value.split('\n');
    const commands: CommandLine[] = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith('#')) continue;

        if (/^[$>]/.test(trimmed)) {
            const command = trimmed.replace(/^[$>]\s*/, '');
            if (command) commands.push({ raw: trimmed, command });
            continue;
        }

        if (COMMAND_START_RE.test(trimmed)) {
            commands.push({ raw: trimmed, command: trimmed });
        }
    }

    return commands;
};

function CopyButton({ value, label }: { value: string; label: string }) {
    const [copied, setCopied] = useState(false);

    return (
        <button
            type="button"
            onClick={() => {
                void navigator.clipboard.writeText(value);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
            }}
            className={clsx(
                "inline-flex items-center gap-2 text-[10px] px-2 py-1 rounded border transition-colors",
                copied
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-200"
                    : "bg-white/5 border-white/10 text-white/60 hover:text-white/80 hover:bg-white/10"
            )}
            aria-label={label}
        >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
        </button>
    );
}

function ApplyButton({
    filePath,
    value,
    onApplied,
    onPathResolved,
}: {
    filePath?: string;
    value: string;
    onApplied: () => void;
    onPathResolved?: (path: string) => void;
}) {
    const [state, setState] = useState<'idle' | 'previewing' | 'confirming' | 'applying' | 'applied' | 'error'>('idle');
    const [diffText, setDiffText] = useState<string | null>(null);
    const [baseSha, setBaseSha] = useState<string | null>(null);
    const [pathPromptOpen, setPathPromptOpen] = useState(false);
    const [pathInput, setPathInput] = useState(filePath ?? '');
    const [pathError, setPathError] = useState<string | null>(null);

    const closeConfirm = () => {
        setDiffText(null);
        setBaseSha(null);
        setState('idle');
    };

    const startPreview = async (path: string) => {
        setState('previewing');
        try {
            const res = await fetch('/api/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'preview', path, content: value }),
            });

            if (!res.ok) {
                setState('error');
                window.setTimeout(() => setState('idle'), 1500);
                return;
            }

            const data = (await res.json()) as {
                exists: boolean;
                diff?: string;
                baseSha?: string | null;
            };

            const exists = Boolean(data.exists);
            if (!exists) {
                // New file: apply immediately
                setState('applying');
                const applyRes = await fetch('/api/apply', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'apply', path, content: value, baseSha: null }),
                });
                if (!applyRes.ok) {
                    setState('error');
                    window.setTimeout(() => setState('idle'), 1500);
                    return;
                }
                setState('applied');
                onApplied();
                window.setTimeout(() => setState('idle'), 1500);
                return;
            }

            // Existing file: show diff + confirmation
            setDiffText(typeof data.diff === 'string' ? data.diff : '(No diff available)');
            setBaseSha(typeof data.baseSha === 'string' ? data.baseSha : null);
            setState('confirming');
        } catch {
            setState('error');
            window.setTimeout(() => setState('idle'), 1500);
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={async () => {
                    if (state !== 'idle') return;
                    const targetPath = filePath || pathInput.trim();
                    if (!targetPath) {
                        if (filePath && !pathInput) {
                            setPathInput(filePath);
                        }
                        setPathPromptOpen(true);
                        setPathError(null);
                        return;
                    }
                    await startPreview(targetPath);
                }}
                className={clsx(
                    "inline-flex items-center gap-2 text-[10px] px-2 py-1 rounded border transition-colors",
                    state === 'applied'
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-200"
                        : state === 'error'
                            ? "bg-red-500/10 border-red-500/20 text-red-200"
                            : "bg-white/5 border-white/10 text-white/60 hover:text-white/80 hover:bg-white/10"
                )}
                aria-label="Apply code to file"
                title={`Apply to ${filePath}`}
            >
                {state === 'applied' ? <Check size={12} /> : <Zap size={12} />}
                {state === 'applied'
                    ? 'Applied'
                    : state === 'previewing'
                        ? 'Preview…'
                        : state === 'applying'
                            ? 'Applying…'
                            : state === 'error'
                                ? 'Failed'
                                : 'Apply'}
            </button>

            {pathPromptOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onMouseDown={() => setPathPromptOpen(false)}
                        role="presentation"
                    />
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className="relative w-full max-w-lg rounded-xl border border-white/10 bg-[#070707] shadow-2xl overflow-hidden"
                        role="dialog"
                        aria-label="Select apply path"
                    >
                        <div className="px-4 py-3 border-b border-white/10 bg-black/40 flex items-center justify-between">
                            <div className="text-sm font-mono text-white/80">Apply code block</div>
                            <button
                                type="button"
                                onClick={() => setPathPromptOpen(false)}
                                className="text-xs font-mono px-3 py-1 rounded bg-white/5 hover:bg-white/10 text-white/70"
                            >
                                Cancel
                            </button>
                        </div>
                        <div className="p-4 space-y-3">
                            <div className="text-[11px] font-mono text-white/50">
                                Enter a relative file path (e.g. <span className="text-white/70">src/app/page.tsx</span>)
                            </div>
                            <input
                                value={pathInput}
                                onChange={(e) => setPathInput(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white/90 font-mono focus:outline-none focus:border-white/30"
                                placeholder="src/..."
                            />
                            {pathError ? <div className="text-[11px] text-red-300">{pathError}</div> : null}
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={async () => {
                                        const next = pathInput.trim();
                                        if (!next || !looksLikeRelativeFilePath(next)) {
                                            setPathError('Please enter a valid relative path.');
                                            return;
                                        }
                                        setPathError(null);
                                        setPathPromptOpen(false);
                                        onPathResolved?.(next);
                                        await startPreview(next);
                                    }}
                                    className="text-xs font-mono px-3 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-200 inline-flex items-center gap-2"
                                >
                                    <Zap size={14} />
                                    Continue
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {state === 'confirming' && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onMouseDown={closeConfirm}
                        role="presentation"
                    />
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className="relative w-full max-w-3xl rounded-xl border border-white/10 bg-[#070707] shadow-2xl overflow-hidden"
                        role="dialog"
                        aria-label="Confirm apply"
                    >
                        <div className="px-4 py-3 border-b border-white/10 bg-black/40 flex items-center justify-between">
                            <div className="text-sm font-mono text-white/80">
                                Apply to <span className="text-white">{filePath || pathInput}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={closeConfirm}
                                    className="text-xs font-mono px-3 py-1 rounded bg-white/5 hover:bg-white/10 text-white/70"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        setState('applying');
                                        const targetPath = filePath || pathInput.trim();
                                        try {
                                            const applyRes = await fetch('/api/apply', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ action: 'apply', path: targetPath, content: value, baseSha }),
                                            });
                                            if (!applyRes.ok) {
                                                setState('error');
                                                window.setTimeout(() => setState('idle'), 1500);
                                                return;
                                            }
                                            setState('applied');
                                            onApplied();
                                            window.setTimeout(() => setState('idle'), 1500);
                                        } catch {
                                            setState('error');
                                            window.setTimeout(() => setState('idle'), 1500);
                                        }
                                    }}
                                    className="text-xs font-mono px-3 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-200 inline-flex items-center gap-2"
                                >
                                    <Zap size={14} />
                                    Apply
                                </button>
                            </div>
                        </div>

                        <div className="p-4">
                            <div className="text-[11px] font-mono text-white/40 mb-2">
                                Preview diff (old → new)
                            </div>
                            <pre className="text-[12px] leading-relaxed font-mono bg-black/40 border border-white/10 rounded-lg p-3 overflow-auto max-h-[60vh] text-white/80">
                                {(diffText || '').split('\n').map((line, idx) => {
                                    const color =
                                        line.startsWith('+') ? 'text-emerald-300' :
                                            line.startsWith('-') ? 'text-red-300' :
                                                line.startsWith('@@') ? 'text-amber-200' :
                                                    'text-white/70';
                                    return (
                                        <div key={idx} className={color}>
                                            {line || ' '}
                                        </div>
                                    );
                                })}
                            </pre>
                        </div>
                    </motion.div>
                </div>
            )}
        </>
    );
}

function CommandLineRow({ line, onRun }: { line: CommandLine; onRun: (cmd: string) => Promise<void> }) {
    const [state, setState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');

    return (
        <div
            className={clsx(
                "group flex items-center gap-3 rounded px-2 py-1 transition-colors",
                state === 'error' ? "bg-red-500/10" : "hover:bg-white/5"
            )}
        >
            <button
                type="button"
                onClick={async () => {
                    if (state === 'running') return;
                    setState('running');
                    try {
                        await onRun(line.command);
                        setState('done');
                        window.setTimeout(() => setState('idle'), 1200);
                    } catch {
                        setState('error');
                        window.setTimeout(() => setState('idle'), 1500);
                    }
                }}
                className={clsx(
                    "opacity-0 group-hover:opacity-100 transition-opacity text-[10px] px-2 py-1 rounded border",
                    state === 'done'
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-200"
                        : state === 'running'
                            ? "bg-white/10 border-white/20 text-white/80"
                            : state === 'error'
                                ? "bg-red-500/10 border-red-500/20 text-red-200"
                                : "bg-white/5 border-white/10 text-white/60 hover:text-white/90"
                )}
                aria-label={`Run command ${line.command}`}
                title="Run command"
            >
                <Play size={12} />
            </button>
            <code className="text-white/80 text-[0.95em]">{line.raw}</code>
        </div>
    );
}

function CommandBlock({
    lines,
    onRun,
}: {
    lines: CommandLine[];
    onRun: (cmd: string) => Promise<void>;
}) {
    return (
        <div className="py-2">
            {lines.map((line, idx) => (
                <CommandLineRow key={`${line.command}-${idx}`} line={line} onRun={onRun} />
            ))}
        </div>
    );
}

function CodeFence({
    language,
    filePath,
    value,
}: {
    language: string | undefined;
    filePath: string | undefined;
    value: string;
}) {
    const [appliedPulse, setAppliedPulse] = useState(0);
    const [resolvedPath, setResolvedPath] = useState<string | undefined>(filePath);
    const [showDiff, setShowDiff] = useState(false);
    const [diffText, setDiffText] = useState<string | null>(null);
    const [diffLoading, setDiffLoading] = useState(false);
    const [diffError, setDiffError] = useState<string | null>(null);

    const commandLines = useMemo(() => parseCommandLines(value), [value]);
    const isShell = language ? SHELL_LANGS.has(language.toLowerCase()) : false;
    const isCommandBlock = !resolvedPath && (isShell || commandLines.length > 0);

    useEffect(() => {
        if (filePath) {
            setResolvedPath(filePath);
        }
    }, [filePath]);

    useEffect(() => {
        setShowDiff(false);
        setDiffText(null);
        setDiffError(null);
        setDiffLoading(false);
    }, [resolvedPath, value]);

    const handleRunCommand = useCallback(async (command: string) => {
        await agencyClient.send({ type: 'INTENT_EXEC_CMD', command });
    }, []);

    const handleToggleDiff = useCallback(async () => {
        if (!resolvedPath) return;
        if (showDiff) {
            setShowDiff(false);
            return;
        }

        setShowDiff(true);
        if (diffText || diffLoading) return;

        setDiffLoading(true);
        setDiffError(null);
        try {
            const res = await fetch('/api/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'preview', path: resolvedPath, content: value }),
            });
            if (!res.ok) {
                setDiffError('Failed to load diff');
                return;
            }
            const data = (await res.json()) as { diff?: string };
            setDiffText(typeof data.diff === 'string' ? data.diff : '(No diff available)');
        } catch {
            setDiffError('Failed to load diff');
        } finally {
            setDiffLoading(false);
        }
    }, [resolvedPath, showDiff, diffText, diffLoading, value]);

    const glowClass = getGlowClass(language);
    const lines = value.split('\n');
    const showLineNumbers = lines.length > 3; // Show line numbers for 4+ lines

    return (
        <motion.div
            className={clsx(
                "my-2 rounded-lg bg-black/50 overflow-hidden relative code-glow",
                glowClass
            )}
            animate={appliedPulse > 0 ? { scale: [1, 0.985, 1] } : undefined}
            transition={{ duration: 0.28 }}
        >
            {appliedPulse > 0 && (
                <motion.div
                    className="absolute inset-0 pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.25, 0] }}
                    transition={{ duration: 0.6 }}
                    style={{
                        background:
                            'linear-gradient(90deg, rgba(16,185,129,0) 0%, rgba(16,185,129,0.15) 45%, rgba(16,185,129,0) 100%)',
                    }}
                />
            )}

            <div className="code-header flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                    {getLanguageIcon(language)}
                    <span className="code-header-lang">{language || 'code'}</span>
                    {resolvedPath ? <span className="text-white/25 ml-1">• {resolvedPath}</span> : null}
                </div>
                <div className="flex items-center gap-2">
                    {resolvedPath && !isCommandBlock ? (
                        <button
                            type="button"
                            onClick={() => void handleToggleDiff()}
                            className={clsx(
                                "inline-flex items-center gap-2 text-[10px] px-2 py-1 rounded border transition-colors",
                                showDiff
                                    ? "bg-sapphire-500/10 border-blue-500/20 text-blue-200"
                                    : "bg-white/5 border-white/10 text-white/60 hover:text-white/80 hover:bg-white/10"
                            )}
                            aria-pressed={showDiff}
                            aria-label="Toggle diff view"
                        >
                            Show Diff
                        </button>
                    ) : null}
                    <CopyButton value={value} label="Copy code block" />
                    <ApplyButton
                        filePath={resolvedPath}
                        value={value}
                        onApplied={() => setAppliedPulse((x) => x + 1)}
                        onPathResolved={(nextPath) => setResolvedPath(nextPath)}
                    />
                </div>
            </div>

            {isCommandBlock ? (
                <CommandBlock lines={commandLines} onRun={handleRunCommand} />
            ) : showDiff ? (
                <div className="p-3">
                    {diffLoading ? (
                        <div className="text-[12px] text-white/40 font-mono">Loading diff…</div>
                    ) : diffError ? (
                        <div className="text-[12px] text-red-300 font-mono">{diffError}</div>
                    ) : (
                        <pre className="text-[12px] leading-relaxed font-mono bg-black/40 border border-white/10 rounded-lg p-3 overflow-auto max-h-[60vh] text-white/80">
                            {(diffText || '').split('\n').map((line, idx) => {
                                const color =
                                    line.startsWith('+') ? 'text-emerald-300' :
                                        line.startsWith('-') ? 'text-red-300' :
                                            line.startsWith('@@') ? 'text-amber-200' :
                                                'text-white/70';
                                return (
                                    <div key={idx} className={color}>
                                        {line || ' '}
                                    </div>
                                );
                            })}
                        </pre>
                    )}
                </div>
            ) : (
                <div className="relative">
                    {showLineNumbers && (
                        <div className="code-line-numbers">
                            {lines.map((_, i) => (
                                <span key={i}>{i + 1}</span>
                            ))}
                        </div>
                    )}
                    <SyntaxHighlighter
                        language={language || undefined}
                        style={vscDarkPlus}
                        customStyle={{
                            margin: 0,
                            background: 'transparent',
                            padding: '12px',
                            paddingLeft: showLineNumbers ? '56px' : '12px',
                            fontSize: 'var(--terminal-code-font-size)',
                            lineHeight: 1.65,
                        }}
                        codeTagProps={{
                            style: {
                                fontFamily:
                                    'var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                            },
                        }}
                    >
                        {value}
                    </SyntaxHighlighter>
                </div>
            )}
        </motion.div>
    );
}

export function MarkdownMessage({ content, className }: MarkdownMessageProps) {
    const { thinking, rest } = useMemo(() => parseThinkingBlocks(content), [content]);
    const trimmed = useMemo(() => rest.trimEnd(), [rest]);

    return (
        <div className={clsx("text-white/80 leading-relaxed text-[1em]", className)}>
            {/* Render thinking block if present */}
            {thinking && <ThinkingBlock content={thinking} defaultExpanded={true} />}

            {/* Render rest of content */}
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    p({ children }) {
                        return <p className="mb-2 last:mb-0">{children}</p>;
                    },
                    ul({ children }) {
                        return <ul className="mb-2 last:mb-0 ml-5 list-disc">{children}</ul>;
                    },
                    ol({ children }) {
                        return <ol className="mb-2 last:mb-0 ml-5 list-decimal">{children}</ol>;
                    },
                    li({ children }) {
                        return <li className="mb-1 last:mb-0">{children}</li>;
                    },
                    code({ className: codeClassName, children, node, ...props }) {
                        const match = /language-(\w+)/.exec(codeClassName || '');
                        const language = normalizeLanguage(match?.[1]);
                        const raw = String(children ?? '');
                        const value = raw.replace(/\n$/, '');
                        const meta = getStringProp(node as unknown, 'meta');
                        const { filePath } = parseCodeFenceMeta(meta);
                        const { filePath: inlinePath, cleanedValue } = extractInlineFileDirective(value);
                        const resolvedPath = filePath ?? inlinePath;
                        const finalValue = inlinePath ? cleanedValue : value;

                        const isBlock = Boolean(match);
                        if (!isBlock) {
                            return (
                                <code
                                    className="px-1 py-0.5 rounded bg-white/10 border border-white/10 text-white/90 font-mono text-[0.92em]"
                                    {...props}
                                >
                                    {children}
                                </code>
                            );
                        }

                        return <CodeFence language={language || undefined} filePath={resolvedPath} value={finalValue} />;
                    },
                    pre({ children }) {
                        return <>{children}</>;
                    },
                }}
            >
                {trimmed}
            </ReactMarkdown>
        </div>
    );
}
