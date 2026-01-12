"use client";

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Send, Sparkles, Terminal, CheckCircle, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';
import type { ActionCardProps, OllamaChatMessage, AgentIntent } from '@/types';
import { AIAvatar } from './AIAvatar';
import { PhaseAura } from './PhaseAura';
import { AgentControls } from './AgentControls';
import { useAgencyClient } from '@/lib/client';
import { ShadowTerminal } from './ShadowTerminal';

const DEFAULT_SYSTEM_PROMPT = `You are a helpful, compliant, and proactive AI coding assistant. Your primary goal is to help users by writing code, providing solutions, and answering questions directly and efficiently.

Key behaviors:
- Always write code snippets when requested, even if the request is brief or has minor typos
- Be helpful and compliant - never refuse reasonable requests or ask for excessive clarification
- If a request is unclear, make reasonable assumptions and proceed rather than asking many questions
- When asked to write code, write it immediately without hesitation
- Be direct and action-oriented, similar to Claude Haiku 4.5's helpfulness
- Focus on being useful and getting things done rather than being overly cautious

You are here to help, not to question or refuse. Write code, provide solutions, and assist users promptly.`;

// Helper to cap chat history: keep system prompt + last 20 non-system messages
const capChatHistory = (history: OllamaChatMessage[]): OllamaChatMessage[] => {
    if (history.length === 0) return history;
    const nonSystem = history.slice(1);
    const cappedNonSystem = nonSystem.slice(-20);
    return [history[0], ...cappedNonSystem];
};

const buildSystemPrompt = (memoryNotes: string[], pinnedNotes: string[], workingGoal: string) => {
    const sections: string[] = [];
    const goal = workingGoal.trim();
    if (goal) {
        sections.push(`Working goal:\n- ${goal}`);
    }
    if (pinnedNotes.length) {
        sections.push(`Pinned:\n- ${pinnedNotes.join('\n- ')}`);
    }
    if (memoryNotes.length) {
        sections.push(`Memory:\n- ${memoryNotes.join('\n- ')}`);
    }
    return sections.length ? `${DEFAULT_SYSTEM_PROMPT}\n\n${sections.join('\n\n')}` : DEFAULT_SYSTEM_PROMPT;
};

// Type aliases for client.send calls
type ExecCmdIntent = Omit<Extract<AgentIntent, { type: 'INTENT_EXEC_CMD' }>, 'header'>;
type OllamaChatIntent = Omit<Extract<AgentIntent, { type: 'INTENT_OLLAMA_CHAT' }>, 'header'>;

// Extend base types for hybrid stream
export interface StreamItem extends ActionCardProps {
    isUser?: boolean;
    isTyping?: boolean;
    // Enhancement: Strict payload types for cards
    payload?: Record<string, unknown>;
}

interface AgentWorkspaceProps {
    runId: string;
    currentPhase: 'plan' | 'build' | 'review' | 'deploy';
    stream: StreamItem[];
    onSendMessage: (message: string) => void;
}

type SlashCommand = {
    id: string;
    label: string;
    description: string;
    insert: string;
};

type MentionTarget = {
    id: string;
    label: string;
    description: string;
    insert: string;
};

type MacroCommand = {
    id: string;
    label: string;
    description: string;
    insert: string;
    command: string;
};

type AutocompleteKind = 'slash' | 'mention' | 'macro';

type AutocompleteItem = {
    id: string;
    label: string;
    description: string;
    insert: string;
    kind: AutocompleteKind;
};

type ParsedInput = {
    mode: 'chat' | 'terminal' | 'system';
    payload: string;
    command?: string;
    macro?: MacroCommand;
    agentTarget?: MentionTarget;
};

