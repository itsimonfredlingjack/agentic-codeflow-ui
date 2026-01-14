"use client";

import React, { useState, useEffect } from 'react';

interface ThinkingIndicatorProps {
    phase?: 'plan' | 'build' | 'review' | 'deploy';
    status?: string;
    showScanLine?: boolean;
    compact?: boolean;
}

const PHASE_COLORS: Record<string, string> = {
    plan: 'hsl(210 100% 50%)',      // Sapphire
    build: 'hsl(150 100% 40%)',     // Emerald
    review: 'hsl(35 100% 50%)',     // Amber
    deploy: 'hsl(280 80% 60%)',     // Amethyst
};


const STATUS_MESSAGES = [
    'PROCESSING',
    'THINKING',
    'ANALYZING',
    'COMPUTING',
];

export function ThinkingIndicator({
    phase = 'build',
    status,
    showScanLine = true,
    compact = false,
}: ThinkingIndicatorProps) {
    const [displayText, setDisplayText] = useState('');
    const [messageIndex, setMessageIndex] = useState(0);

    const color = PHASE_COLORS[phase] || PHASE_COLORS.build;
    const targetText = status || STATUS_MESSAGES[messageIndex];

    // Typing effect
    useEffect(() => {
        if (displayText.length < targetText.length) {
            const timeout = setTimeout(() => {
                setDisplayText(targetText.slice(0, displayText.length + 1));
            }, 50);
            return () => clearTimeout(timeout);
        }
    }, [displayText, targetText]);

    // Cycle through messages
    useEffect(() => {
        if (!status) {
            const interval = setInterval(() => {
                setMessageIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
                setDisplayText('');
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [status]);

    // Reset text when target changes
    useEffect(() => {
        queueMicrotask(() => setDisplayText(''));
    }, [targetText]);

    if (compact) {
        return (
            <span
                className="inline-flex items-center gap-1 font-mono text-xs"
                style={{ color }}
            >
                <span className="thinking-cursor">█</span>
                <span className="opacity-70">{displayText}</span>
                <span className="thinking-dots">...</span>
            </span>
        );
    }

    return (
        <div
            className="relative overflow-hidden rounded px-3 py-2 bg-black/40 border border-white/10"
            style={{ '--indicator-color': color } as React.CSSProperties}
        >
            {/* Scan line effect */}
            {showScanLine && (
                <div className="scan-line-overlay" />
            )}

            {/* Content */}
            <div className="relative z-10 flex items-center gap-2 font-mono text-sm">
                {/* Blinking cursor */}
                <span
                    className="thinking-cursor text-lg"
                    style={{ color, textShadow: `0 0 10px ${color}, 0 0 20px ${color}` }}
                >
                    █
                </span>

                {/* Status text */}
                <span
                    className="tracking-wider uppercase font-medium"
                    style={{ color, textShadow: `0 0 8px ${color}` }}
                >
                    {displayText}
                </span>

                {/* Animated dots */}
                <span className="thinking-dots" style={{ color }}>
                    <span className="dot">.</span>
                    <span className="dot">.</span>
                    <span className="dot">.</span>
                </span>
            </div>

            {/* Glowing progress bar */}
            <div className="mt-2 h-0.5 w-full bg-white/10 rounded overflow-hidden">
                <div
                    className="h-full thinking-progress"
                    style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
                />
            </div>
        </div>
    );
}
