/**
 * Task board domain model: task lifecycle statuses, the task record shape,
 * and the pure transition functions the controller and tests share.
 * Framework-free (no cordis, no runtime imports) so the state machine is
 * unit-testable in isolation.
 */

/** Task lifecycle status, one per kanban column. */
export type TaskStatus = 'backlog' | 'todo' | 'running' | 'done' | 'failed'

/**
 * One real execution attempt: the run's own id, the dsh session that ran it
 * (filled once the session is created; absent for Codex runs), and the
 * settled outcome once the run ended.
 */
export interface ExecutionRecord {
  /** Execution attempt id (uuid). */
  id: string
  /** The dsh session that ran this attempt; absent until creation resolves (or for Codex runs). */
  sessionId: string | undefined
  /** When the run started (ms epoch). */
  startedAt: number
  /** When the run settled; absent while still running. */
  endedAt: number | undefined
  /** Outcome once settled. */
  result: 'succeeded' | 'failed' | 'cancelled' | undefined
  /** Human failure text when the run failed (prompt rejection or agent error). */
  error: string | undefined
  /**
   * Which runner executed this attempt: the dsh session machinery (default)
   * or a host-side OpenAI Codex App Server child.
   */
  runner?: 'dsh' | 'codex'
  /** Host-side run id of a Codex execution (absent for dsh sessions). */
  runId?: string
  /**
   * Persistent Codex thread id of a Codex execution. Follow-up turns resume
   * this thread, so the conversation identity survives restarts.
   */
  threadId?: string
  /** Absolute working directory used by a Codex execution. */
  cwd?: string
  /** Short tail of the run output (Codex final answer / failure text) kept for display. */
  outputTail?: string
}

/**
 * A scheduled-run rule attached to a task. The browser-side scheduler ticks
 * every minute and triggers the task when `nextRunAt` is due; the rule is
 * persisted with the task (localStorage), so scheduling survives refreshes.
 */
export interface ScheduleRule {
  /** Whether the schedule is armed. */
  enabled: boolean
  /** 5-field cron expression: `分 时 日 月 周`. */
  cron: string
  /** Next due instant (ms epoch); maintained by the scheduler/controller. */
  nextRunAt: number | undefined
  /** Instant of the latest scheduled trigger (ms epoch). */
  lastTriggeredAt: number | undefined
}

/** Provider/model/effort pinned to one task execution. */
export interface TaskModelSelection {
  /** Registered provider route. */
  provider: string
  /** Provider-owned model id. */
  model: string
  /** Optional adapter-owned reasoning effort. */
  reasoningEffort?: string
}

/**
 * The git worktree a task runs in. `branch` is requested up front; `path`
 * and `workspaceId` are filled in once the worktree has been materialized
 * on the host and registered as a DSH workspace (the sidebar entry).
 */
export interface TaskWorktreeSpec {
  /** Git branch checked out in the worktree (created when missing). */
  branch: string
  /** Absolute worktree directory once created; absent until then. */
  path?: string
  /** DSH workspace id the worktree is registered as; absent until then. */
  workspaceId?: string
  /** When the worktree was materialized (ms epoch). */
  createdAt?: number
}

