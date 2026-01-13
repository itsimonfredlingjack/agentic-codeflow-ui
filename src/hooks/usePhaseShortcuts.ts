
import { useEffect } from 'react';

type Phase = 'plan' | 'build' | 'review' | 'deploy';

const PHASE_ORDER: Phase[] = ['plan', 'build', 'review', 'deploy'];

export function usePhaseShortcuts(
    currentPhase: Phase,
    onPhaseChange: (newPhase: Phase) => void
) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Tab key cycles phases
            if (e.key === 'Tab') {
                e.preventDefault();
                const currentIndex = PHASE_ORDER.indexOf(currentPhase);
                const nextIndex = (currentIndex + 1) % PHASE_ORDER.length;
                onPhaseChange(PHASE_ORDER[nextIndex]);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentPhase, onPhaseChange]);
}
