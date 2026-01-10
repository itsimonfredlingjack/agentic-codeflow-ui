"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Server, Key, Cpu, Wifi } from 'lucide-react';
import clsx from 'clsx';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const [activeTab, setActiveTab] = useState<'providers' | 'models' | 'system'>('providers');
    const [provider, setProvider] = useState('openai');
    const [apiKey, setApiKey] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [isTesting, setIsTesting] = useState(false);

    const handleTestConnection = () => {
        setIsTesting(true);
        setTimeout(() => {
            setIsTesting(false);
            setIsConnected(true);
        }, 1500);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 10 }}
                        className="relative w-full max-w-2xl bg-[hsl(var(--background))] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[500px]"
                    >
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                            <h2 className="text-lg font-bold tracking-wide text-white">Settings</h2>
                            <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex flex-1 overflow-hidden">
                            {/* Sidebar Tabs */}
                            <div className="w-48 bg-white/2 border-r border-white/5 p-4 flex flex-col gap-1">
                                {[
                                    { id: 'providers', label: 'Providers', icon: Server },
                                    { id: 'models', label: 'Models', icon: Cpu },
                                    { id: 'system', label: 'System', icon: Wifi },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as 'providers' | 'models' | 'system')}
                                        className={clsx(
                                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left",
                                            activeTab === tab.id
                                                ? "bg-white/10 text-white"
                                                : "text-white/40 hover:text-white hover:bg-white/5"
                                        )}
                                    >
                                        <tab.icon size={16} />
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Content Area */}
                            <div className="flex-1 p-8 overflow-y-auto">
                                {activeTab === 'providers' && (
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-widest text-white/40">AI Provider</label>
                                            <select
                                                value={provider}
                                                onChange={(e) => setProvider(e.target.value)}
                                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                                            >
                                                <option value="openai">OpenAI</option>
                                                <option value="anthropic">Anthropic</option>
                                                <option value="gemini">Google Gemini</option>
                                                <option value="ollama">Ollama (Local)</option>
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-widest text-white/40">API Key</label>
                                            <div className="relative">
                                                <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                                                <input
                                                    type="password"
                                                    value={apiKey}
                                                    onChange={(e) => setApiKey(e.target.value)}
                                                    placeholder="sk-..."
                                                    className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-colors font-mono"
                                                />
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-white/5">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className={clsx("w-2 h-2 rounded-full", isConnected ? "bg-emerald-500" : "bg-red-500")} />
                                                    <span className="text-sm text-white/60">{isConnected ? "Connected" : "Disconnected"}</span>
                                                </div>

                                                <button
                                                    onClick={handleTestConnection}
                                                    disabled={isTesting}
                                                    className={clsx(
                                                        "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                                                        isTesting ? "bg-white/5 text-white/40 cursor-wait" : "bg-white/10 hover:bg-white/20 text-white"
                                                    )}
                                                >
                                                    {isTesting ? "Testing..." : isConnected ? "Re-Test" : "Test Connection"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'models' && (
                                    <div className="flex flex-col items-center justify-center h-full text-white/30 gap-2">
                                        <Cpu size={32} />
                                        <p>Model selection requires active connection.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
