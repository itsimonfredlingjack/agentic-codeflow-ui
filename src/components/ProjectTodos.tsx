"use client";

import React, { useState } from 'react';
import { Check, Circle, Plus, Flame, Zap, Clock } from 'lucide-react';
import clsx from 'clsx';

interface TodoItem {
    id: string;
    text: string;
    done: boolean;
    priority?: 'high' | 'medium' | 'low';
    phase?: 'PLAN' | 'BUILD' | 'REVIEW' | 'DEPLOY';
}

const INITIAL_TODOS: TodoItem[] = [
    { id: '1', text: 'Design API architecture', done: true, priority: 'high', phase: 'PLAN' },
    { id: '2', text: 'Implement auth module', done: false, priority: 'high', phase: 'BUILD' },
    { id: '3', text: 'Write unit tests', done: false, priority: 'medium', phase: 'REVIEW' },
    { id: '4', text: 'Configure CI pipeline', done: false, priority: 'low', phase: 'BUILD' },
    { id: '5', text: 'Deploy to staging', done: false, priority: 'medium', phase: 'DEPLOY' },
    { id: '6', text: 'Performance audit', done: false, priority: 'low', phase: 'REVIEW' },
];

const priorityConfig = {
    high: { icon: Flame, color: 'text-red-400', bg: 'bg-red-500/10' },
    medium: { icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    low: { icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10' }
};

const phaseColors = {
    PLAN: 'border-blue-500/30 text-blue-400',
    BUILD: 'border-emerald-500/30 text-emerald-400',
    REVIEW: 'border-amber-500/30 text-amber-400',
    DEPLOY: 'border-purple-500/30 text-purple-400'
};

export function ProjectTodos() {
    const [todos, setTodos] = useState<TodoItem[]>(INITIAL_TODOS);
    const [newTodo, setNewTodo] = useState('');

    const toggleTodo = (id: string) => {
        setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
    };

    const addTodo = () => {
        if (!newTodo.trim()) return;
        setTodos(prev => [...prev, {
            id: Date.now().toString(),
            text: newTodo,
            done: false,
            priority: 'medium',
            phase: 'BUILD'
        }]);
        setNewTodo('');
    };

    const completedCount = todos.filter(t => t.done).length;
    const progress = (completedCount / todos.length) * 100;

    return (
        <div className="flex flex-col gap-3 h-full min-h-0">
            {/* Header with Progress */}
            <div className="flex items-center justify-between shrink-0">
                <span className="text-xs font-bold text-white/40 uppercase tracking-widest">
                    Tasks
                </span>
                <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-emerald-500 transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="text-[10px] font-mono text-white/30">
                        {completedCount}/{todos.length}
                    </span>
                </div>
            </div>

            {/* Todo List */}
            <div className="flex flex-col gap-1.5 overflow-y-auto flex-1 min-h-0 pr-1 custom-scrollbar">
                {todos.map((todo) => {
                    const PriorityIcon = todo.priority ? priorityConfig[todo.priority].icon : Circle;
                    const priorityStyle = todo.priority ? priorityConfig[todo.priority] : { color: 'text-white/20', bg: '' };

                    return (
                        <button
                            key={todo.id}
                            onClick={() => toggleTodo(todo.id)}
                            className={clsx(
                                "flex items-center gap-2.5 p-2.5 rounded-lg text-left transition-all group border",
                                todo.done
                                    ? "opacity-40 border-transparent"
                                    : "hover:bg-white/5 border-white/5 hover:border-white/10"
                            )}
                        >
                            {/* Checkbox */}
                            <div className={clsx(
                                "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all",
                                todo.done
                                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                                    : "border-white/20 group-hover:border-white/40"
                            )}>
                                {todo.done && <Check size={10} />}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className={clsx(
                                    "text-xs truncate",
                                    todo.done ? "line-through text-white/30" : "text-white/80"
                                )}>
                                    {todo.text}
                                </div>
                            </div>

                            {/* Phase Tag */}
                            {todo.phase && !todo.done && (
                                <span className={clsx(
                                    "text-[8px] font-mono px-1.5 py-0.5 rounded border uppercase opacity-60",
                                    phaseColors[todo.phase]
                                )}>
                                    {todo.phase}
                                </span>
                            )}

                            {/* Priority */}
                            {todo.priority && !todo.done && (
                                <PriorityIcon size={12} className={clsx(priorityStyle.color, "opacity-60")} />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Add Todo */}
            <div className="flex gap-2 pt-3 border-t border-white/5 shrink-0">
                <input
                    type="text"
                    value={newTodo}
                    onChange={(e) => setNewTodo(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTodo()}
                    placeholder="Add task..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-md px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/20 font-mono"
                />
                <button
                    onClick={addTodo}
                    disabled={!newTodo.trim()}
                    className={clsx(
                        "p-2 rounded-md transition-all",
                        newTodo.trim()
                            ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                            : "bg-white/5 text-white/20"
                    )}
                >
                    <Plus size={14} />
                </button>
            </div>
        </div>
    );
}