/** One task on the board. */
export interface TaskRecord {
  /** Stable task id (uuid). */
  id: string
  /** Short display title. */
  title: string
  /** Longer human description shown in the detail view. */
  description: string
  /** The prompt sent to dsh when this task is executed. */
  prompt: string
  /** Current column. */
  status: TaskStatus
  /** Creation instant (ms epoch). */
  createdAt: number
  /** Last mutation instant (ms epoch). */
  updatedAt: number
  /** Every execution attempt, most recent last. */
  executions: ExecutionRecord[]
  /** Optional scheduled-run rule (absent on tasks without a schedule). */
  schedule?: ScheduleRule
  /**
   * Workspace the execution must run in (a workspace-list id); absent means
   * the recent-workspace fallback at execution time.
   */
  workspaceId?: string
  /**
   * Agent preset the execution session must be composed from (an
   * `agentPreset.list` id); absent means the deployment default.
   */
  mode?: string
  /**
   * Permission preset applied to the execution session through the
   * `/permission <id>` slash command; absent leaves the session default.
   */
  permission?: TaskPermission
  /**
   * Provider/model/reasoning selection for the execution session; absent uses
   * the session/DSH default. Only meaningful when executor is 'dsh'.
   */
  modelSelection?: TaskModelSelection
  /**
   * Which sub agent executes the task: the DSH session machinery (default,
   * absent) or the host's OpenAI Codex CLI (`codex exec`).
   */
  executor?: TaskExecutor
  /** Codex model slug pinned for a Codex execution; absent uses Codex's own default. */
  codexModel?: string
  /** Codex reasoning effort pinned for a Codex execution; absent uses Codex's own default. */
  codexEffort?: string
  /**
   * Git worktree the task runs in (branch requested up front, materialized
   * on first run or via the detail view). Absent means the task runs directly
   * in its workspace.
   */
  worktree?: TaskWorktreeSpec
  /**
   * When the task was archived (ms epoch). Archived tasks keep their status
   * and execution history but leave the main board; absent means on-board.
   */
  archivedAt?: number
}

/** Statuses a settled task may be archived from. */
export const ARCHIVABLE_STATUSES: readonly TaskStatus[] = ['done', 'failed']


/** Permission presets a task may pin on its execution session (the `/permission <id>` ids). */
export const TASK_PERMISSIONS = ['read-only', 'workspace-write', 'danger-full-access'] as const

/** One permission preset id. */
export type TaskPermission = typeof TASK_PERMISSIONS[number]

/** Whether an unknown value is a known permission preset id. */
export function isTaskPermission(value: unknown): value is TaskPermission {
  return typeof value === 'string' && (TASK_PERMISSIONS as readonly string[]).includes(value)
}

/** Sub agents a task may be executed by. */
export const TASK_EXECUTORS = ['dsh', 'codex'] as const

/** One executor id ('dsh' = the DSH session machinery; 'codex' = the Codex CLI). */
export type TaskExecutor = typeof TASK_EXECUTORS[number]

/** Whether an unknown value is a known executor id. */
export function isTaskExecutor(value: unknown): value is TaskExecutor {
  return typeof value === 'string' && (TASK_EXECUTORS as readonly string[]).includes(value)
}

/** Input for creating a task. */
export interface NewTaskInput {
  title: string
  description: string
  prompt: string
  /** Workspace the execution must run in; empty/absent = the recent workspace. */
  workspaceId?: string
  /** Agent preset the execution session must be composed from; empty/absent = deployment default. */
  mode?: string
  /** Permission preset applied to the execution session; absent = session default. */
  permission?: TaskPermission
  /** Provider/model/reasoning selection; absent = session/DSH default. */
  modelSelection?: TaskModelSelection
  /** Sub agent that executes the task; absent = the DSH session machinery. */
  executor?: TaskExecutor
  /** Codex model slug; absent/blank = Codex's own default model. */
  codexModel?: string
  /** Codex reasoning effort; absent/blank = Codex's own default. */
  codexEffort?: string
  /** Git worktree to run in; `branch` is required when present. */
  worktree?: { branch: string }
  /**
   * Optional scheduled-run rule requested at creation time (the new-task
   * dialog): an enable flag plus a 5-field cron expression. The create use
   * case arms it only when enabled and the expression is valid.
   */
  schedule?: { enabled: boolean; cron: string }
}

/** The five kanban columns, in display order. */
export const COLUMNS: readonly { status: TaskStatus; label: string }[] = [
  { status: 'backlog', label: '待规划' },
  { status: 'todo', label: '待办' },
  { status: 'running', label: '进行中' },
  { status: 'done', label: '已完成' },
  { status: 'failed', label: '已失败' },
]

/** Statuses a user may move a card to manually (execution states are owned by the runner). */
export const MANUAL_STATUSES: readonly TaskStatus[] = ['backlog', 'todo']

/** Statuses the runner may move a card to from 'running'. */
export const RUNNER_SETTLE_STATUSES: readonly TaskStatus[] = ['done', 'failed']

