import type { IncomingMessage, ServerResponse } from 'node:http';
import { AppServerClient } from './appserver-client.ts';
/** The narrow web-server face used here (exact-route registration). */
export interface WebServerFace {
    register(route: {
        kind: 'exact';
        path: string;
        handler(req: IncomingMessage, res: ServerResponse): Promise<void> | void;
    }): unknown;
}
/** Collected-output reader slice of the subprocess seam. */
export interface SubprocessOutputReaderFace {
    readFrom(fromByte: number): {
        text: string;
        nextOffset: number;
        lossy: boolean;
    };
}
/** One live child handle slice of the subprocess seam. */
export interface SubprocessHandleFace {
    readonly pid: number;
    /** Child stdin when spawned with `stdin: 'pipe'`. */
    readonly stdin?: {
        write(data: string): void;
        end(): void;
    };
    /** Raw stdout/stderr when spawned with the matching `'pipe'` mode. */
    readonly stdout?: WireStreamFace;
    readonly stderr?: WireStreamFace;
    readonly done: Promise<{
        exitCode: number | null;
        signal: string | null;
    }>;
    readonly collected: {
        readonly stdout?: SubprocessOutputReaderFace;
        readonly stderr?: SubprocessOutputReaderFace;
    };
    terminate(): void;
    waitForExit(signal?: AbortSignal): Promise<boolean>;
}
/** A raw byte stream face (node Readable slice). */
export interface WireStreamFace {
    setEncoding(encoding: 'utf8'): void;
    on(event: 'data', listener: (chunk: string) => void): void;
}
/** The narrow subprocess face used here. */
export interface SubprocessFace {
    resolveExecutable(command: string): Promise<string>;
    spawn(spec: {
        argv: readonly string[];
        cwd: string;
        stdio: {
            stdin: 'ignore' | 'pipe' | {
                data: string;
            };
            stdout: 'ignore' | 'pipe' | {
                maxBytes: number;
            };
            stderr: 'ignore' | 'pipe' | {
                maxBytes: number;
            };
        };
        graceMs: number;
        signal?: AbortSignal;
        /** Explicit environment entries merged onto the scrubbed parent base. */
        env?: NodeJS.ProcessEnv;
    }): SubprocessHandleFace;
}
/** Hard cap for one codex turn (safety net against zombie processes). */
export declare const CODEX_RUN_TIMEOUT_MS: number;
/** Grace between turn/interrupt and forced process-tree termination. */
export declare const INTERRUPT_GRACE_MS = 10000;
/** Maximum concurrently active codex children (configurable via env). */
export declare const MAX_ACTIVE_RUNS: number;
/** Activity ring length returned to the browser. */
export declare const ACTIVITY_RING = 40;
/** One normalized activity line shown in the board while/after a run. */
export interface CodexActivityEntry {
    at: number;
    kind: 'command' | 'fileChange' | 'mcpToolCall' | 'plan' | 'webSearch' | 'warning' | 'info';
    text: string;
}
/** Run state: exactly one active turn on one persistent thread. */
interface CodexRun {
    id: string;
    cwd: string;
    startedAt: number;
    endedAt: number | undefined;
    threadId: string | undefined;
    turnId: string | undefined;
    /** Coarse lifecycle derived from notifications (never the process alone). */
    settled: boolean;
    outcome: 'succeeded' | 'failed' | 'interrupted' | undefined;
    errorText: string | undefined;
    client: AppServerClient | undefined;
    /** Streaming text of the current agent message (deltas). */
    liveAnswer: string;
    /** Item id currently receiving agentMessage deltas. */
    liveAnswerItemId?: string;
    /** Final answer text once an authoritative item lands. */
    finalAnswer: string | undefined;
    activity: CodexActivityEntry[];
    usage: Record<string, unknown> | undefined;
    cancelRequested: boolean;
    interruptSent: boolean;
    timedOut: boolean;
}
/** One reasoning level advertised by one codex model. */
export interface CodexEffortOption {
    id: string;
    description?: string;
}
/** One codex model projected from models_cache.json. */
export interface CodexModelOption {
    slug: string;
    displayName: string;
    description?: string;
    efforts: readonly CodexEffortOption[];
    defaultEffort?: string;
}
/** The env payload served to the browser. */
export interface CodexEnvPayload {
    available: boolean;
    version?: string;
    home: string;
    defaultModel?: string;
    defaultEffort?: string;
    models: readonly CodexModelOption[];
}
/** Resolve CODEX_HOME the way the CLI does (env override, else ~/.codex). */
export declare function codexHome(): string;
/** Extract top-level `key = "value"` pairs from config.toml without a TOML dep. Standard TOML requires bare keys to precede the first `[table]` header, so collection stops there. */
export declare function parseTopLevelStrings(toml: string): Map<string, string>;
/** Read the machine's codex environment (best effort; never throws). */
export declare function readCodexEnv(subprocess: SubprocessFace | undefined): Promise<CodexEnvPayload>;
/** Directory name created inside a repo to hold this plugin's worktrees. */
export declare const WORKTREE_DIR_NAME = ".dsh-worktrees";
/**
 * Sanitize a user-supplied branch or derive one from the task title:
 * git check-ref-format basics enforced, always non-empty.
 */
