/**
 * Durable DSH-session ↔ Codex-thread binding store (the plan's persistence
 * layer, scoped to the task board: one binding per task-board task).
 *
 * Shape (version 1):
 * {
 *   version: 1,
 *   taskId,            // board task the thread belongs to
 *   threadId,          // persistent Codex thread
 *   cwdFingerprint,    // sha256 of the normalized absolute cwd
 *   cliVersion,        // codex CLI that created the thread
 *   createdAt          // ms epoch
 * }
 *
 * Rules from the plan:
 * - binding files carry mode 0600 inside a 0700 directory where supported;
 * - writes are atomic (temp file + rename);
 * - malformed / missing / mismatched bindings fail closed;
 * - removing a binding never touches board data or the parent history.
 */
import { createHash } from 'node:crypto'
import { chmodSync, closeSync, openSync, writeSync } from 'node:fs'
import { mkdir, readFile, rename, unlink } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

/** On-disk binding record. */
export interface ThreadBinding {
  version: 1
  taskId: string
  threadId: string
  /** sha256 of the normalized absolute working directory. */
  cwdFingerprint: string
  /** Codex CLI version that created the thread. */
  cliVersion?: string
  createdAt: number
}

/** Resolve the binding directory: DSH_HOME env (or explicit override), else ~/.dsh. */
export function bindingDirectory(explicitHome?: string): string {
  const dshHome = explicitHome !== undefined && explicitHome.trim() !== ''
    ? explicitHome
    : process.env.DSH_HOME !== undefined && process.env.DSH_HOME.trim() !== ''
      ? process.env.DSH_HOME
      : join(homedir(), '.dsh')
  return join(dshHome, 'task-board-model', 'bindings')
}

/** Fingerprint a normalized absolute cwd. */
export function fingerprintCwd(cwd: string): string {
  return createHash('sha256').update(cwd).digest('hex')
}

/** File name for one task's binding (taskId is a uuid; still encode defensively). */
export function bindingPath(directory: string, taskId: string): string {
  return join(directory, `${encodeURIComponent(taskId)}.json`)
}

/** Structural + semantic validation of one parsed binding file. */
export function parseBinding(raw: string): ThreadBinding | undefined {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return undefined
  }
  if (typeof parsed !== 'object' || parsed === null) return undefined
  const record = parsed as Record<string, unknown>
  if (record.version !== 1) return undefined
  if (typeof record.taskId !== 'string' || record.taskId === '') return undefined
  if (typeof record.threadId !== 'string' || record.threadId === '') return undefined
  if (typeof record.cwdFingerprint !== 'string' || record.cwdFingerprint.length !== 64) return undefined
  if (record.cliVersion !== undefined && typeof record.cliVersion !== 'string') return undefined
  if (typeof record.createdAt !== 'number' || !Number.isFinite(record.createdAt)) return undefined
  return {
    version: 1,
    taskId: record.taskId,
    threadId: record.threadId,
    cwdFingerprint: record.cwdFingerprint,
    ...(record.cliVersion === undefined ? {} : { cliVersion: record.cliVersion }),
    createdAt: record.createdAt,
  }
}

/**
 * Persist one binding atomically: random temp file in the target directory
 * (mode 0600), flush+close, then rename into place.
 */
export async function saveBinding(directory: string, binding: ThreadBinding): Promise<void> {
  await mkdir(directory, { recursive: true, mode: 0o700 })
  try { chmodSync(directory, 0o700) } catch { /* best effort off POSIX */ }
  const target = bindingPath(directory, binding.taskId)
  const temp = `${target}.${process.pid}.${Math.random().toString(36).slice(2, 10)}.tmp`
  const handle = openSync(temp, 'w', 0o600)
  try {
    const bytes = Buffer.from(JSON.stringify(binding), 'utf8')
    let offset = 0
    while (offset < bytes.length) {
      offset += writeSync(handle, bytes, offset)
    }
  } finally {
    closeSync(handle)
  }
  await rename(temp, target).catch(async error => {
    await unlink(temp).catch(() => undefined)
    throw error
  })
}

/** Load and validate one binding; undefined when missing or malformed. */
export async function loadBinding(directory: string, taskId: string): Promise<ThreadBinding | undefined> {
  let raw: string
  try {
    raw = await readFile(bindingPath(directory, taskId), 'utf8')
  } catch {
    return undefined
  }
  const binding = parseBinding(raw)
  if (binding === undefined) return undefined
  // A record naming another task must never be served for this one.
  if (binding.taskId !== taskId) return undefined
  return binding
}

/** Remove one binding (idempotent); leaves unrelated files alone. */
export async function removeBinding(directory: string, taskId: string): Promise<void> {
  await unlink(bindingPath(directory, taskId)).catch(() => undefined)
}
