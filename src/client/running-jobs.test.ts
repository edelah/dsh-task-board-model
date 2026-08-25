// @vitest-environment jsdom
/**
 * Running-job sidebar rows: a run without a native DSH session materializes
 * one sidebar item inside its workspace group, clicking a Codex row opens its
 * thread chat while a native-session result opens the normal DSH conversation,
 * and identity-free failures fall back to task detail.
 */
import { afterEach, describe, expect, it } from 'vitest'
import type { BoardController, ControllerSnapshot } from '../core/controller.ts'
import type { TaskRecord } from '../core/tasks.ts'
import { JOB_SELECTOR, mountRunningJobs } from './running-jobs.ts'
import { ENTRY_SELECTOR } from './sidebar-entry.ts'

/** Minimal valid task record (the mount only reads task identity and target). */
function makeTask(
  id: string,
  status: TaskRecord['status'],
  title = `任务 ${id}`,
  workspaceId?: string,
  worktree?: TaskRecord['worktree'],
): TaskRecord {
  return {
    id,
    title,
    description: '',
    prompt: '',
    status,
    createdAt: 1,
    updatedAt: 1,
    executions: [],
    ...(workspaceId === undefined ? {} : { workspaceId }),
    ...(worktree === undefined ? {} : { worktree }),
  }
}

interface Harness {
  controller: BoardController
  calls: string[]
  snapshot: ControllerSnapshot
  notify(): void
}

/** A controller double exposing just what the mount consumes. */
function harness(
  initialTasks: readonly TaskRecord[] = [],
  workspaceIds: readonly string[] = ['workspace-a', 'workspace-b'],
): Harness {
  const calls: string[] = []
  const listeners = new Set<() => void>()
  const snapshot: ControllerSnapshot = {
    tasks: initialTasks,
    boardOpen: false,
    archiveView: false,
    selectedTaskId: undefined,
    codexChatTaskId: undefined,
    executionOptions: {
      workspaces: workspaceIds.map(workspaceId => ({ workspaceId, title: workspaceId })),
      presets: [],
      models: [],
      codex: { available: false, models: [] },
    },
  }
  const controller = {
    getSnapshot: () => snapshot,
    subscribe: (fn: () => void) => {
      listeners.add(fn)
      return () => { listeners.delete(fn) }
    },
    openBoard: () => {
      snapshot.boardOpen = true
      calls.push('openBoard')
    },
    closeBoard: () => {
      if (!snapshot.boardOpen) return
      snapshot.boardOpen = false
      calls.push('closeBoard')
    },
    openTask: (id: string) => {
      snapshot.selectedTaskId = id
      calls.push(`open:${id}`)
    },
    openSession: (id: string) => {
      calls.push(`session:${id}`)
    },
    openCodexConversation: (id: string) => {
      snapshot.boardOpen = true
      snapshot.codexChatTaskId = id
      calls.push(`codex:${id}`)
    },
  } as unknown as BoardController
  return {
    controller,
    calls,
    snapshot,
    notify: () => { for (const fn of [...listeners]) fn() },
  }
}

interface Shell {
  root: HTMLElement
  entry: HTMLButtonElement
  groups: Map<string, HTMLElement>
}

/**
 * Current DSH shell scaffold: root > logoRow + Task Board entry + workspace
 * browser > list > groupSection(projectRow + session rows).
 */
