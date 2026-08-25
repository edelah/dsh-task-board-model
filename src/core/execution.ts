/**
 * Execution service: runs a task through dsh's real session machinery.
 *
 * The board's "run" button must make dsh actually work, not fake a status:
 * the service connects a real session (workspace blank-session reuse or
 * `session.create` on the host via the workspaces service), renames it to
 * the task title, sends the task prompt with `session.prompt`, and then
 * watches the session's conversation snapshot until its turn settles. The
 * task board controller consumes {@link ExecutionEvent}s to move the card
 * running → done/failed and to keep the execution record.
 *
 * Deliberately framework-free: the runtime faces are declared structurally
 * (a narrow slice of the real `ctx.sessions` / `ctx.workspaces` contracts)
 * so tests drive it with plain fakes.
 */
import type { ExecutionRecord, TaskModelSelection, TaskRecord } from './tasks.ts'

/** One list-row summary the execution service reads (the narrow slice of a SessionSummary). */
export interface ExecutionSessionSummary {
  running: boolean
  completed?: boolean
  /** Empty-log bit: the preset can only be recomposed while the session is blank. */
  blank?: boolean
  /** The preset the session currently runs (absent on deployments without presets). */
  agentPreset?: string
}

/** The narrow sessions face the service needs. */
export interface SessionsExecutionFace {
  list: {
    getSnapshot(): {
      /** Baseline arrival lifecycle — 'pending' until the host list has loaded. */
      phase: 'pending' | 'ready'
      byId: Record<string, ExecutionSessionSummary>
    }
    subscribe(fn: () => void): () => void
  }
  binding(id: string): { session: SessionDriver } | undefined
  /** Create a dedicated blank session for a task with a pinned model. */
  create(options: { workspaceId: string }): Promise<string>
  /** Record a host-confirmed preset switch so the list label moves immediately. */
  noteAgentPreset?(sessionId: string, agentPreset: string): void
}/** The narrow agent-preset wire face the service needs (`agentPreset.select`). */
export interface PresetsExecutionFace {
  /** Recompose a blank session's agent from a preset. */
  select(sessionId: string, agentPreset: string): Promise<{ ok: true } | { ok: false; error: unknown }>
}

/** The session model-selection wire face used by pinned task executions. */
export interface ModelsExecutionFace {
  /** Select the complete provider/model/effort tuple for one session. */
  select(sessionId: string, selection: TaskModelSelection): Promise<{ ok: true } | { ok: false; error: unknown }>
}

/** Request payload for starting one host-side Codex child turn. */
export interface CodexStartRequest {
  /** Absolute directory the run executes in. */
  cwd: string
  /** The task prompt (delivered through the protocol, never argv). */
  prompt: string
  /** Owning board task id (the thread binding key). */
  taskId?: string
  /** Resume this persisted thread instead of starting a fresh one. */
  resumeThreadId?: string
  /** Codex model slug; absent uses the machine's Codex default. */
  model?: string
  /** Codex reasoning effort; absent uses the machine's Codex default. */
  effort?: string
  /** Sandbox mode (the board's permission presets map 1:1). */
  sandbox?: 'read-only' | 'workspace-write' | 'danger-full-access'
}

/** One normalized live-activity line of a hosted run. */
export interface CodexActivityLine {
  at: number
  kind: 'command' | 'fileChange' | 'mcpToolCall' | 'plan' | 'webSearch' | 'warning' | 'info'
  text: string
}

/** Live snapshot of one hosted Codex run for the detail view. */
export interface CodexRunSnapshot {
  running: boolean
  activity?: readonly CodexActivityLine[]
  liveAnswer?: string
}

/** One user/assistant message projected from a persisted Codex turn. */
export interface CodexConversationMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  phase?: 'commentary' | 'final_answer'
}

/** One safe activity summary projected from a Codex tool item. */
export interface CodexConversationActivity {
  id: string
  kind: CodexActivityLine['kind']
  text: string
}

/** One persisted Codex turn, suitable for the task-board chat surface. */
export interface CodexConversationTurn {
  id: string
  status: string
  messages: readonly CodexConversationMessage[]
  activity: readonly CodexConversationActivity[]
  error?: string
}

/** Complete persisted Codex thread history. */
export interface CodexConversation {
  threadId: string
  turns: readonly CodexConversationTurn[]
}

export type CodexConversationResult =
  | { ok: true; conversation: CodexConversation }
  | { ok: false; error: string }

/** One status probe result for a hosted Codex run. */
export type CodexStatusResult =
  | { ok: true; state: 'running'; threadId?: string; activity?: readonly CodexActivityLine[]; liveAnswer?: string }
  | {
    ok: true
    state: 'succeeded'
    threadId?: string
    lastMessage?: string
    outputTail?: string
    activity?: readonly CodexActivityLine[]
    usage?: Record<string, unknown>
  }
  | { ok: true; state: 'interrupted'; threadId?: string; outputTail?: string }
  | { ok: true; state: 'failed'; error?: string; outputTail?: string; activity?: readonly CodexActivityLine[] }
  | { ok: false; error: unknown }

