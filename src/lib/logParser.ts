import { RuntimeEvent } from './types';

export function parseLogLine(line: string): RuntimeEvent | null {
  // 1. NPM Install detection
  if (line.match(/installing dependencies/i) || line.match(/npm install/i)) {
    return { type: 'PHASE_STATUS', status: 'installing' };
  }

  // 2. Progress Bars (e.g., [====>    ])
  // Matches square brackets containing =, >, and spaces
  const progressMatch = line.match(/\[(=+)(>)?(\s*)\]/);
  if (progressMatch) {
    const filled = progressMatch[1].length;
    const total = filled + (progressMatch[3]?.length || 0);
    if (total > 0) {
      const percentage = Math.round((filled / total) * 100);
      return { type: 'PROGRESS_UPDATE', value: percentage };
    }
  }

  // 3. Build Success
  if (line.match(/Build completed in/i) || line.match(/Compiled successfully/i)) {
    return { type: 'BUILD_SUCCESS' };
  }

  // 4. Errors
  if (line.match(/^Error:/i) || line.match(/Exception/i) || line.match(/Failed to compile/i)) {
    return { 
      type: 'ERROR', 
      severity: 'warn', 
      message: line.trim() 
    };
  }

  return null;
}
