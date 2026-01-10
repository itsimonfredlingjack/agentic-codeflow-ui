"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { FileJson, CheckCircle, AlertTriangle, Loader2, Lock, Unlock, ArrowRight, LayoutTemplate } from 'lucide-react';
import clsx from 'clsx';

// --- 1. Blueprint Card (PLAN Phase) ---
export function BlueprintCard({ content }: { content: string }) {
    // Parse simulated JSON content
    let planData;
    try {
        planData = JSON.parse(content);
    } catch (e) {
        planData = { title: "System Architecture", nodes: ["Unknown Node"] };
    }

    return (
        <div className="bg-[#0f172a]/80 border border-blue-500/30 rounded-xl overflow-hidden font-mono text-xs shadow-lg backdrop-blur-sm">
            <div className="bg-blue-500/10 p-3 border-b border-blue-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-300">
                    <FileJson size={14} />
                    <span className="font-bold tracking-wider">BLUEPRINT ARTIFACT</span>
                </div>
                <span className="text-[10px] text-blue-400/50">v1.0.2</span>
            </div>
            <div className="p-4 space-y-3">
                <div className="text-white/80 font-bold text-sm mb-2">{planData.title}</div>
                <div className="space-y-2">
                    {planData.modules?.map((mod: any, i: number) => (
                        <div key={i} className="flex flex-col gap-1 p-2 bg-black/40 rounded border border-white/5">
                            <div className="font-bold text-blue-200">{mod.name}</div>
                            <div className="text-white/40 pl-2 border-l border-white/10">{mod.description}</div>
                        </div>
                    ))}
                </div>
                <div className="mt-3 pt-3 border-t border-white/10 flex justify-end">
                    <button className="text-[10px] bg-blue-500 hover:bg-blue-400 text-white px-3 py-1.5 rounded transition-colors flex items-center gap-1">
                        View Full Graph <ArrowRight size={10} />
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- 2. Build Status Card (BUILD Phase) ---
export function BuildStatusCard({ title, progress }: { title: string, progress: number }) {
    const isComplete = progress === 100;

    return (
        <div className="bg-[#022c22]/80 border border-emerald-500/30 rounded-xl p-4 shadow-lg backdrop-blur-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {isComplete ? (
                        <CheckCircle size={20} className="text-emerald-400" />
                    ) : (
                        <Loader2 size={20} className="text-emerald-400 animate-spin" />
                    )}
                    <span className="font-bold text-emerald-100">{title}</span>
                </div>
                <span className="font-mono text-emerald-400/80">{progress}%</span>
            </div>

            {/* Progress Bar */}
            <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                />
            </div>

            <div className="font-mono text-[10px] text-emerald-400/50 truncate">
                {isComplete ? "Build successful. Artifacts ready." : "Compiling assets..."}
            </div>
        </div>
    );
}

// --- 3. Security Gate Card (REVIEW Phase) ---
export function SecurityGateCard({ policy, status }: { policy: string, status: 'pass' | 'fail' | 'warn' }) {
    const config = {
        pass: { color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', icon: CheckCircle },
        fail: { color: 'text-red-400', border: 'border-red-500/30', bg: 'bg-red-500/10', icon: Lock },
        warn: { color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/10', icon: AlertTriangle }
    }[status];

    const Icon = config.icon;

    return (
        <div className={clsx(
            "rounded-xl p-4 border shadow-lg backdrop-blur-sm flex items-start gap-4 transition-all hover:bg-white/5",
            config.border,
            config.bg
        )}>
            <div className={clsx("p-2 rounded-lg bg-black/20", config.color)}>
                <Icon size={20} />
            </div>
            <div className="flex-1">
                <div className={clsx("font-bold text-sm mb-1 uppercase tracking-wide", config.color)}>
                    Artifact Handoff Protocol
                </div>
                <div className="text-white/90 font-medium text-sm mb-2">
                    Policy Check: {policy}
                </div>
                <div className="flex gap-2">
                    <span className={clsx(
                        "text-[10px] px-2 py-0.5 rounded border uppercase font-bold",
                        config.border,
                        config.color
                    )}>
                        {status}
                    </span>
                    {status === 'fail' && (
                        <button className="text-[10px] text-white/50 hover:text-white underline">
                            Request Override
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
