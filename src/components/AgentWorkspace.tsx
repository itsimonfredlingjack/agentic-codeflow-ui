"use client";

import React, { useMemo, useRef, useState, useEffect } from 'react';
import type { ActionCardProps, OllamaChatMessage, AgentIntent } from '@/types';
import type { RoleId } from '@/lib/roles';
import { ROLES } from '@/lib/roles';
import { AgentControls } from './AgentControls';
import { useAgencyClient } from '@/lib/client';
import { ShadowTerminal } from './ShadowTerminal';

// Smart Context System
import {
    SessionContext,
    createSessionContext,
    buildPhasePrompt,
    storePhaseOutput,
    addError,
    setUserRequest,
    getContextSummary
} from '@/lib/contextProvider';

// Refactored Sub-Components
import { WorkspaceInput } from './WorkspaceInput';
import { WorkspaceHeader } from './WorkspaceHeader';
import { ASCII_LOGOS } from '@/lib/ascii';


// System prompts are now dynamically generated per phase via contextProvider.ts
// See: src/lib/roles.ts for phase-specific prompts
// See: src/lib/contextProvider.ts for context injection logic

// Helper to cap chat history: keep system prompt + last 20 non-system messages
const capChatHistory = (history: OllamaChatMessage[]): OllamaChatMessage[] => {
    if (history.length === 0) return history;
    const nonSystem = history.slice(1);
    const cappedNonSystem = nonSystem.slice(-20);
    return [history[0], ...cappedNonSystem];
};

