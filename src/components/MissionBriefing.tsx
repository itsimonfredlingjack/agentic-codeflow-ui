"use client";

import React from 'react';
import { MessageSquare, BrainCircuit, GitBranch, Link2 } from 'lucide-react';

interface MissionBriefingProps {
    objective?: string;
    complexity?: 'low' | 'medium' | 'high';
    estimatedTime?: string;
}

export function MissionBriefing({
    objective = "Awaiting mission parameters...",
    complexity = 'medium',
    estimatedTime = "~15 min"
}: MissionBriefingProps) {
    const complexityColors = {
        low: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        medium: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        high: 'text-red-400 bg-red-500/10 border-red-500/30'
    };

    return (
        <div className="flex flex-col gap-3 p-4 rounded-xl border border-white/5 bg-black/20 relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-white/40 uppercase tracking-widest">
                    <BrainCircuit size={14} className="text-cyan-400" />
                    Mission Briefing
                </div>
                <div className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${complexityColors[complexity]}`}>
                    {complexity}
                </div>
            </div>

            {/* Objective */}
            <div className="text-sm text-white/70 leading-relaxed font-mono">
                "{objective}"
            </div>

            {/* Stats */}
            <div className="flex justify-between items-center text-[10px] uppercase tracking-wider text-white/30 font-mono mt-1 pt-2 border-t border-white/5">
                <span className="flex items-center gap-1">
                    <GitBranch size={10} /> 3 Phases
                </span>
                <span className="flex items-center gap-1">
                    ETA: {estimatedTime}
                </span>
            </div>

            {/* Subtle gradient */}
            <div className="absolute inset-0 bg-linear-to-br from-cyan-500/5 via-transparent to-transparent pointer-events-none" />
        </div>
    );
}
