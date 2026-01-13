"use client";

import React, { useState, useRef } from 'react';
import clsx from 'clsx';
import { StreamItem } from './AgentWorkspace'; // Will need to import StreamItem type or redefine it

// Re-defining for decoupling if needed, but for now referencing AgentWorkspace is tricky if we want to avoid circular deps.
// Better to just define the interface here.
export interface ShelfStreamItem {
    content: string;
    type: string;
    agentId?: string;
}

interface ContextShelfProps {
    memoryNotes: string[];
    pinnedNotes: string[];
    workingGoal: string;
    setWorkingGoal: (goal: string) => void;
    setPinnedNotes: (notes: string[] | ((prev: string[]) => string[])) => void;
    latestTerminalOutput: ShelfStreamItem | null;
    onSystemLog: (title: string, content: string, severity?: 'info' | 'warn' | 'error') => void;
}

export function ContextShelf({
    memoryNotes,
    pinnedNotes,
    workingGoal,
    setWorkingGoal,
    setPinnedNotes,
    latestTerminalOutput,
    onSystemLog
}: ContextShelfProps) {
    const [goalStatus, setGoalStatus] = useState<{ message: string; tone: 'ok' | 'warn' } | null>(null);
    const goalStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const truncateText = (value: string, max = 360) => {
        if (value.length <= max) return value;
        return `${value.slice(0, max)}...`;
    };

    const addPinnedNote = (note: string, source: string) => {
        const trimmed = note.trim();
        if (!trimmed) {
            onSystemLog('Pin', 'No text selected to pin.', 'warn');
            return;
        }
        const normalized = truncateText(trimmed.replace(/\s+/g, ' '));
        setPinnedNotes((prev) => [...prev, normalized]);
        onSystemLog('Pin', `Pinned from ${source}.`);
    };

    const handlePinSelection = () => {
        const selection = window.getSelection()?.toString() ?? '';
        addPinnedNote(selection, 'selection');
    };

    const handlePinLatestOutput = () => {
        if (!latestTerminalOutput) {
            onSystemLog('Pin', 'No terminal output to pin yet.', 'warn');
            return;
        }
        addPinnedNote(latestTerminalOutput.content, 'terminal output');
    };

    const flashGoalStatus = (message: string, tone: 'ok' | 'warn') => {
        if (goalStatusTimerRef.current) {
            clearTimeout(goalStatusTimerRef.current);
        }
        setGoalStatus({ message, tone });
        goalStatusTimerRef.current = setTimeout(() => {
            setGoalStatus(null);
        }, 2000);
    };

    return (
        <div className="px-6 py-3 border-b border-white/5 bg-black/30">
            <div className="flex items-center justify-between text-tiny uppercase tracking-widest text-white/40">
                <span>Context Shelf</span>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handlePinSelection}
                        className="px-2 py-1 rounded border border-white/10 text-white/60 hover:text-white hover:border-white/30 transition-colors"
                    >
                        Pin selection
                    </button>
                </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
                <div className="flex flex-col gap-2">
                    <div className="text-tiny uppercase tracking-widest text-white/30">Working goal</div>
                    <input
                        value={workingGoal}
                        onChange={(e) => {
                            setWorkingGoal(e.target.value);
                            setGoalStatus(null);
                        }}
                        placeholder="What are we trying to do?"
                        className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-xs text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/30"
                    />
                    {goalStatus && (
                        <div className={clsx(
                            "text-tiny uppercase tracking-widest",
                            goalStatus.tone === 'ok' ? "text-emerald-400/80" : "text-amber-400/80"
                        )}>
                            {goalStatus.message}
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-tiny uppercase tracking-widest text-white/30">
                        <span>Latest terminal output</span>
                        <button
                            type="button"
                            onClick={handlePinLatestOutput}
                            className="text-tiny text-white/40 hover:text-white transition-colors"
                        >
                            Pin output
                        </button>
                    </div>
                    <div className="min-h-[56px] rounded border border-white/10 bg-black/40 p-2 text-xs text-white/70 whitespace-pre-wrap">
                        {latestTerminalOutput ? truncateText(latestTerminalOutput.content, 220) : 'No terminal output yet.'}
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <div className="text-tiny uppercase tracking-widest text-white/30">Pinned</div>
                    <div className="min-h-[56px] rounded border border-white/10 bg-black/40 p-2 text-xs text-white/70 space-y-2 max-h-28 overflow-y-auto">
                        {pinnedNotes.length === 0 && (
                            <div className="text-white/30">Pin text from output to keep context.</div>
                        )}
                        {pinnedNotes.map((note, idx) => (
                            <div key={`${note}-${idx}`} className="flex items-start gap-2">
                                <span className="text-white/40">•</span>
                                <span className="flex-1">{note}</span>
                                <button
                                    type="button"
                                    onClick={() => setPinnedNotes((prev) => prev.filter((_, i) => i !== idx))}
                                    className="text-white/30 hover:text-white/70 transition-colors"
                                    aria-label="Remove pinned note"
                                >
                                    x
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
