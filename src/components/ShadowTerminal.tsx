"use client";
import React, { useRef, useEffect, useState } from 'react';
import { ActionCardProps } from '@/types';
import clsx from 'clsx';
import { ThinkingIndicator } from './ThinkingIndicator';
import { MarkdownMessage } from './MarkdownMessage';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';

// Extended type to include streaming state
type StreamItem = ActionCardProps & {
    isTyping?: boolean;
};

export function ShadowTerminal({
    actions,
    splitView = false,
    onApprovePermission,
    onDenyPermission,
}: {
    actions: StreamItem[],
    splitView?: boolean,
    onApprovePermission?: (requestId: string) => void,
    onDenyPermission?: (requestId: string) => void,
}) {
    // Virtuoso refs if needed (e.g. to scroll manually), but likely not needed with followOutput
    const virtuosoRef = useRef<VirtuosoHandle>(null);
    const virtuosoSplitRef = useRef<VirtuosoHandle>(null);

    const [autoScroll, setAutoScroll] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // --- Helpers ---
    const filterActions = (list: StreamItem[], type: 'chat' | 'terminal') => {
        return list.filter(a => {
            // Qwen responses go to CHAT even if type is 'code'
            const isQwenResponse = a.agentId === 'QWEN';
            // Terminal: actual shell output (STDOUT, STDERR, commands) but NOT Qwen
            const isTerminal = !isQwenResponse && (a.type === 'command' || a.title === 'STDOUT' || a.title === 'STDERR');
            const match = type === 'terminal' ? isTerminal : !isTerminal;
            if (!match) return false;
            if (searchQuery) {
                return a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    a.content.toLowerCase().includes(searchQuery.toLowerCase());
            }
            return true;
        });
    };

    const chatActions = filterActions(actions, 'chat');
    const terminalActions = filterActions(actions, 'terminal');

    // Track previous lengths to detect new content
    const prevChatLength = useRef(chatActions.length);
    const prevTerminalLength = useRef(terminalActions.length);

    // Auto-scroll effect - always scroll when NEW content arrives
    useEffect(() => {
        const chatGrew = chatActions.length > prevChatLength.current;
        const terminalGrew = terminalActions.length > prevTerminalLength.current;

        prevChatLength.current = chatActions.length;
        prevTerminalLength.current = terminalActions.length;

        // If new content arrived, re-enable autoscroll
        if (chatGrew || terminalGrew) {
            queueMicrotask(() => setAutoScroll(true));
        }
    }, [chatActions.length, terminalActions.length]);

    return (
        <div
            className="w-full h-full rounded flex flex-col overflow-hidden relative border border-white/10 bg-[#0a0a0a] crt-scanlines crt-flicker"
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
                        <div className="bg-emerald-500/10 px-3 py-1.5 text-[10px] uppercase tracking-widest text-emerald-400/80 border-b border-emerald-500/20 font-bold">CHAT</div>
                        <StreamPane
                            items={chatActions}
                            autoScroll={autoScroll}
                            onAutoScrollChange={setAutoScroll}
                            onApprovePermission={onApprovePermission}
                            onDenyPermission={onDenyPermission}
                        />
                    </div>
                    {/* Right: Terminal */}
                    <div className="flex-1 flex flex-col min-w-0 bg-black/40">
                        <div className="bg-amber-500/10 px-3 py-1.5 text-[10px] uppercase tracking-widest text-amber-400/80 border-b border-amber-500/20 font-bold">TERMINAL</div>
                        <StreamPane
                            items={terminalActions}
                            autoScroll={autoScroll}
                            onAutoScrollChange={setAutoScroll}
                            onApprovePermission={onApprovePermission}
                            onDenyPermission={onDenyPermission}
                        />
                    </div>
                </div>
            ) : (
                <StreamPane
                    items={actions}
                    autoScroll={autoScroll}
                    onAutoScrollChange={setAutoScroll}
                    onApprovePermission={onApprovePermission}
                    onDenyPermission={onDenyPermission}
                />
            )}
        </div>
    );
}

