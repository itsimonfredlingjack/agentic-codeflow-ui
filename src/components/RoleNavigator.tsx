"use client";

import React from 'react';
import clsx from 'clsx';
import { Cpu, Bot, Shield, Zap, Box } from 'lucide-react';
import { ROLES, ROLE_ORDER, RoleId } from '@/lib/roles';

interface RoleNavigatorProps {
    currentPhase: RoleId;
    onSetPhase: (phase: RoleId) => void;
    modelAssignments: Record<string, string>;
    onSetModel: (roleId: string, modelId: string) => void;
}

export function RoleNavigator({ currentPhase, onSetPhase }: RoleNavigatorProps) {
    return (
        <div className="flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10">
            {ROLE_ORDER.map((roleId) => {
                const isActive = currentPhase.toUpperCase() === roleId;
                const role = ROLES[roleId];

                return (
                    <button
                        key={roleId}
                        onClick={() => onSetPhase(roleId)}
                        className={clsx(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium press-effect",
                            "transition-all duration-200",
                            isActive
                                ? "bg-white/10 text-white"
                                : "text-white/40 hover:text-white/70 hover:bg-white/5"
                        )}
                        style={isActive ? {
                            color: role.color,
                            boxShadow: `0 0 12px -2px ${role.color}`
                        } : undefined}
                    >
                        <span className={isActive ? "phase-glow" : ""}>
                            {getIcon(roleId, 14)}
                        </span>
                        <span className={clsx(
                            "tracking-wide",
                            isActive ? "font-semibold" : "font-normal"
                        )}>
                            {role.label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

function getIcon(roleId: string, size = 14) {
    const props = { size };
    switch (roleId) {
        case 'PLAN': return <Cpu {...props} />;
        case 'BUILD': return <Bot {...props} />;
        case 'REVIEW': return <Shield {...props} />;
        case 'DEPLOY': return <Zap {...props} />;
        default: return <Box {...props} />;
    }
}
