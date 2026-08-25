/**
 * Running-job sidebar items.
 *
 * A task execution may materialize one row in the main sidebar, directly
 * under the task's workspace header. During execution this covers Codex runs
 * (which never own a DSH session) and the short DSH session-creation window.
 * As soon as a DSH execution receives its sessionId, the shell's native
 * session row becomes authoritative while the run is active, avoiding a
 * duplicate live title. Once the execution settles, a result row is retained
 * until the task is archived or deleted; that gives the user a stable place
 * to reopen the result even when the native session row is collapsed. Native
 * DSH results open that normal conversation; no-session results open the
 * board detail instead.
 *
 * The rows are plain DOM buttons reusing the static entry's classes (so
 * hover/active/focus/collapsed-rail styling comes for free) and follow the
 * same self-healing contract as sidebar-entry.ts: a body-level
 * MutationObserver notices React re-renders and shell rebuilds and re-places
 * displaced rows before paint. All DOM writes are equality-guarded, so an
 * observer callback over unchanged state performs no mutation and cannot
 * feed back into itself.
 */
import type { BoardController } from '../core/controller.ts'
import type { TaskRecord } from '../core/tasks.ts'
import { t } from './locales.ts'
import css from './board.module.css'
import { sidebarRoot } from './sidebar-entry.ts'

/** Stable data attribute identifying an injected execution row; value = task id. */
export const JOB_SELECTOR = '[data-dsh-taskboard-job]'

/** Workspace facts needed to place an execution row in the main sidebar. */
export interface RunningJobWorkspaceSnapshot {
  /** Workspace ids in the same stable order as the sidebar's workspace groups. */
  readonly workspaceIds: readonly string[]
  /** The runtime fallback used when a task does not pin a workspace. */
  readonly recentWorkspaceId?: string
}

/** One mounted row plus the label node its copy updates target. */
interface JobRow {
  el: HTMLButtonElement
  label: HTMLElement
  spinner: HTMLElement
}

/** Build one detached row for a task execution. */
function createJobRow(controller: BoardController, taskId: string): JobRow {
  const el = document.createElement('button')
  el.type = 'button'
  el.dataset.dshTaskboardJob = taskId
  el.className = css.entry
  const icon = document.createElement('span')
  icon.className = css.entryIcon
  const spinner = document.createElement('span')
  spinner.className = css.cardSpinner
  spinner.setAttribute('aria-hidden', 'true')
  icon.appendChild(spinner)
  const label = document.createElement('span')
  label.className = css.entryLabel
  el.append(icon, label)
  // DSH executions open their native session. Codex executions own an App
  // Server thread instead, so the board renders that thread in its chat-first
  // surface. Only failures without either identity fall back to task detail.
  el.addEventListener('click', () => {
    const task = controller.getSnapshot().tasks.find(candidate => candidate.id === taskId)
    const sessionId = task?.executions[task.executions.length - 1]?.sessionId
    if (sessionId !== undefined) {
      controller.closeBoard()
      controller.openSession(sessionId)
    } else if (task?.executions[task.executions.length - 1]?.runner === 'codex'
      && task.executions[task.executions.length - 1]?.threadId !== undefined) {
      controller.openCodexConversation(taskId)
    } else {
      controller.openBoard()
      controller.openTask(taskId)
    }
  })
  return { el, label, spinner }
}

/**
 * Rewrite a row's copy and selection highlight. Guarded: writing identical
 * values back would churn the DOM (and re-trigger the heal observer).
 */
function jobState(task: TaskRecord): 'running' | 'succeeded' | 'failed' | 'cancelled' {
  if (task.status === 'running') return 'running'
  const latest = task.executions[task.executions.length - 1]
  if (latest?.result === 'succeeded' || task.status === 'done') return 'succeeded'
  if (latest?.result === 'failed' || task.status === 'failed') return 'failed'
  return 'cancelled'
}

