"use client";

import React, { useState } from 'react';
import { Check, Copy, Terminal, Maximize2 } from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockCardProps {
    code: string;
    language?: string;
    filename?: string;
}

export function CodeBlockCard({ code, language = 'typescript', filename }: CodeBlockCardProps) {
    const [copied, setCopied] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={clsx(
                "rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-[#1e1e1e] group mt-2 mb-4 font-mono transition-all duration-300",
                isMaximized ? "fixed inset-4 z-50 m-0 border-white/20" : "relative w-full"
            )}
        >
            {/* Backdrop for Maximized Mode */}
            {isMaximized && (
                <div className="absolute inset-0 bg-black/90 -z-10 backdrop-blur-xl" />
            )}

            {/* Window Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#252526] border-b border-white/5 select-none">
                <div className="flex items-center gap-2">
                    {/* Traffic Lights */}
                    <div className="flex gap-1.5 group/lights">
                        <div className="w-3 h-3 rounded-full bg-[#ff5f56] hover:bg-[#ff5f56]/80 transition-colors" />
                        <div className="w-3 h-3 rounded-full bg-[#ffbd2e] hover:bg-[#ffbd2e]/80 transition-colors" />
                        <button
                            onClick={() => setIsMaximized(!isMaximized)}
                            className="w-3 h-3 rounded-full bg-[#27c93f] hover:bg-[#27c93f]/80 transition-colors flex items-center justify-center"
                        >
                            <Maximize2 size={6} className="text-black/50 opacity-0 group-hover/lights:opacity-100" />
                        </button>
                    </div>

                    {/* Filename */}
                    {filename && (
                        <div className="ml-4 text-xs text-white/40 flex items-center gap-1.5">
                            <Terminal size={10} />
                            {filename}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-[10px] uppercase font-bold text-white/20 tracking-wider">
                        {language}
                    </span>
                    <button
                        onClick={handleCopy}
                        className={clsx(
                            "p-1.5 rounded transition-all flex items-center gap-1.5 text-xs font-bold",
                            copied ? "bg-emerald-500/20 text-emerald-400" : "hover:bg-white/10 text-white/40 hover:text-white"
                        )}
                    >
                        {copied ? (
                            <>
                                <Check size={12} />
                                COPIED
                            </>
                        ) : (
                            <Copy size={12} />
                        )}
                    </button>
                </div>
            </div>

            {/* Code Content */}
            <div className={clsx(
                "overflow-hidden text-sm leading-relaxed custom-scrollbar bg-[#1e1e1e]",
                isMaximized ? "h-[calc(100%-48px)] overflow-y-auto" : "max-h-[400px]"
            )}>
                 <SyntaxHighlighter
                    language={language || 'text'}
                    style={vscDarkPlus}
                    customStyle={{
                        margin: 0,
                        background: 'transparent',
                        padding: '16px',
                        fontSize: '13px',
                        lineHeight: 1.6,
                    }}
                    codeTagProps={{
                        style: {
                            fontFamily:
                                'var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                        },
                    }}
                >
                    {code}
                </SyntaxHighlighter>
            </div>

            {/* Status Bar */}
            <div className="h-6 bg-[#007acc] flex items-center px-3 text-[10px] text-white gap-4 select-none">
                <span>master*</span>
                <span className="opacity-80">Ln {code.split('\n').length}, Col 1</span>
                <span className="ml-auto opacity-80">UTF-8</span>
                <span className="opacity-80">{language}</span>
            </div>
        </motion.div>
    );
}