/** The narrow host-route face that starts, tracks, steers, and cancels runs. */
export interface CodexExecutionFace {
  start(request: CodexStartRequest): Promise<
    { ok: true; runId: string; threadId?: string } | { ok: false; error: unknown }
  >
  status(runId: string): Promise<CodexStatusResult>
  /** Read a task-owned persisted thread without resuming it. */
  readConversation(taskId: string, threadId: string): Promise<CodexConversationResult>
  /** Steer the active turn with additional user input. */
  steer(runId: string, content: string): Promise<{ ok: boolean; error?: string }>
  /** Best-effort interrupt of a running turn (grace before force-kill). */
  cancel(runId: string): Promise<void>
}

/** Request payload for materializing (or reusing) one git worktree. */
export interface WorktreeEnsureRequest {
  /** Absolute directory inside the source repository. */
  repoPath: string
  /** Branch to check out (created when missing). */
  branch: string
  /** Human title used for auto-naming when branch is blank. */
  title?: string
}

/** The narrow host-route face that creates/removes git worktrees. */
export interface WorktreeExecutionFace {
  ensure(
    request: WorktreeEnsureRequest,
  ): Promise<{ ok: true; path: string; branch: string; created: boolean } | { ok: false; error: unknown }>
  remove(request: { path: string; force?: boolean }): Promise<{ ok: true } | { ok: false; error: unknown }>
}

/** Settled result of one agent-preset switch, shared by concurrent waiters. */
type PresetSelectResult = { ok: true } | { ok: false; error: unknown }

/** The narrow workspaces face the service needs. */
export interface WorkspacesExecutionFace {
  list: {
    getSnapshot(): {
      items: readonly { workspaceId: string; path?: string }[]
      recentWorkspaceId: string | undefined
    }
  }
  connectWorkspace(workspaceId: string): Promise<string>
}

/** One raw session-history event narrowed to the failure signal reconcile needs. */
export interface ExecutionHistoryEvent {
  type: string
  data?: unknown
}

/** Optional raw-history face used to detect failures of never-opened sessions. */
export interface HistoryExecutionFace {
  loadTail(sessionId: string): Promise<{ events: readonly ExecutionHistoryEvent[] } | undefined>
}

/** The behavior verbs the service invokes on an execution session. */
export interface SessionDriver {
  rename(title: string): Promise<unknown>
  prompt(
    content: readonly unknown[],
    mode: 'queue',
  ): Promise<{ ok: true } | { ok: false; error: unknown }>
  /**
   * Admit one slash-command line against the session's agent (the
   * `/permission <id>` mechanism). `matched` reports whether a command
   * claimed the line.
   */
  command(line: string): Promise<{ ok: true; matched: boolean } | { ok: false; error: unknown }>
  getSnapshot(): { running: boolean; lastAgentError: string | null; turnEnds: ReadonlyMap<number, number> }
  subscribe(fn: () => void): () => void
}

/** Everything the service needs from the runtime. */
export interface ExecutionEnvironment {
  sessions: SessionsExecutionFace
  workspaces: WorkspacesExecutionFace
  /** Agent-preset wire face; absent on deployments without preset support. */
  presets?: PresetsExecutionFace
  /** Model-selection wire face; absent on older deployments. */
  models?: ModelsExecutionFace
  /** Raw-history reader for failure detection of never-opened sessions. */
  history?: HistoryExecutionFace
  /** Host-route face for Codex CLI executions; absent disables the codex executor. */
  codex?: CodexExecutionFace
  /** Host-route face for git-worktree materialization; absent disables worktrees. */
  worktrees?: WorktreeExecutionFace
  /**
   * Register an absolute directory as a DSH workspace (sidebar entry); used
   * to adopt materialized worktrees. Registration is idempotent per path.
   */
  registerWorkspace?: (path: string, title: string) => Promise<string | undefined>
  /** Poll interval (ms) for hosted-run status probes; defaults to 2000. */
  pollIntervalMs?: number
}

/** Outcome events the service emits to the controller. */
export type ExecutionEvent =
  | {
    kind: 'started'
    taskId: string
    executionId: string
    /** The dsh session running this attempt (absent for Codex runs). */
    sessionId?: string
    /** Which runner owns this attempt. */
    runner?: 'dsh' | 'codex'
    /** Host-side run id of a Codex execution. */
    runId?: string
    /** Persistent Codex thread id (follow-ups resume it). */
    threadId?: string
  }
  | {
    kind: 'worktree-ready'
    taskId: string
    executionId: string
    path: string
    branch: string
    /** Workspace id the directory was registered as, when known. */
    workspaceId?: string
  }
  | { kind: 'settled'; taskId: string; executionId: string; outcome: 'succeeded' | 'failed' | 'cancelled'; error?: string; outputTail?: string }

/**
 * The resolved place a task runs in: an absolute directory (always, because
 * Codex needs one) plus the workspace id to open a session in (when the run
 * goes through the DSH session machinery).
 */
