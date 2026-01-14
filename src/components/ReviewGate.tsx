"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import clsx from 'clsx';



interface ReviewGateProps {
    onUnlock: () => void;
}

export function ReviewGate({ onUnlock }: ReviewGateProps) {
    const [checks, setChecks] = useState({
        security: true, // Mocked as passed
        tests: true,
        manual: false
    });

    const handleApprove = useCallback(() => {
        setChecks(prev => ({ ...prev, manual: true }));
        // Small delay to show checkmark
        setTimeout(() => {
            onUnlock();
        }, 200);
    }, [onUnlock]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === 'y') {
                handleApprove();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleApprove]);

    return (
        <div className="w-full bg-black/40 border border-white/10 rounded p-4 flex flex-col gap-3">
            <div className="text-[10px] font-bold tracking-widest text-white/40 uppercase mb-1">
                Gate::Evaluation
            </div>

            <div className="space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between text-emerald-500">
                    <span>[PASS] Security Scan</span>
                    <CheckCircle size={12} />
                </div>
                <div className="flex items-center justify-between text-emerald-500">
                    <span>[PASS] Unit Tests</span>
                    <CheckCircle size={12} />
                </div>
                <div className={clsx("flex items-center justify-between transition-colors", checks.manual ? "text-emerald-500" : "text-white/50")}>
                    <span>[{checks.manual ? 'PASS' : 'WAIT'}] Manual Review</span>
                    {checks.manual ? <CheckCircle size={12} /> : <div className="w-3 h-3 rounded-full border border-white/20" />}
                </div>
            </div>

            <div className="flex gap-2 mt-2">
                <button
                    onClick={handleApprove}
                    className="flex-1 bg-emerald-900/40 border border-emerald-500/50 hover:bg-emerald-500/20 text-emerald-400 py-2 rounded text-xs font-bold tracking-wider transition-all active:scale-95"
                >
                    APPROVE (Y)
                </button>
                <button
                    className="flex-1 bg-red-900/40 border border-red-500/50 hover:bg-red-500/20 text-red-400 py-2 rounded text-xs font-bold tracking-wider transition-all active:scale-95"
                >
                    REJECT (N)
                </button>
            </div>
        </div>
    );
}
