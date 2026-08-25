/**
 * Host-route tests against a FAKE Codex App Server (the plan's §10 harness):
 * a small node executable that speaks the real wire protocol
 * (newline-delimited JSON-RPC) without network access or credentials.
 *
 * Covered: initialize handshake, thread/start vs validated thread/resume,
 * durable bindings (save-before-turn, fingerprint mismatch rejection), live
 * event normalization (commands, deltas, final answer), fail-closed approval
 * answering, steer-while-active, and interrupt-then-settle cancellation.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { spawn as nodeSpawn, spawnSync, type ChildProcess } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, chmodSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  parseTopLevelStrings, readCodexEnv, resetRunsForTests, taskBoardRouteHandlers,
  ROUTE_CODEX_CANCEL, ROUTE_CODEX_START, ROUTE_CODEX_STATUS, ROUTE_CODEX_STEER, ROUTE_CODEX_THREAD,
  sanitizeBranchName, WORKTREE_DIR_NAME,
  type SubprocessFace,
} from './codex-routes.ts'
import { bindingDirectory } from './thread-bindings.ts'

// --- pure helpers -------------------------------------------------------------------

describe('parseTopLevelStrings', () => {
  it('reads top-level quoted keys and stops at table headers', () => {
    const values = parseTopLevelStrings([
      'model = "gpt-5.6-sol"',
      'model_reasoning_effort = "medium" # inline comment',
      '[projects."/home/x"]',
      'trust_level = "trusted"',
    ].join('\n'))
    expect(values.get('model')).toBe('gpt-5.6-sol')
    expect(values.get('model_reasoning_effort')).toBe('medium')
    expect(values.get('trust_level')).toBeUndefined()
  })
})

describe('sanitizeBranchName', () => {
  it('accepts valid names and rejects git-invalid ones', () => {
    expect(sanitizeBranchName('feature/a-b', undefined, 0)).toBe('feature/a-b')
    expect(() => sanitizeBranchName('bad..name', undefined, 0)).toThrow(/invalid branch/)
    expect(sanitizeBranchName(undefined, 'Add: fancy feature!', 0)).toMatch(/^add-fancy-feature-\d{8}$/)
  })
})

describe('readCodexEnv', () => {
  const previousHome = process.env.CODEX_HOME

  beforeAll(() => {
    const home = mkdtempSync(join(tmpdir(), 'codex-home-'))
    cleanupDirs.push(home)
    process.env.CODEX_HOME = home
    writeFileSync(join(home, 'models_cache.json'), JSON.stringify({
      models: [
        {
          slug: 'gpt-5.6-sol', display_name: 'GPT-5.6-Sol', default_reasoning_level: 'low',
          visibility: 'list',
          supported_reasoning_levels: [{ effort: 'low' }, { effort: 'high', description: 'deep' }],
        },
        { slug: 'hidden-model', visibility: 'hidden' },
      ],
    }))
  })

  afterAll(() => {
    if (previousHome === undefined) delete process.env.CODEX_HOME
    else process.env.CODEX_HOME = previousHome
  })

  it('projects the catalog and skips hidden entries', async () => {
    const env = await readCodexEnv(undefined)
    expect(env.available).toBe(true)
    expect(env.models).toHaveLength(1)
    expect(env.models[0]).toMatchObject({ slug: 'gpt-5.6-sol', efforts: [{ id: 'low' }, { id: 'high' }] })
  })
})

// --- subprocess double over node child_process ---------------------------------------

function makeRealSubprocess(): SubprocessFace {
  return {
    async resolveExecutable(command) { return command },
    spawn(spec) {
      const child: ChildProcess = nodeSpawn(spec.argv[0]!, spec.argv.slice(1), {
        cwd: spec.cwd,
        ...(spec.env === undefined ? {} : { env: spec.env }),
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      // Only batch-mode stdin auto-ends; 'pipe' stays open for protocol writes.
      if (spec.stdio.stdin !== 'ignore' && spec.stdio.stdin !== 'pipe') {
        child.stdin!.end(spec.stdio.stdin.data)
      }
      let stdout = ''
      let stderr = ''
      child.stdout!.setEncoding('utf8')
      child.stdout!.on('data', chunk => { stdout += String(chunk) })
      child.stderr!.setEncoding('utf8')
      child.stderr!.on('data', chunk => { stderr += String(chunk) })
      const done = new Promise<{ exitCode: number | null; signal: string | null }>(resolve => {
        child.on('close', (code, signal) => resolve({ exitCode: code, signal }))
      })
      return {
        pid: child.pid ?? -1,
        done,
        // Raw pipes (the app-server client consumes these directly).
        stdin: { write: (data: string) => { void child.stdin!.write(data) }, end: () => { child.stdin!.end() } },
        stdout: child.stdout!,
        stderr: child.stderr!,
        collected: {
          stdout: { readFrom: () => ({ text: stdout, nextOffset: stdout.length, lossy: false }) },
          stderr: { readFrom: () => ({ text: stderr, nextOffset: stderr.length, lossy: false }) },
        },
        terminate: () => child.kill('SIGTERM'),
        waitForExit: async () => true,
      }
    },
  }
}

type RouteHandler = (args: Record<string, unknown>) => Promise<unknown>

const cleanupDirs: string[] = []

afterAll(() => {
  for (const dir of cleanupDirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

// --- test-scoped DSH_HOME for bindings -------------------------------------------------

beforeAll(() => {
  const dshHome = mkdtempSync(join(tmpdir(), 'codex-bindings-'))
  cleanupDirs.push(dshHome)
  process.env.DSH_HOME = dshHome
})

/** Poll status until the run leaves 'running'. */
async function waitSettled(handlers: Map<string, RouteHandler>, runId: string): Promise<Record<string, unknown>> {
  let status: Record<string, unknown> = {}
  for (let i = 0; i < 240; i += 1) {
    status = await handlers.get(ROUTE_CODEX_STATUS)!({ runId }) as Record<string, unknown>
    if (status.state !== 'running') return status
    await new Promise(resolve => setTimeout(resolve, 25))
  }
  return status
}

