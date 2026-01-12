"use client";

import React from 'react';
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
            className={clsx(
                "font-mono leading-relaxed text-[var(--terminal-font-size)]",
                "rounded-lg px-2 -mx-2 transition-all duration-fast",
                "hover:bg-white/[0.02]",
                isUser ? "text-emerald-100" : "text-white/80"
            )}
            role="article"
            aria-label={`${type} event: ${title}`}
        >
            <div className="grid grid-cols-[86px_72px_1fr] gap-x-3 gap-y-1 items-start py-1.5">
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
                        <MarkdownMessage content={content} />
                    )}
                </div>
            </div>
        </motion.div>
    );
}
