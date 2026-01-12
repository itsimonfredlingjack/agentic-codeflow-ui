"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useMachine } from '@xstate/react';
import type { SnapshotFrom } from 'xstate';
import { ReviewGate } from './ReviewGate';
import { AgentWorkspace } from './AgentWorkspace';
import { ActionCardProps, RuntimeEvent } from '@/types';
import { LayoutGrid, Cpu, Shield, Zap, Activity, PanelLeft, Settings, ChevronsRight } from 'lucide-react';
import clsx from 'clsx';
import { missionControlMachine } from '@/machines/missionControlMachine';

import { SettingsModal } from './SettingsModal';
import { CommandPalette } from './CommandPalette';
import { LogicVisualizer } from './LogicVisualizer';
import { AgentSelector } from './AgentSelector';
import { ProjectTodos } from './ProjectTodos';
import { StatusBar } from './StatusBar';

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

const phases = [
    { id: 'plan', label: 'PLAN', color: 'var(--sapphire)', icon: LayoutGrid },
    { id: 'build', label: 'BUILD', color: 'var(--emerald)', icon: Cpu },
    { id: 'review', label: 'REVIEW', color: 'var(--amber)', icon: Shield },
    { id: 'deploy', label: 'DEPLOY', color: 'var(--amethyst)', icon: Zap },
] as const;

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
    const [leftPanelOpen, setLeftPanelOpen] = useState(true);
    const [rightPanelOpen, setRightPanelOpen] = useState(true);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isCmdPaletteOpen, setIsCmdPaletteOpen] = useState(false);
    const [activeAgentId, setActiveAgentId] = useState('architect');
    const sessionStartRef = useRef(Date.now());

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
    }, [snapshot.context.runId]);

    const handleCommand = (cmdId: string) => {
        switch (cmdId) {
            case 'toggle-left': setLeftPanelOpen(prev => !prev); break;
            case 'toggle-right': setRightPanelOpen(prev => !prev); break;
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

    const currentPhase = (Object.keys(PHASE_MAP).find(key => matchesPhase(key)) || 'plan') as 'plan' | 'build' | 'review' | 'deploy';
    const isLockdown = snapshot.matches('security_lockdown');

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

    // Poll for events from SQLite "Task Ledger"
    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const res = await fetch(`/api/events?runId=${snapshot.context.runId}`);
                if (res.ok) {
                    const data = await res.json();
                    const filteredEvents = (data as RuntimeEvent[]).filter((event) => {
                        if (event.type === 'OLLAMA_BIT') return false;
                        if (event.type === 'OLLAMA_CHAT_STARTED') return false;
                        const timestamp = event.header?.timestamp;
                        if (typeof timestamp !== 'number') return false;
                        return timestamp >= sessionStartRef.current;
                    });
                    
                     // Map RuntimeEvent to ActionCardProps for the UI
                    const mappedEvents: ActionCardProps[] = filteredEvents.map((event: RuntimeEvent, index: number): ActionCardProps => {
                        const base = {
                            id: `${snapshot.context.runId}-${index}`,
                            runId: snapshot.context.runId,
                            timestamp: new Date(event.header.timestamp).toLocaleTimeString(),
                            phase: currentPhase,
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
                            default:
                                return { ...base, type: 'log' as const, title: event.type, content: JSON.stringify(event) };
                        }
                    });
                    
                    setActions(mappedEvents);
                }
            } catch (err) {
                console.error("Failed to fetch ledger:", err);
            }
        };

        fetchEvents(); // Initial load
        const interval = setInterval(fetchEvents, 2000); // Poll every 2s
        return () => clearInterval(interval);
    }, [snapshot.context.runId, currentPhase]);

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
        <div className="grid h-screen w-full text-white overflow-hidden p-4 pb-0 gap-4 transition-all duration-500 ease-in-out" style={{
            gridTemplateColumns: `${leftPanelOpen ? '260px' : '0px'} minmax(400px, 1fr) ${rightPanelOpen ? '340px' : '0px'}`,
            gridTemplateRows: 'auto 1fr auto',
            ...({ '--active-aura': phases.find(p => p.id === currentPhase)?.color } as React.CSSProperties)
        }}>

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
                    { id: 'toggle-left', label: 'Toggle Sidebar', shortcut: 'Cmd+B', icon: PanelLeft, onSelect: () => handleCommand('toggle-left') },
                    { id: 'new-run', label: 'New Session', shortcut: 'Cmd+R', icon: Zap, onSelect: () => handleCommand('new-run') },
                    { id: 'open-settings', label: 'Settings', shortcut: 'Cmd+,', icon: Settings, onSelect: () => handleCommand('open-settings') }
                ]}
            />

            {/* 1. Header Board (HUD Style) */}
            <header className="col-span-3 flex items-center justify-between px-6 z-50 relative h-16">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setLeftPanelOpen(!leftPanelOpen)}
                        className={clsx("p-2 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors", !leftPanelOpen && "bg-white/5 text-emerald-400")}
                    >
                        <PanelLeft size={18} />
                    </button>
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-2 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                    >
                        <Settings size={18} />
                    </button>
                    <div className="h-6 w-px bg-white/10" />
                    <div className="text-xl font-bold tracking-widest text-white/90 glow-text">Agentic<span className="text-white/40">Code</span></div>
                    <div className="h-6 w-px bg-white/10" />
                    <div className="text-xs font-mono text-white/50">PROJECT: GLASS PIPELINE</div>
                </div>

                {/* Minimalist Phase HUD */}
                <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center w-[400px]">
                    {/* THE RAIL SYSTEM */}
                    <div className="absolute h-px w-full bg-white/5 z-0" />

                    <div className="flex items-center gap-10 relative z-10">
                        {phases.map((phase, i) => {
                            const isActive = currentPhase === phase.id;
                            return (
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                <div key={phase.id} className="flex items-center gap-2 relative group cursor-pointer bg-[hsl(var(--background))] px-2 z-10 transition-colors" onClick={() => send({ type: 'SET_STAGE', stage: phase.id } as any)}>
                                    {i > 0 && <ChevronsRight size={12} className="text-white/10 absolute -left-5" />}
                                    <div className={clsx(
                                        "text-sm font-mono transition-all duration-300",
                                        isActive ? "text-(--active-aura) font-bold glow-text scale-110" : "text-white/20 group-hover:text-white/50"
                                    )}>
                                        {phase.label}
                                    </div>
                                    {isActive && (
                                        <div className="absolute -bottom-2 left-0 right-0 h-px bg-(--active-aura) shadow-[0_0_10px_var(--active-aura)]" />
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="h-6 w-px bg-white/10" />
                    <button
                        onClick={() => setRightPanelOpen(!rightPanelOpen)}
                        className={clsx("p-2 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors", !rightPanelOpen && "bg-white/5 text-amber-400")}
                    >
                        <Activity size={18} />
                    </button>
                    <div className={clsx("w-2 h-2 rounded-full", isLockdown ? "bg-red-500 animate-ping" : "animate-pulse")} style={{ background: isLockdown ? undefined : 'var(--active-aura)' }} />
                    <span className={clsx("text-xs font-mono", isLockdown ? "text-red-500 font-bold" : "text-white/50")}>
                        {isLockdown ? "LOCKDOWN" : "ONLINE"}
                    </span>
                </div>
            </header>

            {/* 2. Context Panel (Left) - Glassy */}
            <aside className="glass-panel p-4 rounded-xl flex flex-col gap-4 relative">
                <div className="flex-3 overflow-y-auto pr-1 flex flex-col gap-4 custom-scrollbar">
                    {/* Active Run Card */}
                    <div className="flex flex-col gap-2 border-b border-white/5 pb-4">
                        <div className="flex items-center justify-between">
                            <div className="text-xs font-bold text-white/40 uppercase tracking-widest">Active Run</div>
                            <button
                                onClick={() => {
                                    if (confirm("New Run?")) send({ type: 'RESET_RUN' });
                                }}
                                className="text-[10px] bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-white/60 hover:text-white transition-colors"
                            >
                                + NEW
                            </button>
                        </div>
                        <div className="font-mono text-sm text-emerald-400">#{snapshot.context.runId}</div>
                        <div className="text-[10px] text-white/50">Started 14:02:45</div>
                    </div>
                    {/* Agent Selection Section */}
                    <AgentSelector
                        currentAgentId={activeAgentId}
                        onSelectAgent={setActiveAgentId}
                    />

                    {/* Project Tasks */}
                    <ProjectTodos />
                </div>

                <div className="flex flex-col gap-2 pt-4 border-t border-white/5">
                    <button className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-all text-white/40 hover:text-white group">
                        <div className="flex items-center gap-3">
                            <Activity size={16} className="group-hover:text-amber-400 transition-colors" />
                            <span className="text-xs font-bold uppercase tracking-widest">Recent Sessions</span>
                        </div>
                        <ChevronsRight size={14} className="opacity-0 group-hover:opacity-100 transition-all translate-x-[-4px] group-hover:translate-x-0" />
                    </button>
                </div>
            </aside>

            {/* 3. Main Stage (Center - Agent Console) - SOLID */}
            {/* Removed glass-panel class to allow AgentWorkspace to be the solid container */}
            <main className="p-0 rounded-xl relative group flex flex-col overflow-hidden">
                {/* Unified Agent Workspace */}
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

            {/* 4. Insight Panel (Right) - Glassy */}
            <aside className="glass-panel p-5 rounded-xl flex flex-col relative overflow-hidden gap-4">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <LogicVisualizer currentPhase={currentPhase} onTransition={(event) => send({ type: event } as any)} />
                <div className="h-px bg-white/5 w-full my-2" />
                <div className="text-xs font-bold text-white/40 uppercase tracking-wider">System Status</div>

                {/* Memory Usage / Context Window */}
                <div className="glass-card p-4 rounded flex flex-col gap-3">
                    <div className="flex justify-between items-center pb-2 border-b border-white/5">
                        <span className="text-xs text-white/50">Context Window</span>
                        <span className="text-xs font-mono text-emerald-400">14%</span>
                    </div>
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 w-[14%]" />
                    </div>
                    <div className="text-[10px] text-white/30 font-mono">
                        4,096 / 32,000 TOKENS
                    </div>
                </div>

                {/* Active Artifacts */}
                <div className="glass-card p-4 rounded flex flex-col gap-2">
                    <div className="text-xs text-white/50 mb-1">Active Artifacts</div>
                    <div className="flex items-center gap-2 text-xs text-white/80 p-2 bg-white/5 rounded">
                        <LayoutGrid size={12} className="text-sapphire-400" />
                        <span>implementation_plan.md</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/80 p-2 bg-white/5 rounded">
                        <Cpu size={12} className="text-emerald-400" />
                        <span>MissonControl.tsx</span>
                    </div>
                </div>

                <div className="mt-auto flex flex-col gap-4 pt-4 border-t border-white/5">
                    {/* Review Summary Stats */}
                    {currentPhase === 'review' && (
                        <div className="flex gap-2">
                            <div className="flex-1 bg-red-500/10 border border-red-500/20 rounded p-2 text-center">
                                <div className="text-sm font-bold text-red-400">0</div>
                                <div className="text-[10px] text-red-500/60 uppercase">Errors</div>
                            </div>
                            <div className="flex-1 bg-yellow-500/10 border border-yellow-500/20 rounded p-2 text-center">
                                <div className="text-sm font-bold text-yellow-400">2</div>
                                <div className="text-[10px] text-yellow-500/60 uppercase">Warns</div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-center">
                        {currentPhase === 'review' ? (
                            <ReviewGate onUnlock={handleUnlock} />
                        ) : (
                            <div className="text-center text-xs text-white/20 italic">
                                {currentPhase === 'deploy' ? 'Deployment Active' : 'All Systems Nominal'}
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Status Bar (Claude Code Style) */}
            <div className="col-span-3">
                <StatusBar
                    currentPhase={currentPhase}
                    eventCount={actions.length}
                    isProcessing={false}
                />
            </div>
        </div>
    );
}
