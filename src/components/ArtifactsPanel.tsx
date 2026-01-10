"use client";

import React from 'react';
import { FileText, FileCode, ExternalLink } from 'lucide-react';

interface Artifact {
    id: string;
    name: string;
    type: 'spec' | 'code' | 'doc';
    phase: string;
}

const MOCK_ARTIFACTS: Artifact[] = [
    { id: '1', name: 'architecture_v1.md', type: 'doc', phase: 'PLAN' },
    { id: '2', name: 'auth_module.tsx', type: 'code', phase: 'BUILD' },
    { id: '3', name: 'security_audit.json', type: 'spec', phase: 'REVIEW' },
];

export function ArtifactsPanel() {
    return (
        <div className="flex flex-col gap-3 mt-4">
            <div className="flex items-center justify-between text-xs font-bold text-white/40 uppercase tracking-widest px-1">
                <span>Produced Artifacts</span>
                <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-white/30">{MOCK_ARTIFACTS.length}</span>
            </div>

            <div className="flex flex-col gap-1.5">
                {MOCK_ARTIFACTS.map((art) => (
                    <div
                        key={art.id}
                        className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-all group cursor-pointer"
                    >
                        <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-white/40 group-hover:text-white transition-colors">
                            {art.type === 'code' ? <FileCode size={14} /> : <FileText size={14} />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-bold text-white/70 truncate group-hover:text-white transition-colors">
                                {art.name}
                            </div>
                            <div className="text-[9px] text-white/30 uppercase font-mono">
                                {art.phase}
                            </div>
                        </div>
                        <ExternalLink size={10} className="text-white/10 group-hover:text-white/40 transition-all opacity-0 group-hover:opacity-100" />
                    </div>
                ))}
            </div>
        </div>
    );
}
