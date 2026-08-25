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
import { ExecutionService, type CodexConversationResult, type CodexRunSnapshot } from './execution.ts';
import type { TaskStore } from './store.ts';
import { type NewTaskInput, type TaskRecord, type TaskStatus } from './tasks.ts';
import { type TaskUpdatePatch } from './use-cases/task-update.ts';
/** The sessions face the controller needs for navigation awareness. */
export interface SessionsControllerFace {
    list: {
        getSnapshot(): {
            current: string | undefined;
        };
        subscribe(fn: () => void): () => void;
    };
    /** Select a session as current (navigates the conversation view). */
    open(id: string): void;
}
/** Controller dependencies (all swappable in tests). */
export interface ControllerDeps {
    store: TaskStore;
    exec: ExecutionService;
    sessions: SessionsControllerFace;
    /**
     * Register an absolute directory as a DSH workspace (the sidebar entry a
     * materialized git worktree needs). Absent disables the registration step.
     */
    registerWorkspace?: (path: string, title: string) => Promise<string | undefined>;
    /** Delete a workspace registration (worktree removal cleanup). */
    deleteWorkspace?: (workspaceId: string) => Promise<void>;
    /**
     * Navigate the GUI to a workspace (connect its blank session and select it).
     * Backs the detail view's "open workspace" affordance for worktrees.
     */
    openWorkspace?: (workspaceId: string) => void;
    /** Clock; defaults to Date.now. */
    now?: () => number;
    /** Id minting; defaults to a random-uuid. */
    uuid?: () => string;
    /** Debounce (ms) for session-list-changed reconciles; defaults to 350. */
    reconcileDebounceMs?: number;
}
/** One workspace option the execution-target pickers offer. */
export interface ExecutionWorkspaceOption {
    workspaceId: string;
    /** Display label (workspace title; the wiring falls back to the path). */
    title: string;
    /** Absolute directory of the workspace (worktree creation base). */
    path?: string;
}
/** One agent-preset option the execution-target pickers offer. */
export interface ExecutionPresetOption {
    id: string;
    name?: string;
    description?: string;
    /** Why this preset cannot compose a session; the pickers disable it. */
    broken?: string;
    isDefault: boolean;
}
/** One effort option advertised for an exact provider/model route. */
export interface ExecutionEffortOption {
    id: string;
    name: string;
    description?: string;
}
/** One provider/model option shown by the task execution pickers. */
export interface ExecutionModelOption {
    provider: string;
    providerName: string;
    model: string;
    name: string;
    description?: string;
    reasoning?: {
        efforts: readonly ExecutionEffortOption[];
        defaultEffort?: string;
    };
}
/** One Codex reasoning-effort choice advertised by a Codex model. */
export interface CodexEffortChoice {
    id: string;
    description?: string;
}
/** One Codex model choice from the machine's catalog. */
export interface CodexModelChoice {
    slug: string;
    displayName: string;
    description?: string;
    efforts: readonly CodexEffortChoice[];
    defaultEffort?: string;
}
/** The host's Codex CLI facts the executor pickers offer. */
export interface CodexOptionsSnapshot {
    /** Whether the codex CLI / catalog could be found on the host. */
    available: boolean;
    /** The config.toml default model, when readable. */
    defaultModel?: string;
    /** The config.toml default reasoning effort, when readable. */
    defaultEffort?: string;
    models: readonly CodexModelChoice[];
}
/** The empty Codex snapshot used until the first host read lands. */
export declare const EMPTY_CODEX_OPTIONS: CodexOptionsSnapshot;
/** The execution-target option sets the UI feeds into the controller. */
export interface ExecutionOptionsSnapshot {
    workspaces: readonly ExecutionWorkspaceOption[];
    presets: readonly ExecutionPresetOption[];
    models: readonly ExecutionModelOption[];
    codex: CodexOptionsSnapshot;
}
/** Immutable controller snapshot for UI subscriptions. */
export interface ControllerSnapshot {
    tasks: readonly TaskRecord[];
    boardOpen: boolean;
    /** True when the board shows the archive view instead of the columns. */
    archiveView: boolean;
    selectedTaskId: string | undefined;
    /** Codex task whose persisted thread is shown in the chat-first surface. */
    codexChatTaskId: string | undefined;
    /** Picker option sets (workspace list + agent-preset roster + models). */
    executionOptions: ExecutionOptionsSnapshot;
}
/** The selected task (resolved from the ledger), or undefined. */
export declare function selectedTaskOf(snapshot: ControllerSnapshot): TaskRecord | undefined;
/** The Codex task currently shown as a conversation, or undefined. */
export declare function selectedCodexTaskOf(snapshot: ControllerSnapshot): TaskRecord | undefined;
/**
 * Board controller (see module doc). All mutations bump the snapshot and
 * persist through the store; UI and DOM mounts subscribe and re-render.
 */
