"use client";

import React, { useRef, useEffect, useState } from 'react';
import { ActionCard } from './ActionCard';
import { ActionCardProps } from '@/types';
import { AnimatePresence } from 'framer-motion';
import { List, CreditCard, Filter, Search } from 'lucide-react';
import clsx from 'clsx';

interface ShadowTerminalProps {
    actions: ActionCardProps[];
}

type ViewMode = 'cards' | 'raw';

export function ShadowTerminal({ actions }: ShadowTerminalProps) {
    const bottomRef = useRef<HTMLDivElement>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('cards');
    const [autoScroll, setAutoScroll] = useState(true);

    // Power Tools (v3.0)
    const [filterErrors, setFilterErrors] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Apply filters
    const visibleActions = actions.filter(a => {
        if (filterErrors && a.type !== 'error') return false;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return a.title.toLowerCase().includes(query) || a.content.toLowerCase().includes(query);
        }
        return true;
    });

    useEffect(() => {
        if (autoScroll) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [visibleActions, autoScroll, viewMode]);

    return (
        <div className="glass-panel w-full h-full rounded-xl flex flex-col overflow-hidden relative" role="region" aria-label="Shadow Terminal Output">
            {/* Header / Toolbar */}
            <div className="h-12 border-b border-white/10 flex items-center px-4 justify-between bg-black/20 backdrop-blur-md z-10 gap-4">
                <div className="flex items-center gap-4 flex-1">
                    {/* Search Bar */}
                    <div className="relative group flex-1 max-w-xs">
                        <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/70 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search logs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-black/20 border border-white/5 rounded text-xs py-1.5 pl-7 pr-2 text-white placeholder-white/20 focus:outline-none focus:bg-black/40 focus:border-white/10 transition-all font-mono"
                        />
                    </div>

                    {/* Filter Toggle */}
                    <button
                        onClick={() => setFilterErrors(!filterErrors)}
                        className={clsx(
                            "flex items-center gap-1.5 px-2 py-1.5 rounded text-xs font-mono border transition-all",
                            filterErrors ? "bg-red-500/20 border-red-500/30 text-red-300" : "bg-transparent border-transparent text-white/40 hover:bg-white/5"
                        )}
                    >
                        <Filter size={12} />
                        <span>{filterErrors ? 'Errors Only' : 'All Events'}</span>
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    {/* View Toggle */}
                    <div className="flex items-center bg-black/30 rounded-lg p-1 gap-1 border border-white/5">
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
                    <div className="text-xs font-mono text-white/40 hidden md:block">SHADOW TERMINAL v3.0</div>
                </div>
            </div>

            {/* Content Area */}
            <div
                className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
                onScroll={(e) => {
                    const bottom = e.currentTarget.scrollHeight - e.currentTarget.scrollTop === e.currentTarget.clientHeight;
                    if (bottom) setAutoScroll(true);
                    else setAutoScroll(false);
                }}
            >
                {viewMode === 'cards' ? (
                    <AnimatePresence mode='popLayout'>
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
            <div className="p-3 border-t border-white/10 bg-black/20 flex gap-2 font-mono text-sm shadow-2xl">
                <span className="text-emerald-500">❯</span>
                <span className="animate-pulse text-white/50">Listening for Agent commands...</span>
            </div>
        </div>
    );
}
