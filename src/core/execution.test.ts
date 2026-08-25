import { describe, expect, it, vi } from 'vitest'
import { ExecutionService, type ExecutionEnvironment, type ExecutionSessionSummary, type SessionDriver } from './execution.ts'
import { createTask, type ExecutionRecord } from './tasks.ts'

function makeExecution(id = 'execution-1'): ExecutionRecord {
  return { id, sessionId: undefined, startedAt: 1, endedAt: undefined, result: undefined, error: undefined }
}

function makeDriver(calls: string[]): { driver: SessionDriver; finish: () => void } {
  let running = false
  let turnEnds = new Map<number, number>()
  const listeners = new Set<() => void>()
  const driver: SessionDriver = {
    rename: vi.fn(async title => { calls.push(`rename:${title}`) }),
    command: vi.fn(async line => {
      calls.push(`command:${line}`)
      return { ok: true as const, matched: true }
    }),
    prompt: vi.fn(async () => {
      calls.push('prompt')
      return { ok: true as const }
    }),
    getSnapshot: () => ({ running, lastAgentError: null, turnEnds }),
    subscribe: listener => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
  }
  return {
    driver,
    finish: () => {
      running = false
      turnEnds = new Map([[1, Date.now()]])
      for (const listener of [...listeners]) listener()
    },
  }
}

function environment(
  summary: ExecutionSessionSummary,
  sessionId: string,
  driver: SessionDriver,
  calls: string[],
) {
  const modelSelect = vi.fn(async () => {
    calls.push('model')
    return { ok: true as const }
  })
  const sessionsCreate = vi.fn(async ({ workspaceId }: { workspaceId: string }) => {
    calls.push(`create:${workspaceId}`)
    return sessionId
  })
  const workspaceConnect = vi.fn(async (workspaceId: string) => {
    calls.push(`connect:${workspaceId}`)
    return sessionId
  })
  const env: ExecutionEnvironment = {
    sessions: {
        list: {
          getSnapshot: () => ({ phase: 'ready' as const, byId: { [sessionId]: summary } }),
          subscribe: () => () => {},
        },
        create: sessionsCreate,
        binding: () => ({ session: driver }),
      },
      workspaces: {
        list: {
          getSnapshot: () => ({ items: [{ workspaceId: 'workspace-1' }], recentWorkspaceId: 'workspace-1' }),
        },
        connectWorkspace: workspaceConnect,
      },
    models: { select: modelSelect },
  }
  return {
    env,
    modelSelect,
    sessionsCreate,
    workspaceConnect,
  }
}

describe('model-pinned execution', () => {
  it('creates a dedicated session and applies model before prompting', async () => {
    const calls: string[] = []
    const { driver, finish } = makeDriver(calls)
    const wiring = environment({ running: false, blank: true }, 'session-1', driver, calls)
    const service = new ExecutionService(wiring.env)
    const task = createTask({
      title: 'Pinned task',
      description: '',
      prompt: 'do the work',
      modelSelection: { provider: 'openai', model: 'gpt-5', reasoningEffort: 'high' },
      permission: 'workspace-write',
    }, 1, 'task-1')
    const events: unknown[] = []

    await service.run(task, makeExecution(), event => { events.push(event) })
    finish()

    expect(wiring.sessionsCreate).toHaveBeenCalledWith({ workspaceId: 'workspace-1' })
    expect(wiring.workspaceConnect).not.toHaveBeenCalled()
    expect(wiring.modelSelect).toHaveBeenCalledWith('session-1', task.modelSelection)
    expect(calls).toEqual([
      'create:workspace-1',
      'model',
      'command:/permission workspace-write',
      'rename:Pinned task',
      'prompt',
    ])
    expect(events).toEqual([
      { kind: 'started', taskId: 'task-1', executionId: 'execution-1', sessionId: 'session-1', runner: 'dsh' },
      { kind: 'settled', taskId: 'task-1', executionId: 'execution-1', outcome: 'succeeded' },
    ])
  })

  it('keeps the original workspace reuse path for unpinned tasks', async () => {
    const calls: string[] = []
    const { driver, finish } = makeDriver(calls)
    const wiring = environment({ running: false, blank: true }, 'session-2', driver, calls)
    const service = new ExecutionService(wiring.env)
    const task = createTask({ title: 'Default task', description: '', prompt: 'do it' }, 1, 'task-2')
    const events: unknown[] = []

    await service.run(task, makeExecution('execution-2'), event => { events.push(event) })
    finish()

    expect(wiring.workspaceConnect).toHaveBeenCalledWith('workspace-1')
    expect(wiring.sessionsCreate).not.toHaveBeenCalled()
    expect(wiring.modelSelect).not.toHaveBeenCalled()
    expect(events.at(-1)).toEqual({
      kind: 'settled', taskId: 'task-2', executionId: 'execution-2', outcome: 'succeeded',
    })
  })

  it('does not prompt when model selection is rejected', async () => {
    const calls: string[] = []
    const { driver } = makeDriver(calls)
    const wiring = environment({ running: false, blank: true }, 'session-3', driver, calls)
    wiring.env.models = {
      select: vi.fn(async () => ({ ok: false as const, error: new Error('unknown model') })),
    }
    const service = new ExecutionService(wiring.env)
    const task = createTask({
      title: 'Rejected task',
      description: '',
      prompt: 'do not send',
      modelSelection: { provider: 'openai', model: 'missing' },
    }, 1, 'task-3')
    const events: unknown[] = []

    await service.run(task, makeExecution('execution-3'), event => { events.push(event) })

    expect(calls).toEqual(['create:workspace-1'])
    expect(events).toEqual([
      { kind: 'started', taskId: 'task-3', executionId: 'execution-3', sessionId: 'session-3', runner: 'dsh' },
      {
        kind: 'settled',
        taskId: 'task-3',
        executionId: 'execution-3',
        outcome: 'failed',
        error: 'model selection rejected for openai/missing: unknown model',
      },
    ])
  })
})

