"use client";

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Terminal, AlertCircle, CheckCircle, Activity, Clock } from 'lucide-react';
import clsx from 'clsx';
import { ActionCardProps, type ActionType } from '@/types';

const icons = {
    command: Terminal,
    log: Activity,
    error: AlertCircle,
    success: CheckCircle,
    plan: Clock,
    plan_artifact: Activity,
    build_status: Terminal,
    security_gate: AlertCircle,
    code: Terminal,
    analysis: Activity,
    result: CheckCircle,
};

// HSL vars from globals.css
const typeColors: Record<ActionType, string> = {
    command: 'var(--sapphire)',
    log: 'var(--foreground)',
    error: '#ff5555', // High contrast red
    success: 'var(--emerald)',
    plan: 'var(--amber)',
    plan_artifact: 'var(--sapphire)',
    build_status: 'var(--emerald)',
    security_gate: 'var(--amber)',
    code: 'var(--sapphire)',
    analysis: 'var(--amethyst)',
    result: 'var(--emerald)',
};

export function ActionCard({ type, title, content, timestamp, agentId, severity }: ActionCardProps) {
    const Icon = icons[type];
    const shouldReduceMotion = useReducedMotion();
    const [copied, setCopied] = React.useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const animations = shouldReduceMotion ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 }
    } : {
        initial: { opacity: 0, y: 20, scale: 0.95 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, scale: 0.9 }
    };

    return (
        <motion.div
            layout
            {...animations}
            transition={{ duration: 0.2 }}
            className="glass-card mb-3 p-4 rounded-lg flex flex-col gap-2 relative overflow-hidden group"
            style={{
                borderLeft: `4px solid hsl(${typeColors[type]})`
            }}
            role="article"
            aria-label={`${type} event: ${title}`}
        >
            {/* Header Line: Timestamp | Agent | Type | Status (Severity) */}
            <div className="flex items-center justify-between transition-opacity">
                <div className="flex items-center gap-3">
                    <Icon size={16} aria-hidden="true" style={{ color: `hsl(${typeColors[type]})` }} />
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-white/90">{type}</span>
                            {agentId && <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/60 font-mono">{agentId}</span>}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {severity && severity !== 'info' && (
                        <span className={clsx(
                            "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded",
                            severity === 'error' ? "bg-red-500/20 text-red-300" : "bg-yellow-500/20 text-yellow-300"
                        )}>
                            {severity}
                        </span>
                    )}
                    <span className="text-xs font-mono text-white/40">{timestamp}</span>
                </div>
            </div>

            <div className="font-medium text-sm text-white/95 text-shadow pl-7">
                {title}
            </div>

            <div className="relative group/code mt-1">
                <div className="font-mono text-xs text-white/80 bg-black/40 p-3 rounded overflow-x-auto whitespace-pre-wrap font-ligatures">
                    {content}
                </div>
                <button
                    onClick={handleCopy}
                    className="absolute top-2 right-2 p-1.5 rounded bg-white/10 hover:bg-white/20 text-white/60 hover:text-white opacity-0 group-hover/code:opacity-100 transition-all"
                    aria-label="Copy to clipboard"
                >
                    {copied ? <CheckCircle size={12} className="text-emerald-400" /> : <Terminal size={12} />}
                </button>
            </div>

            {/* Decorative background glow - Disabled for reduced motion */}
            {!shouldReduceMotion && (
                <div
                    className="absolute -right-10 -top-10 w-24 h-24 rounded-full blur-3xl opacity-10 pointer-events-none"
                    style={{ background: `hsl(${typeColors[type]})` }}
                />
            )}
        </motion.div>
    );
}
