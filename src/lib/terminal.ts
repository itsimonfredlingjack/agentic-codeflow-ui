// src/lib/terminal.ts
import { spawn, type ChildProcess } from 'child_process';
import treeKill from 'tree-kill';
import { RuntimeEvent, MessageHeader } from '@/types';

export class TerminalService {
    private activeProcesses = new Map<string, ChildProcess>(); // correlationId -> Process
    private projectRoot = process.cwd(); // Default to current CWD
    private readonly defaultTimeoutMs = 10 * 60 * 1000; // 10 minutes
    private readonly maxOutputBytes = 512 * 1024; // 512KB per stream

    public executeParsed(
        header: MessageHeader,
        program: string,
        args: string[],
        onEvent: (e: RuntimeEvent) => void
    ) {
        // Spawn without a shell to avoid shell injection via operators (&&, ;, |, redirects).
        const child = spawn(program, args, {
            cwd: this.projectRoot,
            shell: false,
            env: { ...process.env, FORCE_COLOR: 'true' }
        });

        this.activeProcesses.set(header.correlationId, child);

        const renderedCommand = [program, ...args].join(' ');
        onEvent({ 
            type: 'PROCESS_STARTED', 
            header, 
            pid: child.pid || 0, 
            command: renderedCommand 
        });

        // 3. Stream Output
        let stdoutBytes = 0;
        let stderrBytes = 0;

        child.stdout?.on('data', (data) => {
            if (stdoutBytes >= this.maxOutputBytes) return;
            const chunk = data.toString();
            stdoutBytes += Buffer.byteLength(chunk, 'utf8');
            const content = stdoutBytes > this.maxOutputBytes
                ? `${chunk}\n... (stdout truncated)`
                : chunk;
            onEvent({ type: 'STDOUT_CHUNK', header, content });
        });

        child.stderr?.on('data', (data) => {
            if (stderrBytes >= this.maxOutputBytes) return;
            const chunk = data.toString();
            stderrBytes += Buffer.byteLength(chunk, 'utf8');
            const content = stderrBytes > this.maxOutputBytes
                ? `${chunk}\n... (stderr truncated)`
                : chunk;
            onEvent({ type: 'STDERR_CHUNK', header, content });
        });

        const timeoutId = setTimeout(() => {
            this.kill(header.correlationId);
        }, this.defaultTimeoutMs);

        // 4. Handle Exit
        child.on('close', (code) => {
            clearTimeout(timeoutId);
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
