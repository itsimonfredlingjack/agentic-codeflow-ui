"use client";

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Brain } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

interface ThinkingBlockProps {
    content: string;
    defaultExpanded?: boolean;
}

export function ThinkingBlock({ content, defaultExpanded = false }: ThinkingBlockProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    // Parse bullet points
    const lines = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

    return (
        <div className="my-2 rounded-lg border border-amber-500/20 bg-amber-500/5 overflow-hidden">
            {/* Header - clickable to toggle */}
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className={clsx(
                    "w-full flex items-center gap-2 px-3 py-2 text-left",
                    "hover:bg-amber-500/10 transition-colors",
                    "text-amber-400/80 text-xs font-mono uppercase tracking-wider"
                )}
            >
                {isExpanded ? (
                    <ChevronDown size={14} className="text-amber-500" />
                ) : (
                    <ChevronRight size={14} className="text-amber-500" />
                )}
                <Brain size={14} className="text-amber-500" />
                <span>Thinking</span>
                <span className="text-amber-500/40 ml-auto text-[10px]">
                    {lines.length} thoughts
                </span>
            </button>

            {/* Content - collapsible */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-3 pb-3 pt-1 border-t border-amber-500/10">
                            <ul className="space-y-1">
                                {lines.map((line, idx) => {
                                    // Remove bullet point prefixes if present
                                    const cleanLine = line.replace(/^[•\-\*]\s*/, '');
                                    return (
                                        <li
                                            key={idx}
                                            className="flex items-start gap-2 text-sm text-amber-100/70 font-mono"
                                        >
                                            <span className="text-amber-500 mt-0.5">•</span>
                                            <span>{cleanLine}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