// --- codex executor + worktree paths ---------------------------------------------

import type { CodexExecutionFace, CodexStatusResult, WorktreeExecutionFace } from './execution.ts'
import { startExecution } from './tasks.ts'

/** Fake codex face: records starts, replays queued statuses. */
function makeCodexFace(calls: string[], statuses: Array<CodexStatusResult | 'reject'>): CodexExecutionFace {
  return {
    start: vi.fn(async request => {
      calls.push(`codex-start:${request.cwd}|model=${request.model ?? ''}|effort=${request.effort ?? ''}|sandbox=${request.sandbox ?? ''}`)
      return { ok: true as const, runId: 'run-1', threadId: 'thread-1' }
    }),
    steer: vi.fn(async () => ({ ok: true as const })),
    status: vi.fn(async () => {
      const next = statuses.shift()
      if (next === 'reject') throw new Error('transport down')
      if (next === undefined) throw new Error('no scripted status left')
      calls.push(`codex-status:${next.ok && next.state !== undefined ? next.state : 'error'}`)
      return next
    }),
    readConversation: vi.fn(async (_taskId, threadId) => ({
      ok: true as const,
      conversation: { threadId, turns: [] },
    })),
    cancel: vi.fn(async () => { calls.push('codex-cancel') }),
  }
}