interface ResolvedRunTarget {
  cwd: string
  workspaceId?: string
}

/** Human copy for a run failure. */
function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

/** Collapse an arbitrary rejection into a short single-line label. */
function trimError(error: unknown): string {
  const text = messageOf(error).replace(/\s+/g, ' ').trim()
  if (text === '') return 'unknown error'
  return text.length > 300 ? `${text.slice(0, 300)}…` : text
}

/** Keep a bounded tail of run output for the ledger (empty collapses to undefined). */
function tailText(text: string | undefined): string | undefined {
  const trimmed = text?.replace(/\n+$/, '')
  if (trimmed === undefined || trimmed === '') return undefined
  return trimmed.length > 4000 ? `…${trimmed.slice(-4000)}` : trimmed
}

/** The thread id of the task's latest Codex execution (continuation target). */
function latestCodexThreadId(task: TaskRecord): string | undefined {
  for (let index = task.executions.length - 1; index >= 0; index -= 1) {
    const execution = task.executions[index]
    if (execution.runner === 'codex' && execution.threadId !== undefined) return execution.threadId
  }
  return undefined
}

/**
 * Whether a rejected preset switch actually means "the session already runs
 * this preset" (the host's agent-preset-conflict with a matching
 * existingPreset). A blank-session reuse race can produce this even though
 * the requested composition is in place.
 */
function presetAlreadyRuns(error: unknown, mode: string): boolean {
  if (typeof error !== 'object' || error === null) return false
  const details = (error as { details?: unknown }).details
  if (typeof details !== 'object' || details === null) return false
  return (details as { existingPreset?: unknown }).existingPreset === mode
}

/** Whether a `turn/end` payload closed the turn with an error reason. */
function isErrorTurnEnd(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) return false
  const reason = (data as { reason?: unknown }).reason
  return typeof reason === 'object' && reason !== null
    && (reason as { kind?: unknown }).kind === 'error'
}

/**
 * Run one task to completion (or to a settled failure).
 *
 * @param task - the task being executed.
 * @param execution - the freshly opened execution record (id + start time).
 * @param onEvent - callback for started/settled events.
 * @returns resolves when the run settles (or fails to start); never rejects —
 *   every failure path is reported as a settled event.
 */
export class ExecutionService {
  /**
   * In-flight preset switches keyed by `sessionId\u0000mode`. The session
   * list mirror can lag behind a just-applied switch, so concurrent runs
   * against one blank session would otherwise each issue the same select
   * RPC (an amplified storm); sharing one in-flight call keeps the wire to
   * a single request. The settled entry is forgotten so a later run can
   * switch again.
   */
  private readonly presetSwitches = new Map<string, Promise<PresetSelectResult>>()

  /** Execution ids opened as Codex follow-ups (they resume the thread). */
  private readonly followUpExecutions = new Set<string>()

  /** @param env - the runtime faces (real or fake). */
  constructor(private readonly env: ExecutionEnvironment) {}

  async run(
    task: TaskRecord,
    execution: ExecutionRecord,
    onEvent: (event: ExecutionEvent) => void,
  ): Promise<void> {
    const settleFailed = (error: string): void => {
      onEvent({ kind: 'settled', taskId: task.id, executionId: execution.id, outcome: 'failed', error })
    }
    try {
      // The Codex executor bypasses the session machinery entirely: the task
      // prompt runs as one host-side `codex exec` process in the resolved
      // directory (a materialized worktree when the task asks for one).
      if (task.executor === 'codex') {
        await this.runViaCodex(task, execution, onEvent)
        return
      }
      // A worktree-pinned task runs in its materialized worktree workspace —
      // prepared and registered up front, exactly like for Codex runs.
      let runWorkspaceId = task.workspaceId
      if (task.worktree !== undefined) {
        const target = await this.resolveRunTarget(task, execution, onEvent, settleFailed)
        if (target === undefined) return
        if (target.workspaceId === undefined) {
          settleFailed('the git worktree could not be registered as a workspace')
          return
        }
        runWorkspaceId = target.workspaceId
      }
      // A model-pinned task gets a dedicated blank session. This prevents a
      // reused blank session (or a concurrent task) from racing its model
      // selection before the prompt is accepted.
      const sessionId = await this.connectSession(runWorkspaceId, task.modelSelection !== undefined, runWorkspaceId !== task.workspaceId)
      onEvent({ kind: 'started', taskId: task.id, executionId: execution.id, sessionId, runner: 'dsh' })
      const driver = this.driverOf(sessionId)
      if (driver === undefined) {
        settleFailed('execution session is not ready')
        return
      }
      // Task-pinned execution targets are applied BEFORE any prompt: a preset
      // can only be recomposed while the session is blank, and the permission
      // command must run before the task's turn starts. A rejected target
      // fails the run without sending the prompt — running the task under
      // different settings than it declared would be worse than not running.
      if (!await this.applyMode(driver, task, sessionId, settleFailed)) return
      if (!await this.applyModel(task, sessionId, settleFailed)) return
      if (!await this.applyPermission(driver, task, settleFailed)) return
      // Best-effort rename so the execution is recognizable in the session list.
      await driver.rename(task.title).catch(() => { /* rename is cosmetic */ })
      // Baseline the turn counter BEFORE the prompt round-trip: a turn that
      // completes while prompt is in flight must still advance past this
      // baseline, or the watch below would never observe it settle.
      const baseline = driver.getSnapshot().turnEnds.size
      const accepted = await this.sendPrompt(driver, task)
      if (!accepted.ok) {
        settleFailed(messageOf(accepted.error))
        return
      }
      this.watchForSettlement(driver, task.id, execution.id, onEvent, baseline)
    } catch (error) {
      settleFailed(messageOf(error))
    }
  }