export function AgentWorkspace({ runId, currentPhase, stream: initialStream, onSendMessage }: AgentWorkspaceProps) {
    const [inputValue, setInputValue] = useState('');
    const [localStream, setLocalStream] = useState<StreamItem[]>(initialStream);
    const [memoryNotes, setMemoryNotes] = useState<string[]>([]);
    const [pinnedNotes, setPinnedNotes] = useState<string[]>([]);
    const [workingGoal, setWorkingGoal] = useState('');
    const [goalStatus, setGoalStatus] = useState<{ message: string; tone: 'ok' | 'warn' } | null>(null);
    const [chatHistory, setChatHistory] = useState<OllamaChatMessage[]>([
        { role: 'system', content: buildSystemPrompt([], [], '') }
    ]);
    const hasHydratedStream = useRef(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const goalStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [autocompleteOpen, setAutocompleteOpen] = useState(false);
    const [autocompleteQuery, setAutocompleteQuery] = useState('');
    const [autocompleteActiveIndex, setAutocompleteActiveIndex] = useState(0);
    const [autocompleteKind, setAutocompleteKind] = useState<AutocompleteKind>('slash');

    const { lastEvent, client } = useAgencyClient(runId);

    const slashCommands: SlashCommand[] = useMemo(() => [
        { id: 'help', label: '/help', description: 'Show available commands', insert: '/help' },
        { id: 'models', label: '/models', description: 'List Ollama models', insert: '/models' },
        { id: 'clear', label: '/clear', description: 'Clear local output', insert: '/clear' },
        { id: 'remember', label: '/remember', description: 'Remember a note', insert: '/remember ' },
        { id: 'pin', label: '/pin', description: 'Pin a note', insert: '/pin ' },
        { id: 'goal', label: '/goal', description: 'Set working goal', insert: '/goal ' },
        { id: 'chat', label: '/chat', description: 'Chat with Qwen (same as /llm)', insert: '/chat ' },
        { id: 'llm', label: '/llm', description: 'Chat with Qwen (explicit)', insert: '/llm ' },
        { id: 'exec', label: '/exec', description: 'Run a shell command', insert: '/exec ' },
        { id: 'cmd', label: '/cmd', description: 'Run a shell command (alias)', insert: '/cmd ' },
        { id: 'init', label: '/init', description: 'Initialize a fresh session (placeholder)', insert: '/init ' },
    ], []);

    const mentionTargets: MentionTarget[] = useMemo(() => [
        { id: 'plan', label: '@plan', description: 'Planning mode', insert: '@plan ' },
        { id: 'build', label: '@build', description: 'Build mode', insert: '@build ' },
        { id: 'review', label: '@review', description: 'Review mode', insert: '@review ' },
        { id: 'deploy', label: '@deploy', description: 'Deploy mode', insert: '@deploy ' },
        { id: 'engineer', label: '@engineer', description: 'Implementation and fixes', insert: '@engineer ' },
        { id: 'designer', label: '@designer', description: 'UI and UX ideas', insert: '@designer ' },
        { id: 'reviewer', label: '@reviewer', description: 'Critical review and QA', insert: '@reviewer ' },
        { id: 'build-helper', label: '@build-helper', description: 'Beta: build assistance', insert: '@build-helper ' },
        { id: 'frontend-designer', label: '@frontend-designer', description: 'Beta: UI execution', insert: '@frontend-designer ' },
        { id: 'code-reviewer', label: '@code-reviewer', description: 'Beta: code review', insert: '@code-reviewer ' },
    ], []);

    const macroCommands: MacroCommand[] = useMemo(() => [
        { id: 'test', label: '!test', description: 'Typecheck (no tests configured)', insert: '!test ', command: 'npx tsc -p tsconfig.json --noEmit' },
        { id: 'lint', label: '!lint', description: 'Run eslint', insert: '!lint ', command: 'npm run lint' },
        { id: 'build', label: '!build', description: 'Production build', insert: '!build ', command: 'npm run build' },
    ], []);

    const autocompleteItems = useMemo<Record<AutocompleteKind, AutocompleteItem[]>>(() => ({
        slash: slashCommands.map((cmd) => ({ ...cmd, kind: 'slash' as const })),
        mention: mentionTargets.map((target) => ({ ...target, kind: 'mention' as const })),
        macro: macroCommands.map((macro) => ({ ...macro, kind: 'macro' as const })),
    }), [slashCommands, mentionTargets, macroCommands]);

    const filteredAutocompleteItems = useMemo(() => {
        const q = autocompleteQuery.trim().toLowerCase();
        const items = autocompleteItems[autocompleteKind] ?? [];
        if (!q) return items;
        return items.filter((item) => item.label.toLowerCase().includes(q) || item.description.toLowerCase().includes(q));
    }, [autocompleteItems, autocompleteKind, autocompleteQuery]);

    const macroLookup = useMemo(() => new Map(macroCommands.map((macro) => [macro.id, macro])), [macroCommands]);
    const mentionLookup = useMemo(() => new Map(mentionTargets.map((target) => [target.id, target])), [mentionTargets]);

    // Reset local state when run changes
    useEffect(() => {
        hasHydratedStream.current = false;
        setLocalStream([]);
        setMemoryNotes([]);
        setPinnedNotes([]);
        setWorkingGoal('');
        setGoalStatus(null);
        setChatHistory([{ role: 'system', content: buildSystemPrompt([], [], '') }]);
        setAutocompleteOpen(false);
        setAutocompleteQuery('');
        setAutocompleteActiveIndex(0);
    }, [runId]);

    // Hydrate stream once per run (avoid clobbering optimistic UI)
    useEffect(() => {
        if (hasHydratedStream.current) return;
        if (initialStream.length === 0) return;
        setLocalStream((prev) => (prev.length === 0 ? initialStream : prev));
        hasHydratedStream.current = true;
    }, [initialStream]);

    // Handle Real-time Events
    useEffect(() => {
        if (!lastEvent) return;

        if (lastEvent.type === 'OLLAMA_BIT') return;

        const correlationId = lastEvent.header.correlationId;
        const typingId = `typing-${correlationId}`;

        const item: StreamItem = {
            id: `evt-${Date.now()}-${Math.random()}`,
            runId: lastEvent.header.sessionId,
            timestamp: new Date(lastEvent.header.timestamp).toLocaleTimeString(),
            phase: currentPhase, // Or derive from event if available
            title: 'System Event',
            content: '',
            type: 'log',
            severity: 'info',
            agentId: 'SYSTEM'
        };

        switch (lastEvent.type) {
            case 'STDOUT_CHUNK':
                item.type = 'command';
                item.title = 'STDOUT';
                item.content = lastEvent.content;
                break;
            case 'STDERR_CHUNK':
                item.type = 'error';
                item.title = 'STDERR';
                item.content = lastEvent.content;
                item.severity = 'error';
                break;
            case 'PROCESS_STARTED':
                item.type = 'log';
                item.title = 'Process Started';
                item.content = `$ ${lastEvent.command} (PID: ${lastEvent.pid})`;
                break;
            case 'PROCESS_EXITED':
                item.type = 'log';
                item.title = 'Process Exited';
                item.content = `Exit Code: ${lastEvent.code}`;
                break;

            case 'PERMISSION_REQUESTED':
                item.type = 'security_gate';
                item.title = 'Permission Required';
                item.content = `Command: ${lastEvent.command}`;
                item.payload = { policy: 'Manual Approval', status: 'warn' };
                break;
            case 'WORKFLOW_ERROR':
                item.type = 'error';
                item.title = 'Workflow Error';
                item.content = lastEvent.error;
                item.severity = lastEvent.severity === 'fatal' ? 'error' : 'warn';
                break;
            case 'OLLAMA_CHAT_STARTED':
                setLocalStream((prev) => {
                    const withoutTyping = prev.filter((x) => x.id !== typingId);
                    return [
                        ...withoutTyping,
                        {
                            id: typingId,
                            runId,
                            type: 'log',
                            title: 'Qwen',
                            content: 'Thinking…',
                            timestamp: new Date(lastEvent.header.timestamp).toLocaleTimeString(),
                            phase: currentPhase,
                            agentId: 'QWEN',
                            severity: 'info',
                            isTyping: true,
                        },
                    ];
                });
                return;
            case 'OLLAMA_CHAT_COMPLETED':
                item.type = 'code';
                item.title = 'Qwen';
                item.content = lastEvent.response.message.content;
                item.agentId = 'QWEN';
                setLocalStream((prev) => prev.filter((x) => x.id !== typingId));
                // append assistant message to history
                setChatHistory(prev => capChatHistory([...prev, { role: 'assistant', content: lastEvent.response.message.content }]));
                break;
            case 'OLLAMA_CHAT_FAILED':
                item.type = 'error';
                item.title = 'Ollama Chat Failed';
                item.content = lastEvent.error;
                item.severity = 'error';
                setLocalStream((prev) => prev.filter((x) => x.id !== typingId));
                break;
            case 'OLLAMA_ERROR':
                item.type = 'error';
                item.title = 'Ollama Error';
                item.content = lastEvent.error;
                item.severity = 'error';
                setLocalStream((prev) => prev.filter((x) => x.id !== typingId));
                break;
            case 'SYS_READY':
                item.type = 'log';
                item.title = 'System Ready';
                item.content = 'System is ready.';
                break;
            default:
                return; // Ignore other events for now
        }

        setLocalStream(prev => [...prev, item]);
    }, [lastEvent, currentPhase]);

    const updateAutocompleteFromInput = (nextValue: string) => {
        const el = textareaRef.current;
        const cursor = el?.selectionStart ?? nextValue.length;

        const beforeCursor = nextValue.slice(0, cursor);
        const match = beforeCursor.match(/(^|[\s\n])([/@!])([a-zA-Z0-9-_]*)$/);
        if (!match) {
            setAutocompleteOpen(false);
            setAutocompleteQuery('');
            setAutocompleteActiveIndex(0);
            return;
        }

        const prefix = match[2];
        const kind = prefix === '/' ? 'slash' : prefix === '@' ? 'mention' : 'macro';
        setAutocompleteKind(kind);
        setAutocompleteOpen(true);
        setAutocompleteQuery(match[3] || '');
        setAutocompleteActiveIndex(0);
    };

    const insertAutocompleteItem = (item: AutocompleteItem) => {
        const el = textareaRef.current;
        if (!el) {
            setInputValue(item.insert);
            setAutocompleteOpen(false);
            return;
        }

        const cursor = el.selectionStart ?? inputValue.length;
        const beforeCursor = inputValue.slice(0, cursor);
        const afterCursor = inputValue.slice(cursor);

        const match = beforeCursor.match(/(^|[\s\n])([/@!])([a-zA-Z0-9-_]*)$/);
        if (!match) {
            setInputValue(item.insert);
            setAutocompleteOpen(false);
            return;
        }

        const triggerLength = `${match[2]}${match[3] || ''}`.length;
        const startIndex = beforeCursor.length - triggerLength;
        const next = `${inputValue.slice(0, startIndex)}${item.insert}${afterCursor.replace(/^\s+/, '')}`;
        setInputValue(next);
        setAutocompleteOpen(false);
        setAutocompleteQuery('');
        setAutocompleteActiveIndex(0);

        requestAnimationFrame(() => {
            const nextCursor = startIndex + item.insert.length;
            el.focus();
            el.setSelectionRange(nextCursor, nextCursor);
        });
    };

    useEffect(() => {
        if (!autocompleteOpen) return;
        if (filteredAutocompleteItems.length === 0) return;
        setAutocompleteActiveIndex((prev) => Math.min(prev, filteredAutocompleteItems.length - 1));
    }, [autocompleteOpen, filteredAutocompleteItems.length]);

    useEffect(() => {
        setChatHistory((prev) => {
            const nextPrompt = buildSystemPrompt(memoryNotes, pinnedNotes, workingGoal);
            if (prev.length === 0) return [{ role: 'system', content: nextPrompt }];
            if (prev[0]?.role === 'system' && prev[0].content === nextPrompt) return prev;
            const next = [...prev];
            next[0] = { role: 'system', content: nextPrompt };
            return next;
        });
    }, [memoryNotes, pinnedNotes, workingGoal]);

    const appendSystemLog = (title: string, content: string, severity: 'info' | 'warn' | 'error' = 'info') => {
        const item: StreamItem = {
            id: `sys-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            runId,
            type: severity === 'error' ? 'error' : 'log',
            title,
            content,
            timestamp: new Date().toLocaleTimeString(),
            phase: currentPhase,
            agentId: 'SYSTEM',
            severity
        };
        setLocalStream((prev) => [...prev, item]);
    };

    const flashGoalStatus = (message: string, tone: 'ok' | 'warn') => {
        if (goalStatusTimerRef.current) {
            clearTimeout(goalStatusTimerRef.current);
        }
        setGoalStatus({ message, tone });
        goalStatusTimerRef.current = setTimeout(() => {
            setGoalStatus(null);
        }, 2000);
    };

    const truncateText = (value: string, max = 360) => {
        if (value.length <= max) return value;
        return `${value.slice(0, max)}...`;
    };

    const addPinnedNote = (note: string, source: string) => {
        const trimmed = note.trim();
        if (!trimmed) {
            appendSystemLog('Pin', 'No text selected to pin.', 'warn');
            return;
        }
        const normalized = truncateText(trimmed.replace(/\s+/g, ' '));
        setPinnedNotes((prev) => [...prev, normalized]);
        appendSystemLog('Pin', `Pinned from ${source}.`);
    };

    const handlePinSelection = () => {
        const selection = window.getSelection()?.toString() ?? '';
        addPinnedNote(selection, 'selection');
    };

    const latestTerminalOutput = useMemo(() => {
        for (let i = localStream.length - 1; i >= 0; i -= 1) {
            const item = localStream[i];
            if (item.type === 'command' || (item.type === 'error' && item.agentId !== 'USER')) {
                return item;
            }
        }
        return null;
    }, [localStream]);

    const handlePinLatestOutput = () => {
        if (!latestTerminalOutput) {
            appendSystemLog('Pin', 'No terminal output to pin yet.', 'warn');
            return;
        }
        addPinnedNote(latestTerminalOutput.content, 'terminal output');
    };

    const isLikelyTerminalCommand = (text: string) => {
        if (text.startsWith('$')) return true;
        if (text.startsWith('./') || text.startsWith('../')) return true;
        if (/[|&]{2}|\|/.test(text)) return true;
        return /^(npm|npx|pnpm|yarn|bun|git|ls|cd|cat|rg|grep|node|python|pip|docker|kubectl|make|tsc|eslint)\b/i.test(text);
    };

    const parseInput = (raw: string): ParsedInput => {
        let text = raw.trim();
        if (!text) return { mode: 'chat' as const, payload: '' };

        let agentTarget: MentionTarget | undefined;
        const agentMatch = text.match(/^@([a-zA-Z0-9-_]+)\s+/);
        if (agentMatch) {
            agentTarget = mentionLookup.get(agentMatch[1].toLowerCase());
            text = text.replace(/^@([a-zA-Z0-9-_]+)\s+/, '');
        }

        if (text.startsWith('!')) {
            const macroMatch = text.match(/^!([a-zA-Z0-9-_]+)/);
            const macro = macroMatch ? macroLookup.get(macroMatch[1].toLowerCase()) : undefined;
            if (macro) {
                return { mode: 'terminal' as const, payload: macro.command, macro, agentTarget };
            }
        }

        if (text.startsWith('/')) {
            const match = text.match(/^\/([a-zA-Z0-9-_]+)(?:\s+(.*))?$/);
            if (match) {
                const command = match[1].toLowerCase();
                const arg = (match[2] ?? '').trim();

                if (command === 'chat' || command === 'llm') {
                    return { mode: 'chat' as const, payload: arg, command, agentTarget };
                }
                if (command === 'exec' || command === 'cmd') {
                    return { mode: 'terminal' as const, payload: arg, command, agentTarget };
                }
                if (['help', 'models', 'clear', 'remember', 'pin', 'goal', 'init'].includes(command)) {
                    return { mode: 'system' as const, payload: arg, command, agentTarget };
                }
            }
        }

        const mode = isLikelyTerminalCommand(text)
            ? 'terminal'
            : (currentPhase === 'plan' || currentPhase === 'review' ? 'chat' : 'terminal');
        return { mode, payload: text, agentTarget };
    };

    const handleSystemCommand = async (command?: string, payload?: string) => {
        if (!command) return;
        switch (command) {
            case 'help': {
                appendSystemLog(
                    'Omnibar Help',
                    [
                        'Commands:',
                        '- /help, /models, /clear, /remember <note>, /pin <note>, /goal <text>',
                        '- /chat <prompt>, /llm <prompt>, /exec <cmd>, /cmd <cmd>',
                        'Mentions:',
                        '- @plan, @build, @review, @deploy',
                        '- @engineer, @designer, @reviewer',
                        '- @build-helper, @frontend-designer, @code-reviewer (beta)',
                        'Macros:',
                        '- !test, !lint, !build'
                    ].join('\n')
                );
                return;
            }
            case 'models': {
                appendSystemLog('Ollama Models', 'Fetching available models...');
                try {
                    const res = await fetch('/api/ollama?action=models');
                    if (!res.ok) {
                        const text = await res.text();
                        appendSystemLog('Ollama Models', `Failed: ${text.substring(0, 200)}`, 'warn');
                        return;
                    }
                    const data = await res.json();
                    const models = Array.isArray(data?.models) ? data.models : [];
                    const names = models.map((m: { name?: string }) => m?.name).filter(Boolean);
                    appendSystemLog('Ollama Models', names.length ? names.join('\n') : 'No models found.');
                } catch (error) {
                    appendSystemLog('Ollama Models', error instanceof Error ? error.message : String(error), 'warn');
                }
                return;
            }
            case 'clear': {
                const item: StreamItem = {
                    id: `sys-clear-${Date.now()}`,
                    runId,
                    type: 'log',
                    title: 'Omnibar',
                    content: 'Cleared local output.',
                    timestamp: new Date().toLocaleTimeString(),
                    phase: currentPhase,
                    agentId: 'SYSTEM',
                    severity: 'info'
                };
                setLocalStream([item]);
                return;
            }
            case 'remember': {
                if (!payload) {
                    appendSystemLog('Remember', 'Missing note. Usage: /remember <note>', 'warn');
                    return;
                }
                const normalized = truncateText(payload.trim().replace(/\s+/g, ' '));
                if (!normalized) {
                    appendSystemLog('Remember', 'Missing note. Usage: /remember <note>', 'warn');
                    return;
                }
                setMemoryNotes((prev) => [...prev, normalized]);
                appendSystemLog('Remember', `Saved: ${normalized}`);
                return;
            }
            case 'pin': {
                if (!payload) {
                    appendSystemLog('Pin', 'Missing note. Usage: /pin <note>', 'warn');
                    return;
                }
                const normalized = truncateText(payload.trim().replace(/\s+/g, ' '));
                if (!normalized) {
                    appendSystemLog('Pin', 'Missing note. Usage: /pin <note>', 'warn');
                    return;
                }
                setPinnedNotes((prev) => [...prev, normalized]);
                appendSystemLog('Pin', `Pinned: ${normalized}`);
                return;
            }
            case 'goal': {
                if (!payload) {
                    appendSystemLog('Goal', 'Missing goal. Usage: /goal <text>', 'warn');
                    flashGoalStatus('Missing goal text after /goal', 'warn');
                    return;
                }
                const normalized = truncateText(payload.trim().replace(/\s+/g, ' '), 240);
                if (!normalized) {
                    appendSystemLog('Goal', 'Missing goal. Usage: /goal <text>', 'warn');
                    flashGoalStatus('Missing goal text after /goal', 'warn');
                    return;
                }
                setWorkingGoal(normalized);
                appendSystemLog('Goal', `Working goal set: ${normalized}`);
                flashGoalStatus('Working goal updated', 'ok');
                return;
            }
            case 'init': {
                appendSystemLog('Init', 'Init command acknowledged (placeholder).');
                return;
            }
            default:
                appendSystemLog('Command', `Unknown command: /${command}`, 'warn');
        }
    };

    const handleSend = async () => {
        if (!inputValue.trim()) return;
        
        const parsed = parseInput(inputValue);
        if (parsed.mode !== 'system' && !parsed.payload) return;

        setInputValue('');
        setAutocompleteOpen(false);

        if (parsed.mode === 'system') {
            await handleSystemCommand(parsed.command, parsed.payload);
            return;
        }

        const agentPrefix = parsed.agentTarget ? `[${parsed.agentTarget.label}] ` : '';
        const payload = `${agentPrefix}${parsed.payload}`;
        const title = parsed.macro
            ? `Macro ${parsed.macro.label}`
            : parsed.mode === 'chat'
                ? 'User Prompt'
                : 'User Command';

        // 2. Optimistic UI Update
        const userMsg: StreamItem = {
            id: Date.now().toString(),
            runId,
            type: 'log',
            title,
            content: payload,
            timestamp: new Date().toLocaleTimeString(),
            phase: currentPhase,
            agentId: 'USER',
            severity: 'info',
            isUser: true
        };
        setLocalStream(prev => [...prev, userMsg]);

        // 3. Dispatch Logic
        if (parsed.mode === 'chat') {
            const nextHistory = capChatHistory([...chatHistory, { role: 'user', content: payload }]);
            setChatHistory(nextHistory);

            if (client) {
                const intent: OllamaChatIntent = {
                    type: 'INTENT_OLLAMA_CHAT',
                    messages: nextHistory
                };
                try {
                    await client.send(intent);
                } catch (error) {
                    const errorItem: StreamItem = {
                        id: `error-${Date.now()}`,
                        runId,
                        type: 'error',
                        title: 'Dispatch Failed',
                        content: error instanceof Error ? error.message : String(error),
                        timestamp: new Date().toLocaleTimeString(),
                        phase: currentPhase,
                        agentId: 'SYSTEM',
                        severity: 'error'
                    };
                    setLocalStream(prev => [...prev, errorItem]);
                }
            }
        } else {
            // Terminal Mode
            if (client) {
                const intent: ExecCmdIntent = {
                    type: 'INTENT_EXEC_CMD',
                    command: payload
                };
                try {
                    await client.send(intent);
                } catch (error) {
                    const errorItem: StreamItem = {
                        id: `error-${Date.now()}`,
                        runId,
                        type: 'error',
                        title: 'Dispatch Failed',
                        content: error instanceof Error ? error.message : String(error),
                        timestamp: new Date().toLocaleTimeString(),
                        phase: currentPhase,
                        agentId: 'SYSTEM',
                        severity: 'error'
                    };
                    setLocalStream(prev => [...prev, errorItem]);
                }
            } else {
                onSendMessage(payload);
            }
        }
    };

    // Role Configuration
    const getRoleConfig = () => {
        switch (currentPhase) {
            case 'plan': return {
                icon: Sparkles,
                label: 'ARCHITECT',
                placeholder: 'Describe your vision or ask for blueprint changes...',
                accent: 'text-[var(--sapphire)]',
                border: 'border-[var(--sapphire)]'
            };
            case 'build': return {
                icon: Terminal,
                label: 'ENGINEER',
                placeholder: 'Enter build command, debugging query, or /llm prompt...',
                accent: 'text-[var(--emerald)]',
                border: 'border-[var(--emerald)]'
            };
            case 'review': return {
                icon: ShieldAlert,
                label: 'CRITIC',
                placeholder: 'Ask about security risks or approve changes...',
                accent: 'text-[var(--amber)]',
                border: 'border-[var(--amber)]'
            };
            default: return {
                icon: CheckCircle,
                label: 'DEPLOYER',
                placeholder: 'Command deployment...',
                accent: 'text-[var(--amethyst)]',
                border: 'border-[var(--amethyst)]'
            };
        }
    };

    const config = getRoleConfig();
    const RoleIcon = config.icon;

    return (
        <div className="flex flex-col h-full relative overflow-hidden bg-[hsl(var(--background))] rounded-xl group shadow-inner shadow-black/80 font-mono">
            {/* Phase Aura Background */}
            <PhaseAura phase={currentPhase} />

            {/* Header / HUD - Compact */}
            <div className="h-9 border-b border-white/5 flex items-center px-4 justify-between bg-black/20 z-10 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="relative scale-50 origin-left -mr-3">
                        <AIAvatar phase={currentPhase} isProcessing={localStream.some(s => s.isTyping)} />
                    </div>
                    <div className={clsx("text-xs font-bold tracking-widest flex items-center gap-1.5", config.accent)}>
                        <RoleIcon size={12} />
                        <span style={{ textShadow: '0 0 8px currentColor' }}>AI_{config.label}</span>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] text-white/20">
                    <div className={clsx("w-1 h-1 rounded-full", client ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
                    {client ? "ONLINE" : "OFFLINE"}
                </div>
            </div>

            {/* Context Shelf - Hidden for cleaner UI, can be re-enabled */}

            {/* Stream Area - Vertical Timeline OR Shadow Terminal */}
            <div
                className="flex-1 overflow-hidden relative"
            >
               {/* Using ShadowTerminal for the output area as requested */}
               <ShadowTerminal actions={localStream} />
            </div>

            {/* Elite HUD Enhancements */}
            <AgentControls phase={currentPhase} />

            {/* Omnibar Input */}
            <div className="p-4 shrink-0 z-20 bg-[#050505] border-t border-white/10">
                <div className={clsx(
                    "relative group flex items-stretch overflow-hidden rounded-xl",
                    "border border-white/10 transition-all duration-200",
                    "focus-within:border-white/20 focus-within:bg-black/40",
                    "focus-within:shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                )}>
                    {/* Autocomplete Menu */}
                    {autocompleteOpen && filteredAutocompleteItems.length > 0 && (
                        <div className="absolute bottom-full left-0 right-0 mb-2 z-50">
                            <div className="mx-2 rounded-lg border border-white/10 bg-black/90 shadow-xl overflow-hidden">
                                <div className="px-3 py-2 text-[10px] text-white/40 font-mono border-b border-white/10">
                                    {autocompleteKind === 'slash' ? 'Commands' : autocompleteKind === 'mention' ? 'Agents' : 'Macros'}
                                </div>
                                <div className="max-h-56 overflow-y-auto">
                                    {filteredAutocompleteItems.map((cmd, idx) => (
                                        <button
                                            key={cmd.id}
                                            type="button"
                                            onMouseEnter={() => setAutocompleteActiveIndex(idx)}
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => insertAutocompleteItem(cmd)}
                                            className={clsx(
                                                "w-full text-left px-3 py-2 flex items-start gap-3 font-mono",
                                                idx === autocompleteActiveIndex ? "bg-white/10" : "bg-transparent hover:bg-white/5"
                                            )}
                                            aria-selected={idx === autocompleteActiveIndex}
                                        >
                                            <div className="text-white/90 text-xs w-16 shrink-0">{cmd.label}</div>
                                            <div className="text-white/40 text-xs">{cmd.description}</div>
                                        </button>
                                    ))}
                                </div>
                                <div className="px-3 py-2 text-[10px] text-white/30 border-t border-white/10">
                                    ↑/↓ to navigate • Enter/Tab to insert • Esc to close
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Prefix Icon */}
                    <div className="w-10 flex items-start pt-3 justify-center text-white/30 group-focus-within:text-white/50 transition-colors">
                        <span className="font-mono text-lg">❯</span>
                    </div>

                    <div className="flex-1 flex flex-col py-2">
                        <div className="flex flex-wrap gap-1 min-h-[18px] text-[10px] uppercase tracking-wider text-white/40">
                            {(() => {
                                const preview = parseInput(inputValue);
                                if (!inputValue.trim()) return null;

                                const chips: { label: string; tone: string }[] = [];
                                const modeLabel = preview.mode === 'terminal' ? 'Terminal' : preview.mode === 'chat' ? 'Chat' : 'Command';
                                chips.push({ label: modeLabel, tone: preview.mode === 'terminal' ? 'border-emerald-500/30 text-emerald-300/80' : preview.mode === 'chat' ? 'border-sapphire-500/30 text-sapphire-300/80' : 'border-amber-500/30 text-amber-300/80' });
                                if (preview.agentTarget) {
                                    chips.push({ label: `Agent: ${preview.agentTarget.label.replace('@', '').toUpperCase()}`, tone: 'border-cyan-500/30 text-cyan-300/80' });
                                }
                                if (preview.command) {
                                    chips.push({ label: `/${preview.command}`, tone: 'border-white/20 text-white/50' });
                                }
                                if (preview.macro) {
                                    chips.push({ label: `Macro: ${preview.macro.label}`, tone: 'border-emerald-500/20 text-emerald-300/70' });
                                }
                                return chips.map((chip) => (
                                    <span
                                        key={chip.label}
                                        className={clsx(
                                            "px-2 py-0.5 rounded-full border bg-black/30",
                                            chip.tone
                                        )}
                                    >
                                        {chip.label}
                                    </span>
                                ));
                            })()}
                        </div>
                        <textarea
                            ref={textareaRef}
                            value={inputValue}
                            onChange={(e) => {
                                const next = e.target.value;
                                setInputValue(next);
                                updateAutocompleteFromInput(next);
                            }}
                            onKeyDown={(e) => {
                                if (autocompleteOpen) {
                                    if (e.key === 'Escape') {
                                        e.preventDefault();
                                        setAutocompleteOpen(false);
                                        return;
                                    }
                                    if (e.key === 'ArrowDown') {
                                        e.preventDefault();
                                        setAutocompleteActiveIndex((prev) => Math.min(prev + 1, filteredAutocompleteItems.length - 1));
                                        return;
                                    }
                                    if (e.key === 'ArrowUp') {
                                        e.preventDefault();
                                        setAutocompleteActiveIndex((prev) => Math.max(prev - 1, 0));
                                        return;
                                    }
                                    if (e.key === 'Enter' || e.key === 'Tab') {
                                        const cmd = filteredAutocompleteItems[autocompleteActiveIndex];
                                        if (cmd) {
                                            e.preventDefault();
                                            insertAutocompleteItem(cmd);
                                            return;
                                        }
                                    }
                                }

                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    void handleSend();
                                }
                            }}
                            placeholder={config.placeholder}
                            className="flex-1 bg-transparent border-none focus:ring-0 text-white/90 placeholder:text-white/20 resize-none px-0 min-h-[48px] max-h-[200px] text-sm font-mono leading-relaxed focus:outline-none"
                        />
                    </div>

                    <div className="flex flex-col justify-end p-2">
                        <button
                            onClick={() => void handleSend()}
                            disabled={!inputValue.trim()}
                            className={clsx(
                                "p-2.5 rounded-lg transition-all duration-fast",
                                inputValue.trim()
                                    ? `${config.accent} hover:scale-110 active:scale-95 bg-white/5 hover:bg-white/10`
                                    : "text-white/10"
                            )}
                        >
                            <Send size={16} className={clsx(
                                "transition-transform duration-fast",
                                inputValue.trim() ? "translate-x-0" : "translate-x-1 opacity-0"
                            )} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
