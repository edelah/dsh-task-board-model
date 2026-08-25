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
import type { BoardController } from '../core/controller.ts';
/** Stable data attribute identifying an injected execution row; value = task id. */
export declare const JOB_SELECTOR = "[data-dsh-taskboard-job]";
/** Workspace facts needed to place an execution row in the main sidebar. */
export interface RunningJobWorkspaceSnapshot {
    /** Workspace ids in the same stable order as the sidebar's workspace groups. */
    readonly workspaceIds: readonly string[];
    /** The runtime fallback used when a task does not pin a workspace. */
    readonly recentWorkspaceId?: string;
}
/**
 * Mount the live/result execution rows.
 * @param controller - the board controller whose task ledger drives the rows.
 * @param readWorkspaces - optional runtime workspace list; the controller
 *   options are enough for pinned tasks, while the runtime source also exposes
 *   the recent-workspace fallback for unpinned tasks.
 * @returns disposer removing the rows and their observers.
 */
export declare function mountRunningJobs(controller: BoardController, readWorkspaces?: () => RunningJobWorkspaceSnapshot): () => void;
//# sourceMappingURL=running-jobs.d.ts.map