  /**
   * Execute one task through a host-side Codex App Server child: resolve the
   * run directory (materializing the pinned git worktree first), start or
   * RESUME the task's persistent thread, then poll its status until it
   * settles. Never rejects.
   */
  private async runViaCodex(
    task: TaskRecord,
    execution: ExecutionRecord,
    onEvent: (event: ExecutionEvent) => void,
    followUp?: string,
  ): Promise<void> {
    const settleFailed = (error: string): void => {
      onEvent({ kind: 'settled', taskId: task.id, executionId: execution.id, outcome: 'failed', error })
    }
    const codex = this.env.codex
    if (codex === undefined) {
      settleFailed('this deployment does not support the Codex executor')
      return
    }
    const target = await this.resolveRunTarget(task, execution, onEvent, settleFailed)
    if (target === undefined) return
    // Continuation: a follow-up resumes the task's persisted thread;
    // everything else starts a fresh one. The host validates the binding
    // fail-closed before resuming.
    const previousThread = latestCodexThreadId(task)
    const isFollowUp = this.followUpExecutions.has(execution.id)
    const resumeThreadId = isFollowUp ? previousThread : undefined
    if (isFollowUp && previousThread === undefined) {
      settleFailed('this task has no persisted Codex thread to continue')
      return
    }
    const started = await codex.start({
      cwd: target.cwd,
      prompt: followUp ?? (task.prompt.trim() !== '' ? task.prompt : task.title),
      taskId: task.id,
      ...(resumeThreadId === undefined ? {} : { resumeThreadId }),
      ...(task.codexModel === undefined ? {} : { model: task.codexModel }),
      ...(task.codexEffort === undefined ? {} : { effort: task.codexEffort }),
      // The board's permission presets map 1:1 onto codex sandbox modes;
      // absent leaves the machine's configured default policy in charge.
      ...(task.permission === undefined ? {} : { sandbox: task.permission }),
    })
    if (!started.ok) {
      settleFailed(`codex could not be started: ${messageOf(started.error)}`)
      return
    }
    onEvent({
      kind: 'started', taskId: task.id, executionId: execution.id,
      runner: 'codex', runId: started.runId,
      ...(started.threadId === undefined ? {} : { threadId: started.threadId }),
    })
    await this.pollCodexRun(codex, task.id, execution.id, started.runId, onEvent)
  }

  /**
   * Resolve the place a task runs in. With a worktree spec the base
   * workspace hosts `git worktree add` (idempotent per branch), the
   * directory is registered as a workspace, and a worktree-ready event lets
   * the controller persist the adopted spec.
   */
  private async resolveRunTarget(
    task: TaskRecord,
    execution: ExecutionRecord,
    onEvent: (event: ExecutionEvent) => void,
    settleFailed: (error: string) => void,
  ): Promise<ResolvedRunTarget | undefined> {
    const list = this.env.workspaces.list.getSnapshot()
    const pathOf = (workspaceId: string | undefined): string | undefined =>
      workspaceId === undefined ? undefined : list.items.find(item => item.workspaceId === workspaceId)?.path
    const basePath = pathOf(task.workspaceId)
      ?? pathOf(list.recentWorkspaceId)
      // Last resort: any workspace that carries a usable absolute path.
      ?? list.items.find(item => typeof item.path === 'string' && item.path !== '')?.path
    if (basePath === undefined || basePath === '') {
      settleFailed('no workspace with a known path is available to run the task in')
      return undefined
    }
    const spec = task.worktree
    if (spec === undefined) return { cwd: basePath }
    const worktrees = this.env.worktrees
    if (worktrees === undefined) {
      settleFailed('this deployment does not support git worktrees')
      return undefined
    }
    try {
      const ensured = await worktrees.ensure({ repoPath: basePath, branch: spec.branch, title: task.title })
      if (!ensured.ok) {
        settleFailed(`git worktree could not be prepared (${spec.branch}): ${messageOf(ensured.error)}`)
        return undefined
      }
      // Registering makes the worktree a real sidebar workspace; it is also
      // what a DSH-session run needs to open its session inside the tree.
      let workspaceId: string | undefined
      if (this.env.registerWorkspace !== undefined) {
        try {
          workspaceId = await this.env.registerWorkspace(ensured.path, task.title)
        } catch (error) {
          console.error('[dsh-task-board] worktree workspace registration failed', error)
        }
      }
      onEvent({
        kind: 'worktree-ready', taskId: task.id, executionId: execution.id,
        path: ensured.path, branch: ensured.branch,
        ...(workspaceId === undefined ? {} : { workspaceId }),
      })
      return { cwd: ensured.path, workspaceId }
    } catch (error) {
      settleFailed(`git worktree preparation failed (${spec.branch}): ${messageOf(error)}`)
      return undefined
    }
  }