function StreamPane({
    items,
    autoScroll,
    onAutoScrollChange,
    onApprovePermission,
    onDenyPermission,
}: {
    items: StreamItem[],
    autoScroll: boolean;
    onAutoScrollChange: (val: boolean) => void;
    onApprovePermission?: (requestId: string) => void;
    onDenyPermission?: (requestId: string) => void;
}) {
    return (
        <Virtuoso
            className="h-full scroll-smooth"
            data={items}
            followOutput={autoScroll ? 'smooth' : false}
            atBottomStateChange={(atBottom) => {
                // If the user scrolls up, atBottom becomes false -> disable autoScroll
                // If the user scrolls down to bottom, atBottom becomes true -> enable autoScroll
                onAutoScrollChange(atBottom);
            }}
            itemContent={(index, action) => (
                <div className="flex gap-3 hover:bg-white/5 p-1 px-4 rounded group mb-1.5 first:mt-4">
                    <span className="opacity-60 select-none w-20 text-[11px] pt-0.5 text-cyan-400/60 shrink-0">{action.timestamp}</span>
                    <span className={clsx(
                        "w-2 h-2 rounded-full mt-1.5 shrink-0",
                        action.type === 'error' ? 'bg-red-500' :
                            action.type === 'command' ? 'bg-emerald-500' :
                                action.type === 'code' ? 'bg-amber-500' :
                                    action.type === 'security_gate' ? 'bg-amber-400' : 'bg-blue-500'
                    )} title={action.type} />
                    <span className="flex-1 break-all whitespace-pre-wrap group-hover:text-white transition-colors min-w-0">
                        {action.agentId !== 'SYSTEM' && <span className="text-white/40 mr-2">[{action.agentId}]</span>}
                        <span className="font-bold">{action.title}</span>
                        {action.isTyping ? (
                            <div className="mt-2">
                                <ThinkingIndicator phase={action.phase as 'plan' | 'build' | 'review' | 'deploy'} />
                            </div>
                        ) : action.content && (
                            <div className="mt-1 opacity-80 border-l border-white/10 pl-2 ml-1">
                                {action.type === 'security_gate' && action.payload && typeof action.payload === 'object' ? (
                                    <PermissionGateRow
                                        payload={action.payload as Record<string, unknown>}
                                        onApprove={onApprovePermission}
                                        onDeny={onDenyPermission}
                                    />
                                ) : null}
                                {(action.agentId === 'QWEN' || action.type === 'code') ? (
                                    <MarkdownMessage content={action.content} />
                                ) : (
                                    <span className="whitespace-pre-wrap">{action.content}</span>
                                )}
                            </div>
                        )}
                    </span>
                </div>
            )}
        />
    );
}

function PermissionGateRow({
    payload,
    onApprove,
    onDeny,
}: {
    payload: Record<string, unknown>;
    onApprove?: (requestId: string) => void;
    onDeny?: (requestId: string) => void;
}) {
    const requestId = typeof payload.requestId === 'string' ? payload.requestId : null;
    if (!requestId) return null;

    return (
        <div className="mb-2 flex flex-wrap items-center gap-2">
            <button
                type="button"
                onClick={() => onApprove?.(requestId)}
                className="text-[10px] font-mono px-2 py-1 rounded border bg-emerald-500/10 border-emerald-500/20 text-emerald-200 hover:bg-emerald-500/20"
            >
                Approve
            </button>
            <button
                type="button"
                onClick={() => onDeny?.(requestId)}
                className="text-[10px] font-mono px-2 py-1 rounded border bg-red-500/10 border-red-500/20 text-red-200 hover:bg-red-500/20"
            >
                Deny
            </button>
            <span className="text-[10px] font-mono text-white/40">requestId: {requestId}</span>
        </div>
    );
}
