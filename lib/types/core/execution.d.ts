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
import type { ExecutionRecord, TaskModelSelection, TaskRecord } from './tasks.ts';
/** One list-row summary the execution service reads (the narrow slice of a SessionSummary). */
export interface ExecutionSessionSummary {
    running: boolean;
    completed?: boolean;
    /** Empty-log bit: the preset can only be recomposed while the session is blank. */
    blank?: boolean;
    /** The preset the session currently runs (absent on deployments without presets). */
    agentPreset?: string;
}
/** The narrow sessions face the service needs. */
export interface SessionsExecutionFace {
    list: {
        getSnapshot(): {
            /** Baseline arrival lifecycle — 'pending' until the host list has loaded. */
            phase: 'pending' | 'ready';
            byId: Record<string, ExecutionSessionSummary>;
        };
        subscribe(fn: () => void): () => void;
    };
    binding(id: string): {
        session: SessionDriver;
    } | undefined;
    /** Create a dedicated blank session for a task with a pinned model. */
    create(options: {
        workspaceId: string;
    }): Promise<string>;
    /** Record a host-confirmed preset switch so the list label moves immediately. */
    noteAgentPreset?(sessionId: string, agentPreset: string): void;
} /** The narrow agent-preset wire face the service needs (`agentPreset.select`). */
export interface PresetsExecutionFace {
    /** Recompose a blank session's agent from a preset. */
    select(sessionId: string, agentPreset: string): Promise<{
        ok: true;
    } | {
        ok: false;
        error: unknown;
    }>;
}
/** The session model-selection wire face used by pinned task executions. */
export interface ModelsExecutionFace {
    /** Select the complete provider/model/effort tuple for one session. */
    select(sessionId: string, selection: TaskModelSelection): Promise<{
        ok: true;
    } | {
        ok: false;
        error: unknown;
    }>;
}
/** Request payload for starting one host-side Codex child turn. */
export interface CodexStartRequest {
    /** Absolute directory the run executes in. */
    cwd: string;
    /** The task prompt (delivered through the protocol, never argv). */
    prompt: string;
    /** Owning board task id (the thread binding key). */
    taskId?: string;
    /** Resume this persisted thread instead of starting a fresh one. */
    resumeThreadId?: string;
    /** Codex model slug; absent uses the machine's Codex default. */
    model?: string;
    /** Codex reasoning effort; absent uses the machine's Codex default. */
    effort?: string;
    /** Sandbox mode (the board's permission presets map 1:1). */
    sandbox?: 'read-only' | 'workspace-write' | 'danger-full-access';
}
/** One normalized live-activity line of a hosted run. */
export interface CodexActivityLine {
    at: number;
    kind: 'command' | 'fileChange' | 'mcpToolCall' | 'plan' | 'webSearch' | 'warning' | 'info';
    text: string;
}
/** Live snapshot of one hosted Codex run for the detail view. */
export interface CodexRunSnapshot {
    running: boolean;
    activity?: readonly CodexActivityLine[];
    liveAnswer?: string;
}
/** One status probe result for a hosted Codex run. */
export type CodexStatusResult = {
    ok: true;
    state: 'running';
    threadId?: string;
    activity?: readonly CodexActivityLine[];
    liveAnswer?: string;
} | {
    ok: true;
    state: 'succeeded';
    threadId?: string;
    lastMessage?: string;
    outputTail?: string;
    activity?: readonly CodexActivityLine[];
    usage?: Record<string, unknown>;
} | {
    ok: true;
    state: 'interrupted';
    threadId?: string;
    outputTail?: string;
} | {
    ok: true;
    state: 'failed';
    error?: string;
    outputTail?: string;
    activity?: readonly CodexActivityLine[];
} | {
    ok: false;
    error: unknown;
};
/** The narrow host-route face that starts, tracks, steers, and cancels runs. */
export interface CodexExecutionFace {
    start(request: CodexStartRequest): Promise<{
        ok: true;
        runId: string;
        threadId?: string;
    } | {
        ok: false;
        error: unknown;
    }>;
    status(runId: string): Promise<CodexStatusResult>;
    /** Steer the active turn with additional user input. */
    steer(runId: string, content: string): Promise<{
        ok: boolean;
        error?: string;
    }>;
    /** Best-effort interrupt of a running turn (grace before force-kill). */
    cancel(runId: string): Promise<void>;
}
/** Request payload for materializing (or reusing) one git worktree. */
export interface WorktreeEnsureRequest {
    /** Absolute directory inside the source repository. */
    repoPath: string;
    /** Branch to check out (created when missing). */
    branch: string;
    /** Human title used for auto-naming when branch is blank. */
    title?: string;
}
/** The narrow host-route face that creates/removes git worktrees. */
export interface WorktreeExecutionFace {
    ensure(request: WorktreeEnsureRequest): Promise<{
        ok: true;
        path: string;
        branch: string;
        created: boolean;
    } | {
        ok: false;
        error: unknown;
    }>;
    remove(request: {
        path: string;
        force?: boolean;
    }): Promise<{
        ok: true;
    } | {
        ok: false;
        error: unknown;
    }>;
}
/** The narrow workspaces face the service needs. */
export interface WorkspacesExecutionFace {
    list: {
        getSnapshot(): {
            items: readonly {
                workspaceId: string;
                path?: string;
            }[];
            recentWorkspaceId: string | undefined;
        };
    };
    connectWorkspace(workspaceId: string): Promise<string>;
}
/** One raw session-history event narrowed to the failure signal reconcile needs. */
export interface ExecutionHistoryEvent {
    type: string;
    data?: unknown;
}
/** Optional raw-history face used to detect failures of never-opened sessions. */
export interface HistoryExecutionFace {
    loadTail(sessionId: string): Promise<{
        events: readonly ExecutionHistoryEvent[];
    } | undefined>;
}
/** The behavior verbs the service invokes on an execution session. */
export interface SessionDriver {
    rename(title: string): Promise<unknown>;
    prompt(content: readonly unknown[], mode: 'queue'): Promise<{
        ok: true;
    } | {
        ok: false;
        error: unknown;
    }>;
    /**
     * Admit one slash-command line against the session's agent (the
     * `/permission <id>` mechanism). `matched` reports whether a command
     * claimed the line.
     */
    command(line: string): Promise<{
        ok: true;
        matched: boolean;
    } | {
        ok: false;
        error: unknown;
    }>;
    getSnapshot(): {
        running: boolean;
        lastAgentError: string | null;
        turnEnds: ReadonlyMap<number, number>;
    };
    subscribe(fn: () => void): () => void;
}
/** Everything the service needs from the runtime. */
export interface ExecutionEnvironment {
    sessions: SessionsExecutionFace;
    workspaces: WorkspacesExecutionFace;
    /** Agent-preset wire face; absent on deployments without preset support. */
    presets?: PresetsExecutionFace;
    /** Model-selection wire face; absent on older deployments. */
    models?: ModelsExecutionFace;
    /** Raw-history reader for failure detection of never-opened sessions. */
    history?: HistoryExecutionFace;
    /** Host-route face for Codex CLI executions; absent disables the codex executor. */
    codex?: CodexExecutionFace;
    /** Host-route face for git-worktree materialization; absent disables worktrees. */
    worktrees?: WorktreeExecutionFace;
    /**
     * Register an absolute directory as a DSH workspace (sidebar entry); used
     * to adopt materialized worktrees. Registration is idempotent per path.
     */
    registerWorkspace?: (path: string, title: string) => Promise<string | undefined>;
    /** Poll interval (ms) for hosted-run status probes; defaults to 2000. */
    pollIntervalMs?: number;
}
/** Outcome events the service emits to the controller. */
export type ExecutionEvent = {
    kind: 'started';
    taskId: string;
    executionId: string;
    /** The dsh session running this attempt (absent for Codex runs). */
    sessionId?: string;
    /** Which runner owns this attempt. */
    runner?: 'dsh' | 'codex';
    /** Host-side run id of a Codex execution. */
    runId?: string;
    /** Persistent Codex thread id (follow-ups resume it). */
    threadId?: string;
} | {
    kind: 'worktree-ready';
    taskId: string;
    executionId: string;
    path: string;
    branch: string;
    /** Workspace id the directory was registered as, when known. */
    workspaceId?: string;
} | {
    kind: 'settled';
    taskId: string;
    executionId: string;
    outcome: 'succeeded' | 'failed' | 'cancelled';
    error?: string;
    outputTail?: string;
};
/**
 * Run one task to completion (or to a settled failure).
 *
 * @param task - the task being executed.
 * @param execution - the freshly opened execution record (id + start time).
 * @param onEvent - callback for started/settled events.
 * @returns resolves when the run settles (or fails to start); never rejects —
 *   every failure path is reported as a settled event.
 */