export declare class BoardController {
    private readonly deps;
    private tasks;
    private boardOpen;
    private archiveView;
    private selectedTaskId;
    private codexChatTaskId;
    private executionOptions;
    private listeners;
    private disposers;
    private readonly now;
    private readonly uuid;
    /** @param deps - store, execution service, and the sessions navigation face. */
    constructor(deps: ControllerDeps);
    /** Load the persisted ledger and start the navigation/status subscriptions. */
    start(): void;
    /** Stop all subscriptions and drop retained state (idempotent). */
    dispose(): void;
    getSnapshot(): ControllerSnapshot;
    subscribe(fn: () => void): () => void;
    /** Notify views that an external presentation input, such as locale, changed. */
    refresh(): void;
    openBoard(): void;
    closeBoard(): void;
    toggleBoard(): void;
    /**
     * Switch between the kanban columns and the archive view. Leaving the
     * archive view with an archived task still selected closes the selection —
     * the detail overlay must not linger over a task that is off-board.
     */
    toggleArchiveView(): void;
    openTask(id: string): void;
    /** Open a Codex task's persisted thread in the board-owned chat surface. */
    openCodexConversation(id: string): void;
    closeTask(): void;
    createTask(input: NewTaskInput): TaskRecord | undefined;
    updateTask(id: string, patch: TaskUpdatePatch): void;
    /**
     * Replace (a part of) the picker option sets the UI feeds (workspace list
     * and agent-preset roster come from the runtime, not the ledger).
     */
    setExecutionOptions(patch: Partial<ExecutionOptionsSnapshot>): void;
    moveTask(id: string, status: TaskStatus): void;
    deleteTask(id: string): void;
    /**
     * Archive a settled task (done/failed). Running or on-board-unsettled
     * tasks are refused so the runner keeps exclusive ownership of their
     * lifecycle.
     * @returns true when applied.
     */
    archiveTask(id: string): boolean;
    /** Restore an archived task back onto the board (same status column). */
    restoreTask(id: string): boolean;
    /**
     * Update a task's schedule rule. A blank or invalid cron expression is
     * rejected (returns false, state untouched). When the rule ends up enabled
     * the next run instant is computed immediately; a disabled rule carries no
     * next-run instant. Delegates the domain transition to the schedule use case.
     * @param id - the task to schedule.
     * @param patch - fields to change (absent fields keep their current value).
     * @returns true when applied, false when rejected (invalid cron / unknown task).
     */
    setSchedule(id: string, patch: {
        enabled?: boolean;
        cron?: string;
    }): boolean;
    /**
     * Roll a task's schedule forward (scheduler callback): persist the next due
     * instant and the trigger instant of this run. No-op when the task has no
     * schedule rule (it was deleted mid-tick, for example).
     */
    applyScheduleNextRun(id: string, nextRunAt: number | undefined, lastTriggeredAt: number | undefined): void;
    /**
     * Reload the ledger from the persisted store without notifying subscribers.
     * The scheduler calls this before every tick so a task deleted in another
     * tab (or a stale in-memory copy) can never be fired from this tab: the
     * fire decision and the subsequent roll-forward both run on the freshest
     * persisted truth. Deliberately silent — same-origin external changes still
     * reach subscribers through the storage-event subscription.
     */
    reloadFromStore(): void;
    /**
     * Jump to an execution's session transcript. Selecting the session changes
     * `current`, which closes the board (the conversation view takes over).
     * @param sessionId - the execution session to open.
     */
    openSession(sessionId: string): void;
    /**
     * Navigate the GUI to one of the task's workspaces (e.g. the materialized
     * worktree): connect its blank session and select it, closing the board.
     */
    openTaskWorkspace(id: string): void;
    /**
     * Execute a task for real: move it to 'running', open an execution record,
     * and hand off to the ExecutionService. A second call while the task is
     * already running is ignored.
     */
    runTask(id: string): Promise<boolean>;
    /** Re-run a settled task: move it back to 'todo' first, then execute. */
    rerunTask(id: string): Promise<void>;
    private handleExecutionEvent;
    /**
     * Persist a materialized worktree onto its task and make sure the directory
     * is registered as a DSH workspace so it appears in the sidebar's workspace
     * list. Registration failures keep the worktree usable (the path is still
     * recorded); only the sidebar entry is missing then.
     */
    private adoptWorktree;
    /**
     * Materialize a task's git worktree without running the task (detail-view
     * prepare action). The execution service creates/reuses it; adoption above
     * registers + persists it.
     */
    prepareWorktree(id: string): Promise<{
        ok: boolean;
        error?: string;
        path?: string;
    }>;
    /**
     * Remove a task's git worktree directory (`git worktree remove`) and drop
     * its workspace registration + record fields. The branch itself survives —
     * deleting committed work is never implicit.
     */
    removeWorktree(id: string, force?: boolean): Promise<boolean>;
    /**
     * Send one follow-up prompt to a settled Codex task's persisted thread.
     * Opens a new execution record; the conversation continues server-side
     * (initialize → thread/resume → turn/start).
     * @returns true when the follow-up was launched.
     */
    followUpTask(id: string, content: string): Promise<boolean>;
    /**
     * Steer the latest running Codex execution with additional input (the
     * input is injected into the ACTIVE turn via turn/steer).
     */
    steerExecution(id: string, content: string): Promise<{
        ok: boolean;
        error?: string;
    }>;
    /** Live snapshot of the latest hosted Codex run (detail-view progress). */
    codexRunSnapshot(id: string): Promise<CodexRunSnapshot | undefined>;
    /** Load a task's complete persisted Codex conversation. */
    codexConversation(id: string): Promise<CodexConversationResult>;
    /**
     * Best-effort cancel of the latest running execution: hosted Codex turns
     * are interrupted (turn/interrupt) with a bounded grace before the child
     * process tree is terminated; DSH session runs have no cancel verb yet.
     * @returns true when a cancellation request was delivered.
     */
    cancelExecution(id: string): Promise<boolean>;
    /** Reconcile running tasks and close the board when the user navigates. */
    private onSessionsChanged;
    private lastCurrent;
    /** Execution ids launched on this page; they settle via their live watch, never list reconciliation. */
    private readonly activeExecutionIds;
    /** Debounce timer for {@link reconcileRunningTasks}. */
    private reconcileTimer;
    /** Whether a reconcile pass is underway (single-flight guard). */
    private reconcileInFlight;
    /**
     * Debounce + single-flight trigger for the running-task reconciliation.
     * Session-list notifications arrive in bursts (one per session status
     * change); both guards together keep a burst from reading the history API
     * once per running task.
     */
    private scheduleReconcile;
    /** Settle tasks left 'running' whose sessions already finished. */
    private reconcileRunningTasks;
    private persistAndNotify;
    private notify;
}
//# sourceMappingURL=controller.d.ts.map