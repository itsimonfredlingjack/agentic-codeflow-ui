"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useMachine } from '@xstate/react';
import type { SnapshotFrom } from 'xstate';
import { ReviewGate } from './ReviewGate';
import { AgentWorkspace } from './AgentWorkspace';
import { ActionCardProps, RuntimeEvent } from '@/types';
import { useAgencyClient } from '@/lib/client';
import { Zap, Shield, Settings } from 'lucide-react';
import { missionControlMachine } from '@/machines/missionControlMachine';

import { SettingsModal } from './SettingsModal';
import { usePhaseShortcuts } from '@/hooks/usePhaseShortcuts';

import { CommandPalette } from './CommandPalette';

import { ProjectTodos } from './ProjectTodos';
import { StatusBar } from './StatusBar';
import { RoleNavigator } from './RoleNavigator';
import { DEFAULT_MODEL_ASSIGNMENTS } from '@/lib/models';
import { RoleId } from '@/lib/roles';

type MissionPersistedSnapshot = {
    status: string;
    value: string | Record<string, string>;
    context: {
        runId: string;
        agentId: string | null;
        error: string | null;
    };
    children?: Record<string, unknown>;
    historyValue?: Record<string, unknown>;
    tags?: string[];
    output?: unknown;
    error?: unknown;
};

const isPersistedSnapshot = (value: unknown): value is MissionPersistedSnapshot => {
    if (!value || typeof value !== 'object') return false;
    const record = value as Record<string, unknown>;
    return (
        typeof record.status === 'string' &&
        'value' in record &&
        'context' in record
    );
};

// Mapping XState values to UI phases
const PHASE_MAP: Record<string, 'plan' | 'build' | 'review' | 'deploy'> = {
    'plan': 'plan',
    'build': 'build',
    'review': 'review',
    'deploy': 'deploy'
};

export function MissionControl() {
    const [initialSnapshot, setInitialSnapshot] = useState<MissionPersistedSnapshot | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadSession = async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1500);

            try {
                const res = await fetch('/api/run', { signal: controller.signal });
                if (res.ok) {
                    const data = await res.json();
                    const candidate = data?.snapshot ?? data?.context;
                    if (candidate && isPersistedSnapshot(candidate)) {
                        console.log("Resuming session:", data.id);
                        setInitialSnapshot(candidate);
                    }
                }
            } catch (err) {
                if (err instanceof Error && err.name === 'AbortError') {
                    console.warn("Session load timeout");
                } else {
                    console.warn("Failed to load session", err);
                }
            } finally {
                clearTimeout(timeoutId);
                setIsLoading(false);
            }
        };
        loadSession();
    }, []);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-white/50">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <div className="font-mono text-xs tracking-widest">INITIALIZING TASK LEDGER...</div>
            </div>
        );
    }

    return <MissionControlInner initialSnapshot={initialSnapshot} />;
}

