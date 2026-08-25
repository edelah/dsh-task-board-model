/**
 * Board controller: the single owner of task-ledger state and view state.
 *
 * It keeps the ledger in memory, persists every mutation through the
 * {@link TaskStore}, drives real executions through the
 * {@link ExecutionService}, and closes the board view whenever the user
 * navigates to a session (the sessions-list `current` selection changes).
 * Framework-free (structural runtime faces) so the whole orchestration is
 * unit-testable with fakes.
 *
 * The per use-case domain transitions (create/update/delete/schedule) live in
 * dedicated modules under core/use-cases and are applied here; the controller
 * owns only the orchestration seam (state, persistence, notify, execution,
 * navigation, reconciliation).
 */
import {
  ExecutionService, type CodexConversationResult, type CodexRunSnapshot, type ExecutionEvent,
} from './execution.ts'
import type { TaskStore } from './store.ts'
import {
  settleExecution, startExecution, withStatus,
  type NewTaskInput, type TaskRecord, type TaskStatus,
} from './tasks.ts'
import { applyArchiveTask, applyRestoreTask } from './use-cases/task-archive.ts'
import { applyCreateTask } from './use-cases/task-create.ts'
import { applyDeleteTask } from './use-cases/task-delete.ts'
import { applyScheduleNextRun as applyScheduleRollForward, applySetSchedule } from './use-cases/task-schedule.ts'
import { applyUpdateTask, type TaskUpdatePatch } from './use-cases/task-update.ts'

/** The sessions face the controller needs for navigation awareness. */
export interface SessionsControllerFace {
  list: {
    getSnapshot(): { current: string | undefined }
    subscribe(fn: () => void): () => void
  }
  /** Select a session as current (navigates the conversation view). */
  open(id: string): void
}

/** Controller dependencies (all swappable in tests). */
export interface ControllerDeps {
  store: TaskStore
  exec: ExecutionService
  sessions: SessionsControllerFace
  /**
   * Register an absolute directory as a DSH workspace (the sidebar entry a
   * materialized git worktree needs). Absent disables the registration step.
   */
  registerWorkspace?: (path: string, title: string) => Promise<string | undefined>
  /** Delete a workspace registration (worktree removal cleanup). */
  deleteWorkspace?: (workspaceId: string) => Promise<void>
  /**
   * Navigate the GUI to a workspace (connect its blank session and select it).
   * Backs the detail view's "open workspace" affordance for worktrees.
   */
  openWorkspace?: (workspaceId: string) => void
  /** Clock; defaults to Date.now. */
  now?: () => number
  /** Id minting; defaults to a random-uuid. */
  uuid?: () => string
  /** Debounce (ms) for session-list-changed reconciles; defaults to 350. */
  reconcileDebounceMs?: number
}

/** One workspace option the execution-target pickers offer. */
export interface ExecutionWorkspaceOption {
  workspaceId: string
  /** Display label (workspace title; the wiring falls back to the path). */
  title: string
  /** Absolute directory of the workspace (worktree creation base). */
  path?: string
}

/** One agent-preset option the execution-target pickers offer. */
export interface ExecutionPresetOption {
  id: string
  name?: string
  description?: string
  /** Why this preset cannot compose a session; the pickers disable it. */
  broken?: string
  isDefault: boolean
}

/** One effort option advertised for an exact provider/model route. */
export interface ExecutionEffortOption {
  id: string
  name: string
  description?: string
}

/** One provider/model option shown by the task execution pickers. */
export interface ExecutionModelOption {
  provider: string
  providerName: string
  model: string
  name: string
  description?: string
  reasoning?: {
    efforts: readonly ExecutionEffortOption[]
    defaultEffort?: string
  }
}

/** One Codex reasoning-effort choice advertised by a Codex model. */
export interface CodexEffortChoice {
  id: string
  description?: string
}

/** One Codex model choice from the machine's catalog. */
export interface CodexModelChoice {
  slug: string
  displayName: string
  description?: string
  efforts: readonly CodexEffortChoice[]
  defaultEffort?: string
}