function jobLabel(task: TaskRecord): string {
  const state = jobState(task)
  if (state === 'running') return t('job.running', { name: task.title })
  if (state === 'succeeded') return t('job.succeeded', { name: task.title })
  if (state === 'failed') return t('job.failed', { name: task.title })
  return t('job.cancelled', { name: task.title })
}

function paintRow(row: JobRow, task: TaskRecord, active: boolean): void {
  const state = jobState(task)
  const text = jobLabel(task)
  if (row.el.getAttribute('aria-label') !== text) row.el.setAttribute('aria-label', text)
  if (row.el.title !== text) row.el.title = text
  // The shell may already contain a conversation/session with the same title.
  // Keep the execution state in the visible label (not only in
  // aria-label/title) so the two sidebar rows are distinguishable at a glance.
  if (row.label.textContent !== text) row.label.textContent = text
  if (row.el.dataset.jobState !== state) row.el.dataset.jobState = state
  const spinning = state === 'running'
  if (row.spinner.hidden !== !spinning) row.spinner.hidden = !spinning
  if (active) {
    if (row.el.dataset.active !== 'true') row.el.dataset.active = 'true'
  } else if ('active' in row.el.dataset) {
    delete row.el.dataset.active
  }
}

/**
 * Find the workspace group that corresponds to one workspace id.
 *
 * The current shell keeps the workspace id in React state rather than a DOM
 * attribute. Its rendered group order is nevertheless the same as the
 * runtime workspace list (one group per workspace, followed by an optional
 * ungrouped bucket), so the index is the stable integration seam here.
 */
function workspaceGroup(
  root: HTMLElement,
  workspaceId: string,
  workspaceIds: readonly string[],
): HTMLElement | undefined {
  const index = workspaceIds.indexOf(workspaceId)
  if (index < 0) return undefined
  return Array.from(root.querySelectorAll<HTMLElement>('[class*="groupSection"]'))[index]
}

/** Resolve the workspace where the runner actually places this task. */
function taskWorkspaceId(task: TaskRecord, workspaces: RunningJobWorkspaceSnapshot): string | undefined {
  // A materialized worktree is registered as its own workspace and must win
  // over the task's base workspace. Directly pinned tasks use workspaceId;
  // unpinned tasks follow the same recent/first fallback as ExecutionService.
  return task.worktree?.workspaceId
    ?? task.workspaceId
    ?? workspaces.recentWorkspaceId
    ?? workspaces.workspaceIds[0]
}

/** Whether this run still needs the plugin's synthetic sidebar row. */
function needsSyntheticRow(task: TaskRecord): boolean {
  // Archived tasks remain available in the board's archive view, but should
  // not keep a stale navigation row in the workspace sidebar.
  if (task.archivedAt !== undefined) return false
  const latest = task.executions[task.executions.length - 1]
  if (task.status === 'running') {
    // A task can briefly be marked running before its first execution record
    // is attached, so retain the historical status-only behavior here.
    return latest?.sessionId === undefined
  }
  // Once an execution settles, keep a result row as the durable entry point
  // for inspection. A native DSH session may still have its own row, but the
  // result row is intentionally distinct (Succeeded/Failed/Cancelled) and
  // remains visible even when the shell collapses older sessions.
  if (latest?.endedAt === undefined) return false
  return true
}

/**
 * Position rows immediately below their workspace header, in task-ledger order.
 * Idempotent per row: a row already sitting exactly at the cursor is left
 * untouched, so shell and sibling-plugin self-healing passes do not fight over
 * settled geometry.
 */
function placeRows(
  root: HTMLElement,
  groupedRows: ReadonlyMap<string, readonly JobRow[]>,
  workspaceIds: readonly string[],
): void {
  for (const [workspaceId, rows] of groupedRows) {
    const group = workspaceGroup(root, workspaceId, workspaceIds)
    const header = group?.querySelector<HTMLElement>('[class*="projectRow"]')
    if (group === undefined || header === null || header === undefined) continue
    // HoverCard wraps each shell row in a direct-child span. Insert after
    // that wrapper when present; the test/legacy shells may expose the row
    // directly, in which case the row itself is the cursor.
    const headerHost = header.parentElement?.parentElement === group
      ? header.parentElement
      : header
    let cursor: ChildNode = headerHost
    for (const row of rows) {
      if (row.el.parentElement !== group || cursor.nextSibling !== row.el) {
        group.insertBefore(row.el, cursor.nextSibling)
      }
      cursor = row.el
    }
  }
}

