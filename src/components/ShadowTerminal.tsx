"use client";

import React, { useRef, useEffect, useState } from 'react';
import { ActionCard } from './ActionCard';
import { ActionCardProps } from '@/types';
import { AnimatePresence } from 'framer-motion';
import { List, CreditCard, Search, ArrowDown, Pause, Play } from 'lucide-react';
import clsx from 'clsx';

interface ShadowTerminalProps {
    actions: ActionCardProps[];
}

type ViewMode = 'cards' | 'raw';
type StreamCategory = 'chat' | 'terminal' | 'agent' | 'error';

export function ShadowTerminal({ actions }: ShadowTerminalProps) {
    const bottomRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('cards');
    const [autoScroll, setAutoScroll] = useState(true);
    const SCROLL_BOTTOM_THRESHOLD_PX = 24;

    // Power Tools (v3.0)
    const [showChat, setShowChat] = useState(true);
    const [showTerminal, setShowTerminal] = useState(true);
    const [showAgent, setShowAgent] = useState(true);
    const [showErrors, setShowErrors] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Apply filters
    const visibleActions = actions.filter(a => {
        const isChat = (a.agentId === 'USER' || a.agentId === 'QWEN') && a.type !== 'command';
        const isTerminal = a.type === 'command' || a.title === 'STDOUT' || a.title === 'STDERR';
        const isError = a.type === 'error' || a.severity === 'error';
        const category: StreamCategory = isError ? 'error' : isChat ? 'chat' : isTerminal ? 'terminal' : 'agent';
        const categoryEnabled = (
            (category === 'chat' && showChat) ||
            (category === 'terminal' && showTerminal) ||
            (category === 'agent' && showAgent) ||
            (category === 'error' && showErrors)
        );
        if (!categoryEnabled) return false;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return a.title.toLowerCase().includes(query) || a.content.toLowerCase().includes(query);
        }
        return true;
    });

    useEffect(() => {
        if (!autoScroll) return;

        const raf = requestAnimationFrame(() => {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        });

        return () => cancelAnimationFrame(raf);
    }, [visibleActions.length, autoScroll, viewMode]);

    return (
        <div
            className="w-full h-full rounded-xl flex flex-col overflow-hidden relative border border-white/10 bg-[#050505]"
            role="region"
            aria-label="Shadow Terminal Output"
            style={{
                // Tuned default sizes (can be made configurable later)
                ['--terminal-font-size' as unknown as keyof React.CSSProperties]: '14.5px',
                ['--terminal-code-font-size' as unknown as keyof React.CSSProperties]: '13px',
            }}
        >
            {/* Header / Toolbar */}
            <div className="h-12 border-b border-white/10 flex items-center px-4 justify-between bg-black/40 z-10 gap-4">
                <div className="flex items-center gap-4 flex-1">
                    {/* Filters */}
                    <div className="flex items-center bg-black/30 rounded-lg p-1 gap-1 border border-white/10">
                        {[
                            { id: 'chat', label: 'Chat', active: showChat, onClick: () => setShowChat((prev) => !prev) },
                            { id: 'terminal', label: 'Terminal', active: showTerminal, onClick: () => setShowTerminal((prev) => !prev) },
                            { id: 'agent', label: 'Agent', active: showAgent, onClick: () => setShowAgent((prev) => !prev) },
                            { id: 'error', label: 'Errors', active: showErrors, onClick: () => setShowErrors((prev) => !prev) },
                        ].map((chip) => (
                            <button
                                key={chip.id}
                                onClick={chip.onClick}
                                className={clsx(
                                    "px-2 py-1 rounded text-xs font-mono transition-colors",
                                    chip.active ? "bg-white/10 text-white" : "text-white/40 hover:text-white/80"
                                )}
                                aria-pressed={chip.active}
                            >
                                {chip.label}
                            </button>
                        ))}
                    </div>

                    {/* Search Bar */}
                    <div className="relative group flex-1 max-w-xs">
                        <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/70 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search stream..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-black/30 border border-white/10 rounded text-xs py-1.5 pl-7 pr-2 text-white placeholder-white/20 focus:outline-none focus:bg-black/40 focus:border-white/20 transition-all font-mono"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* View Toggle */}
                    <div className="flex items-center bg-black/30 rounded-lg p-1 gap-1 border border-white/10">
                        <button
                            onClick={() => setViewMode('cards')}
                            className={clsx(
                                "p-1.5 rounded transition-colors",
                                viewMode === 'cards' ? "bg-white/10 text-white" : "text-white/40 hover:text-white/80"
                            )}
                            aria-label="Switch to Card View"
                            aria-pressed={viewMode === 'cards'}
                        >
                            <CreditCard size={14} />
                        </button>
                        <button
                            onClick={() => setViewMode('raw')}
                            className={clsx(
                                "p-1.5 rounded transition-colors",
                                viewMode === 'raw' ? "bg-white/10 text-white" : "text-white/40 hover:text-white/80"
                            )}
                            aria-label="Switch to Raw View"
                            aria-pressed={viewMode === 'raw'}
                        >
                            <List size={14} />
                        </button>
                    </div>
                    <button
                        onClick={() => setAutoScroll((prev) => !prev)}
                        className={clsx(
                            "flex items-center gap-1.5 px-2 py-1.5 rounded text-xs font-mono border transition-all",
                            autoScroll ? "bg-white/10 border-white/20 text-white" : "bg-transparent border-white/10 text-white/40 hover:text-white/80"
                        )}
                        aria-pressed={autoScroll}
                    >
                        {autoScroll ? <Play size={12} /> : <Pause size={12} />}
                        <span>{autoScroll ? 'Auto-scroll on' : 'Auto-scroll off'}</span>
                    </button>
                    <button
                        onClick={() => {
                            setAutoScroll(true);
                            bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
                        }}
                        className={clsx(
                            "flex items-center gap-1.5 px-2 py-1.5 rounded text-xs font-mono border transition-all",
                            autoScroll ? "border-white/10 text-white/40 hover:text-white/80" : "bg-white/10 border-white/20 text-white"
                        )}
                    >
                        <ArrowDown size={12} />
                        <span>Jump to latest</span>
                    </button>
                    <div className="text-xs font-mono text-white/40 hidden md:block">STREAM</div>
                </div>
            </div>

            {/* Content Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 scroll-smooth"
                onScroll={(e) => {
                    const target = e.currentTarget;
                    const distanceFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
                    setAutoScroll(distanceFromBottom < SCROLL_BOTTOM_THRESHOLD_PX);
                }}
            >
                {viewMode === 'cards' ? (
                    <AnimatePresence mode='sync'>
                        {visibleActions.map((action) => (
                            <ActionCard key={action.id} {...action} />
                        ))}
                    </AnimatePresence>
                ) : (
                    <div className="font-mono text-xs space-y-1 text-white/80 selection:bg-white/20">
                        {visibleActions.map((action) => (
                            <div key={action.id} className="flex gap-3 hover:bg-white/5 p-1 rounded">
                                <span className="opacity-50 select-none w-20">{action.timestamp}</span>
                                <span className={clsx(
                                    "font-bold uppercase w-16 select-none",
                                    action.type === 'error' ? 'text-red-400' : 'text-blue-400'
                                )}>{action.type}</span>
                                <span className="flex-1 break-all whitespace-pre-wrap">{action.title} {action.content && `| ${action.content}`}</span>
                            </div>
                        ))}
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input Placeholder */}
            <div className="p-3 border-t border-white/10 bg-black/40 flex gap-2 font-mono text-sm shadow-2xl">
                <span className="text-emerald-500">❯</span>
                <span className="text-white/50">Output stream</span>
            </div>
        </div>
    );
}
