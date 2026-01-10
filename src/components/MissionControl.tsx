"use client";

import React, { useState, useEffect } from 'react';
import { useMachine } from '@xstate/react';
import { ReviewGate } from './ReviewGate';
import { AgentWorkspace } from './AgentWorkspace';
import { ActionCardProps } from '@/types';
import { LayoutGrid, Cpu, Shield, Zap, Activity, PanelLeft, Settings } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { missionControlMachine } from '@/machines/missionControlMachine';
import { RunList } from './RunList';
import { SettingsModal } from './SettingsModal';
import { CommandPalette } from './CommandPalette';

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
    const [initialSnapshot, setInitialSnapshot] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadSession = async () => {
            try {
                const res = await fetch('/api/run');
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.context) {
                        console.log("Resuming session:", data.id);
                        setInitialSnapshot(data.context);
                    }
                }
            } catch (err) {
                console.warn("Failed to load session", err);
            } finally {
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

function MissionControlInner({ initialSnapshot }: { initialSnapshot?: any }) {
    const [snapshot, send] = useMachine(missionControlMachine, {
        snapshot: initialSnapshot
    });
    const [actions, setActions] = useState<ActionCardProps[]>([]);
    const [leftPanelOpen, setLeftPanelOpen] = useState(true);
    const [rightPanelOpen, setRightPanelOpen] = useState(true);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isCmdPaletteOpen, setIsCmdPaletteOpen] = useState(false);

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
    const isLocked = matchesPhase('review') && snapshot.matches({ review: 'locked' });
    const isLockdown = snapshot.matches('security_lockdown');

    // Persistence Loop: Save Snapshot on Change
    useEffect(() => {
        if (snapshot.context.runId === 'INIT') return; // Don't save pending init

        const saveState = async () => {
            try {
                await fetch('/api/run', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: snapshot.context.runId,
                        context: snapshot, // Saving FULL snapshot
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
    }, [snapshot]);

    // Poll for events from SQLite "Task Ledger"
    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const res = await fetch('/api/events');
                if (res.ok) {
                    const data = await res.json();
                    setActions(data);
                }
            } catch (err) {
                console.error("Failed to fetch ledger:", err);
            }
        };

        fetchEvents(); // Initial load
        const interval = setInterval(fetchEvents, 1000); // Poll every 1s
        return () => clearInterval(interval);
    }, []);

    // Simulate AGENT WRITING to the Ledger
    // In a real app, this would be the backend agent process, not the UI
    useEffect(() => {
        if (isLockdown) return; // Stop simulation in lockdown

        // Whitelisted commands that pass Sentinel
        const safeCommands = [
            'npm install lodash',
            'npm run build',
            'git status',
            'git add .',
            'mkdir components',
            'echo "Build complete"'
        ];

        const timer = setInterval(async () => {
            const seed = Math.random();
            let type: string = 'log';
            let title = 'Phase Update';
            let content = `Processing step in ${currentPhase} sequence...`;
            let payload = {};

            // Simulate Structured Events based on Phase
            if (currentPhase === 'plan' && seed > 0.7) {
                type = 'plan_artifact';
                title = 'Architecture Draft';
                content = JSON.stringify({
                    title: "System Architecture v1.0",
                    modules: [
                        { name: "Auth Service", description: "Handles JWT issuance and validation" },
                        { name: "Payment Gateway", description: "Stripe integration via Webhooks" }
                    ]
                });
            } else if (currentPhase === 'build' && seed > 0.6) {
                type = 'build_status';
                title = seed > 0.8 ? 'Compiling Assets' : 'Installing Dependencies';
                content = '';
                payload = { progress: Math.floor(Math.random() * 100) };
            } else if (currentPhase === 'review' && seed > 0.8) {
                type = 'security_gate';
                title = 'Security Check';
                content = '';
                payload = {
                    policy: "No Hardcoded Secrets",
                    status: Math.random() > 0.5 ? 'pass' : 'warn'
                };
            } else if (currentPhase === 'build' && seed > 0.4 && seed < 0.6) {
                type = 'code';
                title = 'Generated Component';
                content = `import React from 'react';\n\nexport const GeneratedComponent = () => {\n  return (\n    <div className="p-4 bg-emerald-500/10">\n      <h1>Auto-Generated</h1>\n    </div>\n  );\n};`;
            } else if (seed > 0.9) {
                type = 'command';
                title = 'Executed Command';
                content = safeCommands[Math.floor(Math.random() * safeCommands.length)];
            }

            const newAction: ActionCardProps & { payload?: any } = {
                id: Math.random().toString(),
                runId: snapshot.context.runId,
                type: type as any,
                title: title,
                content: content,
                timestamp: new Date().toLocaleTimeString(),
                phase: currentPhase,
                agentId: currentPhase === 'plan' ? 'architect-01' : 'builder-01',
                severity: 'info',
                payload: payload
            };

            // Post to API (Task Ledger)
            await fetch('/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newAction)
            });
        }, 4000);
        return () => clearInterval(timer);
    }, [currentPhase, snapshot.context.runId, isLockdown]);

    // Handle Review Gate Unlock
    const handleUnlock = () => {
        console.log("Unlocked!");
        send({ type: 'UNLOCK_GATE' });
        setTimeout(() => send({ type: 'NEXT' }), 500);
    };

    return (
        <div className="grid h-screen w-full text-white overflow-hidden p-4 gap-4 transition-all duration-500 ease-in-out" style={{
            gridTemplateColumns: `${leftPanelOpen ? '260px' : '0px'} minmax(400px, 1fr) ${rightPanelOpen ? '340px' : '0px'}`,
            gridTemplateRows: 'auto 1fr',
            ['--active-aura' as any]: phases.find(p => p.id === currentPhase)?.color
        }}>

            {/* SECURITY OVERLAY */}
            {isLockdown && (
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
            )}

            {/* 1. Header Board (Top) */}
            <header className="col-span-3 glass-panel rounded-xl flex items-center justify-between px-6 z-50 bg-[#000000]/20 backdrop-blur-md">
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
                    <div className="h-6 w-[1px] bg-white/10" />
                    <div className="text-xl font-bold tracking-widest text-white/90">AGENCY<span className="text-white/40">OS</span></div>
                    <div className="h-6 w-[1px] bg-white/10" />
                    <div className="text-xs font-mono text-white/50">PROJECT: GLASS PIPELINE</div>
                </div>

                {/* Pipeline Tracker */}
                <div className="flex bg-black/20 rounded-full p-1 border border-white/5" role="tablist" aria-label="Pipeline Stages">
                    {phases.map((phase) => {
                        const isActive = currentPhase === phase.id;
                        const Icon = phase.icon;
                        return (
                            <button
                                key={phase.id}
                                role="tab"
                                aria-selected={isActive}
                                onClick={() => send({ type: 'SET_STAGE', stage: phase.id as any })}
                                className={clsx(
                                    "px-4 py-2 rounded-full flex items-center gap-2 text-xs font-bold transition-all relative",
                                    isActive ? "text-white" : "text-white/40 hover:text-white/70"
                                )}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 rounded-full bg-white/10 border border-white/20 shadow-lg backdrop-blur-sm"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <Icon size={14} style={{ color: isActive ? phase.color : undefined }} />
                                <span className="relative z-10">{phase.label}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="flex items-center gap-3">
                    <div className="h-6 w-[1px] bg-white/10" />
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

            {/* 2. Context Panel (Left) - Sticky */}
            <aside className="glass-panel p-4 rounded-xl flex flex-col gap-4 relative">
                <div className="flex-1 overflow-hidden flex flex-col gap-4">
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

                    {/* Run List */}
                    <RunList
                        currentRunId={`run-${snapshot.context.runId}`}
                        onSelectRun={(id) => console.log("Selected run:", id)}
                    />
                </div>

                <div className="text-xs font-bold text-white/40 uppercase tracking-widest mt-2">Workspace</div>
                <div className="flex-1 bg-black/20 rounded border border-white/5 p-3 overflow-hidden font-mono">
                    <div className="opacity-50 text-xs space-y-2">
                        <div>📁 src/</div>
                        <div className="pl-4 text-emerald-400/80">📄 MissionControl.tsx</div>
                        <div className="pl-4">📄 ShadowTerminal.tsx</div>
                        <div className="pl-4">📄 ActionCard.tsx</div>
                        <div className="pl-4">📄 globals.css</div>
                    </div>
                </div>
            </aside>

            {/* 3. Main Stage (Center - Agent Console) */}
            <main className="glass-panel p-1 rounded-xl relative group flex flex-col overflow-hidden">
                <div className="absolute inset-0 bg-[var(--active-aura)] opacity-5 blur-3xl transition-colors duration-1000 pointer-events-none" />

                {/* Unified Agent Workspace */}
                <AgentWorkspace
                    currentPhase={currentPhase}
                    stream={actions as any} // In real app, map this properly
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
                    }}
                />
            </main>

            {/* 4. Insight Panel (Right) - Context & Memory */}
            <aside className="glass-panel p-5 rounded-xl flex flex-col relative overflow-hidden gap-4">
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

        </div>
    );
}
