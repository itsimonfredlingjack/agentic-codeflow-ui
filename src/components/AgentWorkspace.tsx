"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, CornerDownLeft, Sparkles, Terminal, FileCode, CheckCircle, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { ActionCardProps } from '@/types';
import { BlueprintCard, BuildStatusCard, SecurityGateCard } from './SemanticCards';
import { CodeBlockCard } from './CodeBlockCard';
import { AIAvatar } from './AIAvatar';

// Extend base types for hybrid stream
export interface StreamItem extends ActionCardProps {
    isUser?: boolean;
    isTyping?: boolean;
    // Enhancement: Strict payload types for cards
    payload?: any;
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
                bg: 'bg-[var(--sapphire)]'
            };
            case 'build': return {
                icon: Terminal,
                label: 'ENGINEER',
                placeholder: 'Enter build command or debugging query...',
                accent: 'text-[var(--emerald)]',
                bg: 'bg-[var(--emerald)]'
            };
            case 'review': return {
                icon: ShieldAlert,
                label: 'CRITIC',
                placeholder: 'Ask about security risks or approve changes...',
                accent: 'text-[var(--amber)]',
                bg: 'bg-[var(--amber)]'
            };
            default: return {
                icon: CheckCircle,
                label: 'DEPLOYER',
                placeholder: 'Command deployment...',
                accent: 'text-[var(--amethyst)]',
                bg: 'bg-[var(--amethyst)]'
            };
        }
    };

    const config = getRoleConfig();
    const RoleIcon = config.icon;

    return (
        <div className="flex flex-col h-full relative overflow-hidden glass-panel rounded-xl group">

            {/* Header / StatusBar */}
            <div className="h-12 border-b border-white/10 flex items-center px-4 justify-between bg-black/20 backdrop-blur-md z-10 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <AIAvatar phase={currentPhase} isProcessing={stream.some(s => s.isTyping)} />
                    </div>
                    <div>
                        <div className={clsx("text-xs font-bold tracking-widest", config.accent)}>
                            AI {config.label}
                        </div>
                        <div className="text-[10px] text-white/40 font-mono">
                            SESSION ACTIVE • {stream.length} EVENTS
                        </div>
                    </div>
                </div>
            </div>

            {/* Stream Area */}
            <div
                className="flex-1 overflow-y-auto p-6 space-y-6 console-stream scroll-smooth"
                ref={scrollRef}
            >
                <AnimatePresence initial={false}>
                    {stream.map((item) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={clsx(
                                "w-full", // Full width container
                                item.isUser ? "ml-auto max-w-xl" : "mr-auto",
                                // Only constrain width for non-code items if needed, but flex-col handles it
                                item.type !== 'code' && !item.isUser && "max-w-3xl"
                            )}
                        >
                            {item.isUser ? (
                                // User Message
                                <div className="flex flex-col items-end gap-1">
                                    <div className="text-[10px] text-white/30 uppercase tracking-wider font-bold pr-1">You</div>
                                    <div className="message-user px-4 py-3 rounded-tr-none rounded-2xl text-white/90 text-sm leading-relaxed backdrop-blur-md shadow-sm max-w-xl">
                                        {item.content}
                                    </div>
                                </div>
                            ) : (
                                // AI Message / Event
                                <div className="message-node flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className={clsx("text-xs font-bold uppercase", config.accent)}>
                                            {item.agentId || 'SYSTEM'}
                                        </span>
                                        <span className="text-[10px] text-white/20 font-mono">{item.timestamp}</span>
                                    </div>

                                    {/* Content based on type */}
                                    {item.type === 'plan_artifact' ? (
                                        <BlueprintCard content={item.content} />
                                    ) : item.type === 'build_status' ? (
                                        <BuildStatusCard
                                            title={item.title}
                                            progress={item.payload?.progress || 0}
                                        />
                                    ) : item.type === 'code' ? (
                                        <CodeBlockCard code={item.content} language="typescript" />
                                    ) : item.type === 'security_gate' ? (
                                        <SecurityGateCard
                                            policy={item.payload?.policy || "Standard Policy"}
                                            status={item.payload?.status || 'warn'}
                                        />
                                    ) : item.type === 'command' ? (
                                        <div className="font-mono text-xs bg-black/40 border border-white/10 rounded p-3 text-emerald-400/90 shadow-inner">
                                            $ {item.content}
                                        </div>
                                    ) : item.type === 'error' ? (
                                        <div className="bg-red-500/10 border border-red-500/20 rounded p-3 text-red-300 text-sm flex items-start gap-3">
                                            <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                                            <div>
                                                <div className="font-bold text-xs uppercase mb-1 opacity-70">Error</div>
                                                {item.content}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={clsx(
                                            "message-ai px-5 py-4 rounded-tl-none rounded-2xl text-white/90 text-sm leading-relaxed",
                                        )}>
                                            {item.title && <div className="font-bold mb-2 text-white/90 flex items-center gap-2">
                                                {item.phase === 'build' && <Terminal size={12} />}
                                                {item.title}
                                            </div>}
                                            {item.content}
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Typing Indicator */}
                {stream.some(s => s.isTyping) && (
                    <div className="message-node pt-2">
                        <div className="flex gap-1.5 p-2 items-center">
                            <div className="w-1.5 h-1.5 rounded-full typing-dot" />
                            <div className="w-1.5 h-1.5 rounded-full typing-dot" />
                            <div className="w-1.5 h-1.5 rounded-full typing-dot" />
                        </div>
                    </div>
                )}

                <div ref={bottomRef} className="h-4" />
            </div>

            {/* Omnibar Input */}
            <div className="omnibar-wrapper p-4 shrink-0 z-20">
                <div className={clsx(
                    "relative group rounded-xl bg-black/40 border transition-all duration-300 flex items-stretch overflow-hidden",
                    "border-white/10 focus-within:border-[var(--active-aura)] focus-within:bg-black/60 focus-within:shadow-[0_0_20px_rgba(var(--active-aura),0.2)]"
                )}>
                    {/* Prefix Icon */}
                    <div className="w-10 flex items-center justify-center text-white/20 group-focus-within:text-[var(--active-aura)] transition-colors">
                        {currentPhase === 'build' ? <span className="font-mono text-lg">❯</span> : <Sparkles size={16} />}
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
                        className="omnibar-input flex-1 bg-transparent border-none focus:ring-0 text-white/90 placeholder:text-white/20 resize-none py-4 px-0 min-h-[56px] max-h-[200px] text-[15px] leading-relaxed"
                        style={{ outline: "none" }} // Ensure no blue browser outline
                    />

                    <div className="flex flex-col justify-end p-2">
                        <button
                            onClick={handleSend}
                            disabled={!inputValue.trim()}
                            className={clsx(
                                "p-2 rounded-lg transition-all",
                                inputValue.trim()
                                    ? "text-white shadow-lg bg-[var(--active-aura)]"
                                    : "text-white/10 hover:text-white/30"
                            )}
                        >
                            {inputValue.trim() ? <Send size={16} /> : <CornerDownLeft size={16} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