function makeWorktreeFace(calls: string[], result?: { ok: false; error: string }): WorktreeExecutionFace {
  return {
    ensure: vi.fn(async request => {
      calls.push(`ensure:${request.repoPath}:${request.branch}`)
      if (result !== undefined) return result
      // Mirror the host's directory naming: branch separators become dashes.
      const dir = request.branch.replace(/\//g, '-')
      return { ok: true as const, path: `/repo/.dsh-worktrees/${dir}`, branch: request.branch, created: true }
    }),
    remove: vi.fn(async () => ({ ok: true as const })),
  }
}

describe('codex execution', () => {
  it('materializes a worktree, maps permission to sandbox, and settles by polling', async () => {
    const calls: string[] = []
    const codex = makeCodexFace(calls, [
      { ok: true, state: 'running' },
      { ok: true, state: 'succeeded', lastMessage: 'All done.' },
    ])
    const worktrees = makeWorktreeFace(calls)
    const wiring = environment({ running: false }, 'session-x', makeDriver(calls).driver, calls)
    wiring.env.workspaces.list.getSnapshot = () => ({
      items: [{ workspaceId: 'workspace-1', path: '/repo' }],
      recentWorkspaceId: 'workspace-1',
    })
    wiring.env.codex = codex
    wiring.env.worktrees = worktrees
    wiring.env.pollIntervalMs = 1

    const service = new ExecutionService(wiring.env)
    const task = createTask({
      title: 'Codex task',
      description: '',
      prompt: 'do it via codex',
      executor: 'codex',
      codexModel: 'gpt-5.6-sol',
      codexEffort: 'high',
      permission: 'read-only',
      worktree: { branch: 'task/wt' },
    }, 1, 'task-9')
    const events: unknown[] = []

    await service.run(task, startExecution(task, 1, 'exec-9').execution, event => { events.push(event) })

    expect(calls.filter(call => call.startsWith('ensure:'))).toEqual(['ensure:/repo:task/wt'])
    expect(codex.start).toHaveBeenCalledWith(expect.objectContaining({
      cwd: '/repo/.dsh-worktrees/task-wt',
      model: 'gpt-5.6-sol',
      effort: 'high',
      sandbox: 'read-only',
    }))
    expect(events.map(event => (event as { kind: string }).kind)).toEqual([
      'worktree-ready', 'started', 'settled',
    ])
    expect(events.at(-1)).toMatchObject({ outcome: 'succeeded', outputTail: 'All done.' })
    // The dsh session machinery must stay untouched.
    expect(calls.filter(call => call.startsWith('create:') || call === 'prompt')).toEqual([])
  })

  it('runs directly in the workspace when no worktree is configured', async () => {
    const calls: string[] = []
    const codex = makeCodexFace(calls, [{ ok: true, state: 'succeeded', outputTail: 'ok' }])
    const worktrees = makeWorktreeFace(calls)
    const wiring = environment({ running: false }, 'session-y', makeDriver(calls).driver, calls)
    wiring.env.workspaces.list.getSnapshot = () => ({
      items: [
        { workspaceId: 'workspace-1' },
        { workspaceId: 'workspace-2', path: '/elsewhere' },
      ],
      recentWorkspaceId: 'workspace-1',
    })
    wiring.env.codex = codex
    wiring.env.worktrees = worktrees
    wiring.env.pollIntervalMs = 1
    const service = new ExecutionService(wiring.env)
    const task = createTask({ title: 'Plain codex task', description: '', prompt: 'p', executor: 'codex' }, 1, 'task-10')
    const events: unknown[] = []

    await service.run(task, startExecution(task, 1, 'exec-10').execution, event => { events.push(event) })

    expect(worktrees.ensure).not.toHaveBeenCalled()
    // No permission pin → no sandbox override (Codex's own default policy).
    const startRequest = vi.mocked(codex.start).mock.calls[0]![0]!
    expect(startRequest.cwd).toBe('/elsewhere')
    expect('sandbox' in startRequest && startRequest.sandbox !== undefined).toBe(false)
    expect(events.at(-1)).toMatchObject({ outcome: 'succeeded' })
  })

  it('fails the run without starting when the worktree cannot be prepared', async () => {
    const calls: string[] = []
    const codex = makeCodexFace(calls, [])
    const worktrees = makeWorktreeFace(calls, { ok: false, error: 'detached head' })
    const wiring = environment({ running: false }, 'session-z', makeDriver(calls).driver, calls)
    wiring.env.workspaces.list.getSnapshot = () => ({
      items: [{ workspaceId: 'workspace-1', path: '/repo' }],
      recentWorkspaceId: 'workspace-1',
    })
    wiring.env.codex = codex
    wiring.env.worktrees = worktrees
    wiring.env.pollIntervalMs = 1
    const service = new ExecutionService(wiring.env)
    const task = createTask({
      title: 'Broken worktree task', description: '', prompt: 'p',
      executor: 'codex', worktree: { branch: 'wt/broken' },
    }, 1, 'task-11')
    const events: unknown[] = []

    await service.run(task, startExecution(task, 1, 'exec-11').execution, event => { events.push(event) })

    expect(codex.start).not.toHaveBeenCalled()
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ kind: 'settled', outcome: 'failed' })
    expect((events[0] as { error?: string }).error).toContain('git worktree could not be prepared')
  })

  it('reconciles backgrounded codex runs through status probes', async () => {
    const calls: string[] = []
    const wiring = environment({ running: false }, 'session-r', makeDriver(calls).driver, calls)
    let state: CodexStatusResult = { ok: true, state: 'running' }
    wiring.env.codex = {
      start: vi.fn(),
      status: vi.fn(async () => state),
      readConversation: vi.fn(async (_taskId, threadId) => ({
        ok: true as const, conversation: { threadId, turns: [] },
      })),
      steer: vi.fn(async () => ({ ok: true as const })),
      cancel: vi.fn(async () => {}),
    }
    const service = new ExecutionService(wiring.env)
    const task = createTask({ title: 'Background codex', description: '', prompt: 'p', executor: 'codex' }, 1, 'task-12')
    const started = startExecution(task, 1, 'exec-12')
    const runningTask = {
      ...started.task,
      status: 'running' as const,
      executions: [{ ...started.execution, runner: 'codex' as const, runId: 'run-bg' }],
    }

    // Still running → nothing settles yet.
    expect(await service.reconcile(runningTask)).toBeUndefined()
    // Succeeded with a final message.
    state = { ok: true, state: 'succeeded', lastMessage: 'done!' }
    expect(await service.reconcile(runningTask)).toMatchObject({
      kind: 'settled', taskId: 'task-12', executionId: 'exec-12', outcome: 'succeeded', outputTail: 'done!',
    })
    // Unknown run (host restarted) → cancelled.
    state = { ok: false, error: 'unknown-run' }
    expect(await service.reconcile(runningTask)).toMatchObject({ outcome: 'cancelled' })
    // A codex execution without a run id cannot be tracked at all.
    const orphan = { ...runningTask, executions: [{ ...started.execution, runner: 'codex' as const }] }
    expect(await service.reconcile(orphan)).toMatchObject({ outcome: 'cancelled' })
  })
})

