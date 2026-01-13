"use client";

import React, { useMemo, useRef, useState, useEffect } from 'react';
import type { ActionCardProps, OllamaChatMessage, AgentIntent } from '@/types';
import type { RoleId } from '@/lib/roles';
import { AgentControls } from './AgentControls';
import { useAgencyClient } from '@/lib/client';
import { ShadowTerminal } from './ShadowTerminal';


// Refactored Sub-Components
import { WorkspaceInput } from './WorkspaceInput';
import { WorkspaceHeader } from './WorkspaceHeader';
import { ASCII_HEADERS, ASCII_LOGOS } from '@/lib/ascii';


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

    const [activeRole, setActiveRole] = useState<RoleId>('PLAN');
    const [chatHistory, setChatHistory] = useState<OllamaChatMessage[]>([
        { role: 'system', content: DEFAULT_SYSTEM_PROMPT }
    ]);
    const hasHydratedStream = useRef(false);
    const prevRunIdRef = useRef(runId);

    const { lastEvent, client } = useAgencyClient(runId);

    // Reset local state when run changes
    useEffect(() => {
        if (prevRunIdRef.current === runId) return;
        prevRunIdRef.current = runId;
        hasHydratedStream.current = false;
        queueMicrotask(() => {
            setLocalStream([]);

            setChatHistory([{ role: 'system', content: DEFAULT_SYSTEM_PROMPT }]);
        });
    }, [runId]);

    // Hydrate stream once per run (avoid clobbering optimistic UI)
    useEffect(() => {
        if (hasHydratedStream.current) return;
        if (initialStream.length === 0) return;
        hasHydratedStream.current = true;

        // Rebuild chat history from stream (simple reconstruction)
        // Ideally, we would have the full chat history in the ledger, but for now we reconstruct context
        const reconstructedHistory: OllamaChatMessage[] = [{ role: 'system', content: DEFAULT_SYSTEM_PROMPT }];
        initialStream.forEach(item => {
            if (item.type === 'log' && item.title === 'User Prompt') {
                reconstructedHistory.push({ role: 'user', content: item.content });
            } else if (item.type === 'code' && item.agentId === 'QWEN') {
                reconstructedHistory.push({ role: 'assistant', content: item.content });
            }
        });
        queueMicrotask(() => {
            setChatHistory(capChatHistory(reconstructedHistory));
            setLocalStream((prev) => (prev.length === 0 ? initialStream : prev));
        });
    }, [initialStream]);

    // Handle Real-time Events
    useEffect(() => {
        if (!lastEvent) return;

        if (lastEvent.type === 'OLLAMA_BIT') return;

        const correlationId = lastEvent.header.correlationId;
        const typingId = `typing-${correlationId}`;
        const phaseHeader = ASCII_HEADERS[currentPhase.toUpperCase() as keyof typeof ASCII_HEADERS] || '';

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
                queueMicrotask(() => {
                    setLocalStream((prev) => {
                        const withoutTyping = prev.filter((x) => x.id !== typingId);
                        return [
                            ...withoutTyping,
                            {
                                id: typingId,
                                runId,
                                type: 'log',
                                title: 'Qwen',
                                content: `${ASCII_LOGOS.AGENT}\nThinking...`,
                                timestamp: new Date(lastEvent.header.timestamp).toLocaleTimeString(),
                                phase: currentPhase,
                                agentId: 'QWEN',
                                severity: 'info',
                                isTyping: true,
                            },
                        ];
                    });
                });
                return;
            case 'OLLAMA_CHAT_COMPLETED':
                item.type = 'code';
                item.title = 'Qwen';
                item.content = `${phaseHeader}\n${lastEvent.response.message.content}`;
                item.agentId = 'QWEN';
                queueMicrotask(() => {
                    setLocalStream((prev) => prev.filter((x) => x.id !== typingId));
                    setChatHistory(prev => capChatHistory([...prev, { role: 'assistant', content: lastEvent.response.message.content }]));
                });
                break;
            case 'OLLAMA_CHAT_FAILED':
                item.type = 'error';
                item.title = 'Ollama Chat Failed';
                item.content = lastEvent.error;
                item.severity = 'error';
                queueMicrotask(() => {
                    setLocalStream((prev) => prev.filter((x) => x.id !== typingId));
                });
                break;
            case 'OLLAMA_ERROR':
                item.type = 'error';
                item.title = 'Ollama Error';
                item.content = lastEvent.error;
                item.severity = 'error';
                queueMicrotask(() => {
                    setLocalStream((prev) => prev.filter((x) => x.id !== typingId));
                });
                break;
            case 'SYS_READY':
                // Clean log - just show ready state
                item.type = 'log';
                item.title = 'System Ready';
                item.content = `${ASCII_LOGOS.SYSTEM}\nSystem initialized and ready.`;
                break;
            default:
                return;
        }

        queueMicrotask(() => {
            setLocalStream(prev => [...prev, item]);
        });
    }, [lastEvent, currentPhase, runId]);



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
            {/* Phase Aura Background REMOVED */}\n

            <WorkspaceHeader
                currentPhase={currentPhase}
                isConnected={!!client}
                isProcessing={localStream.some(s => s.isTyping)}
            />



            {/* Stream Area */}
            <div className="flex-1 overflow-hidden relative">
                <ShadowTerminal actions={localStream} splitView={currentPhase === 'build'} />
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