// Auto-detect and wrap code in markdown fences if not already wrapped
const ensureCodeFencing = (content: string): string => {
    // Already has code fences? Return as-is
    if (/```[\w]*\n/.test(content)) return content;

    // Patterns that strongly suggest code
    const codePatterns = [
        /^(function|const|let|var|class|import|export|interface|type)\s+\w+/m,
        /^(def|class|import|from|async def)\s+\w+/m,
        /^\s*(if|for|while|switch|try)\s*\(/m,
        /=>\s*{/,
        /\(\)\s*{/,
        /^<[A-Z]\w+/m, // JSX/TSX component
        /^\s*return\s+/m,
        /\w+\.\w+\(/,  // method calls
    ];

    const looksLikeCode = codePatterns.some(pattern => pattern.test(content));
    const hasMultipleLines = content.split('\n').length > 3;
    const hasIndentation = /^\s{2,}/m.test(content);

    if (looksLikeCode && (hasMultipleLines || hasIndentation)) {
        // Try to detect language
        let lang = 'typescript'; // default
        if (/^(def|class|import|from)\s+/m.test(content) && !/^(import|export)\s+.*from/m.test(content)) {
            lang = 'python';
        } else if (/^\$\s|^npm\s|^yarn\s|^git\s/m.test(content)) {
            lang = 'bash';
        } else if (/<[A-Z]\w+/.test(content) || /className=/.test(content)) {
            lang = 'tsx';
        }

        return '```' + lang + '\n' + content.trim() + '\n```';
    }

    return content;
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

    // Map currentPhase to RoleId
    const phaseToRole = (phase: typeof currentPhase): RoleId => phase.toUpperCase() as RoleId;

    const [activeRole, setActiveRole] = useState<RoleId>(phaseToRole(currentPhase));

    // Smart Context System - session context persists across phase transitions
    const initialSessionContext = useMemo(() => createSessionContext(), []);
    const sessionContextRef = useRef<SessionContext>(initialSessionContext);

    const [chatHistory, setChatHistory] = useState<OllamaChatMessage[]>([
        { role: 'system', content: buildPhasePrompt(activeRole, initialSessionContext) }
    ]);
    const hasHydratedStream = useRef(false);
    const prevRunIdRef = useRef(runId);
    const prevPhaseRef = useRef(currentPhase);

    const { lastEvent, client } = useAgencyClient(runId);

    // Sync activeRole with currentPhase and update system prompt
    useEffect(() => {
        if (prevPhaseRef.current === currentPhase) return;
        const oldPhase = prevPhaseRef.current;
        prevPhaseRef.current = currentPhase;
        const newRole = phaseToRole(currentPhase);
        queueMicrotask(() => setActiveRole(newRole));

        // Add phase transition marker to stream
        const transitionMarker: StreamItem = {
            id: `phase-transition-${Date.now()}`,
            runId,
            type: 'log',
            title: `PHASE: ${currentPhase.toUpperCase()}`,
            content: `Switched from ${oldPhase.toUpperCase()} to ${currentPhase.toUpperCase()}`,
            timestamp: new Date().toLocaleTimeString(),
            phase: currentPhase,
            agentId: 'SYSTEM',
            severity: 'info'
        };
        setLocalStream(prev => [...prev, transitionMarker]);

        // Update system prompt with new phase context
        const newPrompt = buildPhasePrompt(newRole, sessionContextRef.current);
        setChatHistory(prev => {
            const nonSystem = prev.slice(1);
            return [{ role: 'system', content: newPrompt }, ...nonSystem];
        });

        // Log phase transition for visibility
        console.log(`[SmartContext] Phase transition: ${oldPhase} → ${currentPhase}`);
        console.log(`[SmartContext] Context summary:\n${getContextSummary(sessionContextRef.current)}`);
    }, [currentPhase, runId]);

    // Reset local state when run changes
    useEffect(() => {
        if (prevRunIdRef.current === runId) return;
        prevRunIdRef.current = runId;
        hasHydratedStream.current = false;

        // Reset session context for new run
        sessionContextRef.current = createSessionContext();

        queueMicrotask(() => {
            setLocalStream([]);
            const freshPrompt = buildPhasePrompt(activeRole, sessionContextRef.current);
            setChatHistory([{ role: 'system', content: freshPrompt }]);
        });
    }, [runId, activeRole]);

    // Hydrate stream once per run (avoid clobbering optimistic UI)
    useEffect(() => {
        if (hasHydratedStream.current) return;
        if (initialStream.length === 0) return;
        hasHydratedStream.current = true;

        // Rebuild chat history from stream (simple reconstruction)
        // Use current phase prompt (dynamic based on context)
        const currentPrompt = buildPhasePrompt(activeRole, sessionContextRef.current);
        const reconstructedHistory: OllamaChatMessage[] = [{ role: 'system', content: currentPrompt }];
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
    }, [initialStream, activeRole]);

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
                // Track errors in context for BUILD phase awareness
                addError(sessionContextRef.current, `STDERR: ${lastEvent.content.slice(0, 200)}`);
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
                item.payload = { requestId: lastEvent.requestId, command: lastEvent.command, riskLevel: lastEvent.riskLevel };
                break;
            case 'WORKFLOW_ERROR':
                item.type = 'error';
                item.title = 'Workflow Error';
                item.content = lastEvent.error;
                item.severity = lastEvent.severity === 'fatal' ? 'error' : 'warn';
                addError(sessionContextRef.current, `Workflow: ${lastEvent.error.slice(0, 200)}`);
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
            case 'OLLAMA_CHAT_COMPLETED': {
                const rawContent = lastEvent.response.message.content;
                const processedContent = ensureCodeFencing(rawContent);
                item.type = 'code';
                item.title = 'Qwen';
                item.content = processedContent;
                item.agentId = 'QWEN';

                // Store phase output for smart context pipeline
                storePhaseOutput(sessionContextRef.current, activeRole, rawContent);
                console.log(`[SmartContext] Stored ${activeRole} phase output (${rawContent.length} chars)`);
                console.log(`[DEBUG] OLLAMA_CHAT_COMPLETED received, content length: ${rawContent.length}`);
                console.log(`[DEBUG] Removing typing indicator: ${typingId}`);

                queueMicrotask(() => {
                    setLocalStream((prev) => {
                        console.log(`[DEBUG] Before filter: ${prev.length} items, typing found: ${prev.some(x => x.id === typingId)}`);
                        return prev.filter((x) => x.id !== typingId);
                    });
                    setChatHistory(prev => capChatHistory([...prev, { role: 'assistant', content: rawContent }]));
                });
                break;
            }
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

        console.log(`[DEBUG] Adding item to stream: ${item.title}, type: ${item.type}`);
        queueMicrotask(() => {
            setLocalStream(prev => {
                console.log(`[DEBUG] Stream append: ${prev.length} → ${prev.length + 1} items`);
                return [...prev, item];
            });
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
                        '- /help, /models, /clear, /resume, /context',
                        '- /chat <prompt>, /llm <prompt>, /exec <cmd>, /cmd <cmd>',
                        'Mentions:',
                        '- @plan, @build, @review, @deploy',
                        '- @engineer, @designer, @reviewer',
                        'Macros:',
                        '- !test, !lint, !build'
                    ].join('\n')
                );
                return;
            }
            case 'context': {
                // Debug command to show smart context state
                const summary = getContextSummary(sessionContextRef.current);
                const phaseOutputs = Array.from(sessionContextRef.current.phaseOutputs.entries())
                    .map(([phase, output]) => `${phase}: ${output.summary.slice(0, 100)}...`)
                    .join('\n');
                appendSystemLog(
                    'Smart Context Status',
                    [
                        `Current Phase: ${activeRole}`,
                        `Role: ${ROLES[activeRole].label}`,
                        '',
                        summary,
                        '',
                        phaseOutputs ? `Phase Outputs:\n${phaseOutputs}` : 'No phase outputs yet.'
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
            case 'resume': {
                appendSystemLog('Sessions', 'Fetching previous sessions...');
                try {
                    const res = await fetch('/api/run?list=true&limit=10');
                    if (!res.ok) {
                        appendSystemLog('Sessions', 'Failed to fetch sessions', 'error');
                        return;
                    }
                    const data = await res.json();
                    const sessions = data?.sessions || [];
                    if (sessions.length === 0) {
                        appendSystemLog('Sessions', 'No previous sessions found.');
                        return;
                    }
                    const lines = sessions.map((s: { id: string; createdAt: number; eventCount: number }, i: number) => {
                        const date = new Date(s.createdAt).toLocaleString();
                        const isCurrent = s.id === runId;
                        return `${i + 1}. ${s.id}${isCurrent ? ' (current)' : ''}\n   ${date} • ${s.eventCount} events`;
                    });
                    appendSystemLog(
                        'Available Sessions',
                        lines.join('\n\n') + '\n\nTo resume: reload page with ?runId=RUN-xxx'
                    );
                } catch (error) {
                    appendSystemLog('Sessions', error instanceof Error ? error.message : String(error), 'error');
                }
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

        // Store user request in context (for PLAN phase context injection)
        if (parsed.mode === 'chat') {
            setUserRequest(sessionContextRef.current, payload);
        }

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
                    messages: nextHistory,
                    model: ROLES[activeRole].model  // Use role-specific model
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

            <WorkspaceHeader
                currentPhase={currentPhase}
                isConnected={!!client}
                isProcessing={localStream.some(s => s.isTyping)}
            />

            {/* Stream Area */}
            <div className="flex-1 overflow-hidden relative">
                <ShadowTerminal
                    actions={localStream}
                    splitView={currentPhase === 'build'}
                    onApprovePermission={(requestId) => {
                        appendSystemLog('Permission', `Approved: ${requestId}`);
                        void client.send({ type: 'INTENT_GRANT_PERMISSION', requestId }).catch((error) => {
                            appendSystemLog(
                                'Permission',
                                error instanceof Error ? error.message : String(error),
                                'error'
                            );
                        });
                    }}
                    onDenyPermission={(requestId) => {
                        appendSystemLog('Permission', `Denied: ${requestId}`, 'warn');
                        void client.send({ type: 'INTENT_DENY_PERMISSION', requestId }).catch((error) => {
                            appendSystemLog(
                                'Permission',
                                error instanceof Error ? error.message : String(error),
                                'error'
                            );
                        });
                    }}
                />
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
