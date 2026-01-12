"use client";

import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import clsx from 'clsx';

type MarkdownMessageProps = {
    content: string;
    className?: string;
};

const normalizeLanguage = (language: string | undefined) => {
    const lower = (language || '').toLowerCase();
    if (!lower) return '';
    if (lower === 'ts') return 'typescript';
    if (lower === 'tsx') return 'tsx';
    if (lower === 'js') return 'javascript';
    if (lower === 'jsx') return 'jsx';
    if (lower === 'sh') return 'bash';
    if (lower === 'shell') return 'bash';
    if (lower === 'py') return 'python';
    return lower;
};

function CopyButton({ value, label }: { value: string; label: string }) {
    const [copied, setCopied] = useState(false);

    return (
        <button
            type="button"
            onClick={() => {
                void navigator.clipboard.writeText(value);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
            }}
            className={clsx(
                "inline-flex items-center gap-2 text-[10px] px-2 py-1 rounded border transition-colors",
                copied
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-200"
                    : "bg-white/5 border-white/10 text-white/60 hover:text-white/80 hover:bg-white/10"
            )}
            aria-label={label}
        >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
        </button>
    );
}

export function MarkdownMessage({ content, className }: MarkdownMessageProps) {
    const trimmed = useMemo(() => content.trimEnd(), [content]);

    return (
        <div className={clsx("text-white/80 leading-relaxed text-[1em]", className)}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    p({ children }) {
                        return <p className="mb-2 last:mb-0">{children}</p>;
                    },
                    ul({ children }) {
                        return <ul className="mb-2 last:mb-0 ml-5 list-disc">{children}</ul>;
                    },
                    ol({ children }) {
                        return <ol className="mb-2 last:mb-0 ml-5 list-decimal">{children}</ol>;
                    },
                    li({ children }) {
                        return <li className="mb-1 last:mb-0">{children}</li>;
                    },
                    code({ className: codeClassName, children, ...props }) {
                        const match = /language-(\w+)/.exec(codeClassName || '');
                        const language = normalizeLanguage(match?.[1]);
                        const raw = String(children ?? '');
                        const value = raw.replace(/\n$/, '');

                        const isBlock = Boolean(match);
                        if (!isBlock) {
                            return (
                                <code
                                    className="px-1 py-0.5 rounded bg-white/10 border border-white/10 text-white/90 font-mono text-[0.92em]"
                                    {...props}
                                >
                                    {children}
                                </code>
                            );
                        }

                        return (
                            <div className="my-2 rounded-lg border border-white/10 bg-black/50 overflow-hidden">
                                <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-black/30">
                                    <div className="text-[10px] font-mono uppercase tracking-widest text-white/50">
                                        {language || 'code'}
                                    </div>
                                    <CopyButton value={value} label="Copy code block" />
                                </div>
                                <SyntaxHighlighter
                                    language={language || undefined}
                                    style={vscDarkPlus}
                                    customStyle={{
                                        margin: 0,
                                        background: 'transparent',
                                        padding: '12px',
                                        fontSize: 'var(--terminal-code-font-size)',
                                        lineHeight: 1.65,
                                    }}
                                    codeTagProps={{
                                        style: {
                                            fontFamily: 'var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                        },
                                    }}
                                >
                                    {value}
                                </SyntaxHighlighter>
                            </div>
                        );
                    },
                    pre({ children }) {
                        return <>{children}</>;
                    },
                }}
            >
                {trimmed}
            </ReactMarkdown>
        </div>
    );
}