function readWireLog(logPath: string): Array<Record<string, any>> {
  return readFileSync(logPath, 'utf8').trim().split('\n').map(line => JSON.parse(line))
}

// --- the fake app-server --------------------------------------------------------------

/**
 * A fake `codex` binary implementing just enough of the app-server protocol:
 * initialize → thread/start|resume → turn/start (+scripted notifications),
 * steering, interrupts, and one server-request approval answered by us.
 */
async function writeFakeCodex(dir: string, logPath: string): Promise<string> {
  const scriptPath = join(dir, 'fake-codex.cjs')
  const script = [
    '#!/usr/bin/env node',
    "const fs = require('fs')",
    "const readline = require('readline')",
    `const LOG = ${JSON.stringify(logPath)}`,
    "const log = (entry) => fs.appendFileSync(LOG, JSON.stringify(entry) + '\\n')",
    'const send = (obj) => process.stdout.write(JSON.stringify(obj) + "\\n")',
    "const rl = readline.createInterface({ input: process.stdin })",
    "rl.on('line', (line) => {",
    "  if (!line.trim()) return",
    '  let msg',
    '  try { msg = JSON.parse(line) } catch { return }',
    '  log({ dir: "in", msg })',
    "  if (msg.method === 'initialize') {",
    "    send({ jsonrpc: '2.0', id: msg.id, result: { userAgent: 'fake' } })",
    '    return',
    '  }',
    '  if (msg.id === undefined) return',
    '  switch (msg.method) {',
    "    case 'thread/start':",
    "      send({ jsonrpc: '2.0', id: msg.id, result: { thread: { id: 'thread-fake-1', cliVersion: '9.9.9-fake', cwd: (msg.params || {}).cwd } } })",
    '      break',
    "    case 'thread/resume': {",
    '      const requested = msg.params.threadId',
    "      if (requested !== 'thread-fake-1') {",
    "        send({ jsonrpc: '2.0', id: msg.id, error: { message: 'thread not found: ' + requested } })",
    '      } else {',
    "        send({ jsonrpc: '2.0', id: msg.id, result: { thread: { id: requested, cliVersion: '9.9.9-fake' } } })",
    '      }',
    '      break',
    '    }',
    "    case 'thread/read':",
    "      send({ jsonrpc: '2.0', id: msg.id, result: { thread: { id: msg.params.threadId, turns: [{ id: 'turn-stored-1', status: 'completed', items: [{ type: 'userMessage', id: 'user-1', content: [{ type: 'text', text: 'do the thing' }] }, { type: 'commandExecution', id: 'cmd-1', command: 'pnpm test' }, { type: 'reasoning', id: 'reasoning-1', content: ['secret'] }, { type: 'agentMessage', id: 'agent-1', phase: 'final_answer', text: 'All done.' }] }] } } })",
    '      break',
    "    case 'turn/start': {",
    "      send({ jsonrpc: '2.0', id: msg.id, result: { turn: { id: 'turn-fake-1', status: 'inProgress' } } })",
    "      setTimeout(() => send({ jsonrpc: '2.0', method: 'item/started', params: { threadId: 'thread-fake-1', turnId: 'turn-fake-1', startedAtMs: 1, item: { type: 'commandExecution', command: 'echo hi', id: 'item-cmd' } } }), 10)",
    "      setTimeout(() => send({ jsonrpc: '2.0', method: 'item/completed', params: { threadId: 'thread-fake-1', turnId: 'turn-fake-1', completedAtMs: 2, item: { type: 'commandExecution', command: 'echo hi', aggregatedOutput: 'hi', id: 'item-cmd' } } }), 20)",
    "      setTimeout(() => send({ jsonrpc: '2.0', method: 'item/fileChange/requestApproval', id: 'srv-1', params: { conversationId: 'thread-fake-1', reason: 'test' } }), 30)",
    "      setTimeout(() => send({ jsonrpc: '2.0', method: 'item/agentMessage/delta', params: { threadId: 'thread-fake-1', turnId: 'turn-fake-1', itemId: 'item-msg', delta: 'All ' } }), 40)",
    "      setTimeout(() => send({ jsonrpc: '2.0', method: 'item/agentMessage/delta', params: { threadId: 'thread-fake-1', turnId: 'turn-fake-1', itemId: 'item-msg', delta: 'done.' } }), 50)",
    "      setTimeout(() => send({ jsonrpc: '2.0', method: 'item/completed', params: { threadId: 'thread-fake-1', turnId: 'turn-fake-1', completedAtMs: 3, item: { type: 'agentMessage', phase: 'final_answer', text: 'All done.', id: 'item-msg' } } }), 60)",
    "      setTimeout(() => send({ jsonrpc: '2.0', method: 'turn/completed', params: { threadId: 'thread-fake-1', turn: { id: 'turn-fake-1', status: 'completed', items: [] } } }), 70)",
    '      break',
    '    }',
    "    case 'turn/steer':",
    '      log({ dir: "steer", expectedTurnId: msg.params.expectedTurnId })',
    "      send({ jsonrpc: '2.0', id: msg.id, result: {} })",
    '      break',
    "    case 'turn/interrupt':",
    "      send({ jsonrpc: '2.0', id: msg.id, result: {} })",
    "      setTimeout(() => send({ jsonrpc: '2.0', method: 'turn/completed', params: { threadId: 'thread-fake-1', turn: { id: 'turn-fake-1', status: 'interrupted', items: [] } } }), 20)",
    '      break',
    '    default:',
    "      send({ jsonrpc: '2.0', id: msg.id, error: { message: 'unsupported: ' + msg.method } })",
    '  }',
    '})',
    "process.on('disconnect', () => process.exit(0))",
  ]
  writeFileSync(scriptPath, script.join('\n'))

  // The route resolves the literal name 'codex'; tests substitute a wrapper
  // whose argv check ('app-server' subcommand) mirrors the real binary.
  const wrapper = join(dir, 'fake-codex-bin.cjs')
  writeFileSync(wrapper, [
    '#!/usr/bin/env node',
    "if (process.argv[2] !== 'app-server') { console.error('unexpected argv'); process.exit(64) }",
    `require(${JSON.stringify(scriptPath)})`,
  ].join('\n'))
  chmodSync(wrapper, 0o755)
  return wrapper
}

