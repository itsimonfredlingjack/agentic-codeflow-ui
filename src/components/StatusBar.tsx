"use client";

import React from 'react';
import { Terminal, Cpu, Wifi, Clock } from 'lucide-react';

interface StatusBarProps {
    currentPhase: string;
    eventCount: number;
    isProcessing?: boolean;
    connectionStatus: 'connecting' | 'open' | 'error' | 'closed';
}

export function StatusBar({ currentPhase, eventCount, isProcessing, connectionStatus }: StatusBarProps) {
    const time = new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
    const statusMap = {
        open: { label: 'Connected', textClass: 'text-emerald-400/80', dotClass: 'bg-emerald-500' },
        connecting: { label: 'Connecting', textClass: 'text-amber-400/80', dotClass: 'bg-amber-400 animate-pulse' },
        error: { label: 'Reconnecting', textClass: 'text-amber-400/80', dotClass: 'bg-amber-400 animate-pulse' },
        closed: { label: 'Offline', textClass: 'text-rose-400/80', dotClass: 'bg-rose-500' },
    } as const;
    const status = statusMap[connectionStatus];

    return (
        <div className="h-6 bg-[#0a0a0a] border-t border-white/5 flex items-center justify-between px-4 text-[10px] font-mono text-white/40 select-none shrink-0">
            {/* Left: Context Path */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                    <Terminal size={10} className="text-emerald-500/60" />
                    <span className="text-white/30">~/project</span>
                    <span className="text-white/10">/</span>
                    <span className="text-white/50 uppercase">{currentPhase}</span>
                </div>

                <div className="flex items-center gap-1 text-white/20">
                    <span className="px-1 py-0.5 rounded bg-white/5">{eventCount} events</span>
                </div>

                {isProcessing && (
                    <div className="flex items-center gap-1.5 text-amber-500/60">
                        <Cpu size={10} className="animate-spin" />
                        <span>Processing...</span>
                    </div>
                )}
            </div>

            {/* Center: Keyboard Shortcuts */}
            <div className="flex items-center gap-4 text-white/20">
                <div className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 rounded bg-white/5 text-white/30 text-[9px]">⌘K</kbd>
                    <span>Commands</span>
                </div>
                <div className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 rounded bg-white/5 text-white/30 text-[9px]">⌘Enter</kbd>
                    <span>Send</span>
                </div>
                <div className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 rounded bg-white/5 text-white/30 text-[9px]">Esc</kbd>
                    <span>Cancel</span>
                </div>
            </div>

            {/* Right: System Status */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dotClass}`} />
                    <Wifi size={10} className={status.textClass} />
                    <span className={status.textClass}>{status.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Clock size={10} />
                    <span>{time}</span>
                </div>
            </div>
        </div>
    );
}
