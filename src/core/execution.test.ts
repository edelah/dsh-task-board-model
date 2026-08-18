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
      { kind: 'started', taskId: 'task-1', executionId: 'execution-1', sessionId: 'session-1' },
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
      { kind: 'started', taskId: 'task-3', executionId: 'execution-3', sessionId: 'session-3' },
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
