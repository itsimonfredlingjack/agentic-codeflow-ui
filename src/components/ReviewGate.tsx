"use client";

import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { ChevronRight, Lock, Unlock } from 'lucide-react';
import clsx from 'clsx';

interface ReviewGateProps {
    onUnlock: () => void;
}

export function ReviewGate({ onUnlock }: ReviewGateProps) {
    const [unlocked, setUnlocked] = useState(false);
    const x = useMotionValue(0);
    const opacity = useTransform(x, [0, 200], [1, 0]);
    const textOpacity = useTransform(x, [0, 100], [1, 0]);
    const width = 260; // Track width

    const handleDragEnd = () => {
        if (x.get() > 180) {
            setUnlocked(true);
            onUnlock();
        } else {
            animate(x, 0, { type: "spring", stiffness: 400, damping: 40 });
        }
    };

    return (
        <div className={clsx(
            "relative h-14 rounded-full border border-white/10 overflow-hidden select-none transition-all duration-500",
            unlocked ? "bg-emerald-500/20 w-14" : "bg-black/30 w-[260px]"
        )}>
            {/* Background Track Text */}
            {!unlocked && (
                <motion.div
                    style={{ opacity: textOpacity }}
                    className="absolute inset-0 flex items-center justify-center text-xs font-bold tracking-widest text-white/30"
                >
                    SLIDE TO APPROVE
                </motion.div>
            )}

            {/* Slider Handle */}
            <motion.div
                drag={!unlocked ? "x" : false}
                dragConstraints={{ left: 0, right: width - 56 }}
                dragElastic={0.1}
                dragMomentum={false}
                onDragEnd={handleDragEnd}
                style={{ x }}
                className={clsx(
                    "absolute top-1 bottom-1 left-1 w-12 rounded-full flex items-center justify-center shadow-lg transition-colors cursor-grab active:cursor-grabbing",
                    unlocked ? "bg-emerald-500" : "bg-amber-500 hover:bg-amber-400"
                )}
            >
                {unlocked ? <Unlock size={18} className="text-black" /> : <ChevronRight size={20} className="text-black" />}
            </motion.div>
        </div>
    );
}
