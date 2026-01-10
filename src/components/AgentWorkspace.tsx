"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Terminal, CheckCircle, ShieldAlert, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { ActionCardProps } from '@/types';
import { BlueprintCard, BuildStatusCard, SecurityGateCard } from './SemanticCards';
import { CodeBlockCard } from './CodeBlockCard';
import { AIAvatar } from './AIAvatar';
import { PhaseAura } from './PhaseAura';
import { AgentControls } from './AgentControls';

// Extend base types for hybrid stream
export interface StreamItem extends ActionCardProps {
    isUser?: boolean;
    isTyping?: boolean;
    // Enhancement: Strict payload types for cards
    payload?: Record<string, unknown>;
}

interface AgentWorkspaceProps {
    currentPhase: 'plan' | 'build' | 'review' | 'deploy';
    stream: StreamItem[];
    onSendMessage: (message: string) => void;
}

export function AgentWorkspace({ currentPhase, stream, onSendMessage }: AgentWorkspaceProps) {
    const [inputValue, setInputValue] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logic
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [stream]);

    const handleSend = () => {
        if (!inputValue.trim()) return;
        onSendMessage(inputValue);
        setInputValue('');
    };

    // Role Configuration
    const getRoleConfig = () => {
        switch (currentPhase) {
            case 'plan': return {
                icon: Sparkles,
                label: 'ARCHITECT',
                placeholder: 'Describe your vision or ask for blueprint changes...',
                accent: 'text-[var(--sapphire)]',
                border: 'border-[var(--sapphire)]'
            };
            case 'build': return {
                icon: Terminal,
                label: 'ENGINEER',
                placeholder: 'Enter build command or debugging query...',
                accent: 'text-[var(--emerald)]',
                border: 'border-[var(--emerald)]'
            };
            case 'review': return {
                icon: ShieldAlert,
                label: 'CRITIC',
                placeholder: 'Ask about security risks or approve changes...',
                accent: 'text-[var(--amber)]',
                border: 'border-[var(--amber)]'
            };
            default: return {
                icon: CheckCircle,
                label: 'DEPLOYER',
                placeholder: 'Command deployment...',
                accent: 'text-[var(--amethyst)]',
                border: 'border-[var(--amethyst)]'
            };
        }
    };

    const config = getRoleConfig();
    const RoleIcon = config.icon;

    return (
        <div className="flex flex-col h-full relative overflow-hidden bg-[hsl(var(--background))] rounded-xl group shadow-inner shadow-black/80 font-mono">
            {/* Phase Aura Background */}
            <PhaseAura phase={currentPhase} />

            {/* Header / HUD */}
            <div className="h-14 border-b border-white/5 flex items-center px-6 justify-between bg-black/20 z-10 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="relative scale-75 origin-left">
                        <AIAvatar phase={currentPhase} isProcessing={stream.some(s => s.isTyping)} />
                    </div>
                    <div className="flex flex-col">
                        <div className={clsx("text-sm font-bold tracking-widest flex items-center gap-2", config.accent)}>
                            <RoleIcon size={14} />
                            <span style={{ textShadow: '0 0 10px currentColor' }}>AI_{config.label}</span>
                        </div>
                        <div className="text-[10px] text-white/40 tracking-wider">
                            SESSION ID: <span className="text-white/60">0x1A4F</span> • EVENTS: {stream.length}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-white/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    SYSTEM ONLINE
                </div>
            </div>

            {/* Stream Area - Vertical Timeline */}
            <div
                className="flex-1 overflow-y-auto p-6 console-stream scroll-smooth relative"
                ref={scrollRef}
            >
                {/* Timeline Line */}
                <div className="absolute left-8 top-0 bottom-0 w-px bg-white/10" />

                <div className="space-y-8 pl-8">
                    <AnimatePresence initial={false}>
                        {stream.map((item) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="w-full relative"
                            >
                                {/* Timeline Node Indicator */}
                                <div className={clsx(
                                    "absolute -left-[37px] top-1 w-2.5 h-2.5 rounded-full border-2 bg-[#050505]",
                                    item.isUser ? "border-white/40" : config.border
                                )} />

                                {item.isUser ? (
                                    // User Entry
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2 text-xs text-white/40">
                                            <span className="font-bold text-white/60">USER</span>
                                            <ChevronRight size={10} />
                                            <span className="font-mono">{item.timestamp}</span>
                                        </div>
                                        <div className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap font-sans pl-2 border-l-2 border-white/10 py-1">
                                            {item.content}
                                        </div>
                                    </div>
                                ) : (
                                    // AI Entry
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2 text-xs text-white/40">
                                            <span className={clsx("font-bold", config.accent)}>{item.agentId || 'SYSTEM'}</span>
                                            <span className="px-1 py-0.5 rounded border border-white/10 text-[9px] uppercase">{item.phase}</span>
                                            <span className="font-mono">{item.timestamp}</span>
                                        </div>

                                        {/* Content based on type */}
                                        <div className="pl-0">
                                            {item.type === 'plan_artifact' ? (
                                                <BlueprintCard content={item.content} />
                                            ) : item.type === 'build_status' ? (
                                                <BuildStatusCard
                                                    title={item.title}
                                                    progress={(item.payload?.progress as number) || 0}
                                                />
                                            ) : item.type === 'code' ? (
                                                <CodeBlockCard code={item.content} language="typescript" />
                                            ) : item.type === 'security_gate' ? (
                                                <SecurityGateCard
                                                    policy={(item.payload?.policy as string) || "Standard Policy"}
                                                    status={(item.payload?.status as 'pass' | 'warn' | 'fail') || 'warn'}
                                                />
                                            ) : item.type === 'command' ? (
                                                <div className="font-mono text-xs text-emerald-400/90 flex items-center gap-2">
                                                    <span className="text-white/40">$</span>
                                                    {item.content}
                                                </div>
                                            ) : item.type === 'error' ? (
                                                <div className="text-red-400 text-sm flex items-start gap-2 bg-red-950/10 border-l-2 border-red-500/50 p-2">
                                                    <ShieldAlert size={14} className="shrink-0 mt-0.5" />
                                                    {item.content}
                                                </div>
                                            ) : (
                                                <div className="text-white/80 text-sm font-mono leading-relaxed">
                                                    {item.title && (
                                                        <div className="font-bold text-white/90 mb-1 flex items-center gap-2">
                                                            {item.title}
                                                        </div>
                                                    )}
                                                    {item.content}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Typing Indicator */}
                    {stream.some(s => s.isTyping) && (
                        <div className="relative">
                            <div className={clsx(
                                "absolute -left-[37px] top-1 w-2.5 h-2.5 rounded-full border-2 bg-[#050505] animate-pulse",
                                config.border
                            )} />
                            <div className="text-xs text-white/30 font-mono animate-pulse">
                                AI_AGENT IS PROCESSING...
                            </div>
                        </div>
                    )}
                </div>

                <div ref={bottomRef} className="h-4" />
            </div>

            {/* Elite HUD Enhancements */}
            <AgentControls phase={currentPhase} />

            {/* Omnibar Input */}
            <div className="p-4 shrink-0 z-20 bg-[#050505] border-t border-white/10">
                <div className={clsx(
                    "relative group flex items-stretch overflow-hidden",
                    // Removed background, just border and glowing text
                )}>
                    {/* Prefix Icon */}
                    <div className="w-8 flex items-start pt-3 justify-center text-white/30">
                        <span className="font-mono text-lg">❯</span>
                    </div>

                    <textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder={config.placeholder}
                        className="flex-1 bg-transparent border-none focus:ring-0 text-white/90 placeholder:text-white/20 resize-none py-3 px-0 min-h-[48px] max-h-[200px] text-sm font-mono leading-relaxed focus:outline-none"
                    />

                    <div className="flex flex-col justify-end p-2">
                        <button
                            onClick={handleSend}
                            disabled={!inputValue.trim()}
                            className={clsx(
                                "p-2 rounded transition-all",
                                inputValue.trim()
                                    ? config.accent
                                    : "text-white/10"
                            )}
                        >
                            {inputValue.trim() ? <Send size={14} /> : null}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
