/**
 * Context Provider - Smart context injection per phase
 *
 * Each phase gets automatic relevant context:
 * - PLAN: User request, project info
 * - BUILD: Plan output, errors, relevant files
 * - REVIEW: Build output, code changes
 * - DEPLOY: Review output, approval status
 */

import { RoleId, ROLES, getPreviousPhase } from './roles';

// Phase output storage (in-memory for now, can be persisted to ledger)
export interface PhaseOutput {
  phase: RoleId;
  summary: string;      // Compressed output for next phase
  fullOutput: string;   // Complete output (for reference)
  timestamp: number;
}

// Session context - accumulated across phases
export interface SessionContext {
  phaseOutputs: Map<RoleId, PhaseOutput>;
  errorLog: string[];
  relevantFiles: string[];
  userRequest: string;
}

// Create fresh session context
export function createSessionContext(): SessionContext {
  return {
    phaseOutputs: new Map(),
    errorLog: [],
    relevantFiles: [],
    userRequest: ''
  };
}

// Store output from a phase
export function storePhaseOutput(
  context: SessionContext,
  phase: RoleId,
  fullOutput: string
): void {
  const summary = compressOutput(fullOutput, phase);
  context.phaseOutputs.set(phase, {
    phase,
    summary,
    fullOutput,
    timestamp: Date.now()
  });
}

// Compress output for context injection (prevents token explosion)
function compressOutput(output: string, phase: RoleId): string {
  // Extract key sections based on phase
  const lines = output.split('\n');
  const maxLines = 30; // Keep context manageable

  if (phase === 'PLAN') {
    // Extract goal, approach, components
    const sections = extractSections(output, ['Goal', 'Approach', 'Components']);
    return sections || truncateLines(lines, maxLines);
  }

  if (phase === 'BUILD') {
    // Extract code blocks and usage
    const codeBlocks = extractCodeBlocks(output);
    const usage = extractSections(output, ['Usage']);
    return `${codeBlocks}\n\n${usage || ''}`.trim() || truncateLines(lines, maxLines);
  }

  if (phase === 'REVIEW') {
    // Extract verdict and issues
    const verdict = extractSections(output, ['Verdict', 'Issues']);
    return verdict || truncateLines(lines, maxLines);
  }

  return truncateLines(lines, maxLines);
}

// Extract named sections from markdown-ish output
function extractSections(output: string, sectionNames: string[]): string | null {
  const results: string[] = [];

  for (const name of sectionNames) {
    // Match **Name** or ## Name patterns
    const regex = new RegExp(`(?:\\*\\*${name}\\*\\*|##\\s*${name})[:\\s]*([\\s\\S]*?)(?=\\n(?:\\*\\*|##)|$)`, 'i');
    const match = output.match(regex);
    if (match) {
      results.push(`**${name}:** ${match[1].trim()}`);
    }
  }

  return results.length > 0 ? results.join('\n\n') : null;
}

// Extract code blocks from output
function extractCodeBlocks(output: string): string {
  const codeRegex = /```[\w]*\n([\s\S]*?)```/g;
  const blocks: string[] = [];
  let match;

  while ((match = codeRegex.exec(output)) !== null) {
    blocks.push(match[0]);
  }

  // Limit to first 3 code blocks to prevent token explosion
  return blocks.slice(0, 3).join('\n\n');
}

// Simple line truncation with indicator
function truncateLines(lines: string[], max: number): string {
  if (lines.length <= max) {
    return lines.join('\n');
  }
  return lines.slice(0, max).join('\n') + `\n\n... (${lines.length - max} more lines)`;
}

// Build the complete system prompt for a phase with context injected
export function buildPhasePrompt(
  phase: RoleId,
  context: SessionContext
): string {
  let prompt = ROLES[phase].systemPrompt;

  // Replace context placeholders based on phase
  switch (phase) {
    case 'PLAN':
      prompt = prompt.replace('{{projectInfo}}',
        context.userRequest
          ? `Current request: "${context.userRequest}"`
          : ''
      );
      break;

    case 'BUILD': {
      const planOutput = context.phaseOutputs.get('PLAN');
      prompt = prompt.replace('{{planContext}}',
        planOutput
          ? `PLAN PHASE OUTPUT:\n${planOutput.summary}`
          : 'No plan provided. Ask the user to clarify requirements.'
      );
      prompt = prompt.replace('{{errorContext}}',
        context.errorLog.length > 0
          ? `RECENT ERRORS:\n${context.errorLog.slice(-5).join('\n')}`
          : ''
      );
      break;
    }

    case 'REVIEW': {
      const buildOutput = context.phaseOutputs.get('BUILD');
      prompt = prompt.replace('{{buildContext}}',
        buildOutput
          ? `BUILD PHASE OUTPUT:\n${buildOutput.summary}`
          : 'No build output to review.'
      );
      break;
    }

    case 'DEPLOY': {
      const reviewOutput = context.phaseOutputs.get('REVIEW');
      const isApproved = reviewOutput?.summary.toLowerCase().includes('approved');
      prompt = prompt.replace('{{reviewContext}}',
        reviewOutput
          ? `REVIEW PHASE OUTPUT:\n${reviewOutput.summary}\n\nAPPROVAL STATUS: ${isApproved ? 'APPROVED' : 'NOT APPROVED'}`
          : 'No review completed. Cannot deploy without review.'
      );
      break;
    }
  }

  return prompt;
}

// Add error to context
export function addError(context: SessionContext, error: string): void {
  context.errorLog.push(`[${new Date().toLocaleTimeString()}] ${error}`);
  // Keep last 10 errors only
  if (context.errorLog.length > 10) {
    context.errorLog = context.errorLog.slice(-10);
  }
}

// Add relevant file to context
export function addRelevantFile(context: SessionContext, file: string): void {
  if (!context.relevantFiles.includes(file)) {
    context.relevantFiles.push(file);
  }
}

// Set the user's current request
export function setUserRequest(context: SessionContext, request: string): void {
  context.userRequest = request;
}

// Get context summary for debugging/display
export function getContextSummary(context: SessionContext): string {
  const phases = Array.from(context.phaseOutputs.keys());
  return [
    `Phases completed: ${phases.join(' → ') || 'none'}`,
    `Errors logged: ${context.errorLog.length}`,
    `Files tracked: ${context.relevantFiles.length}`,
    `Current request: ${context.userRequest || 'none'}`
  ].join('\n');
}