/** The host's Codex CLI facts the executor pickers offer. */
export interface CodexOptionsSnapshot {
  /** Whether the codex CLI / catalog could be found on the host. */
  available: boolean
  /** The config.toml default model, when readable. */
  defaultModel?: string
  /** The config.toml default reasoning effort, when readable. */
  defaultEffort?: string
  models: readonly CodexModelChoice[]
}

/** The empty Codex snapshot used until the first host read lands. */
export const EMPTY_CODEX_OPTIONS: CodexOptionsSnapshot = { available: false, models: [] }

/** The execution-target option sets the UI feeds into the controller. */
export interface ExecutionOptionsSnapshot {
  workspaces: readonly ExecutionWorkspaceOption[]
  presets: readonly ExecutionPresetOption[]
  models: readonly ExecutionModelOption[]
  codex: CodexOptionsSnapshot
}

/** Immutable controller snapshot for UI subscriptions. */
export interface ControllerSnapshot {
  tasks: readonly TaskRecord[]
  boardOpen: boolean
  /** True when the board shows the archive view instead of the columns. */
  archiveView: boolean
  selectedTaskId: string | undefined
  /** Codex task whose persisted thread is shown in the chat-first surface. */
  codexChatTaskId: string | undefined
  /** Picker option sets (workspace list + agent-preset roster + models). */
  executionOptions: ExecutionOptionsSnapshot
}

/** The selected task (resolved from the ledger), or undefined. */
export function selectedTaskOf(snapshot: ControllerSnapshot): TaskRecord | undefined {
  if (snapshot.selectedTaskId === undefined) return undefined
  return snapshot.tasks.find(task => task.id === snapshot.selectedTaskId)
}

/** The Codex task currently shown as a conversation, or undefined. */
export function selectedCodexTaskOf(snapshot: ControllerSnapshot): TaskRecord | undefined {
  if (snapshot.codexChatTaskId === undefined) return undefined
  return snapshot.tasks.find(task => task.id === snapshot.codexChatTaskId)
}