export declare function sanitizeBranchName(branch: string | undefined, title: string | undefined, now: number): string;
/**
 * Create (or reuse) a git worktree for one repo. The worktree lives at
 * `<repoRoot>/.dsh-worktrees/<branch with / → ->`, and that directory is
 * appended to `.git/info/exclude` so it never shows up in git status.
 */
export declare function createWorktree(subprocess: SubprocessFace, args: Record<string, unknown>): Promise<{
    ok: true;
    path: string;
    branch: string;
    repoRoot: string;
    created: boolean;
} | {
    ok: false;
    error: string;
}>;
/** Remove a worktree created earlier (`git worktree remove`). */
export declare function removeWorktree(subprocess: SubprocessFace, args: Record<string, unknown>): Promise<{
    ok: boolean;
    error?: string;
}>;
/** Route paths served on the harness web server. */
export declare const ROUTE_CODEX_START = "/dsh-task-board/codex/start";
export declare const ROUTE_CODEX_STATUS = "/dsh-task-board/codex/status";
export declare const ROUTE_CODEX_CANCEL = "/dsh-task-board/codex/cancel";
export declare const ROUTE_CODEX_STEER = "/dsh-task-board/codex/steer";
export declare const ROUTE_CODEX_THREAD = "/dsh-task-board/codex/thread";
export declare const ROUTE_CODEX_ENV = "/dsh-task-board/codex/env";
export declare const ROUTE_WORKTREE_CREATE = "/dsh-task-board/worktree/create";
export declare const ROUTE_WORKTREE_REMOVE = "/dsh-task-board/worktree/remove";
/**
 * The business logic of every task-board host route, keyed by path and free
 * of HTTP concerns (each takes a parsed JSON body, returns a JSON-able
 * payload with an `ok` field). Exposed separately so tests can drive the
 * flows without faking http.ServerResponse.
 */
export declare function taskBoardRouteHandlers(subprocess: SubprocessFace | undefined): Map<string, (args: Record<string, unknown>) => Promise<unknown>>;
/**
 * Register every task-board host route on the harness web server. Each
 * handler owns its full response. Returns the registration results (cordis
 * treats them as disposers when returned from ctx.effect).
 */
export declare function registerTaskBoardRoutes(webServer: WebServerFace, subprocess: SubprocessFace | undefined): Array<unknown>;
/** Test-only visibility into the run registry. */
export declare function peekRunForTests(runId: string): CodexRun | undefined;
/** Test hook: clear all runs between tests. */
export declare function resetRunsForTests(): void;
/** Exposed for tests: how many children may run at once. */
export declare function maxActiveRunsForTests(): number;
export {};
//# sourceMappingURL=codex-routes.d.ts.map