"use client";

import React, { useMemo, useRef, useState, useEffect } from 'react';
import type { ActionCardProps, OllamaChatMessage, AgentIntent } from '@/types';
import { AgentControls } from './AgentControls';
import { useAgencyClient } from '@/lib/client';
import { ShadowTerminal } from './ShadowTerminal';
import { PhaseAura } from './PhaseAura';

// Refactored Sub-Components
import { WorkspaceInput } from './WorkspaceInput';
import { WorkspaceHeader } from './WorkspaceHeader';
import { ContextShelf } from './ContextShelf';

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
    payload?: Record<string, unknown>;
}

interface AgentWorkspaceProps {
    runId: string;
    currentPhase: 'plan' | 'build' | 'review' | 'deploy';
    stream: StreamItem[];
    onSendMessage: (message: string) => void;
}

export function AgentWorkspace({ runId, currentPhase, stream: initialStream, onSendMessage }: AgentWorkspaceProps) {
    const [localStream, setLocalStream] = useState<StreamItem[]>(initialStream);
    const [memoryNotes, setMemoryNotes] = useState<string[]>([]);
    const [pinnedNotes, setPinnedNotes] = useState<string[]>([]);
    const [workingGoal, setWorkingGoal] = useState('');
    const [chatHistory, setChatHistory] = useState<OllamaChatMessage[]>([
        { role: 'system', content: buildSystemPrompt([], [], '') }
    ]);
    const hasHydratedStream = useRef(false);

    const { lastEvent, client } = useAgencyClient(runId);

    // Reset local state when run changes
    useEffect(() => {
        hasHydratedStream.current = false;
        setLocalStream([]);
        setMemoryNotes([]);
        setPinnedNotes([]);
        setWorkingGoal('');
        setChatHistory([{ role: 'system', content: buildSystemPrompt([], [], '') }]);
    }, [runId]);

    // Hydrate stream once per run (avoid clobbering optimistic UI)
    useEffect(() => {
        if (hasHydratedStream.current) return;
        if (initialStream.length === 0) return;

        // Rebuild chat history from stream (simple reconstruction)
        // Ideally, we would have the full chat history in the ledger, but for now we reconstruct context
        const reconstructedHistory: OllamaChatMessage[] = [{ role: 'system', content: buildSystemPrompt([], [], '') }];
        initialStream.forEach(item => {
            if (item.type === 'log' && item.title === 'User Prompt') {
                reconstructedHistory.push({ role: 'user', content: item.content });
            } else if (item.type === 'code' && item.agentId === 'QWEN') {
                reconstructedHistory.push({ role: 'assistant', content: item.content });
            }
        });
        setChatHistory(capChatHistory(reconstructedHistory));

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
            phase: currentPhase,
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
                return;
        }

        setLocalStream(prev => [...prev, item]);
    }, [lastEvent, currentPhase, runId]);

    // Rebuild system prompt when context changes
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

    const latestTerminalOutput = useMemo(() => {
        for (let i = localStream.length - 1; i >= 0; i -= 1) {
            const item = localStream[i];
            if (item.type === 'command' || (item.type === 'error' && item.agentId !== 'USER')) {
                return item;
            }
        }
        return null;
    }, [localStream]);

    const truncateText = (value: string, max = 360) => {
        if (value.length <= max) return value;
        return `${value.slice(0, max)}...`;
    };

    const handleSystemCommand = async (command: string, payload: string) => {
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
                    return;
                }
                const normalized = truncateText(payload.trim().replace(/\s+/g, ' '), 240);
                if (!normalized) {
                    appendSystemLog('Goal', 'Missing goal. Usage: /goal <text>', 'warn');
                    return;
                }
                setWorkingGoal(normalized);
                appendSystemLog('Goal', `Working goal set: ${normalized}`);
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleSendMessage = async (parsed: any, rawValue: string) => {
        const agentPrefix = parsed.agentTarget ? `[${parsed.agentTarget.label}] ` : '';
        const payload = `${agentPrefix}${parsed.payload}`;
        const title = parsed.macro
            ? `Macro ${parsed.macro.label}`
            : parsed.mode === 'chat'
                ? 'User Prompt'
                : 'User Command';

        // Optimistic UI
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

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
                e.preventDefault();
                setLocalStream([]); // Clear
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const config = useMemo(() => {
        switch (currentPhase) {
            case 'plan': return { accent: 'text-[var(--sapphire)]', placeholder: 'Describe your vision or ask for blueprint changes...' };
            case 'build': return { accent: 'text-[var(--emerald)]', placeholder: 'Enter build command, debugging query, or /llm prompt...' };
            case 'review': return { accent: 'text-[var(--amber)]', placeholder: 'Ask about security risks or approve changes...' };
            default: return { accent: 'text-[var(--amethyst)]', placeholder: 'Command deployment...' };
        }
    }, [currentPhase]);

    return (
        <div className="flex flex-col h-full relative overflow-hidden bg-[hsl(var(--background))] rounded-xl group shadow-inner shadow-black/80 font-mono">
            {/* Phase Aura Background */}
            <PhaseAura phase={currentPhase} />

            <WorkspaceHeader
                currentPhase={currentPhase}
                isConnected={!!client}
                isProcessing={localStream.some(s => s.isTyping)}
            />

            <ContextShelf
                memoryNotes={memoryNotes}
                pinnedNotes={pinnedNotes}
                workingGoal={workingGoal}
                setWorkingGoal={setWorkingGoal}
                setPinnedNotes={setPinnedNotes}
                latestTerminalOutput={latestTerminalOutput}
                onSystemLog={appendSystemLog}
            />

            {/* Stream Area */}
            <div className="flex-1 overflow-hidden relative">
               <ShadowTerminal actions={localStream} />
            </div>

            <AgentControls phase={currentPhase} />

            <WorkspaceInput
                currentPhase={currentPhase}
                config={config}
                onSend={handleSendMessage}
                onSystemCommand={handleSystemCommand}
            />
        </div>
    );
}
