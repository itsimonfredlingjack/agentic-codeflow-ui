"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Terminal, CheckCircle, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';
import type { ActionCardProps, OllamaChatMessage, AgentIntent } from '@/types';
import { AIAvatar } from './AIAvatar';
import { PhaseAura } from './PhaseAura';
import { AgentControls } from './AgentControls';
import { useAgencyClient } from '@/lib/client';
import { ShadowTerminal } from './ShadowTerminal';

const DEFAULT_SYSTEM_PROMPT = 'You are a helpful AI assistant.';

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
    // Enhancement: Strict payload types for cards
    payload?: Record<string, unknown>;
}

interface AgentWorkspaceProps {
    runId: string;
    currentPhase: 'plan' | 'build' | 'review' | 'deploy';
    stream: StreamItem[];
    onSendMessage: (message: string) => void;
}

export function AgentWorkspace({ runId, currentPhase, stream: initialStream, onSendMessage }: AgentWorkspaceProps) {
    const [inputValue, setInputValue] = useState('');
    const [localStream, setLocalStream] = useState<StreamItem[]>(initialStream);
    const [chatHistory, setChatHistory] = useState<OllamaChatMessage[]>([{ role: 'system', content: DEFAULT_SYSTEM_PROMPT }]);
    const hasHydratedStream = useRef(false);

    const { lastEvent, client } = useAgencyClient(runId);

    // Reset local state when run changes
    useEffect(() => {
        hasHydratedStream.current = false;
        setLocalStream([]);
        setChatHistory([{ role: 'system', content: DEFAULT_SYSTEM_PROMPT }]);
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

    const handleSend = async () => {
        if (!inputValue.trim()) return;
        
        const trimmed = inputValue.trim();
        let mode: 'chat' | 'command' = 'command';
        let payload = trimmed;

        // 1. Determine Mode & Payload
        if (trimmed.startsWith('/llm ') || trimmed.startsWith('/chat ')) {
            mode = 'chat';
            payload = trimmed.replace(/^(\/llm|\/chat)\s+/, '');
        } else if (trimmed.startsWith('/exec ') || trimmed.startsWith('/cmd ')) {
            mode = 'command';
            payload = trimmed.replace(/^(\/exec|\/cmd)\s+/, '');
        } else {
            // Context-aware defaults
            if (currentPhase === 'plan' || currentPhase === 'review') {
                mode = 'chat';
            } else {
                mode = 'command';
            }
        }

        if (!payload) return;

        // 2. Optimistic UI Update
        const userMsg: StreamItem = {
            id: Date.now().toString(),
            runId,
            type: 'log',
            title: mode === 'chat' ? 'User Prompt' : 'User Command',
            content: payload,
            timestamp: new Date().toLocaleTimeString(),
            phase: currentPhase,
            agentId: 'USER',
            severity: 'info',
            isUser: true
        };
        setLocalStream(prev => [...prev, userMsg]);
        setInputValue('');

        // 3. Dispatch Logic
        if (mode === 'chat') {
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
            // Command Mode
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

            {/* Header / HUD */}
            <div className="h-14 border-b border-white/5 flex items-center px-6 justify-between bg-black/20 z-10 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="relative scale-75 origin-left">
                        <AIAvatar phase={currentPhase} isProcessing={localStream.some(s => s.isTyping)} />
                    </div>
                    <div className="flex flex-col">
                        <div className={clsx("text-sm font-bold tracking-widest flex items-center gap-2", config.accent)}>
                            <RoleIcon size={14} />
                            <span style={{ textShadow: '0 0 10px currentColor' }}>AI_{config.label}</span>
                        </div>
                        <div className="text-[10px] text-white/40 tracking-wider">
                            SESSION ID: <span className="text-white/60">{runId.slice(0, 8)}</span> • EVENTS: {localStream.length}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-white/20">
                    <div className={clsx("w-1.5 h-1.5 rounded-full", client ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
                    {client ? "SYSTEM ONLINE" : "DISCONNECTED"}
                </div>
            </div>

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
                    "relative group flex items-stretch overflow-hidden",
                    // Removed background, just border and glowing text
                )}>
                    {/* Prefix Icon */}
                    <div className="w-8 flex items-start pt-3 justify-center text-white/30">
                        <span className="font-mono text-lg">❯</span>
                    </div>

                    <textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                         onKeyDown={(e) => {
                             if (e.key === 'Enter' && !e.shiftKey) {
                                 e.preventDefault();
                                 void handleSend();
                             }
                         }}
                        placeholder={config.placeholder}
                        className="flex-1 bg-transparent border-none focus:ring-0 text-white/90 placeholder:text-white/20 resize-none py-3 px-0 min-h-[48px] max-h-[200px] text-sm font-mono leading-relaxed focus:outline-none"
                    />

                    <div className="flex flex-col justify-end p-2">
                         <button
                             onClick={() => void handleSend()}
                             disabled={!inputValue.trim()}
                             className={clsx(
                                 "p-2 rounded transition-all",
                                 inputValue.trim()
                                     ? config.accent
                                     : "text-white/10"
                             )}
                         >
                            {inputValue.trim() ? <Send size={14} /> : null}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
