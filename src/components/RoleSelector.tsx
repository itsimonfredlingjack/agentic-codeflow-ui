"use client";

import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { ChevronDown, Sparkles, Terminal, ShieldAlert, Rocket } from 'lucide-react';
import { RoleId, RoleSpec, ROLES, ROLE_ORDER } from '@/lib/roles';

interface RoleSelectorProps {
  currentRole: RoleId;
  onRoleChange: (role: RoleId) => void;
  disabled?: boolean;
}

const ROLE_ICONS: Record<RoleId, React.ElementType> = {
  PLAN: Sparkles,
  BUILD: Terminal,
  REVIEW: ShieldAlert,
  DEPLOY: Rocket,
};

export function RoleSelector({ currentRole, onRoleChange, disabled = false }: RoleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const role = ROLES[currentRole];
  const Icon = ROLE_ICONS[currentRole];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleSelect = (roleId: RoleId) => {
    onRoleChange(roleId);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={clsx(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg",
          "bg-black/40 border border-white/10",
          "backdrop-blur-md",
          "transition-all duration-200",
          disabled
            ? "opacity-50 cursor-not-allowed"
            : "hover:border-white/20 hover:bg-black/50 cursor-pointer",
          isOpen && "border-white/20 bg-black/50"
        )}
        style={{
          boxShadow: isOpen ? `0 0 20px hsla(${role.color.replace('var(--', '').replace(')', '')}, 0.2)` : undefined
        }}
      >
        <Icon
          size={14}
          className="transition-colors"
          style={{ color: `hsl(${role.color.replace('var(--', '').replace(')', '')})` }}
        />
        <span
          className="text-xs font-semibold tracking-wide"
          style={{
            color: `hsl(${role.color.replace('var(--', '').replace(')', '')})`,
            textShadow: `0 0 10px hsla(${role.color.replace('var(--', '').replace(')', '')}, 0.5)`
          }}
        >
          {role.label.toUpperCase()}
        </span>
        <ChevronDown
          size={12}
          className={clsx(
            "text-white/40 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={clsx(
            "absolute top-full left-0 mt-2 z-50",
            "min-w-[180px] py-1",
            "bg-black/90 backdrop-blur-xl",
            "border border-white/10 rounded-lg",
            "shadow-2xl shadow-black/50",
            "animate-in fade-in slide-in-from-top-2 duration-200"
          )}
        >
          {ROLE_ORDER.map((roleId) => {
            const roleSpec = ROLES[roleId];
            const RoleIcon = ROLE_ICONS[roleId];
            const isSelected = roleId === currentRole;
            const colorVar = roleSpec.color.replace('var(--', '').replace(')', '');

            return (
              <button
                key={roleId}
                type="button"
                onClick={() => handleSelect(roleId)}
                className={clsx(
                  "w-full flex items-center gap-3 px-3 py-2",
                  "transition-all duration-150",
                  isSelected
                    ? "bg-white/10"
                    : "hover:bg-white/5"
                )}
              >
                <RoleIcon
                  size={14}
                  style={{ color: `hsl(${colorVar})` }}
                />
                <div className="flex flex-col items-start">
                  <span
                    className="text-xs font-semibold tracking-wide"
                    style={{
                      color: isSelected ? `hsl(${colorVar})` : 'rgba(255,255,255,0.8)'
                    }}
                  >
                    {roleSpec.label.toUpperCase()}
                  </span>
                  <span className="text-tiny text-white/40">
                    {roleSpec.tagline}
                  </span>
                </div>
                {isSelected && (
                  <div
                    className="ml-auto w-1.5 h-1.5 rounded-full"
                    style={{
                      backgroundColor: `hsl(${colorVar})`,
                      boxShadow: `0 0 8px hsl(${colorVar})`
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
