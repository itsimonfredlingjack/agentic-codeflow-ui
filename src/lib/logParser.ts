import { RuntimeEvent, SemanticEvent } from '@/types';

export function parseLogLine(line: string): RuntimeEvent | SemanticEvent | null {
  // 1. Clean formatting
  const clean = line.replace(/\x1b\[[0-9;]*m/g, '').trim(); 
  if (!clean) return null;

  // 2. Critical Errors (RESTORED)
  // If we see "Error:" or "Failed to compile", explicitly fail the build.
  if (clean.match(/^Error:/i) || clean.includes('Failed to compile') || clean.includes('Exception:')) {
    return { 
      type: 'BUILD_COMPLETE', 
      durationMs: 0, 
      success: false 
    } as SemanticEvent;
  }

  // 3. NPM/Install Stages
  if (clean.startsWith('installing') || clean.includes('npm install')) {
    return { type: 'PHASE_STATUS', status: 'installing' } as SemanticEvent;
  }

  // 4. Success Marker
  if (clean.includes('Build completed') || clean.includes('Successfully compiled')) {
    return { type: 'BUILD_COMPLETE', durationMs: 1000, success: true } as SemanticEvent;
  }

  return null; 
}