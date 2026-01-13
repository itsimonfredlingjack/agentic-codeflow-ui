"use client";

import React from 'react';
import clsx from 'clsx';
import { Wifi, WifiOff, Activity, Cpu, Layers } from 'lucide-react';

interface StatusBarProps {
    currentPhase: 'plan' | 'build' | 'review' | 'deploy';
    eventCount: number;
    isProcessing: boolean;
    connectionStatus: 'connecting' | 'open' | 'error' | 'closed' | null;
}

export function StatusBar({ currentPhase, eventCount, isProcessing, connectionStatus }: StatusBarProps) {
    const isOnline = connectionStatus === 'open';

    return (
        <div className="flex items-center justify-between h-8 bg-[#0a0a0a] border-t border-white/10 px-4 select-none font-mono text-[10px] uppercase tracking-wider text-white/40">
            {/* Left Section: Mode & Connection */}
            <div className="flex items-center gap-4">
                <div className={clsx("flex items-center gap-2 px-2 py-0.5 rounded", {
                    'bg-sapphire-900/20 text-sapphire-400': currentPhase === 'plan',
                    'bg-emerald-900/20 text-emerald-400': currentPhase === 'build',
                    'bg-amber-900/20 text-amber-400': currentPhase === 'review',
                    'bg-amethyst-900/20 text-amethyst-400': currentPhase === 'deploy',
                })}>
                    <Layers size={10} />
                    <span className="font-bold">MODE::{currentPhase}</span>
                </div>

                <div className="w-px h-4 bg-white/10" />

                <div className={clsx("flex items-center gap-2", isOnline ? "text-emerald-500" : "text-red-500")}>
                    {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
                    <span>{connectionStatus || 'OFFLINE'}</span>
                </div>
            </div>

            {/* Center Section: Processing Indicator */}
            {isProcessing && (
                <div className="flex items-center gap-2 text-emerald-500 animate-pulse">
                    <Activity size={10} />
                    <span>PROCESSING...</span>
                </div>
            )}

            {/* Right Section: System Metrics */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <span>EVENTS: {eventCount}</span>
                </div>

                <div className="w-px h-4 bg-white/10" />

                <div className="flex items-center gap-2">
                    <Cpu size={10} />
                    <span>MEM: 14%</span>
                </div>
            </div>
        </div>
    );
}