export declare class ExecutionService {
    private readonly env;
    /**
     * In-flight preset switches keyed by `sessionId\u0000mode`. The session
     * list mirror can lag behind a just-applied switch, so concurrent runs
     * against one blank session would otherwise each issue the same select
     * RPC (an amplified storm); sharing one in-flight call keeps the wire to
     * a single request. The settled entry is forgotten so a later run can
     * switch again.
     */
    private readonly presetSwitches;
    /** Execution ids opened as Codex follow-ups (they resume the thread). */
    private readonly followUpExecutions;
    /** @param env - the runtime faces (real or fake). */
    constructor(env: ExecutionEnvironment);
    run(task: TaskRecord, execution: ExecutionRecord, onEvent: (event: ExecutionEvent) => void): Promise<void>;
    /**
     * Execute one task through a host-side Codex App Server child: resolve the
     * run directory (materializing the pinned git worktree first), start or
     * RESUME the task's persistent thread, then poll its status until it
     * settles. Never rejects.
     */
    private runViaCodex;
    /**
     * Resolve the place a task runs in. With a worktree spec the base
     * workspace hosts `git worktree add` (idempotent per branch), the
     * directory is registered as a workspace, and a worktree-ready event lets
     * the controller persist the adopted spec.
     */
    private resolveRunTarget;
    /**
     * Poll one hosted Codex run until it settles, then emit the matching
     * settled event. Transient status errors (a reconnect mid-run, say) are
     * retried; an authoritative unknown-run answer settles as failed.
     */
    private pollCodexRun;
    /**
     * Send one follow-up prompt to a task's persisted Codex thread: opens a
     * NEW execution record on the board while resuming the SAME conversation
     * server-side (initialize → thread/resume → turn/start). The caller
     * creates the execution record exactly like for run().
     */
    runCodexFollowUp(task: TaskRecord, execution: ExecutionRecord, content: string, onEvent: (event: ExecutionEvent) => void): Promise<void>;
    /** Whether a follow-up can be sent: the latest Codex execution owns a thread. */
    canFollowUp(task: TaskRecord): boolean;
    /**
     * One live snapshot of the latest hosted run (activity + streaming answer)
     * for the detail view's progress display. Undefined when nothing is
     * pollable; settled runs report their stored tail instead.
     */
    peekCodexRun(task: TaskRecord): Promise<CodexRunSnapshot | undefined>;
    /** Steer the latest running hosted Codex execution with additional input. */
    steerCodexRun(task: TaskRecord, content: string): Promise<{
        ok: boolean;
        error?: string;
    }>;
    /**
     * Best-effort cancel of the latest hosted Codex execution of a task.
     * @returns true when a cancellation request was delivered.
     */
    cancelCodexRun(task: TaskRecord): Promise<boolean>;
    /**
     * Materialize a task's git worktree without running the task (the detail
     * view's prepare action). The callback lets the caller register + persist
     * the resulting directory immediately.
     */
    prepareWorktree(task: TaskRecord, onReady: (event: {
        path: string;
        branch: string;
        workspaceId?: string;
    }) => void): Promise<{
        ok: true;
        path: string;
        branch: string;
    } | {
        ok: false;
        error: string;
    }>;
    /** Remove one git worktree directory (`git worktree remove`). */
    removeWorktree(path: string, force?: boolean): Promise<{
        ok: true;
    } | {
        ok: false;
        error: string;
    }>;
    /**
     * Recompose the execution session's agent from the task-pinned preset.
     * No-op when the task pins none or the session already runs it; fails the
     * run when the session is no longer blank, the preset face is missing, or
     * the wire refuses.
     */
    private applyMode;
    /**
     * One in-flight `select` per (session, preset): concurrent runs against
     * the same blank session share the same wire call instead of each issuing
     * a duplicate RPC. The entry is removed once the call settles, so a later
     * run (after a shared failure, say) issues a fresh switch.
     */
    private switchPreset;
    /**
     * Select the task-pinned model and effort before the first prompt. The
     * current DSH API also updates the deployment default when this succeeds;
     * the dedicated session above prevents a reused blank session from racing.
     */
    private applyModel;
    /**
     * Apply the task-pinned permission preset through the `/permission <id>`
     * slash command. No-op when the task pins none; fails the run when the
     * admission is rejected or no command claimed the line.
     */
    private applyPermission;
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
    reconcile(task: TaskRecord): Promise<ExecutionEvent | undefined>;
    /**
     * Settle a backgrounded Codex execution through one status probe. A
     * transport failure stays silent (the next reconcile retries); an
     * authoritative unknown-run answer settles as cancelled — the run's state
     * died with the previous dsh process.
     */
    private reconcileCodex;
    /** Best-effort failure probe over the raw history tail (false when unavailable). */
    private historyShowsFailure;
    private connectSession;
    private driverOf;
    private sendPrompt;
    /**
     * Subscribe to the execution session and settle the run once the accepted
     * turn completes (turn counter advanced past the acceptance baseline and
     * the session is no longer running). Never settles while the session is
     * still running; unsubscribes on settle.
     */
    private watchForSettlement;
}
//# sourceMappingURL=execution.d.ts.map