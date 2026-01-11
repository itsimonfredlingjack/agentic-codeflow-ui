"use client";

import React from 'react';
import { PlayCircle, Clock, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';

// Mock Data for Runs
const MOCK_RUNS = [
    { id: 'run-ac92-f3e1', phase: 'deploy', status: 'active', timestamp: '2m ago' },
    { id: 'run-8b21-x992', phase: 'review', status: 'paused', timestamp: '1h ago' },
    { id: 'run-77a1-b223', phase: 'build', status: 'completed', timestamp: '3h ago' },
    { id: 'run-11x2-99az', phase: 'plan', status: 'archived', timestamp: '1d ago' },
];

interface RunListProps {
    currentRunId: string;
    onSelectRun: (id: string) => void;
}

export function RunList({ currentRunId, onSelectRun }: RunListProps) {
    return (
        <div className="flex flex-col h-full">
            <div className="px-4 py-3 text-xs font-bold tracking-widest text-white/40 uppercase">
                Recent Sessions
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 px-2 custom-scrollbar">
                {MOCK_RUNS.map((run) => (
                    <button
                        key={run.id}
                        onClick={() => onSelectRun(run.id)}
                        className={clsx(
                            "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all border group",
                            currentRunId === run.id
                                ? "bg-white/10 border-white/10 text-white shadow-lg"
                                : "hover:bg-white/5 border-transparent text-white/50 hover:text-white/80"
                        )}
                    >
                        {/* Status Icon */}
                        <div className={clsx(
                            "relative flex items-center justify-center w-8 h-8 rounded-md bg-black/40 border border-white/10 transition-colors",
                            currentRunId === run.id && "border-white/20"
                        )}>
                            {run.status === 'active' ? (
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            ) : run.status === 'paused' ? (
                                <div className="w-2 h-2 rounded-full bg-amber-500" />
                            ) : (
                                <CheckCircle2 size={12} className="text-white/30" />
                            )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-mono font-bold truncate group-hover:text-emerald-400 transition-colors">
                                #{run.id.split('-')[1]}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className={clsx(
                                    "text-[10px] uppercase font-bold px-1.5 py-0.5 rounded",
                                    run.phase === 'plan' && "bg-blue-500/20 text-blue-300",
                                    run.phase === 'build' && "bg-emerald-500/20 text-emerald-300",
                                    run.phase === 'review' && "bg-amber-500/20 text-amber-300",
                                    run.phase === 'deploy' && "bg-purple-500/20 text-purple-300",
                                )}>
                                    {run.phase}
                                </span>
                                <span className="text-[10px] text-white/30 flex items-center gap-1">
                                    <Clock size={8} /> {run.timestamp}
                                </span>
                            </div>
                        </div>

                        {/* Hover Action */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <PlayCircle size={14} className="text-emerald-500" />
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

// Add to globals.css if needed, or inline standard scrollbar
