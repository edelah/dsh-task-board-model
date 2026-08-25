/**
 * Typed JSON-RPC client for the official Codex App Server (`codex app-server
 * --stdio`), following the "Richer DSH Codex Subagent" implementation plan.
 *
 * Wire facts (validated against the installed CLI's generated protocol
 * schema, codex 0.149.0):
 * - newline-delimited JSON over stdio, one message per line;
 * - client requests: `initialize`, `thread/start`, `thread/resume`, `thread/read`,
 *   `turn/start`, `turn/steer`, `turn/interrupt`;
 * - server→client requests (approvals, user input, elicitations) must be
 *   answered — the policy here is fail-closed: every approval is declined;
 * - notifications carry threadId/turnId; the run layer correlates them.
 *
 * The client deliberately knows nothing about DSH or the task board: it owns
 * framing, request ids, timeouts, bounded stderr capture, process-tree
 * termination escalation, and nothing else.
 */
import type { SubprocessFace } from './codex-routes.ts';
/** Options for one AppServerClient instance. */
export interface AppServerClientOptions {
    /** Process spawn seam (the dsh subprocess service). */
    subprocess: SubprocessFace;
    /** Resolved codex executable path. */
    codexPath: string;
    /** Working directory for the spawned process. */
    cwd: string;
    /** Explicit environment overlay for the child (allowlisted by the caller). */
    env?: NodeJS.ProcessEnv;
    /** Client identity advertised during initialize. */
    clientInfo: {
        name: string;
        version: string;
        title?: string;
    };
    /** Bound (tail) size of captured stderr, bytes. Defaults to 64 KiB. */
    stderrMaxBytes?: number;
    /** Round-trip timeout for one JSON-RPC request. Defaults to 120 s. */
    requestTimeoutMs?: number;
    /**
     * Maximum accepted wire line length, bytes. A longer line is dropped and
     * recorded as a diagnostic instead of growing memory unbounded.
     * Defaults to 8 MiB.
     */
    maxLineBytes?: number;
}
/** One server→client request awaiting our policy decision. */
export interface AppServerRequest {
    /** JSON-RPC request id (echoed in our response). */
    id: number | string;
    method: string;
    params: unknown;
}
/** Exit facts of the app-server process. */
export interface AppServerExit {
    exitCode: number | null;
    signal: string | null;
}
/**
 * One app-server child process with a typed request surface. Each active
 * turn uses a fresh client (process-per-turn MVP), while Codex threads
 * persist on disk across processes.
 */
export declare class AppServerClient {
    private readonly options;
    private nextRequestId;
    private readonly pending;
    private stderrTail;
    private exitFacts;
    private exited;
    private readonly waitersExited;
    private handle;
    private started;
    private notificationHandler;
    private serverRequestHandler;
    /** Internal diagnostics (malformed lines, oversized lines). */
    private readonly diagnostics;
    constructor(options: AppServerClientOptions);
    /**
     * Register the notification sink. Must be called before start(); the run
     * layer correlates events there.
     */
    setNotificationHandler(handler: (method: string, params: unknown) => void): void;
    /**
     * Register the server→client request policy. When absent, every request is
     * answered with the built-in fail-closed response.
     */
    setServerRequestHandler(handler: (request: AppServerRequest) => Promise<unknown>): void;
    /** Whether the underlying process has exited. */
    get hasExited(): boolean;
    /** Bounded tail of everything the process wrote to stderr. */
    getStderrTail(): string;
    /** Resolves once the process tree has exited. */
    waitForExit(): Promise<AppServerExit>;
    /**
     * Spawn the fixed argv and complete the initialize handshake. Safe to call
     * once per instance; a second call rejects.
     */
    start(): Promise<void>;
    /**
     * Begin the SIGTERM → grace → SIGKILL escalation on the process tree and
     * wait for full exit. Idempotent.
     */
    dispose(): Promise<void>;
    /** Send one request and await its result (rejects on error/timeout/exit). */
    request(method: string, params: unknown, timeoutMs?: number): Promise<unknown>;
    /** Send one notification (no id, no response expected). */
    notify(method: string, params?: unknown): void;
    /** Start a fresh persistent thread. Returns the created Thread view. */
    threadStart(params: {
        cwd?: string;
        model?: string;
        effort?: string;
        approvalPolicy?: 'untrusted' | 'on-request' | 'never';
        approvalsReviewer?: 'user' | 'auto_review';
        sandbox?: 'read-only' | 'workspace-write' | 'danger-full-access';
        ephemeral?: boolean;
        developerInstructions?: string;
    }): Promise<Record<string, unknown>>;
    /**
     * Resume a persisted thread. The returned thread id MUST equal the
     * requested one — any mismatch fails loudly (the plan's continuation rule).
     */
    threadResume(params: {
        threadId: string;
        cwd?: string;
        model?: string;
        approvalPolicy?: 'untrusted' | 'on-request' | 'never';
        sandbox?: 'read-only' | 'workspace-write' | 'danger-full-access';
    }): Promise<Record<string, unknown>>;
    /** Read a persisted thread without resuming or subscribing to it. */
    threadRead(threadId: string): Promise<Record<string, unknown>>;
    /** Start one turn on a thread. Returns the Turn view (id + status). */
    turnStart(params: {
        threadId: string;
        input: ReadonlyArray<{
            type: 'text';
            text: string;
        }>;
        effort?: string;
        model?: string;
        cwd?: string;
        sandbox?: 'read-only' | 'workspace-write' | 'danger-full-access';
    }): Promise<Record<string, unknown>>;
    /** Steer the active turn (fails when expectedTurnId is not active). */
    turnSteer(params: {
        threadId: string;
        expectedTurnId: string;
        input: ReadonlyArray<{
            type: 'text';
            text: string;
        }>;
    }): Promise<void>;
    /** Interrupt the active turn. Resolves when the server accepts the request. */
    turnInterrupt(params: {
        threadId: string;
        turnId: string;
    }): Promise<void>;
    private write;
    private handleLine;
    /** Bounded internal diagnostics (malformed/oversized lines, handler errors). */
    getDiagnostics(): readonly string[];
    private diagnostic;
    /** Append to the bounded stderr tail (called by the owner wiring). */
    appendStderr(text: string): void;
}
/**
 * Allowlisted environment overlay for the codex child: identity paths, temp
 * directories, proxy settings, locale, and XDG dirs. The subprocess seam
 * already strips credential-shaped ambient variables before this overlay.
 */
export declare function codexChildEnvironment(home: string, codeHome: string): NodeJS.ProcessEnv;
//# sourceMappingURL=appserver-client.d.ts.map