"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Zap, PanelLeft, PanelRight, Terminal, X, Settings } from 'lucide-react';
import clsx from 'clsx';

interface CommandAction {
    id: string;
    label: string;
    icon: React.ElementType;
    shortcut?: string;
    onSelect?: () => void;
}

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    onCommand?: (commandId: string) => void;
    actions?: CommandAction[];
}

const DEFAULT_COMMANDS: CommandAction[] = [
    { id: 'toggle-left', label: 'Toggle Left Panel', icon: PanelLeft, shortcut: 'Cmd+B' },
    { id: 'toggle-right', label: 'Toggle Right Panel', icon: PanelRight, shortcut: 'Cmd+.' },
    { id: 'new-run', label: 'Start New Session', icon: Zap, shortcut: 'Cmd+N' },
    { id: 'open-settings', label: 'Open Settings', icon: Settings, shortcut: 'Cmd+,' },
    { id: 'clear-logs', label: 'Clear Terminal Logs', icon: X, shortcut: 'Cmd+K' },
    { id: 'focus-input', label: 'Focus Omnibar', icon: Terminal, shortcut: '/' },
];

export function CommandPalette({ isOpen, onClose, onCommand, actions = [] }: CommandPaletteProps) {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);

    // Merge default and passed actions
    const allCommands = [...actions, ...DEFAULT_COMMANDS];
    // De-duplicate by ID (prefer passed actions)
    const uniqueCommands = Array.from(new Map(allCommands.map(item => [item.id, item])).values());

    const filteredCommands = uniqueCommands.filter(cmd =>
        cmd.label.toLowerCase().includes(query.toLowerCase())
    );

    // Keyboard Navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredCommands[selectedIndex]) {
                    const cmd = filteredCommands[selectedIndex];
                    if (cmd.onSelect) {
                        cmd.onSelect();
                    } else if (onCommand) {
                        onCommand(cmd.id);
                    }
                    onClose();
                }
            } else if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, filteredCommands, selectedIndex, onCommand, onClose]);

    // Reset selection on query change handled in onChange now
    // useEffect(() => setSelectedIndex(0), [query]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-1000 flex items-start justify-center pt-[20vh] px-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    {/* Palette */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: -20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: -20 }}
                        className="relative w-full max-w-xl bg-[hsl(var(--background))] border border-white/20 rounded-xl shadow-2xl overflow-hidden flex flex-col"
                    >
                        {/* Search Input */}
                        <div className="flex items-center px-4 py-4 border-b border-white/10 gap-3">
                            <Search size={20} className="text-white/40" />
                            <input
                                autoFocus
                                value={query}
                                onChange={(e) => {
                                    setQuery(e.target.value);
                                    setSelectedIndex(0);
                                }}
                                placeholder="Type a command or search..."
                                className="bg-transparent border-none outline-none text-white text-lg placeholder-white/20 flex-1"
                            />
                            <div className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-[10px] font-mono text-white/40">ESC</div>
                        </div>

                        {/* Results */}
                        <div className="max-h-[300px] overflow-y-auto py-2">
                            {filteredCommands.length > 0 ? (
                                filteredCommands.map((cmd, index) => (
                                    <button
                                        key={cmd.id}
                                        onClick={() => {
                                            if (cmd.onSelect) cmd.onSelect();
                                            else if (onCommand) onCommand(cmd.id);
                                            onClose();
                                        }}
                                        onMouseEnter={() => setSelectedIndex(index)}
                                        className={clsx(
                                            "w-full flex items-center justify-between px-4 py-3 transition-colors",
                                            index === selectedIndex ? "bg-emerald-500/20 text-white" : "text-white/60 hover:text-white"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <cmd.icon size={16} className={clsx(index === selectedIndex ? "text-emerald-400" : "text-white/40")} />
                                            <span className="text-sm font-medium">{cmd.label}</span>
                                        </div>
                                        {cmd.shortcut && (
                                            <span className="text-[10px] font-mono opacity-50">{cmd.shortcut}</span>
                                        )}
                                    </button>
                                ))
                            ) : (
                                <div className="px-4 py-8 text-center text-white/30 text-sm italic">
                                    No commands found.
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-2 bg-white/5 border-t border-white/5 flex items-center justify-between text-[10px] text-white/30">
                            <span>Platform Actions</span>
                            <div className="flex items-center gap-2">
                                <span>Navigate</span>
                                <div className="flex gap-1">
                                    <div className="w-4 h-4 rounded bg-white/10 flex items-center justify-center">↑</div>
                                    <div className="w-4 h-4 rounded bg-white/10 flex items-center justify-center">↓</div>
                                </div>
                                <span className="ml-2">Select</span>
                                <div className="w-8 h-4 rounded bg-white/10 flex items-center justify-center">↵</div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
