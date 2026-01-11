"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

interface PhaseAuraProps {
    phase: 'plan' | 'build' | 'review' | 'deploy';
}

export function PhaseAura({ phase }: PhaseAuraProps) {
    const configs = {
        plan: {
            gradient: "from-blue-600/10 via-transparent to-transparent",
            grid: true,
            color: "rgba(37, 99, 235, 0.05)"
        },
        build: {
            gradient: "from-emerald-600/10 via-transparent to-transparent",
            grid: false,
            pulse: true,
            color: "rgba(16, 185, 129, 0.05)"
        },
        review: {
            gradient: "from-amber-600/10 via-transparent to-transparent",
            scan: true,
            color: "rgba(245, 158, 11, 0.05)"
        },
        deploy: {
            gradient: "from-purple-600/10 via-transparent to-transparent",
            glow: true,
            color: "rgba(147, 51, 234, 0.05)"
        }
    };

    const config = configs[phase];

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
            <AnimatePresence mode="wait">
                <motion.div
                    key={phase}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1 }}
                    className="absolute inset-0"
                >
                    {/* Primary Gradient Aura */}
                    <div className={clsx("absolute inset-0 bg-linear-to-br", config.gradient)} />

                    {/* Blueprint Grid for PLAN */}
                    {phase === 'plan' && (
                        <div
                            className="absolute inset-0 opacity-20"
                            style={{
                                backgroundImage: `linear-gradient(to right, ${config.color} 1px, transparent 1px), linear-gradient(to bottom, ${config.color} 1px, transparent 1px)`,
                                backgroundSize: '40px 40px'
                            }}
                        />
                    )}

                    {/* Code Pulse for BUILD */}
                    {phase === 'build' && (
                        <motion.div
                            animate={{ opacity: [0.1, 0.3, 0.1] }}
                            transition={{ duration: 4, repeat: Infinity }}
                            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.1),transparent_70%)]"
                        />
                    )}

                    {/* Scanning Beam for REVIEW */}
                    {phase === 'review' && (
                        <motion.div
                            animate={{ top: ['-20%', '120%'] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                            className="absolute left-0 right-0 h-1 bg-amber-500/10 blur-sm shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                        />
                    )}

                    {/* Ignition Glow for DEPLOY */}
                    {phase === 'deploy' && (
                        <motion.div
                            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
                            transition={{ duration: 5, repeat: Infinity }}
                            className="absolute bottom-0 left-0 right-0 h-1/2 bg-[radial-gradient(circle_at_50%_100%,rgba(147,51,234,0.15),transparent_70%)]"
                        />
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