/**
 * Mount the live/result execution rows.
 * @param controller - the board controller whose task ledger drives the rows.
 * @param readWorkspaces - optional runtime workspace list; the controller
 *   options are enough for pinned tasks, while the runtime source also exposes
 *   the recent-workspace fallback for unpinned tasks.
 * @returns disposer removing the rows and their observers.
 */
export function mountRunningJobs(
  controller: BoardController,
  readWorkspaces: () => RunningJobWorkspaceSnapshot = () => ({
    workspaceIds: controller.getSnapshot().executionOptions.workspaces.map(workspace => workspace.workspaceId),
  }),
): () => void {
  // Cross-instance idempotency, mirroring sidebar-entry: rows already in the
  // DOM belong to a still-live earlier mount (duplicated apply / HMR
  // re-injection). Never run a second row set alongside them.
  if (typeof document !== 'undefined' && document.querySelector(JOB_SELECTOR) !== null) {
    return () => {}
  }
  /** Mounted rows by task id; insertion order = placement order. */
  const rows = new Map<string, JobRow>()
  let root: HTMLElement | undefined

  /**
   * Reconcile mounted rows with the snapshot: drop archived/deleted tasks,
   * create rows for newly visible executions, place, then paint. Safe to call on
   * every controller notification and every observed mutation — unchanged
   * state performs zero DOM writes.
   */
  const sync = (): void => {
    const snapshot = controller.getSnapshot()
    const visibleTasks = snapshot.tasks.filter(needsSyntheticRow)
    const workspaces = readWorkspaces()

    for (const [taskId, row] of [...rows]) {
      if (!visibleTasks.some(task => task.id === taskId)) {
        row.el.remove()
        rows.delete(taskId)
      }
    }
    for (const task of visibleTasks) {
      if (!rows.has(task.id)) rows.set(task.id, createJobRow(controller, task.id))
    }
    if (rows.size === 0) return

    // Root tracking mirrors sidebar-entry: when the shell tears down the
    // whole sidebar pane, re-query from scratch (the pane may move).
    if (root !== undefined && !root.isConnected) root = undefined
    root ??= sidebarRoot()
    if (root === undefined) return

    // Build one ordered run list per workspace. A row with no rendered target
    // is deliberately removed rather than falling back to the Task Board
    // entry: it will be placed as soon as the workspace list/tree arrives.
    const groupedRows = new Map<string, JobRow[]>()
    for (const task of visibleTasks) {
      const row = rows.get(task.id)
      if (row === undefined) continue
      const workspaceId = taskWorkspaceId(task, workspaces)
      if (workspaceId === undefined) {
        row.el.remove()
        continue
      }
      const group = groupedRows.get(workspaceId)
      if (group === undefined) groupedRows.set(workspaceId, [row])
      else group.push(row)
    }
    placeRows(root, groupedRows, workspaces.workspaceIds)
    for (const task of visibleTasks) {
      const row = rows.get(task.id)
      if (row === undefined) continue
      paintRow(row, task, snapshot.boardOpen && snapshot.selectedTaskId === task.id)
    }
  }

  // One body-level watcher doubles as the wait-for-shell and self-heal
  // observer (rows are few, so the steady-state cost is the rows.size check).
  const observer = new MutationObserver(() => { sync() })
  observer.observe(document.body, { childList: true, subtree: true })
  const unsubscribe = controller.subscribe(sync)
  // Reflect the state already loaded by controller.start(): a page can boot
  // straight into running tasks (background runs from another tab, leftovers
  // awaiting reconciliation), and this mount runs after that first notify.
  sync()

  return () => {
    observer.disconnect()
    unsubscribe()
    for (const row of rows.values()) row.el.remove()
    rows.clear()
  }
}
