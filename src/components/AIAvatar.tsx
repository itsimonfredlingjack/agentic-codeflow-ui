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
        plan: { color: '#3b82f6', glow: 'rgba(59, 130, 246, 0.5)' },    // Sapphire
        build: { color: '#10b981', glow: 'rgba(16, 185, 129, 0.5)' },   // Emerald
        review: { color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.5)' },  // Amber
        deploy: { color: '#a855f7', glow: 'rgba(168, 85, 247, 0.5)' }   // Amethyst
    }[phase];

    return (
        <div className="relative w-16 h-16 flex items-center justify-center">
            {/* Core Glow */}
            <div
                className="absolute inset-0 rounded-full blur-xl transition-colors duration-1000"
                style={{ background: config.glow, opacity: isProcessing ? 0.8 : 0.3 }}
            />

            {/* Geometric Shape Hologram */}
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
                <defs>
                    <linearGradient id={`grad-${phase}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={config.color} stopOpacity="0.8" />
                        <stop offset="100%" stopColor="white" stopOpacity="0.2" />
                    </linearGradient>
                </defs>

                {/* Animated Rings */}
                <motion.circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke={`url(#grad-${phase})`}
                    strokeWidth="1"
                    fill="none"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{
                        scale: [0.8, 1, 0.8],
                        opacity: [0.3, 0.6, 0.3],
                        rotate: 360
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                />

                <motion.circle
                    cx="50"
                    cy="50"
                    r="30"
                    stroke={config.color}
                    strokeWidth="0.5"
                    strokeDasharray="4 4"
                    fill="none"
                    animate={{ rotate: -360 }}
                    transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                    style={{ opacity: 0.4 }}
                />

                {/* Central Kernel */}
                <motion.g
                    animate={{
                        scale: isProcessing ? [1, 1.2, 1] : 1,
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    {phase === 'plan' && (
                        // Tesseract-ish Square
                        <rect x="35" y="35" width="30" height="30" stroke={config.color} strokeWidth="2" fill="none" transform="rotate(45 50 50)" />
                    )}
                    {phase === 'build' && (
                        // Hexagon
                        <path d="M50 25 L72 37.5 L72 62.5 L50 75 L28 62.5 L28 37.5 Z" stroke={config.color} strokeWidth="2" fill="none" />
                    )}
                    {phase === 'review' && (
                        // Shield / Triangle
                        <path d="M50 25 L75 70 L25 70 Z" stroke={config.color} strokeWidth="2" fill="none" />
                    )}
                    {phase === 'deploy' && (
                        // Circle / Portal
                        <circle cx="50" cy="50" r="15" stroke={config.color} strokeWidth="2" fill="none" />
                    )}
                </motion.g>

                {/* Processing Particles */}
                {isProcessing && (
                    <motion.circle
                        cx="50" cy="50" r="2" fill="white"
                        animate={{ opacity: [0, 1, 0], scale: [0, 2, 0] }}
                        transition={{ duration: 1, repeat: Infinity }}
                    />
                )}
            </svg>
        </div>
    );
}