  /**
   * Poll one hosted Codex run until it settles, then emit the matching
   * settled event. Transient status errors (a reconnect mid-run, say) are
   * retried; an authoritative unknown-run answer settles as failed.
   */
  private async pollCodexRun(
    codex: CodexExecutionFace,
    taskId: string,
    executionId: string,
    runId: string,
    onEvent: (event: ExecutionEvent) => void,
  ): Promise<void> {
    const intervalMs = this.env.pollIntervalMs ?? 2000
    for (;;) {
      await new Promise(resolve => setTimeout(resolve, intervalMs))
      let status: CodexStatusResult
      try {
        status = await codex.status(runId)
      } catch {
        continue // transport hiccup — keep polling; the run lives server-side
      }
      if (!status.ok) {
        onEvent({
          kind: 'settled', taskId, executionId, outcome: 'failed',
          error: `codex run is no longer tracked (${trimError(status.error)})`,
        })
        return
      }
      if (status.state === 'running') continue
      if (status.state === 'succeeded') {
        onEvent({
          kind: 'settled', taskId, executionId, outcome: 'succeeded',
          outputTail: tailText(status.lastMessage ?? status.outputTail),
        })
        return
      }
      if (status.state === 'interrupted') {
        onEvent({
          kind: 'settled', taskId, executionId, outcome: 'cancelled',
          outputTail: tailText(status.outputTail),
        })
        return
      }
      onEvent({
        kind: 'settled', taskId, executionId, outcome: 'failed',
        error: status.error ?? trimError(status.outputTail) ?? 'codex run failed',
        outputTail: tailText(status.outputTail ?? status.error),
      })
      return
    }
  }

  /**
   * Send one follow-up prompt to a task's persisted Codex thread: opens a
   * NEW execution record on the board while resuming the SAME conversation
   * server-side (initialize → thread/resume → turn/start). The caller
   * creates the execution record exactly like for run().
   */
  async runCodexFollowUp(
    task: TaskRecord,
    execution: ExecutionRecord,
    content: string,
    onEvent: (event: ExecutionEvent) => void,
  ): Promise<void> {
    this.followUpExecutions.add(execution.id)
    try {
      await this.runViaCodex(task, execution, onEvent, content)
    } finally {
      this.followUpExecutions.delete(execution.id)
    }
  }

  /** Whether a follow-up can be sent: the latest Codex execution owns a thread. */
  canFollowUp(task: TaskRecord): boolean {
    return task.executor === 'codex' && latestCodexThreadId(task) !== undefined
  }

  /** Read the latest Codex thread for a task without changing its state. */
  async readCodexConversation(task: TaskRecord): Promise<CodexConversationResult> {
    const threadId = latestCodexThreadId(task)
    if (threadId === undefined) return { ok: false, error: 'this task has no persisted Codex thread' }
    const codex = this.env.codex
    if (codex === undefined) return { ok: false, error: 'codex executor unavailable' }
    try {
      return await codex.readConversation(task.id, threadId)
    } catch (error) {
      return { ok: false, error: messageOf(error) }
    }
  }

  /**
   * One live snapshot of the latest hosted run (activity + streaming answer)
   * for the detail view's progress display. Undefined when nothing is
   * pollable; settled runs report their stored tail instead.
   */
  async peekCodexRun(task: TaskRecord): Promise<CodexRunSnapshot | undefined> {
    const execution = task.executions[task.executions.length - 1]
    if (execution?.runner !== 'codex') return undefined
    const settled = execution.endedAt !== undefined
    if (!settled && execution.runId !== undefined) {
      try {
        const status = await this.env.codex?.status(execution.runId)
        if (status !== undefined && status.ok) {
          if (status.state === 'running') {
            return {
              running: true,
              activity: status.activity,
              liveAnswer: status.liveAnswer,
            }
          }
          // Settled server-side but not yet persisted by the poll loop.
          return { running: false }
        }
      } catch {
        return undefined // transient transport problem
      }
      return undefined
    }
    if (settled) {
      return {
        running: false,
        activity: undefined,
        liveAnswer: execution.outputTail,
      }
    }
    return undefined
  }

  /** Steer the latest running hosted Codex execution with additional input. */
  async steerCodexRun(
    task: TaskRecord,
    content: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const execution = task.executions[task.executions.length - 1]
    if (execution?.runner !== 'codex' || execution.runId === undefined || execution.endedAt !== undefined) {
      return { ok: false, error: 'no active codex run to steer' }
    }
    const codex = this.env.codex
    if (codex === undefined) return { ok: false, error: 'codex executor unavailable' }
    return codex.steer(execution.runId, content)
  }