function mountShell(workspaceIds: readonly string[] = ['workspace-a', 'workspace-b']): Shell {
  document.body.innerHTML = ''
  const column = document.createElement('div')
  column.setAttribute('data-pane', 'sidebar')
  const root = document.createElement('div')
  const logoRow = document.createElement('div')
  logoRow.className = 'shell-logoRow'
  const newSession = document.createElement('button')
  newSession.className = 'shell-newSession'
  logoRow.appendChild(newSession)
  root.appendChild(logoRow)

  const entry = document.createElement('button')
  entry.setAttribute('data-dsh-taskboard-entry', '')
  root.appendChild(entry)

  const list = document.createElement('div')
  list.className = 'shell-list'
  list.setAttribute('role', 'tree')
  const groups = new Map<string, HTMLElement>()
  for (const workspaceId of workspaceIds) {
    const group = document.createElement('div')
    group.className = 'shell-groupSection'
    const project = document.createElement('div')
    project.className = 'shell-projectRow'
    project.setAttribute('role', 'treeitem')
    project.textContent = workspaceId
    // The real HoverCard renderer wraps each project/session row in a direct
    // child span; keep the scaffold shaped like the live sidebar.
    const projectHost = document.createElement('span')
    projectHost.appendChild(project)
    group.appendChild(projectHost)
    list.appendChild(group)
    groups.set(workspaceId, group)
  }
  root.appendChild(list)
  column.appendChild(root)
  document.body.appendChild(column)
  return { root, entry, groups }
}

const tick = (): Promise<void> => new Promise(resolve => { setTimeout(resolve, 0) })

function job(id: string): HTMLElement {
  return document.querySelector<HTMLElement>(`${JOB_SELECTOR}[data-dsh-taskboard-job="${id}"]`)!
}

afterEach(() => { document.body.innerHTML = '' })

