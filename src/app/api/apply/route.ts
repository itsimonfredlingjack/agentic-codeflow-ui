import { NextResponse } from 'next/server';
import * as path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createTwoFilesPatch } from 'diff';

export const runtime = 'nodejs';

type ApplyRequestBody = {
  action?: 'preview' | 'apply';
  path: string;
  content: string;
  baseSha?: string | null;
};

const MAX_CONTENT_BYTES = 1_000_000; // 1MB
const MAX_DIFF_CHARS = 200_000;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

function isDisallowedPath(targetPath: string) {
  const normalized = targetPath.replaceAll('\\', '/');
  if (normalized.startsWith('.git/')) return true;
  if (normalized.startsWith('.next/')) return true;
  if (normalized.startsWith('node_modules/')) return true;
  if (normalized.startsWith('task_ledger.db')) return true;
  if (normalized.startsWith('.env')) return true;
  return false;
}

function resolveSafePath(relativePath: string) {
  const root = process.cwd();
  const cleaned = relativePath.replaceAll('\\', '/').trim();

  if (cleaned.includes('\0')) {
    return { ok: false as const, error: 'Invalid path' };
  }

  if (path.isAbsolute(cleaned)) {
    return { ok: false as const, error: 'Path must be relative' };
  }

  const resolved = path.resolve(root, cleaned);
  const rootWithSep = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  if (!resolved.startsWith(rootWithSep)) {
    return { ok: false as const, error: 'Path escapes project root' };
  }

  if (isDisallowedPath(cleaned)) {
    return { ok: false as const, error: 'Path is not allowed' };
  }

  return { ok: true as const, absolutePath: resolved, relativePath: cleaned };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const record = body as Partial<ApplyRequestBody>;
  const action = record.action ?? 'apply';
  if (action !== 'preview' && action !== 'apply') {
    return NextResponse.json({ error: 'Invalid "action"' }, { status: 400 });
  }
  if (!isNonEmptyString(record.path)) {
    return NextResponse.json({ error: 'Missing or invalid "path"' }, { status: 400 });
  }
  if (typeof record.content !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid "content"' }, { status: 400 });
  }

  const contentBytes = Buffer.byteLength(record.content, 'utf8');
  if (contentBytes > MAX_CONTENT_BYTES) {
    return NextResponse.json({ error: 'Content too large' }, { status: 413 });
  }

  const resolved = resolveSafePath(record.path);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: 403 });
  }

  try {
    let existingContent: string | null = null;
    let existingSha: string | null = null;

    try {
      existingContent = await readFile(resolved.absolutePath, 'utf8');
      existingSha = createHash('sha256').update(existingContent).digest('hex');
    } catch {
      existingContent = null;
      existingSha = null;
    }

    const nextSha = createHash('sha256').update(record.content).digest('hex');

    if (action === 'preview') {
      const exists = existingContent !== null;
      const oldText = existingContent ?? '';
      const patch = exists
        ? createTwoFilesPatch(resolved.relativePath, resolved.relativePath, oldText, record.content, '', '')
        : createTwoFilesPatch('/dev/null', resolved.relativePath, '', record.content, '', '');

      const diff = patch.length > MAX_DIFF_CHARS ? `${patch.slice(0, MAX_DIFF_CHARS)}\n... (truncated)` : patch;

      return NextResponse.json({
        success: true,
        path: resolved.relativePath,
        exists,
        baseSha: existingSha,
        nextSha,
        diff,
        truncated: patch.length > MAX_DIFF_CHARS,
      });
    }

    if (existingContent !== null && typeof record.baseSha === 'string' && record.baseSha !== existingSha) {
      return NextResponse.json(
        { error: 'File changed since preview', path: resolved.relativePath },
        { status: 409 }
      );
    }

    await mkdir(path.dirname(resolved.absolutePath), { recursive: true });
    await writeFile(resolved.absolutePath, record.content, 'utf8');
    return NextResponse.json({
      success: true,
      path: resolved.relativePath,
      bytes: contentBytes,
      baseSha: existingSha,
      nextSha,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to write file' }, { status: 500 });
  }
}