function randomUuid(): string {
  const randomUUID = globalThis.crypto?.randomUUID
  if (randomUUID !== undefined) {
    return randomUUID.call(globalThis.crypto!)
  }
  const bytes = globalThis.crypto?.getRandomValues(new Uint8Array(16))
  if (bytes === undefined) {
    // Non-secure fallback (tests, odd environments).
    return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** Read the current selection off a session-list snapshot (structural). */
function currentOf(sessions: SessionsControllerFace): string | undefined {
  return sessions.list.getSnapshot().current
}

/**
 * Board controller (see module doc). All mutations bump the snapshot and
 * persist through the store; UI and DOM mounts subscribe and re-render.
 */
export class BoardController {
  private tasks: TaskRecord[] = []
  private boardOpen = false
  private archiveView = false
  private selectedTaskId: string | undefined
  private codexChatTaskId: string | undefined
  private executionOptions: ExecutionOptionsSnapshot = { workspaces: [], presets: [], models: [], codex: EMPTY_CODEX_OPTIONS }
  private listeners = new Set<() => void>()
  private disposers: Array<() => void> = []
  private readonly now: () => number
  private readonly uuid: () => string

  /** @param deps - store, execution service, and the sessions navigation face. */
  constructor(private readonly deps: ControllerDeps) {
    this.now = deps.now ?? (() => Date.now())
    this.uuid = deps.uuid ?? randomUuid
  }

  // --- lifecycle -------------------------------------------------------------

  /** Load the persisted ledger and start the navigation/status subscriptions. */
  start(): void {
    this.tasks = this.deps.store.load()
    void this.reconcileRunningTasks()
    // A sibling tab may have edited or deleted the ledger (same origin,
    // storage events). Reload on external change so a task deleted in
    // another tab stops firing here — and is never written back by this
    // tab's stale copy (scheduler roll-forward, execution settlement).
    const unsubscribeExternal = this.deps.store.subscribeExternal?.(() => {
      this.tasks = this.deps.store.load()
      this.notify()
    })
    if (unsubscribeExternal !== undefined) this.disposers.push(unsubscribeExternal)
    this.disposers.push(this.deps.sessions.list.subscribe(() => {
      this.onSessionsChanged()
    }))
    this.notify()
  }

  /** Stop all subscriptions and drop retained state (idempotent). */
  dispose(): void {
    for (const dispose of this.disposers.splice(0)) dispose()
    this.listeners.clear()
    if (this.reconcileTimer !== undefined) clearTimeout(this.reconcileTimer)
    this.reconcileTimer = undefined
  }

  // --- snapshot / subscription ------------------------------------------------

  getSnapshot(): ControllerSnapshot {
    return {
      tasks: this.tasks,
      boardOpen: this.boardOpen,
      archiveView: this.archiveView,
      selectedTaskId: this.selectedTaskId,
      codexChatTaskId: this.codexChatTaskId,
      executionOptions: this.executionOptions,
    }
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn)
    return () => { this.listeners.delete(fn) }
  }

  /** Notify views that an external presentation input, such as locale, changed. */
  refresh(): void {
    this.notify()
  }

  // --- view state -------------------------------------------------------------

  openBoard(): void {
    const leavingChat = this.codexChatTaskId !== undefined
    this.codexChatTaskId = undefined
    if (this.boardOpen) {
      if (leavingChat) this.notify()
      return
    }
    // Baseline the selection the board opened against: the board stays open
    // until the user navigates (selection changes), never on mere status
    // updates of the already-selected session.
    this.lastCurrent = currentOf(this.deps.sessions)
    this.boardOpen = true
    this.notify()
  }

  closeBoard(): void {
    if (!this.boardOpen) return
    this.boardOpen = false
    this.notify()
  }

  toggleBoard(): void {
    if (this.boardOpen && this.codexChatTaskId === undefined) this.closeBoard()
    else this.openBoard()
  }

  /**
   * Switch between the kanban columns and the archive view. Leaving the
   * archive view with an archived task still selected closes the selection —
   * the detail overlay must not linger over a task that is off-board.
   */
  toggleArchiveView(): void {
    this.archiveView = !this.archiveView
    if (!this.archiveView && this.selectedTaskId !== undefined) {
      const selected = this.tasks.find(task => task.id === this.selectedTaskId)
      if (selected?.archivedAt !== undefined) this.selectedTaskId = undefined
    }
    this.notify()
  }

  openTask(id: string): void {
    if (this.tasks.some(task => task.id === id)) {
      this.codexChatTaskId = undefined
      this.selectedTaskId = id
      this.notify()
    }
  }

  /** Open a Codex task's persisted thread in the board-owned chat surface. */
  openCodexConversation(id: string): void {
    const task = this.tasks.find(candidate => candidate.id === id)
    const latest = task?.executions[task.executions.length - 1]
    if (latest?.runner !== 'codex' || latest.threadId === undefined) return
    this.lastCurrent = currentOf(this.deps.sessions)
    this.selectedTaskId = undefined
    this.codexChatTaskId = id
    this.boardOpen = true
    this.notify()
  }

  closeTask(): void {
    if (this.selectedTaskId === undefined) return
    this.selectedTaskId = undefined
    this.notify()
  }

  // --- task mutations (use-case transitions in core/use-cases) -----------------

  createTask(input: NewTaskInput): TaskRecord | undefined {
    const { task, tasks } = applyCreateTask(this.tasks, input, this.now(), this.uuid())
    if (task === undefined) return undefined
    this.tasks = [...tasks]
    this.persistAndNotify()
    return task
  }

  updateTask(id: string, patch: TaskUpdatePatch): void {
    this.tasks = [...applyUpdateTask(this.tasks, id, patch, this.now())]
    this.persistAndNotify()
  }

  /**
   * Replace (a part of) the picker option sets the UI feeds (workspace list
   * and agent-preset roster come from the runtime, not the ledger).
   */
  setExecutionOptions(patch: Partial<ExecutionOptionsSnapshot>): void {
    this.executionOptions = { ...this.executionOptions, ...patch }
    this.notify()
  }

  moveTask(id: string, status: TaskStatus): void {
    this.tasks = this.tasks.map(task => task.id === id ? withStatus(task, status, this.now()) : task)
    this.persistAndNotify()
  }

  deleteTask(id: string): void {
    const { tasks, selectionCleared } = applyDeleteTask(this.tasks, this.selectedTaskId, id)
    this.tasks = [...tasks]
    if (selectionCleared) this.selectedTaskId = undefined
    if (this.codexChatTaskId === id) this.codexChatTaskId = undefined
    this.persistAndNotify()
  }

  /**
   * Archive a settled task (done/failed). Running or on-board-unsettled
   * tasks are refused so the runner keeps exclusive ownership of their
   * lifecycle.
   * @returns true when applied.
   */
  archiveTask(id: string): boolean {
    const { tasks, archived } = applyArchiveTask(this.tasks, id, this.now())
    if (!archived) return false
    this.tasks = [...tasks]
    this.persistAndNotify()
    return true
  }

  /** Restore an archived task back onto the board (same status column). */
  restoreTask(id: string): boolean {
    const { tasks, archived } = applyRestoreTask(this.tasks, id, this.now())
    if (!archived) return false
    this.tasks = [...tasks]
    this.persistAndNotify()
    return true
  }

  // --- scheduling ---------------------------------------------------------------

  /**
   * Update a task's schedule rule. A blank or invalid cron expression is
   * rejected (returns false, state untouched). When the rule ends up enabled
   * the next run instant is computed immediately; a disabled rule carries no
   * next-run instant. Delegates the domain transition to the schedule use case.
   * @param id - the task to schedule.
   * @param patch - fields to change (absent fields keep their current value).
   * @returns true when applied, false when rejected (invalid cron / unknown task).
   */
  setSchedule(id: string, patch: { enabled?: boolean; cron?: string }): boolean {
    const { tasks, applied } = applySetSchedule(this.tasks, id, patch, this.now())
    if (!applied) return false
    this.tasks = [...tasks]
    this.persistAndNotify()
    return true
  }

  /**
   * Roll a task's schedule forward (scheduler callback): persist the next due
   * instant and the trigger instant of this run. No-op when the task has no
   * schedule rule (it was deleted mid-tick, for example).
   */
  applyScheduleNextRun(id: string, nextRunAt: number | undefined, lastTriggeredAt: number | undefined): void {
    const next = applyScheduleRollForward(this.tasks, id, nextRunAt, lastTriggeredAt, this.now())
    this.tasks = [...next]
    this.persistAndNotify()
  }

  /**
   * Reload the ledger from the persisted store without notifying subscribers.
   * The scheduler calls this before every tick so a task deleted in another
   * tab (or a stale in-memory copy) can never be fired from this tab: the
   * fire decision and the subsequent roll-forward both run on the freshest
   * persisted truth. Deliberately silent — same-origin external changes still
   * reach subscribers through the storage-event subscription.
   */
  reloadFromStore(): void {
    this.tasks = this.deps.store.load()
  }

  /**
   * Jump to an execution's session transcript. Selecting the session changes
   * `current`, which closes the board (the conversation view takes over).
   * @param sessionId - the execution session to open.
   */
  openSession(sessionId: string): void {
    this.deps.sessions.open(sessionId)
  }

  /**
   * Navigate the GUI to one of the task's workspaces (e.g. the materialized
   * worktree): connect its blank session and select it, closing the board.
   */
  openTaskWorkspace(id: string): void {
    const task = this.tasks.find(candidate => candidate.id === id)
    const workspaceId = task?.worktree?.workspaceId
    if (workspaceId === undefined || this.deps.openWorkspace === undefined) return
    this.deps.openWorkspace(workspaceId)
  }

  // --- execution ---------------------------------------------------------------

  /**
   * Execute a task for real: move it to 'running', open an execution record,
   * and hand off to the ExecutionService. A second call while the task is
   * already running is ignored.
   */
  async runTask(id: string): Promise<boolean> {
    const task = this.tasks.find(candidate => candidate.id === id)
    if (task === undefined || task.status === 'running') return false
    const { task: next, execution } = startExecution(task, this.now(), this.uuid())
    this.tasks = this.tasks.map(candidate => candidate.id === id ? next : candidate)
    this.persistAndNotify()
    // This page owns the settlement of its own launches: the live watch
    // (ExecutionService.run) settles on the turn boundary, and list
    // reconciliation must not pre-empt it with a session that has not
    // started a turn yet (its list row is idle, not completed).
    this.activeExecutionIds.add(execution.id)
    await this.deps.exec.run(next, execution, (event) => { this.handleExecutionEvent(event) })
    return true
  }

  /** Re-run a settled task: move it back to 'todo' first, then execute. */
  async rerunTask(id: string): Promise<void> {
    const task = this.tasks.find(candidate => candidate.id === id)
    if (task === undefined) return
    if (task.status !== 'running') {
      this.tasks = this.tasks.map(candidate => candidate.id === id ? withStatus(candidate, 'todo', this.now()) : candidate)
      this.persistAndNotify()
    }
    await this.runTask(id)
  }

  private handleExecutionEvent(event: ExecutionEvent): void {
    if (event.kind === 'started') {
      this.tasks = this.tasks.map(task => task.id === event.taskId
        ? attachRunIdentity(
            task,
            event.executionId,
            event.sessionId,
            event.runner ?? 'dsh',
            event.runId,
            event.threadId,
            this.now(),
          )
        : task)
      this.persistAndNotify()
      return
    }
    if (event.kind === 'worktree-ready') {
      void this.adoptWorktree(event.taskId, event.path, event.branch, event.workspaceId)
      return
    }
    this.activeExecutionIds.delete(event.executionId)
    this.tasks = this.tasks.map(task => task.id === event.taskId
      ? settleExecution(task, event.executionId, event.outcome, this.now(), event.error, event.outputTail)
      : task)
    this.persistAndNotify()
  }

  /**
   * Persist a materialized worktree onto its task and make sure the directory
   * is registered as a DSH workspace so it appears in the sidebar's workspace
   * list. Registration failures keep the worktree usable (the path is still
   * recorded); only the sidebar entry is missing then.
   */
  private async adoptWorktree(
    taskId: string,
    path: string,
    branch: string,
    knownWorkspaceId?: string,
  ): Promise<void> {
    const task = this.tasks.find(candidate => candidate.id === taskId)
    if (task === undefined) return
    let workspaceId = knownWorkspaceId ?? task.worktree?.workspaceId
    if (workspaceId === undefined && this.deps.registerWorkspace !== undefined) {
      try {
        const registered = await this.deps.registerWorkspace(path, task.title)
        if (registered !== undefined) workspaceId = registered
      } catch (error) {
        console.error('[dsh-task-board] worktree workspace registration failed', error)
      }
    }
    // Re-find after the awaited registration: a sibling tab may have rewritten
    // the ledger meanwhile.
    const fresh = this.tasks.find(candidate => candidate.id === taskId)
    if (fresh === undefined) return
    const spec = { ...(fresh.worktree ?? { branch }), branch, path, ...(workspaceId === undefined ? {} : { workspaceId }), createdAt: fresh.worktree?.createdAt ?? this.now() }
    this.updateTask(taskId, { worktree: spec })
  }

  /**
   * Materialize a task's git worktree without running the task (detail-view
   * prepare action). The execution service creates/reuses it; adoption above
   * registers + persists it.
   */
  async prepareWorktree(id: string): Promise<{ ok: boolean; error?: string; path?: string }> {
    const task = this.tasks.find(candidate => candidate.id === id)
    if (task === undefined) return { ok: false, error: 'unknown task' }
    const result = await this.deps.exec.prepareWorktree(task, ({ path, branch, workspaceId }) => {
      void this.adoptWorktree(task.id, path, branch, workspaceId)
    })
    return result.ok
      ? { ok: true, path: result.path }
      : { ok: false, error: result.error }
  }

  /**
   * Remove a task's git worktree directory (`git worktree remove`) and drop
   * its workspace registration + record fields. The branch itself survives —
   * deleting committed work is never implicit.
   */
  async removeWorktree(id: string, force = false): Promise<boolean> {
    const task = this.tasks.find(candidate => candidate.id === id)
    const path = task?.worktree?.path
    if (task === undefined || path === undefined) return false
    const removed = await this.deps.exec.removeWorktree(path, force)
    if (!removed.ok) return false
    const workspaceId = task.worktree?.workspaceId
    if (workspaceId !== undefined && this.deps.deleteWorkspace !== undefined) {
      try {
        await this.deps.deleteWorkspace(workspaceId)
      } catch (error) {
        console.error('[dsh-task-board] worktree workspace deletion failed', error)
      }
    }
    // Clear the materialized spec but keep nothing stale: the whole spec
    // goes away (the branch itself survives in git).
    this.updateTask(id, { worktree: undefined })
    return true
  }

  /**
   * Send one follow-up prompt to a settled Codex task's persisted thread.
   * Opens a new execution record; the conversation continues server-side
   * (initialize → thread/resume → turn/start).
   * @returns true when the follow-up was launched.
   */
  async followUpTask(id: string, content: string): Promise<boolean> {
    const task = this.tasks.find(candidate => candidate.id === id)
    if (task === undefined || task.status === 'running') return false
    if (content.trim() === '') return false
    if (!this.deps.exec.canFollowUp(task)) return false
    const { task: next, execution } = startExecution(task, this.now(), this.uuid())
    this.tasks = this.tasks.map(candidate => candidate.id === id ? next : candidate)
    this.persistAndNotify()
    // This page owns the settlement of its own launch (see runTask).
    this.activeExecutionIds.add(execution.id)
    await this.deps.exec.runCodexFollowUp(
      next,
      execution,
      content.trim(),
      event => { this.handleExecutionEvent(event) },
    )
    return true
  }

  /**
   * Steer the latest running Codex execution with additional input (the
   * input is injected into the ACTIVE turn via turn/steer).
   */
  async steerExecution(id: string, content: string): Promise<{ ok: boolean; error?: string }> {
    const task = this.tasks.find(candidate => candidate.id === id)
    if (task === undefined || content.trim() === '') return { ok: false, error: 'nothing to send' }
    return this.deps.exec.steerCodexRun(task, content.trim())
  }

  /** Live snapshot of the latest hosted Codex run (detail-view progress). */
  async codexRunSnapshot(id: string): Promise<CodexRunSnapshot | undefined> {
    const task = this.tasks.find(candidate => candidate.id === id)
    if (task === undefined) return undefined
    return this.deps.exec.peekCodexRun(task)
  }

  /** Load a task's complete persisted Codex conversation. */
  async codexConversation(id: string): Promise<CodexConversationResult> {
    const task = this.tasks.find(candidate => candidate.id === id)
    if (task === undefined) return { ok: false, error: 'task not found' }
    return this.deps.exec.readCodexConversation(task)
  }

  /**
   * Best-effort cancel of the latest running execution: hosted Codex turns
   * are interrupted (turn/interrupt) with a bounded grace before the child
   * process tree is terminated; DSH session runs have no cancel verb yet.
   * @returns true when a cancellation request was delivered.
   */
  async cancelExecution(id: string): Promise<boolean> {
    const task = this.tasks.find(candidate => candidate.id === id)
    if (task === undefined) return false
    return this.deps.exec.cancelCodexRun(task)
  }

  // --- internals ---------------------------------------------------------------

  /** Reconcile running tasks and close the board when the user navigates. */
  private onSessionsChanged(): void {
    // Background/leftover executions settle through the session list (their
    // conversation snapshots stay cold until opened). Coalesce the burst of
    // list notifications into one reconcile pass instead of fanning out a
    // history read per notification; see scheduleReconcile.
    this.scheduleReconcile()
    if (!this.boardOpen) return
    const current = currentOf(this.deps.sessions)
    if (current !== this.lastCurrent) this.closeBoard()
    this.lastCurrent = current
  }

  private lastCurrent: string | undefined = undefined

  /** Execution ids launched on this page; they settle via their live watch, never list reconciliation. */
  private readonly activeExecutionIds = new Set<string>()

  /** Debounce timer for {@link reconcileRunningTasks}. */
  private reconcileTimer: ReturnType<typeof setTimeout> | undefined = undefined

  /** Whether a reconcile pass is underway (single-flight guard). */
  private reconcileInFlight = false

  /**
   * Debounce + single-flight trigger for the running-task reconciliation.
   * Session-list notifications arrive in bursts (one per session status
   * change); both guards together keep a burst from reading the history API
   * once per running task.
   */
  private scheduleReconcile(): void {
    if (this.reconcileTimer !== undefined) return
    this.reconcileTimer = setTimeout(() => {
      this.reconcileTimer = undefined
      void this.reconcileRunningTasks()
    }, this.deps.reconcileDebounceMs ?? 350)
  }

  /** Settle tasks left 'running' whose sessions already finished. */
  private async reconcileRunningTasks(): Promise<void> {
    if (this.reconcileInFlight) return
    this.reconcileInFlight = true
    try {
      type Settled = Extract<ExecutionEvent, { kind: 'settled' }>
      const events: Array<{ taskId: string; event: Settled }> = []
      for (const task of this.tasks) {
        if (task.status !== 'running') continue
        const execution = task.executions[task.executions.length - 1]
        // Runs launched on this page settle through their live watch (turn
        // boundary); reconciliation exists for background/leftover runs.
        if (execution !== undefined && this.activeExecutionIds.has(execution.id)) continue
        const event = await this.deps.exec.reconcile(task)
        if (event !== undefined && event.kind === 'settled') events.push({ taskId: task.id, event })
      }
      if (events.length === 0) return
      let changed = false
      for (const { taskId, event } of events) {
        // The reconcile call above awaited: a sibling tab may have rewritten
        // the ledger (storage event reload) meanwhile. Re-read the freshest
        // record now so the stale task captured before the await can never
        // overwrite fields the sibling wrote.
        const task = this.tasks.find(candidate => candidate.id === taskId)
        if (task === undefined) continue
        const next = settleExecution(task, event.executionId, event.outcome, this.now(), event.error)
        if (next === task) continue
        this.tasks = this.tasks.map(candidate => candidate.id === taskId ? next : candidate)
        changed = true
      }
      if (changed) this.persistAndNotify()
    } finally {
      this.reconcileInFlight = false
    }
  }

  private persistAndNotify(): void {
    this.deps.store.save(this.tasks)
    this.notify()
  }

  private notify(): void {
    for (const fn of [...this.listeners]) fn()
  }
}

/**
 * Record which runner took an execution over (once the execution service
 * reports it): the dsh session id for session runs, or the host run id for a
 * Codex CLI process.
 */
function attachRunIdentity(
  task: TaskRecord,
  executionId: string,
  sessionId: string | undefined,
  runner: 'dsh' | 'codex',
  runId: string | undefined,
  threadId: string | undefined,
  now: number,
): TaskRecord {
  return {
    ...task,
    updatedAt: now,
    executions: task.executions.map(execution =>
      execution.id === executionId
        ? {
            ...execution,
            runner,
            ...(sessionId === undefined ? {} : { sessionId }),
            ...(runId === undefined ? {} : { runId }),
            ...(threadId === undefined ? {} : { threadId }),
          }
        : execution),
  }
}