  /**
   * Best-effort cancel of the latest hosted Codex execution of a task.
   * @returns true when a cancellation request was delivered.
   */
  async cancelCodexRun(task: TaskRecord): Promise<boolean> {
    const execution = task.executions[task.executions.length - 1]
    if (execution?.runner !== 'codex' || execution.runId === undefined || execution.endedAt !== undefined) return false
    const codex = this.env.codex
    if (codex === undefined) return false
    try {
      await codex.cancel(execution.runId)
      return true
    } catch {
      return false
    }
  }

  /**
   * Materialize a task's git worktree without running the task (the detail
   * view's prepare action). The callback lets the caller register + persist
   * the resulting directory immediately.
   */
  async prepareWorktree(
    task: TaskRecord,
    onReady: (event: { path: string; branch: string; workspaceId?: string }) => void,
  ): Promise<{ ok: true; path: string; branch: string } | { ok: false; error: string }> {
    if (task.worktree === undefined) return { ok: false, error: 'the task has no worktree configured' }
    const list = this.env.workspaces.list.getSnapshot()
    const pathOf = (workspaceId: string | undefined): string | undefined =>
      workspaceId === undefined ? undefined : list.items.find(item => item.workspaceId === workspaceId)?.path
    const basePath = pathOf(task.workspaceId)
      ?? pathOf(list.recentWorkspaceId)
      ?? list.items.find(item => typeof item.path === 'string' && item.path !== '')?.path
    if (basePath === undefined || basePath === '') {
      return { ok: false, error: 'no workspace with a known path is available' }
    }
    const worktrees = this.env.worktrees
    if (worktrees === undefined) return { ok: false, error: 'this deployment does not support git worktrees' }
    try {
      const ensured = await worktrees.ensure({
        repoPath: basePath,
        branch: task.worktree.branch,
        title: task.title,
      })
      if (!ensured.ok) return { ok: false, error: messageOf(ensured.error) }
      let workspaceId: string | undefined
      if (this.env.registerWorkspace !== undefined) {
        try {
          workspaceId = await this.env.registerWorkspace(ensured.path, task.title)
        } catch (error) {
          console.error('[dsh-task-board] worktree workspace registration failed', error)
        }
      }
      onReady({ path: ensured.path, branch: ensured.branch, workspaceId })
      return { ok: true, path: ensured.path, branch: ensured.branch }
    } catch (error) {
      return { ok: false, error: messageOf(error) }
    }
  }

  /** Remove one git worktree directory (`git worktree remove`). */
  async removeWorktree(
    path: string,
    force = false,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const worktrees = this.env.worktrees
    if (worktrees === undefined) return { ok: false, error: 'this deployment does not support git worktrees' }
    try {
      const removed = await worktrees.remove({ path, ...(force ? { force: true } : {}) })
      return removed.ok ? { ok: true } : { ok: false, error: messageOf(removed.error) }
    } catch (error) {
      return { ok: false, error: messageOf(error) }
    }
  }

  /**
   * Recompose the execution session's agent from the task-pinned preset.
   * No-op when the task pins none or the session already runs it; fails the
   * run when the session is no longer blank, the preset face is missing, or
   * the wire refuses.
   */
  private async applyMode(
    driver: SessionDriver,
    task: TaskRecord,
    sessionId: string,
    settleFailed: (error: string) => void,
  ): Promise<boolean> {
    const mode = task.mode
    if (mode === undefined || mode === '') return true
    const summary = this.env.sessions.list.getSnapshot().byId[sessionId]
    if (summary?.blank === false) {
      settleFailed(`cannot switch agent preset to ${mode}: the execution session is not blank`)
      return false
    }
    // Fast path: the list mirror already reports the pinned preset. The
    // mirror can lag a just-applied switch, though, so this guard alone is
    // not enough under concurrent runs — `switchPreset` below dedupes the
    // wire call for the lag window.
    if (summary?.agentPreset === mode) return true
    const presets = this.env.presets
    if (presets === undefined) {
      settleFailed(`this deployment does not support agent presets (task asks for ${mode})`)
      return false
    }
    try {
      const result = await this.switchPreset(presets, sessionId, mode)
      if (!result.ok) {
        // A list race can leave the summary without the preset label even
        // though the blank session already runs it; the wire answers that
        // case with agent-preset-conflict (existingPreset === requested).
        // The requested composition is already in place, so count it as
        // applied instead of failing the run.
        if (presetAlreadyRuns(result.error, mode)) {
          this.env.sessions.noteAgentPreset?.(sessionId, mode)
          return true
        }
        settleFailed(`agent preset switch to ${mode} rejected: ${messageOf(result.error)}`)
        return false
      }
    } catch (error) {
      settleFailed(`agent preset switch to ${mode} failed: ${messageOf(error)}`)
      return false
    }
    this.env.sessions.noteAgentPreset?.(sessionId, mode)
    return true
  }

