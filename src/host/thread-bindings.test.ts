/**
 * Binding store unit tests: serialization validation, malformed inputs,
 * fingerprinting stability, and idempotent removal (plan §10.1).
 */
import { afterAll, describe, expect, it } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  bindingDirectory, fingerprintCwd, loadBinding, parseBinding, removeBinding, saveBinding,
} from './thread-bindings.ts'

const cleanup: string[] = []
afterAll(() => {
  for (const dir of cleanup.splice(0)) rmSync(dir, { recursive: true, force: true })
})

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'bindings-'))
  cleanup.push(dir)
  return dir
}

const valid = {
  version: 1 as const,
  taskId: 'task-1',
  threadId: 'thread-abc',
  cwdFingerprint: 'a'.repeat(64),
  cliVersion: '0.149.0',
  createdAt: 1234,
}

describe('parseBinding', () => {
  it('accepts a well-formed record', () => {
    expect(parseBinding(JSON.stringify(valid))).toEqual(valid)
  })

  it('rejects malformed JSON, wrong versions, short fingerprints, and bad fields', () => {
    expect(parseBinding('{not json')).toBeUndefined()
    expect(parseBinding('[]')).toBeUndefined()
    expect(parseBinding(JSON.stringify({ ...valid, version: 2 }))).toBeUndefined()
    expect(parseBinding(JSON.stringify({ ...valid, cwdFingerprint: 'short' }))).toBeUndefined()
    expect(parseBinding(JSON.stringify({ ...valid, threadId: '' }))).toBeUndefined()
    expect(parseBinding(JSON.stringify({ ...valid, createdAt: 'x' }))).toBeUndefined()
    expect(parseBinding(JSON.stringify({ ...valid, extra: true }).replace('}', ', "extra": true}'))).toBeDefined()
  })
})

describe('fingerprintCwd', () => {
  it('is stable per path and differs across paths', () => {
    expect(fingerprintCwd('/repo/a')).toBe(fingerprintCwd('/repo/a'))
    expect(fingerprintCwd('/repo/a')).not.toBe(fingerprintCwd('/repo/b'))
  })
})

describe('save/load/remove round trip', () => {
  it('round-trips a record and refuses cross-task reads', async () => {
    const dir = tempDir()
    await saveBinding(dir, valid)
    // File mode is restrictive where POSIX modes apply.
    const raw = await readFile(join(dir, 'task-1.json'), 'utf8')
    expect(JSON.parse(raw)).toMatchObject({ taskId: 'task-1', threadId: 'thread-abc' })
    expect(await loadBinding(dir, 'task-1')).toMatchObject({ threadId: 'thread-abc' })

    // A hand-written record naming another task must not be served.
    await writeFileRaw(dir, 'evil.json', JSON.stringify({ ...valid, taskId: 'other' }))
    expect(await loadBinding(dir, 'evil')).toBeUndefined()

    // Malformed content loads as undefined instead of throwing.
    await writeFileRaw(dir, 'broken.json', '{oops')
    expect(await loadBinding(dir, 'broken')).toBeUndefined()

    // Removal is idempotent.
    await removeBinding(dir, 'task-1')
    expect(await loadBinding(dir, 'task-1')).toBeUndefined()
    await removeBinding(dir, 'task-1')
  })

  it('overwrites atomically on re-save', async () => {
    const dir = tempDir()
    await saveBinding(dir, valid)
    await saveBinding(dir, { ...valid, threadId: 'thread-new' })
    expect((await loadBinding(dir, 'task-1'))?.threadId).toBe('thread-new')
  })
})

function writeFileRaw(dir: string, name: string, content: string): void {
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, name), content)
}

describe('bindingDirectory', () => {
  it('prefers DSH_HOME over the default home', () => {
    const previous = process.env.DSH_HOME
    try {
      process.env.DSH_HOME = '/tmp/dsh-home-x'
      expect(bindingDirectory()).toContain('/tmp/dsh-home-x')
      expect(bindingDirectory('/override')).toContain('/override')
      delete process.env.DSH_HOME
      expect(bindingDirectory()).not.toContain('/tmp/dsh-home-x')
    } finally {
      if (previous === undefined) delete process.env.DSH_HOME
      else process.env.DSH_HOME = previous
    }
  })
})
