"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface ChatInterfaceProps {
    currentPhase: string;
}

export function ChatInterface({ currentPhase }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: `System online. I am KOD AI MODEL. Current phase is ${currentPhase.toUpperCase()}. How can I assist with your architectural blueprint today?`,
            timestamp: new Date()
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSend = async () => {
        if (!inputValue.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: inputValue,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsTyping(true);

        // Simulate AI Response
        setTimeout(() => {
            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `I've analyzed your request regarding "${inputValue}". Based on the ${currentPhase} phase constraints, I recommend optimizing the state transitions to reduce latency. Shall I proceed with a draft?`,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMessage]);
            setIsTyping(false);
        }, 1500);
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4 px-1">
                <div className="p-1.5 rounded-lg bg-sapphire/20 border border-sapphire/30">
                    <Sparkles size={14} className="text-sapphire-400 text-blue-400" />
                </div>
                <div className="text-xs font-bold text-white/40 uppercase tracking-widest">KOD AI MODEL</div>
            </div>

            {/* Message List */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto pr-2 space-y-4 mb-4 scrollbar-hide"
            >
                <AnimatePresence initial={false}>
                    {messages.map((msg) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.2 }}
                            className={clsx(
                                "flex gap-3",
                                msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                            )}
                        >
                            <div className={clsx(
                                "w-8 h-8 rounded-full flex-center shrink-0 border",
                                msg.role === 'assistant'
                                    ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                                    : "bg-white/5 border-white/10 text-white/50"
                            )}>
                                {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
                            </div>
                            <div className={clsx(
                                "max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed",
                                msg.role === 'assistant' ? "chat-bubble-ai text-white/90" : "chat-bubble-user text-white/80"
                            )}>
                                {msg.content}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {isTyping && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex gap-2 p-2 ml-10"
                    >
                        <span className="w-1.5 h-1.5 bg-blue-400/50 rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-blue-400/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <span className="w-1.5 h-1.5 bg-blue-400/50 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </motion.div>
                )}
            </div>

            {/* Input Area */}
            <div className="relative group glow-input rounded-xl bg-black/40 border border-white/10 transition-all p-1">
                <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                    placeholder="Ask KOD AI MODEL..."
                    className="w-full bg-transparent border-none focus:ring-0 text-sm text-white/80 placeholder:text-white/20 resize-none py-3 px-4 min-h-[45px] max-h-[120px]"
                    rows={1}
                />
                <div className="flex items-center justify-between px-3 pb-2">
                    <div className="text-[10px] text-white/20 font-mono">SHIFT + ENTER FOR NEW LINE</div>
                    <button
                        onClick={handleSend}
                        disabled={!inputValue.trim() || isTyping}
                        className={clsx(
                            "p-1.5 rounded-lg transition-all",
                            inputValue.trim() ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" : "bg-white/5 text-white/20"
                        )}
                    >
                        <Send size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}
