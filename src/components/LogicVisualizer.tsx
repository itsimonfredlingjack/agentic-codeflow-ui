"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { GitBranch, CheckCircle } from 'lucide-react';
import clsx from 'clsx';

interface LogicVisualizerProps {
    currentPhase: string;
    onTransition: (event: string) => void;
}

// Simplified definition of our machine logic for visualization
const MACHINE_NODES = [
    { id: 'idle', label: 'Idle' },
    { id: 'plan', label: 'Plan' },
    { id: 'build', label: 'Build' },
    { id: 'review', label: 'Review' },
    { id: 'deploy', label: 'Deploy' },
];

const MACHINE_EDGES = [
    { source: 'idle', target: 'plan', event: 'START' },
    { source: 'plan', target: 'build', event: 'NEXT' },
    { source: 'build', target: 'review', event: 'NEXT' },
    { source: 'review', target: 'deploy', event: 'UNLOCK' },
    { source: 'deploy', target: 'idle', event: 'FINISH' },
    // Edge cases
    { source: 'build', target: 'plan', event: 'BACK', type: 'warn' },
    { source: 'review', target: 'build', event: 'REJECT', type: 'error' },
];

export function LogicVisualizer({ currentPhase, onTransition }: LogicVisualizerProps) {
    return (
        <div className="flex flex-col gap-4 p-4">
            <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
                    <GitBranch size={14} /> Logic Flow
                </div>
                <div className="text-[10px] font-mono text-emerald-500/50">ACTIVE</div>
            </div>

            <div className="relative h-44 w-full bg-[hsl(var(--background))] rounded-lg border border-white/5 overflow-hidden shadow-inner">
                {/* Grid Background */}
                <div className="absolute inset-0 opacity-10"
                    style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                />

                {/* Edges */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#444" />
                        </marker>
                    </defs>
                    {/* Edges removed for visual clarity in MVP - using simple connecting lines below */}
                </svg>

                {/* Nodes (Mock Position for MVP) */}
                <div className="flex items-center px-4 h-full relative z-10">
                    {MACHINE_NODES.map((node, index) => {
                        const isActive = currentPhase === node.id;
                        const isPast = MACHINE_NODES.findIndex(n => n.id === currentPhase) > index;

                        return (
                            <div key={node.id} className="flex-1 relative flex flex-col items-center gap-2">
                                {/* Connection Line */}
                                {index < MACHINE_NODES.length - 1 && (
                                    <div className={clsx(
                                        "absolute top-3.5 left-1/2 w-full h-px -z-10 transition-colors duration-500",
                                        isPast ? "bg-emerald-500/30" : "bg-white/10"
                                    )} />
                                )}

                                <motion.div
                                    animate={{
                                        scale: isActive ? 1.2 : 1,
                                        borderColor: isActive ? 'var(--active-aura)' : 'rgba(255,255,255,0.1)'
                                    }}
                                    className={clsx(
                                        "w-7 h-7 rounded-full border-2 flex items-center justify-center bg-[hsl(var(--background))] transition-colors duration-300",
                                        isActive ? "shadow-[0_0_15px_rgba(var(--active-aura),0.4)]" : "text-white/20"
                                    )}
                                >
                                    {isActive ? (
                                        <div className="w-1.5 h-1.5 rounded-full bg-(--active-aura) animate-pulse shadow-[0_0_8px_var(--active-aura)]" />
                                    ) : isPast ? (
                                        <CheckCircle size={10} className="text-emerald-500/50" />
                                    ) : (
                                        <div className="w-1.5 h-1.5 rounded-full bg-white/5" />
                                    )}
                                </motion.div>
                                <div className={clsx(
                                    "text-[9px] uppercase font-bold tracking-tighter transition-colors duration-300",
                                    isActive ? "text-white" : "text-white/20"
                                )}>
                                    {node.label}
                                </div>

                                {/* Active Logic Actions */}
                                {isActive && (
                                    <div className="absolute top-11 flex flex-col gap-1 w-20 items-center z-20">
                                        {MACHINE_EDGES.filter(e => e.source === node.id).map(edge => (
                                            <button
                                                key={edge.event}
                                                onClick={() => onTransition(edge.event)}
                                                className={clsx(
                                                    "px-1.5 py-0.5 rounded text-[9px] font-mono border w-full transition-all hover:scale-105 shadow-xl",
                                                    edge.type === 'warn' ? "bg-amber-500/20 border-amber-500/40 text-amber-500" :
                                                        edge.type === 'error' ? "bg-red-500/20 border-red-500/40 text-red-500" :
                                                            "bg-white/10 border-white/20 text-white/50 hover:bg-white/20 hover:text-white"
                                                )}
                                            >
                                                {edge.event} → {edge.target}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
