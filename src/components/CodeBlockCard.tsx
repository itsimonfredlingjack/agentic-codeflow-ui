"use client";

import React, { useState } from 'react';
import { Check, Copy, Terminal, Maximize2 } from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

// Simple Regex Syntax Highlighter
const highlightSyntax = (code: string, _: string) => {
    // Escape HTML to prevent injection
    let html = code
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // Keywords (Purple/Pink)
    html = html.replace(/\b(const|let|var|function|return|import|export|from|class|extends|if|else|for|while|try|catch|async|await)\b/g,
        '<span class="text-purple-400 font-bold">$1</span>');

    // Types (Yellow/Orange)
    html = html.replace(/\b(string|number|boolean|any|void|Promise|React|interface|type)\b/g,
        '<span class="text-yellow-300">$1</span>');

    // Strings (Green)
    html = html.replace(/(['"`])(.*?)\1/g,
        '<span class="text-emerald-300">$1$2$1</span>');

    // Functions (Blue)
    html = html.replace(/\b([a-zA-Z0-9_]+)(?=\()/g,
        '<span class="text-blue-300">$1</span>');

    // Comments (Gray)
    html = html.replace(/(\/\/.*)/g,
        '<span class="text-gray-500 italic">$1</span>');

    return html;
};

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
                "p-4 overflow-x-auto text-sm leading-relaxed custom-scrollbar",
                isMaximized ? "h-[calc(100%-48px)]" : "max-h-[400px]"
            )}>
                <pre>
                    <code
                        className="text-white/80"
                        dangerouslySetInnerHTML={{ __html: highlightSyntax(code, language) }}
                    />
                </pre>
            </div>

            {/* Status Bar */}
            <div className="h-6 bg-[#007acc] flex items-center px-3 text-[10px] text-white gap-4 select-none">
                <span>master*</span>
                <span className="opacity-80">Ln {code.split('\n').length}, Col 1</span>
                <span className="ml-auto opacity-80">UTF-8</span>
                <span className="opacity-80">TypeScript React</span>
            </div>
        </motion.div>
    );
}

// Add simple CSS for custom scrollbar if not exists
// .custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
// .custom-scrollbar::-webkit-scrollbar-thumb { background: #424242; rounded: 4px; }