/** All valid statuses (closed union guard). */
export const ALL_STATUSES: readonly TaskStatus[] = [
  'backlog', 'todo', 'running', 'done', 'failed',
]

/** Brand an unknown string as a status; undefined when it is not one. */
export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && (ALL_STATUSES as readonly string[]).includes(value)
}

/** Whether a manual move target is allowed from the given status. */
export function canMoveManually(_from: TaskStatus, to: TaskStatus): boolean {
  return (MANUAL_STATUSES as readonly TaskStatus[]).includes(to)
}

/** Normalize one optional execution-target string: trim; blank collapses to undefined. */
export function normalizeTargetId(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed === undefined || trimmed === '' ? undefined : trimmed
}

/**
 * Turn a task title into a usable git branch slug: lowercase ASCII-ish word
 * characters kept, everything else collapsed to `-`, trimmed of separators,
 * with a compact timestamp suffix so two tasks with the same title never
 * collide. Falls back to `task` when nothing survives the cleanup.
 */
export function slugifyBranch(title: string, now: number): string {
  const base = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '')
  // Compact sortable suffix at minute precision.
  const at = new Date(now)
  const stamp = `${String(at.getMonth() + 1).padStart(2, '0')}${String(at.getDate()).padStart(2, '0')}`
    + `${String(at.getHours()).padStart(2, '0')}${String(at.getMinutes()).padStart(2, '0')}`
  return `${base === '' ? 'task' : base}-${stamp}`
}

/** Whether a proposed branch name satisfies git's check-ref-format basics. */
export function isValidBranchName(branch: string): boolean {
  if (!/^[^\s~^:?*[\\]+$/.test(branch)) return false
  if (branch.startsWith('-') || branch.startsWith('/') || branch.endsWith('/')
    || branch.endsWith('.') || branch.endsWith('.lock')) return false
  if (branch.includes('..') || branch.includes('//')) return false
  return true
}

/** Whether an unknown value is a structurally usable model selection. */
export function isTaskModelSelection(value: unknown): value is TaskModelSelection {
  if (typeof value !== 'object' || value === null) return false
  const selection = value as Record<string, unknown>
  return typeof selection.provider === 'string' && selection.provider.trim() !== ''
    && typeof selection.model === 'string' && selection.model.trim() !== ''
    && (selection.reasoningEffort === undefined || typeof selection.reasoningEffort === 'string')
}

/** Normalize a model selection persisted or supplied by the UI. */
export function normalizeModelSelection(value: unknown): TaskModelSelection | undefined {
  if (!isTaskModelSelection(value)) return undefined
  const provider = value.provider.trim()
  const model = value.model.trim()
  const reasoningEffort = value.reasoningEffort?.trim()
  return {
    provider,
    model,
    ...(reasoningEffort === undefined || reasoningEffort === '' ? {} : { reasoningEffort }),
  }
}

/**
 * Normalize a worktree spec persisted or supplied by the UI: keep only a
 * non-blank branch plus known string fields; a blank branch drops the whole
 * spec (a worktree without a branch cannot be materialized).
 */
export function normalizeWorktree(value: unknown): TaskWorktreeSpec | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const spec = value as Record<string, unknown>
  const branch = typeof spec.branch === 'string' ? spec.branch.trim() : ''
  if (branch === '') return undefined
  const path = typeof spec.path === 'string' && spec.path.trim() !== '' ? spec.path.trim() : undefined
  const workspaceId = typeof spec.workspaceId === 'string' && spec.workspaceId.trim() !== ''
    ? spec.workspaceId.trim()
    : undefined
  const createdAt = typeof spec.createdAt === 'number' && Number.isFinite(spec.createdAt)
    ? spec.createdAt
    : undefined
  return {
    branch,
    ...(path === undefined ? {} : { path }),
    ...(workspaceId === undefined ? {} : { workspaceId }),
    ...(createdAt === undefined ? {} : { createdAt }),
  }
}