  /**
   * One in-flight `select` per (session, preset): concurrent runs against
   * the same blank session share the same wire call instead of each issuing
   * a duplicate RPC. The entry is removed once the call settles, so a later
   * run (after a shared failure, say) issues a fresh switch.
   */
  private switchPreset(
    presets: PresetsExecutionFace,
    sessionId: string,
    mode: string,
  ): Promise<PresetSelectResult> {
    const key = `${sessionId}\u0000${mode}`
    const inflight = this.presetSwitches.get(key)
    if (inflight !== undefined) return inflight
    const attempt = presets.select(sessionId, mode).finally(() => {
      if (this.presetSwitches.get(key) === attempt) this.presetSwitches.delete(key)
    })
    this.presetSwitches.set(key, attempt)
    return attempt
  }

  /**
   * Select the task-pinned model and effort before the first prompt. The
   * current DSH API also updates the deployment default when this succeeds;
   * the dedicated session above prevents a reused blank session from racing.
   */
  private async applyModel(
    task: TaskRecord,
    sessionId: string,
    settleFailed: (error: string) => void,
  ): Promise<boolean> {
    const selection = task.modelSelection
    if (selection === undefined) return true
    const models = this.env.models
    if (models === undefined) {
      settleFailed(`this deployment does not support task model selection (${selection.provider}/${selection.model})`)
      return false
    }
    try {
      const result = await models.select(sessionId, selection)
      if (!result.ok) {
        settleFailed(`model selection rejected for ${selection.provider}/${selection.model}: ${messageOf(result.error)}`)
        return false
      }
    } catch (error) {
      settleFailed(`model selection failed for ${selection.provider}/${selection.model}: ${messageOf(error)}`)
      return false
    }
    return true
  }

  /**
   * Apply the task-pinned permission preset through the `/permission <id>`
   * slash command. No-op when the task pins none; fails the run when the
   * admission is rejected or no command claimed the line.
   */
  private async applyPermission(
    driver: SessionDriver,
    task: TaskRecord,
    settleFailed: (error: string) => void,
  ): Promise<boolean> {
    const permission = task.permission
    if (permission === undefined) return true
    const line = `/permission ${permission}`
    try {
      const result = await driver.command(line)
      if (!result.ok) {
        settleFailed(`permission command rejected: ${messageOf(result.error)}`)
        return false
      }
      if (!result.matched) {
        settleFailed(`permission command not recognized: ${line}`)
        return false
      }
    } catch (error) {
      settleFailed(`permission command failed: ${messageOf(error)}`)
      return false
    }
    return true
  }

  /**
   * Inspect a reloaded/background task that was left 'running' and emit a
   * settled event when its session already finished.
   *
   * A session that was never opened keeps a cold conversation snapshot (the
   * runtime only maintains the window for the staged/current session), so the
   * settled outcome is decided by the strongest available signal, in order:
   * 1. the list summary — missing session → cancelled; still running → pending;
   * 2. a warm conversation snapshot → `lastAgentError` decides failed/succeeded;
   * 3. the raw history tail (when a history face is wired) — a `turn/end`
   *    error reason proves failure;
   * 4. otherwise a finished session counts as succeeded.
   *
   * @param task - a task whose latest execution has no endedAt.
   * @returns a settled event when the session state proves completion, else undefined.
   */
  async reconcile(task: TaskRecord): Promise<ExecutionEvent | undefined> {
    const execution = task.executions[task.executions.length - 1]
    if (execution === undefined || execution.endedAt !== undefined) return undefined
    // Hosted Codex runs settle through the host route, not the session list.
    if (execution.runner === 'codex') return this.reconcileCodex(task, execution)
    if (execution.sessionId === undefined) return undefined
    const list = this.env.sessions.list.getSnapshot()
    // The host list baseline has not arrived yet (page load): a session "not
    // found" now would be a false cancel. Wait for a later list change.
    if (list.phase !== 'ready') return undefined
    const summary = list.byId[execution.sessionId]
    if (summary === undefined) {
      return { kind: 'settled', taskId: task.id, executionId: execution.id, outcome: 'cancelled', error: 'execution session no longer exists' }
    }
    if (summary.running) return undefined
    const driver = this.driverOf(execution.sessionId)
    if (driver !== undefined) {
      const snapshot = driver.getSnapshot()
      if (snapshot.turnEnds.size > 0) {
        const outcome = snapshot.lastAgentError !== null ? 'failed' : 'succeeded'
        return {
          kind: 'settled', taskId: task.id, executionId: execution.id, outcome,
          error: snapshot.lastAgentError ?? undefined,
        }
      }
    }
    const failed = await this.historyShowsFailure(execution.sessionId)
    if (failed) {
      return { kind: 'settled', taskId: task.id, executionId: execution.id, outcome: 'failed', error: 'agent turn failed' }
    }
    return { kind: 'settled', taskId: task.id, executionId: execution.id, outcome: 'succeeded' }
  }

