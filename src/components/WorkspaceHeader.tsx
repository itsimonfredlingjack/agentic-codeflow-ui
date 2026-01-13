"use client";

import React from 'react';
import clsx from 'clsx';
import { Sparkles, Terminal, CheckCircle, ShieldAlert } from 'lucide-react';
import { Activity } from 'lucide-react';


interface WorkspaceHeaderProps {
    currentPhase: 'plan' | 'build' | 'review' | 'deploy';
    isConnected: boolean;
    isProcessing: boolean;
}

export function WorkspaceHeader({ currentPhase, isConnected, isProcessing }: WorkspaceHeaderProps) {
    // Role Configuration
    const getRoleConfig = () => {
        switch (currentPhase) {
            case 'plan': return {
                icon: Sparkles,
                label: 'ARCHITECT',
                accent: 'text-[var(--sapphire)]',
            };
            case 'build': return {
                icon: Terminal,
                label: 'ENGINEER',
                accent: 'text-[var(--emerald)]',
            };
            case 'review': return {
                icon: ShieldAlert,
                label: 'CRITIC',
                accent: 'text-[var(--amber)]',
            };
            default: return {
                icon: CheckCircle,
                label: 'DEPLOYER',
                accent: 'text-[var(--amethyst)]',
            };
        }
    };

    const config = getRoleConfig();
    const RoleIcon = config.icon;

    return (
        <div className="h-14 border-b border-white/5 flex items-center px-6 justify-between bg-black/20 z-10 shrink-0">
            <div className="flex items-center gap-4">
                <div className={clsx(
                    "w-8 h-8 rounded flex items-center justify-center border transition-colors",
                    isProcessing ? "bg-[var(--active-aura)] border-white/40" : "bg-white/5 border-white/10"
                )}>
                    <Activity size={16} className={clsx(isProcessing && "animate-pulse")} />
                </div>
                <div className={clsx("text-sm font-bold tracking-widest flex items-center gap-2", config.accent)}>
                    <RoleIcon size={14} />
                    <span style={{ textShadow: '0 0 10px currentColor' }}>AI_{config.label}</span>
                </div>
            </div>
            <div className="flex items-center gap-2 text-tiny text-white/20">
                <div className={clsx("w-1.5 h-1.5 rounded-full", isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
                {isConnected ? "ONLINE" : "OFFLINE"}
            </div>
        </div>
    );
}