describe('codex routes against the fake app-server', () => {
  let workDir: string
  let logPath: string
  let codexPath: string

  beforeAll(async () => {
    resetRunsForTests()
    workDir = mkdtempSync(join(tmpdir(), 'codex-live-'))
    cleanupDirs.push(workDir)
    logPath = join(workDir, 'wire-log.jsonl')
    codexPath = await writeFakeCodex(workDir, logPath)
  })

  afterAll(() => {
    resetRunsForTests()
  })

  function localHandlers(): Map<string, RouteHandler> {
    const base = makeRealSubprocess()
    return taskBoardRouteHandlers({
      resolveExecutable: async command => (command === 'codex' ? codexPath : command),
      spawn: spec => base.spawn(spec),
    })
  }

  it('runs a full turn: events normalize, approvals decline fail-closed, answer lands', async () => {
    const handlers = localHandlers()
    const started = await handlers.get(ROUTE_CODEX_START)!({
      cwd: workDir,
      prompt: 'do the thing',
      taskId: 'task-a',
      sandbox: 'workspace-write',
    }) as { ok: boolean; runId?: string; threadId?: string; error?: string }
    expect(started.ok, started.error).toBe(true)
    expect(started.threadId).toBe('thread-fake-1')

    const status = await waitSettled(handlers, started.runId!)
    expect(status.state).toBe('succeeded')
    expect(status.lastMessage).toBe('All done.')
    const activity = (status.activity ?? []) as Array<{ kind: string; text: string }>
    expect(activity.some(entry => entry.kind === 'command' && entry.text.includes('echo hi'))).toBe(true)

    // The binding persisted BEFORE the turn completed (plan ordering rule).
    const bindingRaw = await readFile(
      join(bindingDirectory(process.env.DSH_HOME), `${encodeURIComponent('task-a')}.json`),
      'utf8',
    )
    expect(JSON.parse(bindingRaw)).toMatchObject({
      version: 1, taskId: 'task-a', threadId: 'thread-fake-1', cliVersion: '9.9.9-fake',
    })

    // Fail-closed approval: the fake logged OUR response to srv-1.
    await new Promise(resolve => setTimeout(resolve, 80))
    const answer = readWireLog(logPath).reverse().find(entry =>
      entry.msg?.id === 'srv-1' && entry.msg?.result !== undefined)
    expect(answer?.msg?.result?.decision).toBe('decline')

    const thread = await handlers.get(ROUTE_CODEX_THREAD)!({
      taskId: 'task-a', threadId: 'thread-fake-1',
    }) as Record<string, any>
    expect(thread.ok).toBe(true)
    expect(thread.conversation.turns[0].messages).toEqual([
      { id: 'user-1', role: 'user', text: 'do the thing' },
      { id: 'agent-1', role: 'assistant', text: 'All done.', phase: 'final_answer' },
    ])
    expect(thread.conversation.turns[0].activity).toEqual([
      { id: 'cmd-1', kind: 'command', text: '$ pnpm test' },
    ])
    expect(JSON.stringify(thread)).not.toContain('secret')
    expect(readWireLog(logPath).some(entry =>
      entry.msg?.method === 'thread/read' && entry.msg?.params?.includeTurns === true)).toBe(true)
    expect(await handlers.get(ROUTE_CODEX_THREAD)!({
      taskId: 'task-a', threadId: 'thread-other',
    })).toMatchObject({ ok: false, error: 'thread binding mismatch' })

    // Steering a settled run fails cleanly.
    const lateSteer = await handlers.get(ROUTE_CODEX_STEER)!({ runId: started.runId, content: 'x' }) as { ok: boolean }
    expect(lateSteer.ok).toBe(false)
  }, 30_000)

  it('resumes the persisted thread and rejects workspace mismatches', async () => {
    const handlers = localHandlers()
    const first = await handlers.get(ROUTE_CODEX_START)!({
      cwd: workDir, prompt: 'first', taskId: 'task-b',
    }) as { ok: boolean; runId?: string; threadId?: string; error?: string }
    expect(first.ok, first.error).toBe(true)
    await waitSettled(handlers, first.runId!)

    // Follow-up resumes the exact thread via thread/resume.
    const followUp = await handlers.get(ROUTE_CODEX_START)!({
      cwd: workDir, prompt: 'follow up', taskId: 'task-b', resumeThreadId: first.threadId,
    }) as { ok: boolean; runId?: string; threadId?: string; error?: string }
    expect(followUp.ok, followUp.error).toBe(true)
    expect(followUp.threadId).toBe(first.threadId)
    expect(readWireLog(logPath).some(entry => entry.msg?.method === 'thread/resume')).toBe(true)
    await waitSettled(handlers, followUp.runId!)

    // A different directory must be refused (workspace fingerprint).
    const otherDir = mkdtempSync(join(tmpdir(), 'codex-other-'))
    cleanupDirs.push(otherDir)
    const mismatched = await handlers.get(ROUTE_CODEX_START)!({
      cwd: otherDir, prompt: 'elsewhere', taskId: 'task-b', resumeThreadId: first.threadId,
    }) as { ok: boolean; error?: string }
    expect(mismatched.ok).toBe(false)
    expect(mismatched.error).toContain('workspace changed')

    // An unknown thread id fails closed at the resume step.
    const unknownThread = await handlers.get(ROUTE_CODEX_START)!({
      cwd: workDir, prompt: 'ghost', taskId: 'task-b', resumeThreadId: 'thread-nope',
    }) as { ok: boolean; error?: string }
    expect(unknownThread.ok).toBe(false)
  }, 30_000)

  it('steers an active turn with the expected turn id', async () => {
    const handlers = localHandlers()
    const started = await handlers.get(ROUTE_CODEX_START)!({
      cwd: workDir, prompt: 'long task', taskId: 'task-d',
    }) as { ok: boolean; runId?: string; error?: string }
    expect(started.ok, started.error).toBe(true)

    // Steer while the scripted stream is still in flight (~70ms).
    const steered = await handlers.get(ROUTE_CODEX_STEER)!({
      runId: started.runId, content: 'also add tests',
    }) as { ok: boolean; error?: string }
    expect(steered.ok, steered.error).toBe(true)
    const steerEntry = readWireLog(logPath).find(entry => entry.dir === 'steer')
    expect(steerEntry?.expectedTurnId).toBe('turn-fake-1')

    await waitSettled(handlers, started.runId!)
  }, 30_000)

  it('interrupt settles a running turn as cancelled', async () => {
    const handlers = localHandlers()
    const started = await handlers.get(ROUTE_CODEX_START)!({
      cwd: workDir, prompt: 'to be interrupted', taskId: 'task-e',
    }) as { ok: boolean; runId?: string; error?: string }
    expect(started.ok, started.error).toBe(true)

    const cancelled = await handlers.get(ROUTE_CODEX_CANCEL)!({ runId: started.runId }) as { ok: boolean; state?: string }
    expect(cancelled.ok).toBe(true)

    const status = await waitSettled(handlers, started.runId!)
    expect(['interrupted']).toContain(status.state)
  }, 30_000)
})