function MissionControlInner({ initialSnapshot }: { initialSnapshot?: MissionPersistedSnapshot | null }) {
    // Note: Internal usage guarded by strict types now.
    const machineOptions = initialSnapshot
        ? { snapshot: initialSnapshot as unknown as SnapshotFrom<typeof missionControlMachine> }
        : undefined;
    const [snapshot, send, actorRef] = useMachine(missionControlMachine, machineOptions);
    const [actions, setActions] = useState<ActionCardProps[]>([]);
    const [modelAssignments, setModelAssignments] = useState(DEFAULT_MODEL_ASSIGNMENTS);

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isCmdPaletteOpen, setIsCmdPaletteOpen] = useState(false);
    const sessionStartRef = useRef(Date.now());
    const currentPhaseRef = useRef<'plan' | 'build' | 'review' | 'deploy'>('plan');
    const lastConnectionStatusRef = useRef<'connecting' | 'open' | 'error' | 'closed' | null>(null);
    const { lastEvent, connectionStatus } = useAgencyClient(snapshot.context.runId);

    // Command Palette Logic
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsCmdPaletteOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        sessionStartRef.current = Date.now();
        setActions([]);
        lastConnectionStatusRef.current = null;
    }, [snapshot.context.runId]);


    const handleCommand = (cmdId: string) => {
        switch (cmdId) {

            case 'open-settings': setIsSettingsOpen(true); break;
            case 'new-run':
                if (confirm("Start new session?")) send({ type: 'RESET_RUN' });
                break;
            case 'clear-logs': console.clear(); break; // Or implement clear state
        }
    };

    // Derived state for UI compatibility
    // Safe check using both direct string match and object match for hierarchical states
    const matchesPhase = (phase: string) => {
        if (typeof snapshot.value === 'string') return snapshot.value === phase;
        if (typeof snapshot.value === 'object') return phase in snapshot.value;
        return false;
    };

    // Auto-Layout based on Phase (Simplified for Zen Mode)
    // We no longer toggle panels, we just adapt the workspace
    // But we keep the state for now in case we want overlay drawers later

    const currentPhase = (Object.keys(PHASE_MAP).find(key => matchesPhase(key)) || 'plan') as 'plan' | 'build' | 'review' | 'deploy';
    const isLockdown = snapshot.matches('security_lockdown');

    // Phase Shortcuts
    usePhaseShortcuts(currentPhase, (newPhase) => {
        send({ type: 'SET_STAGE', stage: newPhase } as any);
    });

    useEffect(() => {
        const prev = lastConnectionStatusRef.current;
        if (prev === connectionStatus) return;
        lastConnectionStatusRef.current = connectionStatus;
        if (!prev) return;

        let message: string | null = null;
        let severity: 'info' | 'warn' = 'info';

        if (connectionStatus === 'error') {
            message = 'Stream lost. Reconnecting...';
            severity = 'warn';
        } else if (connectionStatus === 'open') {
            message = prev === 'error' ? 'Stream reconnected.' : 'Stream connected.';
        } else if (connectionStatus === 'closed' && prev === 'open') {
            message = 'Stream closed.';
            severity = 'warn';
        }

        if (!message) return;

        const logItem: ActionCardProps = {
            id: `conn-${snapshot.context.runId}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            runId: snapshot.context.runId,
            timestamp: new Date().toLocaleTimeString(),
            phase: currentPhaseRef.current,
            agentId: 'SYSTEM',
            type: 'log',
            title: 'Stream',
            content: message,
            severity,
        };

        setActions((prevActions) => [...prevActions, logItem]);
    }, [connectionStatus, snapshot.context.runId]);

    // Persistence Loop: Save Snapshot on Change
    useEffect(() => {
        if (snapshot.context.runId === 'INIT') return; // Don't save pending init

        const saveState = async () => {
            try {
                const persisted = actorRef.getPersistedSnapshot();
                await fetch('/api/run', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: snapshot.context.runId,
                        snapshot: persisted,
                        status: typeof snapshot.value === 'string' ? snapshot.value : JSON.stringify(snapshot.value)
                    })
                });
            } catch (err) {
                console.error("Persistence failed:", err);
            }
        };

        // Debounce simple save
        const timer = setTimeout(saveState, 1000);
        return () => clearTimeout(timer);
    }, [snapshot, actorRef]);

    const toAction = (event: RuntimeEvent, idSuffix: string): ActionCardProps => {
        const base = {
            id: `${snapshot.context.runId}-${idSuffix}`,
            runId: snapshot.context.runId,
            timestamp: new Date(event.header.timestamp).toLocaleTimeString(),
            phase: currentPhaseRef.current,
            agentId: 'SYSTEM',
            severity: 'info' as const,
        };

        switch (event.type) {
            case 'STDOUT_CHUNK':
                return { ...base, type: 'command' as const, content: event.content, title: 'STDOUT' };
            case 'STDERR_CHUNK':
                return { ...base, type: 'error' as const, content: event.content, title: 'STDERR', severity: 'error' as const };
            case 'WORKFLOW_ERROR':
                return {
                    ...base,
                    type: 'error' as const,
                    title: 'Error',
                    content: event.error,
                    severity: event.severity === 'fatal' ? 'error' : 'warn'
                };
            case 'OLLAMA_CHAT_COMPLETED':
                return { ...base, type: 'code' as const, title: 'Qwen', content: event.response.message.content, agentId: 'QWEN' };
            case 'OLLAMA_ERROR':
                return { ...base, type: 'error' as const, title: 'Ollama Error', content: event.error, severity: 'error' as const };
            case 'PROCESS_STARTED':
                return { ...base, type: 'log' as const, title: 'Process Started', content: `PID: ${event.pid}, Command: ${event.command}` };
            case 'PROCESS_EXITED':
                return { ...base, type: 'log' as const, title: 'Process Exited', content: `Exit code: ${event.code}` };
            case 'SECURITY_VIOLATION':
                return { ...base, type: 'error' as const, title: 'Security Violation', content: `Policy: ${event.policy}, Path: ${event.attemptedPath}`, severity: 'error' as const };
            case 'PERMISSION_REQUESTED':
                return { ...base, type: 'log' as const, title: 'Permission Request', content: `Command: ${event.command}, Risk: ${event.riskLevel}` };
            case 'SYS_READY':
                return { ...base, type: 'log' as const, title: 'System Ready', content: 'System initialized and ready.' };
            default:
                return { ...base, type: 'log' as const, title: event.type, content: JSON.stringify(event) };
        }
    };

    // Load initial events from SQLite "Task Ledger"
    useEffect(() => {
        let isActive = true;

        const fetchInitialEvents = async () => {
            try {
                const res = await fetch(`/api/events?runId=${snapshot.context.runId}`);
                if (!res.ok) return;

                const data = await res.json();
                // History Loader: Fetch all events for this run.
                // We do NOT filter by sessionStartRef here because we want to see past history on reload.
                const filteredEvents = (data as RuntimeEvent[]).filter((event) => {
                    if (event.type === 'OLLAMA_BIT') return false;
                    if (event.type === 'OLLAMA_CHAT_STARTED') return false;
                    return true;
                });

                const mappedEvents: ActionCardProps[] = filteredEvents.map((event, index) =>
                    toAction(event, `history-${index}`)
                );

                if (isActive) {
                    setActions(mappedEvents);
                }
            } catch (err) {
                console.error("Failed to fetch ledger:", err);
            }
        };

        fetchInitialEvents();
        return () => {
            isActive = false;
        };
    }, [snapshot.context.runId]);

    useEffect(() => {
        if (!lastEvent) return;
        if (lastEvent.type === 'OLLAMA_BIT' || lastEvent.type === 'OLLAMA_CHAT_STARTED') return;
        if (lastEvent.header?.sessionId !== snapshot.context.runId) return;
        const timestamp = lastEvent.header?.timestamp;
        if (typeof timestamp !== 'number' || timestamp < sessionStartRef.current) return;

        const idSuffix = `live-${lastEvent.header.correlationId}-${timestamp}-${Math.random().toString(16).slice(2)}`;
        setActions((prev) => [...prev, toAction(lastEvent, idSuffix)]);
    }, [lastEvent, snapshot.context.runId]);

    // UI Input Handler - Dispatch Intents to Host
    const handleSendMessage = async (msg: string) => {
        // 1. Dispatch intent to the Host
        try {
            await fetch('/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    runId: snapshot.context.runId,
                    intent: { type: 'INTENT_EXEC_CMD', command: msg }
                })
            });
        } catch (err) {
            console.error("Failed to dispatch intent:", err);
        }
    };

    // Handle Review Gate Unlock
    const handleUnlock = () => {
        console.log("Unlocked!");
        send({ type: 'UNLOCK_GATE' });
        setTimeout(() => send({ type: 'NEXT' }), 500);
    };

    return (
        <div className="flex flex-col h-screen w-full text-white bg-black overflow-hidden font-mono text-[13px]">
            {/* SECURITY OVERLAY */}
            {
                isLockdown && (
                    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-8">
                        <div className="bg-red-950/40 border border-red-500/50 rounded-2xl p-8 max-w-lg w-full text-center shadow-[0_0_100px_rgba(255,0,0,0.2)]">
                            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4 animate-pulse" />
                            <h2 className="text-3xl font-bold text-white mb-2 tracking-widest">SECURITY LOCKDOWN</h2>
                            <p className="text-red-200/80 mb-6 font-mono text-sm border-t border-b border-white/10 py-4 my-4">
                                {snapshot.context.error}
                            </p>
                            <button
                                onClick={() => send({ type: 'RETRY' })}
                                className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg hover:shadow-red-500/20"
                            >
                                ACKNOWLEDGE & RESET
                            </button>
                        </div>
                    </div>
                )
            }

            {/* MODALS */}
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            <CommandPalette
                isOpen={isCmdPaletteOpen}
                onClose={() => setIsCmdPaletteOpen(false)}
                actions={[
                    { id: 'new-run', label: 'New Session', shortcut: 'Cmd+R', icon: Zap, onSelect: () => handleCommand('new-run') },
                    { id: 'open-settings', label: 'Settings', shortcut: 'Cmd+,', icon: Settings, onSelect: () => handleCommand('open-settings') }
                ]}
            />
            {/* Role Deck (Top Center) */}
            <div className="absolute left-0 right-0 top-2 z-40 flex justify-center">
                <RoleNavigator
                    currentPhase={currentPhase.toUpperCase() as RoleId}
                    onSetPhase={(roleId) => send({ type: 'SET_STAGE', stage: roleId.toLowerCase() } as any)}
                    modelAssignments={modelAssignments}
                    onSetModel={(roleId, modelId) => {
                        setModelAssignments(prev => ({ ...prev, [roleId]: modelId }));
                        // Here you would also likely update the agent config on the backend
                        console.log(`Assigned ${modelId} to ${roleId}`);
                    }}
                />
            </div>

            {/* Main Stage (Center - Agent Console) - Full Width */}
            <main className="flex-1 flex flex-col overflow-hidden relative border-b border-white/10">
                <AgentWorkspace
                    runId={snapshot.context.runId}
                    currentPhase={currentPhase}
                    stream={actions} // Types match ActionCardProps
                    onSendMessage={(msg) => {
                        // Optimistic update
                        const userMsg = {
                            id: Date.now().toString(),
                            runId: snapshot.context.runId,
                            type: 'log' as const,
                            title: 'User Input',
                            content: msg,
                            timestamp: new Date().toLocaleTimeString(),
                            phase: currentPhase,
                            agentId: 'USER',
                            severity: 'info' as const,
                            isUser: true
                        };
                        setActions(prev => [...prev, userMsg]);
                        handleSendMessage(msg);
                    }}
                />
            </main>

            {/* Status Bar */}
            <StatusBar
                currentPhase={currentPhase}
                eventCount={actions.length}
                isProcessing={false}
                connectionStatus={connectionStatus}
            />
        </div>
    );
}
