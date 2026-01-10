"use client";

import React from 'react';
import { Sparkles, Terminal, ShieldCheck, Zap } from 'lucide-react';
import clsx from 'clsx';

export interface Agent {
    id: string;
    phase: 'PLAN' | 'BUILD' | 'REVIEW' | 'DEPLOY';
    model: string;
    icon: React.ComponentType<{ size?: number }>;
    color: string;
}

const AGENTS: Agent[] = [
    { id: 'plan', phase: 'PLAN', model: 'Claude', icon: Sparkles, color: 'var(--sapphire)' },
    { id: 'build', phase: 'BUILD', model: 'Claude', icon: Terminal, color: 'var(--emerald)' },
    { id: 'review', phase: 'REVIEW', model: 'Claude', icon: ShieldCheck, color: 'var(--amber)' },
    { id: 'deploy', phase: 'DEPLOY', model: 'Claude', icon: Zap, color: 'var(--amethyst)' },
];

interface AgentSelectorProps {
    currentAgentId?: string;
    onSelectAgent: (agentId: string) => void;
}

export function AgentSelector({ currentAgentId, onSelectAgent }: AgentSelectorProps) {
    return (
        <div className="flex flex-col gap-2">
            {AGENTS.map((agent) => {
                const isActive = currentAgentId === agent.id;
                const Icon = agent.icon;

                return (
                    <button
                        key={agent.id}
                        onClick={() => onSelectAgent(agent.id)}
                        className={clsx(
                            "group relative flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 text-left",
                            isActive
                                ? "bg-white/10 border-white/20"
                                : "bg-transparent border-white/5 hover:bg-white/5"
                        )}
                    >
                        {/* Icon */}
                        <div
                            className={clsx(
                                "w-8 h-8 rounded-md flex items-center justify-center",
                                isActive ? "bg-white/10" : "bg-white/5"
                            )}
                            style={{ color: isActive ? agent.color : 'rgba(255,255,255,0.4)' }}
                        >
                            <Icon size={16} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <span className={clsx(
                                "text-sm font-bold tracking-wide block",
                                isActive ? "text-white" : "text-white/60"
                            )}>
                                {agent.phase}
                            </span>
                            <span className="text-[10px] text-white/30 font-mono">
                                {agent.model}
                            </span>
                        </div>

                        {/* Active indicator */}
                        {isActive && (
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        )}
                    </button>
                );
            })}
        </div>
    );
}
