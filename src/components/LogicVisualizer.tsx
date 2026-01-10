"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { GitBranch, ArrowRight, XCircle, CheckCircle } from 'lucide-react';
import clsx from 'clsx';
import { AnyStateMachine } from 'xstate';

interface LogicVisualizerProps {
    currentPhase: string;
    onTransition: (event: string) => void;
}

// Simplified definition of our machine logic for visualization
const MACHINE_NODES = [
    { id: 'idle', label: 'Idle', x: 50, y: 50 },
    { id: 'plan', label: 'Plan', x: 150, y: 50 },
    { id: 'build', label: 'Build', x: 250, y: 50 },
    { id: 'review', label: 'Review', x: 350, y: 50 },
    { id: 'deploy', label: 'Deploy', x: 450, y: 50 },
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

            <div className="relative h-48 w-full bg-[#0a0a0a] rounded-lg border border-white/5 overflow-hidden shadow-inner">
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
                    {MACHINE_EDGES.map((edge, i) => {
                        const sourceNode = MACHINE_NODES.find(n => n.id === edge.source)!;
                        const targetNode = MACHINE_NODES.find(n => n.id === edge.target)!;
                        // Calculate positions (mocked for now, would be dynamic in real graph)
                        // Adding random control points for curves

                        // Simple straight lines for MVP visualization 
                        // In a real app we'd use D3 or ReactFlow
                        return null;
                    })}
                </svg>

                {/* Nodes (Mock Position for MVP) */}
                <div className="flex items-center justify-between px-8 h-full relative z-10">
                    {MACHINE_NODES.map((node, index) => {
                        const isActive = currentPhase === node.id;
                        const isPast = MACHINE_NODES.findIndex(n => n.id === currentPhase) > index;

                        return (
                            <div key={node.id} className="relative flex flex-col items-center gap-2">
                                {/* Connection Line */}
                                {index < MACHINE_NODES.length - 1 && (
                                    <div className={clsx(
                                        "absolute top-4 left-[50%] w-[200%] h-[2px] -z-10 transition-colors duration-500",
                                        isPast ? "bg-emerald-500/20" : "bg-white/5"
                                    )} />
                                )}

                                <motion.div
                                    animate={{
                                        scale: isActive ? 1.1 : 1,
                                        borderColor: isActive ? 'var(--active-aura)' : 'rgba(255,255,255,0.1)'
                                    }}
                                    className={clsx(
                                        "w-8 h-8 rounded-full border-2 flex items-center justify-center bg-[#0a0a0a] transition-colors duration-300",
                                        isActive ? "shadow-[0_0_15px_rgba(var(--active-aura),0.4)]" : "text-white/20"
                                    )}
                                >
                                    {isActive ? (
                                        <div className="w-2 h-2 rounded-full bg-[var(--active-aura)] animate-pulse" />
                                    ) : isPast ? (
                                        <CheckCircle size={12} className="text-emerald-500/50" />
                                    ) : (
                                        <div className="w-2 h-2 rounded-full bg-white/10" />
                                    )}
                                </motion.div>
                                <div className={clsx(
                                    "text-[10px] uppercase font-bold tracking-wider",
                                    isActive ? "text-white" : "text-white/30"
                                )}>
                                    {node.label}
                                </div>

                                {/* Active Logic Actions */}
                                {isActive && (
                                    <div className="absolute top-12 flex flex-col gap-1 w-24 items-center">
                                        {MACHINE_EDGES.filter(e => e.source === node.id).map(edge => (
                                            <button
                                                key={edge.event}
                                                onClick={() => onTransition(edge.event)}
                                                className={clsx(
                                                    "px-2 py-1 rounded text-[10px] font-mono border w-full transition-all hover:scale-105",
                                                    edge.type === 'warn' ? "bg-amber-500/10 border-amber-500/30 text-amber-500" :
                                                        edge.type === 'error' ? "bg-red-500/10 border-red-500/30 text-red-500" :
                                                            "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
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
