// src/lib/terminal.ts
import { spawn, ChildProcess } from 'child_process';
import treeKill from 'tree-kill';
import { RuntimeEvent, MessageHeader } from '@/types';

export class TerminalService {
    private activeProcesses = new Map<string, ChildProcess>(); // correlationId -> Process
    private projectRoot = process.cwd(); // Default to current CWD

    public execute(
        header: MessageHeader,
        command: string, 
        onEvent: (e: RuntimeEvent) => void
    ) {
        // 1. Security Check (Sandbox Light)
        // I en riktig app, validera att command inte försöker göra cd ../
        if (command.includes('..') || command.includes('/etc')) {
            onEvent({
                type: 'SECURITY_VIOLATION',
                header,
                policy: 'PATH_TRAVERSAL_DETECTED',
                attemptedPath: command
            });
            return;
        }

        // 2. Spawn Process
        const [cmd, ...args] = command.split(' ');
        const child = spawn(cmd, args, { 
            cwd: this.projectRoot, 
            shell: true,
            env: { ...process.env, FORCE_COLOR: 'true' } 
        });

        this.activeProcesses.set(header.correlationId, child);

        onEvent({ 
            type: 'PROCESS_STARTED', 
            header, 
            pid: child.pid || 0, 
            command 
        });

        // 3. Stream Output
        child.stdout?.on('data', (data) => {
            onEvent({ type: 'STDOUT_CHUNK', header, content: data.toString() });
        });

        child.stderr?.on('data', (data) => {
            onEvent({ type: 'STDERR_CHUNK', header, content: data.toString() });
        });

        // 4. Handle Exit
        child.on('close', (code) => {
            this.activeProcesses.delete(header.correlationId);
            onEvent({ type: 'PROCESS_EXITED', header, code: code || 0 });
        });
    }

    public kill(correlationId: string) {
        const child = this.activeProcesses.get(correlationId);
        if (child && child.pid) {
            treeKill(child.pid);
            this.activeProcesses.delete(correlationId);
        }
    }
}