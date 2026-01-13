export type RoleId = 'PLAN' | 'BUILD' | 'REVIEW' | 'DEPLOY';

export interface RoleSpec {
  id: RoleId;
  label: string;
  tagline: string;
  color: string;
  systemPrompt: string;
}

export const ROLES: Record<RoleId, RoleSpec> = {
  PLAN: {
    id: 'PLAN',
    label: 'Architect',
    tagline: 'Design & Strategy',
    color: 'var(--sapphire)',
    systemPrompt: 'You are an AI architect focused on system design, planning, and strategic thinking.'
  },
  BUILD: {
    id: 'BUILD',
    label: 'Engineer',
    tagline: 'Code & Execute',
    color: 'var(--emerald)',
    systemPrompt: 'You are an AI engineer focused on implementation, coding, and building features.'
  },
  REVIEW: {
    id: 'REVIEW',
    label: 'Critic',
    tagline: 'Analyze & Verify',
    color: 'var(--amber)',
    systemPrompt: 'You are an AI reviewer focused on code quality, security, and best practices.'
  },
  DEPLOY: {
    id: 'DEPLOY',
    label: 'Deployer',
    tagline: 'Ship & Monitor',
    color: 'var(--amethyst)',
    systemPrompt: 'You are an AI deployer focused on releases, monitoring, and operations.'
  }
};

export const ROLE_ORDER: RoleId[] = ['PLAN', 'BUILD', 'REVIEW', 'DEPLOY'];
