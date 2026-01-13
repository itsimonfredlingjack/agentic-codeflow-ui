"use client";
import React, { useRef, useEffect, useState } from 'react';
import { ActionCardProps } from '@/types';
import clsx from 'clsx';



export function ShadowTerminal({ actions, splitView = false }: { actions: ActionCardProps[], splitView?: boolean }) {
    const bottomRef = useRef<HTMLDivElement>(null);
    const bottomRefSplit = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const scrollRefSplit = useRef<HTMLDivElement>(null);

    const [autoScroll, setAutoScroll] = useState(true);

    const [searchQuery, setSearchQuery] = useState('');

    // --- Helpers ---
    const filterActions = (list: ActionCardProps[], type: 'chat' | 'terminal') => {
        return list.filter(a => {
            const isTerminal = a.type === 'command' || a.title === 'STDOUT' || a.title === 'STDERR' || a.type === 'code';
            const match = type === 'terminal' ? isTerminal : !isTerminal;
            if (!match) return false;
            if (searchQuery) {
                return a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    a.content.toLowerCase().includes(searchQuery.toLowerCase());
            }
            return true;
        });
    };

    // Auto-scroll effect
    useEffect(() => {
        if (!autoScroll) return;
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        bottomRefSplit.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [actions.length, autoScroll, splitView]);

    const chatActions = filterActions(actions, 'chat');
    const terminalActions = filterActions(actions, 'terminal');

    return (
        <div
            className="w-full h-full rounded flex flex-col overflow-hidden relative border border-white/10 bg-[#050505]"
            role="region"
            aria-label="Shadow Terminal Output"
        >
            {/* Header / Toolbar */}
            <div className="h-8 border-b border-white/10 flex items-center px-4 justify-between bg-white/5 z-10 gap-4 shrink-0">
                <div className="flex items-center gap-4 flex-1">
                    <div className="text-[10px] font-bold text-white/40 tracking-widest uppercase">
                        {splitView ? 'SPLIT::CONSOLE' : 'MAIN::STREAM'}
                    </div>
                    {/* Search Bar */}
                    <div className="relative group flex-1 max-w-xs">
                        <input
                            type="text"
                            placeholder="FILTER_STREAM"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent border-none text-[10px] text-white placeholder-white/20 focus:scale-105 transition-transform font-mono w-full focus:outline-none"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setAutoScroll((prev) => !prev)}
                        className={clsx(
                            "text-[10px] font-mono uppercase transition-colors",
                            autoScroll ? "text-emerald-500" : "text-white/40"
                        )}
                    >
                        {autoScroll ? 'SCROLL:LOCK' : 'SCROLL:FREE'}
                    </button>
                </div>
            </div>

            {/* Content Area */}
            {splitView ? (
                <div className="flex-1 flex min-h-0 divide-x divide-white/10">
                    {/* Left: Chat */}
                    <div className="flex-1 flex flex-col min-w-0">
                        <div className="bg-white/5 px-2 py-1 text-[9px] uppercase tracking-widest text-white/30 border-b border-white/5">Comm_Link</div>
                        <StreamPane
                            items={chatActions}
                            scrollRef={scrollRef}
                            bottomRef={bottomRef}
                            onUserScroll={() => setAutoScroll(false)}
                        />
                    </div>
                    {/* Right: Terminal */}
                    <div className="flex-1 flex flex-col min-w-0 bg-black/40">
                        <div className="bg-white/5 px-2 py-1 text-[9px] uppercase tracking-widest text-white/30 border-b border-white/5">Hard_Line</div>
                        <StreamPane
                            items={terminalActions}
                            scrollRef={scrollRefSplit}
                            bottomRef={bottomRefSplit}
                            onUserScroll={() => setAutoScroll(false)}
                        />
                    </div>
                </div>
            ) : (
                <StreamPane
                    items={actions}
                    scrollRef={scrollRef}
                    bottomRef={bottomRef}
                    onUserScroll={() => setAutoScroll(false)}
                />
            )}
        </div>
    );
}

function StreamPane({
    items,
    scrollRef,
    bottomRef,
    onUserScroll
}: {
    items: ActionCardProps[],
    scrollRef: React.RefObject<HTMLDivElement | null>,
    bottomRef: React.RefObject<HTMLDivElement | null>,
    onUserScroll: () => void
}) {
    const SCROLL_BOTTOM_THRESHOLD_PX = 24;
    return (
        <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 scroll-smooth min-h-0"
            onScroll={(e) => {
                const target = e.currentTarget;
                const distanceFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
                if (distanceFromBottom >= SCROLL_BOTTOM_THRESHOLD_PX) {
                    onUserScroll();
                }
            }}
        >
            <div className="font-mono text-xs space-y-1 text-white/90 selection:bg-white/20">
                {items.map((action) => (
                    <div key={action.id} className="flex gap-3 hover:bg-white/5 p-1 rounded group">
                        <span className="opacity-40 select-none w-20 text-[10px] pt-0.5">{action.timestamp}</span>
                        <span className={clsx(
                            "font-bold uppercase w-16 select-none text-[10px] pt-0.5",
                            action.type === 'error' ? 'text-red-500' :
                                action.type === 'command' ? 'text-emerald-500' :
                                    action.type === 'code' ? 'text-amber-500' : 'text-blue-500'
                        )}>{action.type}</span>
                        <span className="flex-1 break-all whitespace-pre-wrap group-hover:text-white transition-colors">
                            {action.agentId !== 'SYSTEM' && <span className="text-white/40 mr-2">[{action.agentId}]</span>}
                            <span className="font-bold">{action.title}</span>
                            {action.content && (
                                <div className="mt-1 opacity-80 border-l border-white/10 pl-2 ml-1">
                                    {action.content}
                                </div>
                            )}
                        </span>
                    </div>
                ))}
            </div>
            <div ref={bottomRef} />
        </div>
    );
}

