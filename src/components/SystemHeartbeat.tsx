"use client";

import React, { useEffect, useState } from 'react';
import { Activity, Zap, Cpu } from 'lucide-react';

export function SystemHeartbeat() {
    const [bars, setBars] = useState<number[]>(new Array(12).fill(10));

    useEffect(() => {
        const interval = setInterval(() => {
            setBars(prev => prev.map(() => 10 + Math.random() * 40));
        }, 800);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col gap-3 p-4 rounded-xl border border-white/5 bg-black/20 relative overflow-hidden group">
            <div className="flex items-center justify-between z-10">
                <div className="flex items-center gap-2 text-xs font-bold text-white/40 uppercase tracking-widest">
                    <Activity size={14} className="text-emerald-500" />
                    System Vitals
                </div>
                <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/30" />
                </div>
            </div>

            {/* Vital Bars */}
            <div className="flex items-end justify-between h-8 gap-1 z-10">
                {bars.map((height, i) => (
                    <div
                        key={i}
                        className="w-1.5 rounded-t-sm bg-emerald-500/50 transition-all duration-700 ease-in-out group-hover:bg-emerald-400"
                        style={{ height: `${height}%`, opacity: 0.3 + (height / 100) }}
                    />
                ))}
            </div>

            {/* Metrics */}
            <div className="flex justify-between items-center text-[10px] uppercase tracking-wider text-white/30 font-mono z-10 mt-1">
                <span className="flex items-center gap-1"><Cpu size={10} /> Logic: 98%</span>
                <span className="flex items-center gap-1"><Zap size={10} /> Sync: 12ms</span>
            </div>

            {/* Background Glow */}
            <div className="absolute inset-0 bg-linear-to-t from-emerald-500/5 to-transparent pointer-events-none" />
        </div>
    );
}
