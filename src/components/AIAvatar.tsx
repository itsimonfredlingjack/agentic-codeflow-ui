"use client";

import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface AIAvatarProps {
    phase: 'plan' | 'build' | 'review' | 'deploy';
    isProcessing?: boolean;
}

export function AIAvatar({ phase, isProcessing = false }: AIAvatarProps) {
    const config = {
        plan: { color: '#3b82f6' },    // Sapphire
        build: { color: '#10b981' },   // Emerald
        review: { color: '#f59e0b' },  // Amber
        deploy: { color: '#a855f7' }   // Amethyst
    }[phase];

    return (
        <div className="relative w-12 h-12 flex items-center justify-center">
            {/* Minimalist Geometric Hologram */}
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
                {/* Static Ring */}
                <circle
                    cx="50" cy="50" r="45"
                    stroke={config.color}
                    strokeWidth="1"
                    fill="none"
                    opacity="0.3"
                />

                {/* Rotating Ring - Only active when processing */}
                <motion.circle
                    cx="50" cy="50" r="35"
                    stroke={config.color}
                    strokeWidth="2"
                    strokeDasharray="10 20"
                    fill="none"
                    animate={{ rotate: 360 }}
                    transition={{
                        duration: isProcessing ? 2 : 10,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                    style={{ opacity: 0.8 }}
                />

                {/* Center Core */}
                <motion.g
                    animate={{
                        scale: isProcessing ? [1, 1.1, 1] : 1,
                        opacity: isProcessing ? 1 : 0.8
                    }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                >
                    {phase === 'plan' && (
                        <rect x="40" y="40" width="20" height="20" stroke={config.color} strokeWidth="2" fill="none" />
                    )}
                    {phase === 'build' && (
                        <path d="M50 35 L65 60 L35 60 Z" stroke={config.color} strokeWidth="2" fill="none" />
                    )}
                    {phase === 'review' && (
                        <path d="M50 35 L63 45 L63 60 L50 70 L37 60 L37 45 Z" stroke={config.color} strokeWidth="2" fill="none" />
                    )}
                    {phase === 'deploy' && (
                        <circle cx="50" cy="50" r="10" stroke={config.color} strokeWidth="2" fill="none" />
                    )}
                </motion.g>
            </svg>
        </div>
    );
}