describe('dsh execution inside a worktree', () => {
  it('prepares + registers the worktree and opens the session there', async () => {
    const calls: string[] = []
    const { driver, finish } = makeDriver(calls)
    const wiring = environment({ running: false, blank: true }, 'session-wt', driver, calls)
    wiring.env.workspaces.list.getSnapshot = () => ({
      items: [{ workspaceId: 'workspace-1', path: '/repo' }],
      recentWorkspaceId: 'workspace-1',
    })
    wiring.env.worktrees = makeWorktreeFace(calls)
    wiring.env.registerWorkspace = async path => {
      calls.push(`register:${path}`)
      return 'ws-worktree'
    }
    const service = new ExecutionService(wiring.env)
    const task = createTask({
      title: 'Wired worktree',
      description: '',
      prompt: 'work on the branch',
      permission: 'danger-full-access',
      worktree: { branch: 'feature/wired' },
    }, 1, 'task-13')
    const events: unknown[] = []

    await service.run(task, makeExecution('execution-13'), event => { events.push(event) })
    finish()

    expect(calls.filter(call => call.startsWith('ensure:') || call.startsWith('register:'))).toEqual([
      'ensure:/repo:feature/wired',
      'register:/repo/.dsh-worktrees/feature-wired',
    ])
    // The session connects to the WORKTREE workspace, not the base one.
    expect(wiring.workspaceConnect).toHaveBeenCalledWith('ws-worktree')
    const ready = events.find(event => (event as { kind: string }).kind === 'worktree-ready') as { workspaceId?: string }
    expect(ready.workspaceId).toBe('ws-worktree')
    expect(events.at(-1)).toMatchObject({ outcome: 'succeeded' })
  })

  it('fails a worktree-pinned DSH run when registration yields no workspace', async () => {
    const calls: string[] = []
    const { driver, finish } = makeDriver(calls)
    const wiring = environment({ running: false, blank: true }, 'session-wt2', driver, calls)
    wiring.env.workspaces.list.getSnapshot = () => ({
      items: [{ workspaceId: 'workspace-1', path: '/repo' }],
      recentWorkspaceId: 'workspace-1',
    })
    wiring.env.worktrees = makeWorktreeFace(calls)
    wiring.env.registerWorkspace = async () => undefined
    const service = new ExecutionService(wiring.env)
    const task = createTask({
      title: 'Unregistered worktree',
      description: '',
      prompt: 'p',
      worktree: { branch: 'feature/x' },
    }, 1, 'task-14')
    const events: unknown[] = []

    await service.run(task, makeExecution('execution-14'), event => { events.push(event) })
    finish()

    expect(wiring.workspaceConnect).not.toHaveBeenCalled()
    // The worktree itself was still materialized + reported...
    const ready = events.find(event => (event as { kind: string }).kind === 'worktree-ready') as { workspaceId?: string }
    expect(ready).toBeDefined()
    expect(ready.workspaceId).toBeUndefined()
    // ...but without a workspace the session cannot open inside it.
    expect(events.at(-1)).toMatchObject({
      kind: 'settled', outcome: 'failed',
      error: 'the git worktree could not be registered as a workspace',
    })
  })
})
