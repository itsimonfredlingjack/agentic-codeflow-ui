"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';
import { ActionCardProps, type ActionType } from '@/types';
import { MarkdownMessage } from './MarkdownMessage';

// HSL vars from globals.css
const typeColors: Record<ActionType, string> = {
    command: 'var(--sapphire)',
    log: 'var(--foreground)',
    error: '0 100% 67%', // High contrast red
    success: 'var(--emerald)',
    plan: 'var(--amber)',
    plan_artifact: 'var(--sapphire)',
    build_status: 'var(--emerald)',
    security_gate: 'var(--amber)',
    code: 'var(--sapphire)',
    analysis: 'var(--amethyst)',
    result: 'var(--emerald)',
};

type ActionCardExtraProps = ActionCardProps & {
    isUser?: boolean;
    isTyping?: boolean;
};

export function ActionCard({ type, title, content, timestamp, agentId, severity, isUser, isTyping }: ActionCardExtraProps) {
    const shouldReduceMotion = useReducedMotion();
    const accent = isUser ? 'var(--emerald)' : typeColors[type];
    const who = isUser ? 'YOU' : agentId || 'SYS';
    const severityLabel = severity === 'error' ? 'ERR' : severity === 'warn' ? 'WARN' : null;
    const isChat = (agentId === 'USER' || agentId === 'QWEN') && type !== 'command';
    const isTerminal = type === 'command' || title === 'STDOUT' || title === 'STDERR';
    const contentLines = content.split('\n');
    const isLong = content.length > 800 || contentLines.length > 14;
    const shouldUseBlockFolding = isLong && !isChat;
    const blockSize = 12;
    const collapsedLines = 3;

    const blocks = useMemo(() => {
        if (!shouldUseBlockFolding) return [];
        const chunks: string[][] = [];
        for (let i = 0; i < contentLines.length; i += blockSize) {
            chunks.push(contentLines.slice(i, i + blockSize));
        }
        return chunks;
    }, [contentLines, shouldUseBlockFolding]);

    const [expandedBlocks, setExpandedBlocks] = useState<boolean[]>([]);

    useEffect(() => {
        if (!shouldUseBlockFolding) {
            setExpandedBlocks([]);
            return;
        }
        setExpandedBlocks(blocks.map((_, idx) => idx === 0));
    }, [shouldUseBlockFolding, blocks.length, content]);

    const animations = shouldReduceMotion ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 }
    } : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 }
    };

    return (
        <motion.div
            {...animations}
            transition={{ duration: 0.12 }}
            className={clsx("font-mono leading-relaxed text-[var(--terminal-font-size)]", isUser ? "text-emerald-100" : "text-white/80")}
            role="article"
            aria-label={`${type} event: ${title}`}
        >
            <div className="grid grid-cols-[86px_72px_1fr] gap-x-3 gap-y-1 items-start py-1">
                <div className="text-white/30 text-[0.85em]">{timestamp}</div>
                <div className="text-white/60 text-[0.85em]">{who}</div>
                <div className="text-white/50">
                    <span style={{ color: `hsl(${accent})` }}>{type}</span>
                    {severityLabel ? <span className="text-white/30">:{severityLabel}</span> : null}
                    <span className="text-white/20"> — </span>
                    <span className="text-white/70">{title}</span>
                </div>

                <div className="col-start-3">
                    {isTyping ? (
                        <span className="text-white/40 animate-pulse text-[15px]">…</span>
                    ) : (
                        shouldUseBlockFolding ? (
                            <div className="space-y-2">
                                {blocks.map((block, index) => {
                                    const isExpanded = expandedBlocks[index] ?? (index === 0);
                                    const blockContent = isExpanded
                                        ? block.join('\n')
                                        : `${block.slice(0, collapsedLines).join('\n')}${block.length > collapsedLines ? '\n…' : ''}`;
                                    const canToggle = block.length > collapsedLines || blockContent.length > 120;

                                    return (
                                        <div key={`${timestamp}-${index}`} className="rounded border border-white/5 bg-black/20 p-2">
                                            <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-white/30">
                                                <span>Block {index + 1}/{blocks.length}</span>
                                                {canToggle && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setExpandedBlocks((prev) => {
                                                            const next = [...prev];
                                                            next[index] = !isExpanded;
                                                            return next;
                                                        })}
                                                        className={clsx(
                                                            "text-[10px] uppercase tracking-widest",
                                                            isTerminal ? "text-emerald-400/80 hover:text-emerald-300" : "text-white/50 hover:text-white/70"
                                                        )}
                                                    >
                                                        {isExpanded ? 'Collapse block' : 'Expand block'}
                                                    </button>
                                                )}
                                            </div>
                                            <pre className="whitespace-pre-wrap text-white/80 text-[var(--terminal-font-size)] font-mono mt-1">
                                                {blockContent}
                                            </pre>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <MarkdownMessage content={content} />
                        )
                    )}
                </div>
            </div>
        </motion.div>
    );
}