describe('running-job sidebar items', () => {
  it('mounts no rows while nothing is running', () => {
    const shell = mountShell()
    const app = harness([makeTask('a', 'todo'), makeTask('b', 'done')])
    const dispose = mountRunningJobs(app.controller)
    expect(document.querySelectorAll(JOB_SELECTOR)).toHaveLength(0)
    expect(shell.root.querySelectorAll('button')).toHaveLength(2) // New Session + Task Board
    dispose()
  })

  it('creates rows inside their workspace groups, never under Task Board', () => {
    const shell = mountShell()
    const app = harness([
      makeTask('a', 'running', '修复登录', 'workspace-a'),
      makeTask('b', 'running', '写文档', 'workspace-b'),
    ])
    const dispose = mountRunningJobs(app.controller)

    const rowA = job('a')
    const rowB = job('b')
    expect(rowA.textContent).toBe('运行中 · 修复登录')
    expect(rowB.textContent).toBe('运行中 · 写文档')
    expect(rowA.parentElement).toBe(shell.groups.get('workspace-a'))
    expect(rowB.parentElement).toBe(shell.groups.get('workspace-b'))
    expect(shell.entry.contains(rowA)).toBe(false)
    expect(shell.entry.contains(rowB)).toBe(false)
    expect(rowA.previousElementSibling?.querySelector('[class*="projectRow"]')).not.toBeNull()
    expect(rowB.previousElementSibling?.querySelector('[class*="projectRow"]')).not.toBeNull()
    expect(rowA.getAttribute('aria-label')).toBe('运行中 · 修复登录')
    expect(rowA.title).toBe('运行中 · 修复登录')
    dispose()
  })

  it('keeps concurrent rows in task-ledger order within one workspace', () => {
    const shell = mountShell(['workspace-a'])
    const app = harness([
      makeTask('a', 'running', '修复登录', 'workspace-a'),
      makeTask('b', 'running', '写文档', 'workspace-a'),
    ], ['workspace-a'])
    const dispose = mountRunningJobs(app.controller)

    const rows = Array.from(shell.groups.get('workspace-a')!.querySelectorAll<HTMLElement>(JOB_SELECTOR))
    expect(rows.map(row => row.dataset.dshTaskboardJob)).toEqual(['a', 'b'])
    dispose()
  })

  it('prefers a materialized worktree workspace over the base workspace', () => {
    const shell = mountShell()
    const app = harness([
      makeTask('a', 'running', '独立工作树', 'workspace-a', { branch: 'feature/a', workspaceId: 'workspace-b' }),
    ])
    const dispose = mountRunningJobs(app.controller)

    expect(job('a').parentElement).toBe(shell.groups.get('workspace-b'))
    expect(shell.groups.get('workspace-a')!.querySelector(JOB_SELECTOR)).toBeNull()
    dispose()
  })

  it('uses the supplied recent workspace for an unpinned task', () => {
    const shell = mountShell()
    const app = harness([makeTask('a', 'running', '最近工作区')])
    const dispose = mountRunningJobs(app.controller, () => ({
      workspaceIds: ['workspace-a', 'workspace-b'],
      recentWorkspaceId: 'workspace-b',
    }))

    expect(job('a').parentElement).toBe(shell.groups.get('workspace-b'))
    dispose()
  })

  it('does not create a Task Board fallback for an unknown workspace', () => {
    const shell = mountShell()
    const app = harness([makeTask('a', 'running', '无效目标', 'missing-workspace')])
    const dispose = mountRunningJobs(app.controller)

    expect(document.querySelector(JOB_SELECTOR)).toBeNull()
    expect(shell.entry.nextElementSibling?.matches('[class*="list"]')).toBe(true)
    dispose()
  })

  it('keeps a no-session result row for inspection until archive or delete', () => {
    mountShell()
    const app = harness([makeTask('a', 'running')])
    const dispose = mountRunningJobs(app.controller)
    expect(document.querySelectorAll(JOB_SELECTOR)).toHaveLength(1)

    app.snapshot.tasks = [{
      ...makeTask('a', 'done', '完成任务'),
      executions: [{
        id: 'execution-a',
        sessionId: undefined,
        startedAt: 1,
        endedAt: 2,
        result: 'succeeded',
        error: undefined,
        runner: 'codex',
      }],
    }]
    app.notify()
    expect(document.querySelectorAll(JOB_SELECTOR)).toHaveLength(1)
    expect(job('a').textContent).toBe('已完成 · 完成任务')
    expect(job('a').dataset.jobState).toBe('succeeded')
    expect(job('a').querySelector('[class*="cardSpinner"]')).toHaveProperty('hidden', true)

    app.snapshot.tasks = [{
      ...app.snapshot.tasks[0],
      archivedAt: 3,
    }]
    app.notify()
    expect(document.querySelectorAll(JOB_SELECTOR)).toHaveLength(0)

    app.snapshot.tasks = [makeTask('a', 'running'), makeTask('b', 'running')]
    app.notify()
    expect(document.querySelectorAll(JOB_SELECTOR)).toHaveLength(2)
    app.snapshot.tasks = [] // deleted elsewhere
    app.notify()
    expect(document.querySelectorAll(JOB_SELECTOR)).toHaveLength(0)
    dispose()
  })

  it('keeps both pre-session and native-session results visible', () => {
    mountShell(['workspace-a'])
    const app = harness([
      {
        ...makeTask('pre-session', 'failed', '启动失败', 'workspace-a'),
        executions: [{
          id: 'execution-pre-session',
          sessionId: undefined,
          startedAt: 1,
          endedAt: 2,
          result: 'failed',
          error: 'session create failed',
          runner: 'dsh',
        }],
      },
      {
        ...makeTask('native', 'done', '原生会话', 'workspace-a'),
        executions: [{
          id: 'execution-native',
          sessionId: 'session-native',
          startedAt: 1,
          endedAt: 2,
          result: 'succeeded',
          error: undefined,
          runner: 'dsh',
        }],
      },
    ], ['workspace-a'])
    const dispose = mountRunningJobs(app.controller)

    expect(job('pre-session').textContent).toBe('已失败 · 启动失败')
    expect(job('native').textContent).toBe('已完成 · 原生会话')
    app.snapshot.boardOpen = true
    job('native').click()
    expect(app.calls).toEqual(['closeBoard', 'session:session-native'])
    dispose()
  })

  it('hands a DSH run off to its native session row without a duplicate', () => {
    mountShell(['workspace-a'])
    const pending = makeTask('a', 'running', 'test2', 'workspace-a')
    const app = harness([pending], ['workspace-a'])
    const dispose = mountRunningJobs(app.controller)
    expect(job('a').textContent).toBe('运行中 · test2')

    app.snapshot.tasks = [{
      ...pending,
      executions: [{
        id: 'execution-a',
        sessionId: 'session-a',
        startedAt: 1,
        endedAt: undefined,
        result: undefined,
        error: undefined,
        runner: 'dsh',
      }],
    }]
    app.notify()

    expect(document.querySelector(`${JOB_SELECTOR}[data-dsh-taskboard-job="a"]`)).toBeNull()
    dispose()
  })

  it('keeps a synthetic row for a Codex run, which has no DSH session row', () => {
    mountShell(['workspace-a'])
    const task: TaskRecord = {
      ...makeTask('a', 'running', 'Codex task', 'workspace-a'),
      executor: 'codex',
      executions: [{
        id: 'execution-a',
        sessionId: undefined,
        startedAt: 1,
        endedAt: undefined,
        result: undefined,
        error: undefined,
        runner: 'codex',
        runId: 'run-a',
        threadId: 'thread-a',
      }],
    }
    const app = harness([task], ['workspace-a'])
    const dispose = mountRunningJobs(app.controller)

    expect(job('a').textContent).toBe('运行中 · Codex task')
    job('a').click()
    expect(app.calls).toEqual(['codex:a'])
    dispose()
  })

  it('clicking a row opens the board on that task', () => {
    mountShell()
    const app = harness([makeTask('a', 'running')])
    const dispose = mountRunningJobs(app.controller)
    job('a').click()
    expect(app.calls).toEqual(['openBoard', 'open:a'])
    dispose()
  })

  it('highlights the row of the selected task while the board is open', () => {
    mountShell()
    const app = harness([makeTask('a', 'running'), makeTask('b', 'running')])
    const dispose = mountRunningJobs(app.controller)
    const rowA = job('a')
    const rowB = job('b')

    app.snapshot.boardOpen = true
    app.snapshot.selectedTaskId = 'b'
    app.notify()
    expect(rowA.hasAttribute('data-active')).toBe(false)
    expect(rowB.hasAttribute('data-active')).toBe(true)

    // Board closed again: no highlight survives.
    app.snapshot.boardOpen = false
    app.snapshot.selectedTaskId = undefined
    app.notify()
    expect(rowB.hasAttribute('data-active')).toBe(false)
    dispose()
  })

  it('re-places a row the shell displaced (self-heal)', async () => {
    const shell = mountShell(['workspace-a'])
    const app = harness([makeTask('a', 'running')], ['workspace-a'])
    const dispose = mountRunningJobs(app.controller)
    const row = job('a')

    // React re-render drops the injected row from the workspace group.
    row.remove()
    expect(document.querySelector(JOB_SELECTOR)).toBeNull()

    // Any later shell mutation triggers the heal pass before paint.
    shell.groups.get('workspace-a')!.appendChild(document.createElement('div'))
    await tick()
    const restored = job('a')
    expect(restored.parentElement).toBe(shell.groups.get('workspace-a'))
    expect(restored.previousElementSibling!.querySelector('[class*="projectRow"]')).not.toBeNull()
    dispose()
  })

  it('follows the whole sidebar pane being rebuilt', async () => {
    mountShell(['workspace-a'])
    const app = harness([makeTask('a', 'running')], ['workspace-a'])
    const dispose = mountRunningJobs(app.controller)
    expect(document.querySelector(JOB_SELECTOR)).not.toBeNull()

    // Whole-pane teardown + rebuild (shell navigation).
    document.querySelector('[data-pane="sidebar"]')!.remove()
    const fresh = mountShell(['workspace-a'])
    await tick()
    const row = job('a')
    expect(row).not.toBeNull()
    expect(fresh.groups.get('workspace-a')!.contains(row)).toBe(true)
    dispose()
  })

  it('keeps the static Task Board entry separate from running rows', () => {
    const shell = mountShell(['workspace-a'])
    const app = harness([makeTask('a', 'running')], ['workspace-a'])
    const dispose = mountRunningJobs(app.controller)

    expect(document.querySelector(ENTRY_SELECTOR)).toBe(shell.entry)
    expect(shell.entry.parentElement).toBe(shell.root)
    expect(job('a').parentElement).not.toBe(shell.root)
    dispose()
  })
})
