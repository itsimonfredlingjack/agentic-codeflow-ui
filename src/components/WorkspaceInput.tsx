"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import clsx from 'clsx';
import { Send } from 'lucide-react';




type SlashCommand = {
    id: string;
    label: string;
    description: string;
    insert: string;
};

type MentionTarget = {
    id: string;
    label: string;
    description: string;
    insert: string;
};

type MacroCommand = {
    id: string;
    label: string;
    description: string;
    insert: string;
    command: string;
};

type AutocompleteKind = 'slash' | 'mention' | 'macro';

type AutocompleteItem = {
    id: string;
    label: string;
    description: string;
    insert: string;
    kind: AutocompleteKind;
};

type ParsedInput = {
    mode: 'chat' | 'terminal' | 'system';
    payload: string;
    command?: string;
    macro?: MacroCommand;
    agentTarget?: MentionTarget;
};

interface WorkspaceInputProps {
    currentPhase: 'plan' | 'build' | 'review' | 'deploy';
    config: { accent: string; placeholder: string };
    onSend: (parsed: ParsedInput, rawValue: string) => Promise<void>;
    onSystemCommand: (command: string, payload: string) => void;
}

export function WorkspaceInput({ currentPhase, config, onSend, onSystemCommand }: WorkspaceInputProps) {
    const [inputValue, setInputValue] = useState('');
    const [autocompleteOpen, setAutocompleteOpen] = useState(false);
    const [autocompleteQuery, setAutocompleteQuery] = useState('');
    const [autocompleteActiveIndex, setAutocompleteActiveIndex] = useState(0);
    const [autocompleteKind, setAutocompleteKind] = useState<AutocompleteKind>('slash');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const slashCommands: SlashCommand[] = useMemo(() => [
        { id: 'help', label: '/help', description: 'Show available commands', insert: '/help' },
        { id: 'models', label: '/models', description: 'List Ollama models', insert: '/models' },
        { id: 'clear', label: '/clear', description: 'Clear local output (Cmd+L)', insert: '/clear' },
        { id: 'remember', label: '/remember', description: 'Remember a note', insert: '/remember ' },
        { id: 'pin', label: '/pin', description: 'Pin a note', insert: '/pin ' },
        { id: 'goal', label: '/goal', description: 'Set working goal', insert: '/goal ' },
        { id: 'chat', label: '/chat', description: 'Chat with Qwen (same as /llm)', insert: '/chat ' },
        { id: 'llm', label: '/llm', description: 'Chat with Qwen (explicit)', insert: '/llm ' },
        { id: 'exec', label: '/exec', description: 'Run a shell command', insert: '/exec ' },
        { id: 'cmd', label: '/cmd', description: 'Run a shell command (alias)', insert: '/cmd ' },
        { id: 'init', label: '/init', description: 'Initialize a fresh session (placeholder)', insert: '/init ' },
    ], []);

    const mentionTargets: MentionTarget[] = useMemo(() => [
        { id: 'plan', label: '@plan', description: 'Planning mode', insert: '@plan ' },
        { id: 'build', label: '@build', description: 'Build mode', insert: '@build ' },
        { id: 'review', label: '@review', description: 'Review mode', insert: '@review ' },
        { id: 'deploy', label: '@deploy', description: 'Deploy mode', insert: '@deploy ' },
        { id: 'engineer', label: '@engineer', description: 'Implementation and fixes', insert: '@engineer ' },
        { id: 'designer', label: '@designer', description: 'UI and UX ideas', insert: '@designer ' },
        { id: 'reviewer', label: '@reviewer', description: 'Critical review and QA', insert: '@reviewer ' },
        { id: 'build-helper', label: '@build-helper', description: 'Beta: build assistance', insert: '@build-helper ' },
        { id: 'frontend-designer', label: '@frontend-designer', description: 'Beta: UI execution', insert: '@frontend-designer ' },
        { id: 'code-reviewer', label: '@code-reviewer', description: 'Beta: code review', insert: '@code-reviewer ' },
    ], []);

    const macroCommands: MacroCommand[] = useMemo(() => [
        { id: 'test', label: '!test', description: 'Typecheck (no tests configured)', insert: '!test ', command: 'npx tsc -p tsconfig.json --noEmit' },
        { id: 'lint', label: '!lint', description: 'Run eslint', insert: '!lint ', command: 'npm run lint' },
        { id: 'build', label: '!build', description: 'Production build', insert: '!build ', command: 'npm run build' },
    ], []);

    const macroLookup = useMemo(() => new Map(macroCommands.map((macro) => [macro.id, macro])), [macroCommands]);
    const mentionLookup = useMemo(() => new Map(mentionTargets.map((target) => [target.id, target])), [mentionTargets]);

    const autocompleteItems = useMemo<Record<AutocompleteKind, AutocompleteItem[]>>(() => ({
        slash: slashCommands.map((cmd) => ({ ...cmd, kind: 'slash' as const })),
        mention: mentionTargets.map((target) => ({ ...target, kind: 'mention' as const })),
        macro: macroCommands.map((macro) => ({ ...macro, kind: 'macro' as const })),
    }), [slashCommands, mentionTargets, macroCommands]);

    const filteredAutocompleteItems = useMemo(() => {
        const q = autocompleteQuery.trim().toLowerCase();
        const items = autocompleteItems[autocompleteKind] ?? [];
        if (!q) return items;
        return items.filter((item) => item.label.toLowerCase().includes(q) || item.description.toLowerCase().includes(q));
    }, [autocompleteItems, autocompleteKind, autocompleteQuery]);

    const isLikelyTerminalCommand = (text: string) => {
        if (text.startsWith('$')) return true;
        if (text.startsWith('./') || text.startsWith('../')) return true;
        if (/[|&]{2}|\|/.test(text)) return true;
        return /^(npm|npx|pnpm|yarn|bun|git|ls|cd|cat|rg|grep|node|python|pip|docker|kubectl|make|tsc|eslint)\b/i.test(text);
    };

    const parseInput = (raw: string): ParsedInput => {
        let text = raw.trim();
        if (!text) return { mode: 'chat' as const, payload: '' };

        let agentTarget: MentionTarget | undefined;
        const agentMatch = text.match(/^@([a-zA-Z0-9-_]+)\s+/);
        if (agentMatch) {
            agentTarget = mentionLookup.get(agentMatch[1].toLowerCase());
            text = text.replace(/^@([a-zA-Z0-9-_]+)\s+/, '');
        }

        if (text.startsWith('!')) {
            const macroMatch = text.match(/^!([a-zA-Z0-9-_]+)/);
            const macro = macroMatch ? macroLookup.get(macroMatch[1].toLowerCase()) : undefined;
            if (macro) {
                return { mode: 'terminal' as const, payload: macro.command, macro, agentTarget };
            }
        }

        if (text.startsWith('/')) {
            const match = text.match(/^\/([a-zA-Z0-9-_]+)(?:\s+(.*))?$/);
            if (match) {
                const command = match[1].toLowerCase();
                const arg = (match[2] ?? '').trim();

                if (command === 'chat' || command === 'llm') {
                    return { mode: 'chat' as const, payload: arg, command, agentTarget };
                }
                if (command === 'exec' || command === 'cmd') {
                    return { mode: 'terminal' as const, payload: arg, command, agentTarget };
                }
                // Check against known system commands
                const systemCmds = slashCommands.map(c => c.id).filter(id => !['chat', 'llm', 'exec', 'cmd'].includes(id));
                if (systemCmds.includes(command)) {
                    return { mode: 'system' as const, payload: arg, command, agentTarget };
                }
            }
        }

        const mode = isLikelyTerminalCommand(text)
            ? 'terminal'
            : (currentPhase === 'plan' || currentPhase === 'review' ? 'chat' : 'terminal');
        return { mode, payload: text, agentTarget };
    };

    const updateAutocompleteFromInput = (nextValue: string) => {
        const el = textareaRef.current;
        const cursor = el?.selectionStart ?? nextValue.length;

        const beforeCursor = nextValue.slice(0, cursor);
        const match = beforeCursor.match(/(^|[\s\n])([/@!])([a-zA-Z0-9-_]*)$/);
        if (!match) {
            setAutocompleteOpen(false);
            setAutocompleteQuery('');
            setAutocompleteActiveIndex(0);
            return;
        }

        const prefix = match[2];
        const kind = prefix === '/' ? 'slash' : prefix === '@' ? 'mention' : 'macro';
        setAutocompleteKind(kind);
        setAutocompleteOpen(true);
        setAutocompleteQuery(match[3] || '');
        setAutocompleteActiveIndex(0);
    };

    const insertAutocompleteItem = (item: AutocompleteItem) => {
        const el = textareaRef.current;
        if (!el) {
            setInputValue(item.insert);
            setAutocompleteOpen(false);
            return;
        }

        const cursor = el.selectionStart ?? inputValue.length;
        const beforeCursor = inputValue.slice(0, cursor);
        const afterCursor = inputValue.slice(cursor);

        const match = beforeCursor.match(/(^|[\s\n])([/@!])([a-zA-Z0-9-_]*)$/);
        if (!match) {
            setInputValue(item.insert);
            setAutocompleteOpen(false);
            return;
        }

        const triggerLength = `${match[2]}${match[3] || ''}`.length;
        const startIndex = beforeCursor.length - triggerLength;
        const next = `${inputValue.slice(0, startIndex)}${item.insert}${afterCursor.replace(/^\s+/, '')}`;
        setInputValue(next);
        setAutocompleteOpen(false);
        setAutocompleteQuery('');
        setAutocompleteActiveIndex(0);

        requestAnimationFrame(() => {
            const nextCursor = startIndex + item.insert.length;
            el.focus();
            el.setSelectionRange(nextCursor, nextCursor);
        });
    };

    // Clamp active index when filtered items change (only when already open)
    const prevFilteredLengthRef = useRef(filteredAutocompleteItems.length);
    useEffect(() => {
        if (!autocompleteOpen) return;
        if (filteredAutocompleteItems.length === 0) return;
        // Only update if the length actually changed to avoid synchronous setState
        if (prevFilteredLengthRef.current === filteredAutocompleteItems.length) return;
        prevFilteredLengthRef.current = filteredAutocompleteItems.length;
        queueMicrotask(() => {
            setAutocompleteActiveIndex((prev) => Math.min(prev, filteredAutocompleteItems.length - 1));
        });
    }, [autocompleteOpen, filteredAutocompleteItems.length]);

    const handleSend = async () => {
        if (!inputValue.trim()) return;

        const parsed = parseInput(inputValue);
        if (parsed.mode !== 'system' && !parsed.payload) return;

        setInputValue('');
        setAutocompleteOpen(false);

        if (parsed.mode === 'system') {
            onSystemCommand(parsed.command!, parsed.payload);
            return;
        }

        await onSend(parsed, inputValue);
    };

    return (
        <div className="p-4 shrink-0 z-20 bg-[#050505] border-t border-white/10">
            <div className={clsx(
                "relative group flex items-stretch overflow-hidden rounded-xl",
                "border border-white/10 transition-all duration-200",
                "focus-within:border-white/20 focus-within:bg-black/40",
                "focus-within:shadow-[0_0_20px_rgba(255,255,255,0.05)]"
            )}>
                {/* Autocomplete Menu */}
                {autocompleteOpen && filteredAutocompleteItems.length > 0 && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 z-50">
                        <div className="mx-2 rounded-lg border border-white/10 bg-black/90 shadow-xl overflow-hidden">
                            <div className="px-3 py-2 text-[10px] text-white/40 font-mono border-b border-white/10">
                                {autocompleteKind === 'slash' ? 'Commands' : autocompleteKind === 'mention' ? 'Agents' : 'Macros'}
                            </div>
                            <div className="max-h-56 overflow-y-auto">
                                {filteredAutocompleteItems.map((cmd, idx) => (
                                    <button
                                        key={cmd.id}
                                        type="button"
                                        onMouseEnter={() => setAutocompleteActiveIndex(idx)}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => insertAutocompleteItem(cmd)}
                                        className={clsx(
                                            "w-full text-left px-3 py-2 flex items-start gap-3 font-mono",
                                            idx === autocompleteActiveIndex ? "bg-white/10" : "bg-transparent hover:bg-white/5"
                                        )}
                                        data-selected={idx === autocompleteActiveIndex}
                                    >
                                        <div className="text-white/90 text-xs w-16 shrink-0">{cmd.label}</div>
                                        <div className="text-white/40 text-xs">{cmd.description}</div>
                                    </button>
                                ))}
                            </div>
                            <div className="px-3 py-2 text-[10px] text-white/30 border-t border-white/10">
                                ↑/↓ to navigate • Enter/Tab to insert • Esc to close
                            </div>
                        </div>
                    </div>
                )}

                {/* Prefix Icon */}
                <div className="w-10 flex items-start pt-3 justify-center text-white/30 group-focus-within:text-white/50 transition-colors">
                    <span className="font-mono text-lg">❯</span>
                </div>

                <div className="flex-1 flex flex-col py-2">
                    <div className="flex flex-wrap gap-1 min-h-[18px] text-[10px] uppercase tracking-wider text-white/40">
                        {(() => {
                            const preview = parseInput(inputValue);
                            if (!inputValue.trim()) return null;

                            const chips: { label: string; tone: string }[] = [];
                            const modeLabel = preview.mode === 'terminal' ? 'Terminal' : preview.mode === 'chat' ? 'Chat' : 'Command';
                            chips.push({ label: modeLabel, tone: preview.mode === 'terminal' ? 'border-emerald-500/30 text-emerald-300/80' : preview.mode === 'chat' ? 'border-sapphire-500/30 text-sapphire-300/80' : 'border-amber-500/30 text-amber-300/80' });
                            if (preview.agentTarget) {
                                chips.push({ label: `Agent: ${preview.agentTarget.label.replace('@', '').toUpperCase()}`, tone: 'border-cyan-500/30 text-cyan-300/80' });
                            }
                            if (preview.command) {
                                chips.push({ label: `/${preview.command}`, tone: 'border-white/20 text-white/50' });
                            }
                            if (preview.macro) {
                                chips.push({ label: `Macro: ${preview.macro.label}`, tone: 'border-emerald-500/20 text-emerald-300/70' });
                            }
                            return chips.map((chip) => (
                                <span
                                    key={chip.label}
                                    className={clsx(
                                        "px-2 py-0.5 rounded-full border bg-black/30",
                                        chip.tone
                                    )}
                                >
                                    {chip.label}
                                </span>
                            ));
                        })()}
                    </div>
                    <textarea
                        ref={textareaRef}
                        value={inputValue}
                        onChange={(e) => {
                            const next = e.target.value;
                            setInputValue(next);
                            updateAutocompleteFromInput(next);
                        }}
                        onKeyDown={(e) => {
                            if (autocompleteOpen) {
                                if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setAutocompleteOpen(false);
                                    return;
                                }
                                if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    setAutocompleteActiveIndex((prev) => Math.min(prev + 1, filteredAutocompleteItems.length - 1));
                                    return;
                                }
                                if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    setAutocompleteActiveIndex((prev) => Math.max(prev - 1, 0));
                                    return;
                                }
                                if (e.key === 'Enter' || e.key === 'Tab') {
                                    const cmd = filteredAutocompleteItems[autocompleteActiveIndex];
                                    if (cmd) {
                                        e.preventDefault();
                                        insertAutocompleteItem(cmd);
                                        return;
                                    }
                                }
                            }

                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                void handleSend();
                            }
                        }}
                        placeholder={config.placeholder}
                        className="flex-1 bg-transparent border-none focus:ring-0 text-white/90 placeholder:text-white/20 resize-none px-0 min-h-[48px] max-h-[200px] text-sm font-mono leading-relaxed focus:outline-none"
                    />
                </div>

                <div className="flex flex-col justify-end p-2">
                    <button
                        onClick={() => void handleSend()}
                        disabled={!inputValue.trim()}
                        className={clsx(
                            "p-2.5 rounded-lg transition-all duration-fast",
                            inputValue.trim()
                                ? `${config.accent} hover:scale-110 active:scale-95 bg-white/5 hover:bg-white/10`
                                : "text-white/10"
                        )}
                    >
                        <Send size={16} className={clsx(
                            "transition-transform duration-fast",
                            inputValue.trim() ? "translate-x-0" : "translate-x-1 opacity-0"
                        )} />
                    </button>
                </div>
            </div>
        </div>
    );
}