  /**
   * Settle a backgrounded Codex execution through one status probe. A
   * transport failure stays silent (the next reconcile retries); an
   * authoritative unknown-run answer settles as cancelled — the run's state
   * died with the previous dsh process.
   */
  private async reconcileCodex(
    task: TaskRecord,
    execution: ExecutionRecord,
  ): Promise<ExecutionEvent | undefined> {
    const codex = this.env.codex
    if (codex === undefined || execution.runId === undefined) {
      return {
        kind: 'settled', taskId: task.id, executionId: execution.id,
        outcome: 'cancelled', error: 'the codex run can no longer be tracked',
      }
    }
    let status: CodexStatusResult
    try {
      status = await codex.status(execution.runId)
    } catch {
      return undefined // transient transport problem; a later tick retries
    }
    if (!status.ok) {
      return {
        kind: 'settled', taskId: task.id, executionId: execution.id, outcome: 'cancelled',
        error: 'the codex run is no longer tracked (host restarted?)',
      }
    }
    if (status.state === 'running') return undefined
    if (status.state === 'succeeded') {
      return {
        kind: 'settled', taskId: task.id, executionId: execution.id, outcome: 'succeeded',
        outputTail: tailText(status.lastMessage ?? status.outputTail),
      }
    }
    if (status.state === 'interrupted') {
      return {
        kind: 'settled', taskId: task.id, executionId: execution.id, outcome: 'cancelled',
        outputTail: tailText(status.outputTail),
      }
    }
    return {
      kind: 'settled', taskId: task.id, executionId: execution.id, outcome: 'failed',
      error: status.error ?? trimError(status.outputTail) ?? 'codex run failed',
      outputTail: tailText(status.outputTail ?? status.error),
    }
  }

  /** Best-effort failure probe over the raw history tail (false when unavailable). */
  private async historyShowsFailure(sessionId: string): Promise<boolean> {
    const history = this.env.history
    if (history === undefined) return false
    try {
      const tail = await history.loadTail(sessionId)
      if (tail === undefined) return false
      return tail.events.some(event => event.type === 'turn/end' && isErrorTurnEnd(event.data))
    } catch (error) {
      // A failed history read must not block settlement; fall back to success.
      console.error('[dsh-task-board] history failure probe failed', error)
      return false
    }
  }

  private async connectSession(
    taskWorkspaceId: string | undefined,
    dedicated: boolean,
    freshlyRegistered = false,
  ): Promise<string> {
    const workspace = this.env.workspaces.list.getSnapshot()
    if (taskWorkspaceId !== undefined && taskWorkspaceId !== '') {
      // A task-pinned workspace must exist in the list: connecting an
      // unknown id would only defer the failure into the wire. A worktree
      // workspace registered moments ago is trusted without the mirror
      // check — its upsert can still be in flight.
      if (!freshlyRegistered
        && !workspace.items.some(item => item.workspaceId === taskWorkspaceId)) {
        throw new Error(`task workspace is not available: ${taskWorkspaceId}`)
      }
      return dedicated
        ? this.env.sessions.create({ workspaceId: taskWorkspaceId })
        : this.env.workspaces.connectWorkspace(taskWorkspaceId)
    }
    const workspaceId = workspace.recentWorkspaceId ?? workspace.items[0]?.workspaceId
    if (workspaceId === undefined) {
      throw new Error('no workspace available to run the task in')
    }
    return dedicated
      ? this.env.sessions.create({ workspaceId })
      : this.env.workspaces.connectWorkspace(workspaceId)
  }

  private driverOf(sessionId: string): SessionDriver | undefined {
    return this.env.sessions.binding(sessionId)?.session
  }

  private async sendPrompt(
    driver: SessionDriver,
    task: TaskRecord,
  ): Promise<{ ok: true } | { ok: false; error: unknown }> {
    const text = task.prompt.trim() !== '' ? task.prompt : task.title
    try {
      const result = await driver.prompt([{ type: 'text', text }], 'queue')
      return result
    } catch (error) {
      return { ok: false, error }
    }
  }

  /**
   * Subscribe to the execution session and settle the run once the accepted
   * turn completes (turn counter advanced past the acceptance baseline and
   * the session is no longer running). Never settles while the session is
   * still running; unsubscribes on settle.
   */
  private watchForSettlement(
    driver: SessionDriver,
    taskId: string,
    executionId: string,
    onEvent: (event: ExecutionEvent) => void,
    baseline: number,
  ): void {
    let settled = false
    let unsubscribe: () => void = () => {}
    const check = (): void => {
      if (settled) return
      const snapshot = driver.getSnapshot()
      if (snapshot.running || snapshot.turnEnds.size <= baseline) return
      settled = true
      unsubscribe()
      onEvent({
        kind: 'settled', taskId, executionId,
        outcome: snapshot.lastAgentError !== null ? 'failed' : 'succeeded',
        error: snapshot.lastAgentError ?? undefined,
      })
    }
    unsubscribe = driver.subscribe(check)
    // A turn can complete during the prompt round-trip (before subscribe):
    // re-check immediately so a fast turn is never missed.
    check()
  }
}