// --- real-git worktree integration -----------------------------------------------------

function runGit(args: readonly string[], cwd: string): { code: number; stdout: string } {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' })
  return { code: result.status ?? 1, stdout: result.stdout ?? '' }
}

describe('worktree routes against real git', () => {
  let repo = ''
  let handlers: Map<string, RouteHandler>

  beforeAll(async () => {
    repo = mkdtempSync(join(tmpdir(), 'task-board-repo-'))
    cleanupDirs.push(repo)
    const git = (args: string[]): number =>
      spawnSync('git', args, { cwd: repo, encoding: 'utf8' }).status ?? 1
    expect(git(['init'])).toBe(0)
    writeFileSync(join(repo, 'file.txt'), 'hello\n')
    expect(git(['add', '.'])).toBe(0)
    expect(git(['-c', 'user.email=t@example.com', '-c', 'user.name=t', 'commit', '-m', 'init'])).toBe(0)

    handlers = taskBoardRouteHandlers(makeRealSubprocess())
  })

  it('creates, reuses, and removes a worktree under .dsh-worktrees', async () => {
    const created = await handlers.get('/dsh-task-board/worktree/create')!({
      repoPath: repo,
      branch: 'task/wt-test',
      title: 'Some task',
    }) as { ok: boolean; path?: string; branch?: string; created?: boolean; error?: string }
    expect(created.ok, created.error).toBe(true)
    const worktreePath = created.path!
    cleanupDirs.push(worktreePath)
    expect(existsSync(worktreePath)).toBe(true)
    expect(worktreePath).toContain(`${WORKTREE_DIR_NAME}/task-wt-test`)
    const exclude = await readFile(join(repo, '.git', 'info', 'exclude'), 'utf8')
    expect(exclude).toContain(`${WORKTREE_DIR_NAME}/`)
    expect(runGit(['status', '--porcelain'], repo).stdout.trim()).toBe('')
    const head = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: worktreePath, encoding: 'utf8' })
    expect((head.stdout ?? '').trim()).toBe('task/wt-test')

    const reused = await handlers.get('/dsh-task-board/worktree/create')!({
      repoPath: repo, branch: 'task/wt-test',
    }) as { ok: boolean; created?: boolean; path?: string }
    expect(reused.created).toBe(false)
    expect(reused.path).toBe(worktreePath)

    const removed = await handlers.get('/dsh-task-board/worktree/remove')!({ path: worktreePath }) as { ok: boolean; error?: string }
    expect(removed.ok, removed.error).toBe(true)
    expect(existsSync(worktreePath)).toBe(false)
  }, 30_000)
})
