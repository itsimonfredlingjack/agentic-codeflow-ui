"use client";

import React from 'react';
import { ArrowRight } from 'lucide-react';

const FLOW = ['PLAN', 'BUILD', 'REVIEW', 'DEPLOY'];

export function AgentSynergy() {
    return (
        <div className="flex items-center justify-center gap-1 py-3 px-2">
            {FLOW.map((phase, i) => (
                <React.Fragment key={phase}>
                    <span className="text-[10px] font-mono text-white/40 uppercase">
                        {phase}
                    </span>
                    {i < FLOW.length - 1 && (
                        <ArrowRight size={10} className="text-white/20" />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
}
