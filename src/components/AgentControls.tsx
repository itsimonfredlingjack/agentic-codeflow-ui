"use client";

import React, { useState, useEffect } from 'react';
import { Cpu, Zap, Activity, ShieldCheck, RefreshCcw, LayoutList } from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

interface AgentControlsProps {
    phase: 'plan' | 'build' | 'review' | 'deploy';
}

export function AgentControls({ phase }: AgentControlsProps) {
    const [metrics, setMetrics] = useState({ depth: 85, throughput: 12 });

    // Simulate metrics oscillation
    useEffect(() => {
        const interval = setInterval(() => {
            setMetrics({
                depth: Math.floor(80 + Math.random() * 15),
                throughput: Math.floor(10 + Math.random() * 5)
            });
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const phaseActions = {
        plan: [
            { id: 'roadmap', label: 'GENERATE ROADMAP', icon: LayoutList },
            { id: 'risk', label: 'IDENTIFY RISKS', icon: Activity }
        ],
        build: [
            { id: 'opt', label: 'OPTIMIZE LOGIC', icon: Cpu },
            { id: 'sync', label: 'SYNC CONTEXT', icon: RefreshCcw }
        ],
        review: [
            { id: 'sec', label: 'SECURITY AUDIT', icon: ShieldCheck },
            { id: 'lint', label: 'RUN LINTS', icon: Activity }
        ],
        deploy: [
            { id: 'launch', label: 'IGNITION SEQUENCE', icon: Zap },
            { id: 'health', label: 'STAGING HEALTH', icon: Activity }
        ]
    };

    const actions = phaseActions[phase] || [];

    return (
        <div className="flex items-center justify-between px-6 py-2 border-t border-white/5 bg-black/40 backdrop-blur-md relative z-20 shrink-0">
            {/* Quick Actions */}
            <div className="flex items-center gap-3">
                {actions.map((action) => (
                    <button
                        key={action.id}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/5 transition-all hover:scale-105 active:scale-95 group"
                    >
                        <action.icon size={12} className="text-white/40 group-hover:text-white transition-colors" />
                        <span className="text-[10px] font-bold text-white/50 group-hover:text-white uppercase tracking-widest font-mono">
                            {action.label}
                        </span>
                    </button>
                ))}
            </div>

            {/* Thinking Meters */}
            <div className="flex items-center gap-6">
                {/* Logic Depth */}
                <div className="flex flex-col gap-1 items-end">
                    <span className="text-[9px] text-white/30 uppercase tracking-widest font-mono">Logic Depth</span>
                    <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                            <motion.div
                                key={i}
                                animate={{ opacity: metrics.depth > (i * 20) ? 1 : 0.2 }}
                                className={clsx(
                                    "w-3 h-1 rounded-full",
                                    metrics.depth > 90 ? "bg-emerald-500" : "bg-cyan-500/50"
                                )}
                            />
                        ))}
                    </div>
                </div>

                {/* Throughput */}
                <div className="flex flex-col gap-1 items-end">
                    <span className="text-[9px] text-white/30 uppercase tracking-widest font-mono">Flow Rate</span>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-white/60">{metrics.throughput} t/s</span>
                        <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                                animate={{ width: `${(metrics.throughput / 15) * 100}%` }}
                                className="h-full bg-emerald-500/50"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