/** Create a task from user input. */
export function createTask(input: NewTaskInput, now: number, id: string): TaskRecord {
  return {
    id,
    title: input.title.trim(),
    description: input.description.trim(),
    prompt: input.prompt.trim(),
    status: 'todo',
    createdAt: now,
    updatedAt: now,
    executions: [],
    workspaceId: normalizeTargetId(input.workspaceId),
    mode: normalizeTargetId(input.mode),
    permission: isTaskPermission(input.permission) ? input.permission : undefined,
    modelSelection: normalizeModelSelection(input.modelSelection),
    executor: isTaskExecutor(input.executor) && input.executor !== 'dsh' ? input.executor : undefined,
    codexModel: normalizeTargetId(input.codexModel),
    codexEffort: normalizeTargetId(input.codexEffort),
    worktree: input.worktree === undefined ? undefined : normalizeWorktree({ branch: input.worktree.branch }),
  }
}

/** Clone a task with an updated status and a fresh updatedAt. */
export function withStatus(task: TaskRecord, status: TaskStatus, now: number): TaskRecord {
  return { ...task, status, updatedAt: now }
}

/**
 * Merge a schedule patch into a task's schedule rule (creating it when
 * absent), with a fresh updatedAt. Keys present in the patch overwrite the
 * current value — including explicit `undefined`, which clears a field (used
 * to disarm `nextRunAt`); absent keys keep their current value.
 */
export function withSchedule(
  task: TaskRecord,
  patch: Partial<ScheduleRule>,
  now: number,
): TaskRecord {
  const current = task.schedule
  const schedule: ScheduleRule = {
    enabled: current?.enabled ?? false,
    cron: current?.cron ?? '',
    nextRunAt: current?.nextRunAt,
    lastTriggeredAt: current?.lastTriggeredAt,
  }
  if ('enabled' in patch) schedule.enabled = patch.enabled ?? false
  if ('cron' in patch) schedule.cron = patch.cron ?? ''
  if ('nextRunAt' in patch) schedule.nextRunAt = patch.nextRunAt
  if ('lastTriggeredAt' in patch) schedule.lastTriggeredAt = patch.lastTriggeredAt
  return { ...task, updatedAt: now, schedule }
}

/**
 * Open a fresh execution on a task: move it to 'running' and append a
 * running execution record. Returns the new task and the new execution.
 */
export function startExecution(
  task: TaskRecord,
  now: number,
  executionId: string,
): { task: TaskRecord; execution: ExecutionRecord } {
  const execution: ExecutionRecord = {
    id: executionId,
    sessionId: undefined,
    startedAt: now,
    endedAt: undefined,
    result: undefined,
    error: undefined,
  }
  return {
    task: { ...task, status: 'running', updatedAt: now, executions: [...task.executions, execution] },
    execution,
  }
}

/**
 * Settle a running execution: record the outcome and move the task into the
 * matching column. No-op (returns the input task) when the execution is not
 * the task's latest or is already settled.
 */
export function settleExecution(
  task: TaskRecord,
  executionId: string,
  outcome: 'succeeded' | 'failed' | 'cancelled',
  now: number,
  error: string | undefined,
  outputTail?: string,
): TaskRecord {
  const index = task.executions.findIndex(execution => execution.id === executionId)
  if (index === -1) return task
  const execution = task.executions[index]
  if (execution.endedAt !== undefined) return task
  const settled: ExecutionRecord = {
    ...execution,
    endedAt: now,
    result: outcome,
    error,
    outputTail,
  }
  const executions = [...task.executions]
  executions[index] = settled
  const status: TaskStatus = outcome === 'succeeded' ? 'done'
    : outcome === 'failed' ? 'failed'
      : task.status === 'running' ? 'todo' : task.status
  return { ...task, status, updatedAt: now, executions }
}

/** A settled-execution summary string for the detail view. */
export function executionLabel(execution: ExecutionRecord): string {
  if (execution.result === 'succeeded') return 'succeeded'
  if (execution.result === 'failed') return 'failed'
  if (execution.result === 'cancelled') return 'cancelled'
  return 'running'
}
