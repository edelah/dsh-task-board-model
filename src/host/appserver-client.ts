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
import type { SubprocessFace } from './codex-routes.ts'

/** Options for one AppServerClient instance. */
export interface AppServerClientOptions {
  /** Process spawn seam (the dsh subprocess service). */
  subprocess: SubprocessFace
  /** Resolved codex executable path. */
  codexPath: string
  /** Working directory for the spawned process. */
  cwd: string
  /** Explicit environment overlay for the child (allowlisted by the caller). */
  env?: NodeJS.ProcessEnv
  /** Client identity advertised during initialize. */
  clientInfo: { name: string; version: string; title?: string }
  /** Bound (tail) size of captured stderr, bytes. Defaults to 64 KiB. */
  stderrMaxBytes?: number
  /** Round-trip timeout for one JSON-RPC request. Defaults to 120 s. */
  requestTimeoutMs?: number
  /**
   * Maximum accepted wire line length, bytes. A longer line is dropped and
   * recorded as a diagnostic instead of growing memory unbounded.
   * Defaults to 8 MiB.
   */
  maxLineBytes?: number
}

/** One server→client request awaiting our policy decision. */
export interface AppServerRequest {
  /** JSON-RPC request id (echoed in our response). */
  id: number | string
  method: string
  params: unknown
}

/** Exit facts of the app-server process. */
export interface AppServerExit {
  exitCode: number | null
  signal: string | null
}

/** One pending JSON-RPC round trip. */
interface Pending {
  resolve: (result: unknown) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
  method: string
}

/** Default fail-closed answers per server-request family. */
function failClosedResponse(method: string): unknown {
  switch (method) {
    case 'execCommandApproval':
    case 'applyPatchApproval':
      // Legacy ReviewDecision vocabulary.
      return { decision: 'abort' }
    case 'item/commandExecution/requestApproval':
    case 'item/fileChange/requestApproval':
      // Current decision vocabulary.
      return { decision: 'decline' }
    case 'item/permissions/requestApproval':
      // No additional permissions granted; empty profile keeps the turn scoped.
      return { permissions: {} }
    case 'item/tool/requestUserInput':
      // Answer questions with no answers rather than hanging the turn.
      return { answers: {} }
    case 'mcpServer/elicitation/request':
      return { action: 'decline' }
    default:
      // Unknown requests cannot be answered meaningfully: return a protocol
      // error so the server surfaces it instead of waiting forever.
      throw new Error(`unsupported server request: ${method}`)
  }
}

/**
 * One app-server child process with a typed request surface. Each active
 * turn uses a fresh client (process-per-turn MVP), while Codex threads
 * persist on disk across processes.
 */
export class AppServerClient {
  private readonly options: AppServerClientOptions & {
    stderrMaxBytes: number
    requestTimeoutMs: number
    maxLineBytes: number
  }
  private nextRequestId = 1
  private readonly pending = new Map<string, Pending>()
  private stderrTail = ''
  private exitFacts: AppServerExit | undefined
  private exited = false
  private readonly waitersExited: Array<() => void> = []
  private handle: ReturnType<SubprocessFace['spawn']> | undefined
  private started = false
  private notificationHandler: ((method: string, params: unknown) => void) | undefined
  private serverRequestHandler: ((request: AppServerRequest) => Promise<unknown>) | undefined
  /** Internal diagnostics (malformed lines, oversized lines). */
  private readonly diagnostics: string[] = []

  constructor(options: AppServerClientOptions) {
    this.options = {
      stderrMaxBytes: 64 * 1024,
      requestTimeoutMs: 120_000,
      maxLineBytes: 8 * 1024 * 1024,
      ...options,
    }
  }

  /**
   * Register the notification sink. Must be called before start(); the run
   * layer correlates events there.
   */
  setNotificationHandler(handler: (method: string, params: unknown) => void): void {
    this.notificationHandler = handler
  }

  /**
   * Register the server→client request policy. When absent, every request is
   * answered with the built-in fail-closed response.
   */
  setServerRequestHandler(handler: (request: AppServerRequest) => Promise<unknown>): void {
    this.serverRequestHandler = handler
  }

  /** Whether the underlying process has exited. */
  get hasExited(): boolean {
    return this.exited
  }

  /** Bounded tail of everything the process wrote to stderr. */
  getStderrTail(): string {
    return this.stderrTail
  }

  /** Resolves once the process tree has exited. */
  waitForExit(): Promise<AppServerExit> {
    if (this.exitFacts !== undefined) return Promise.resolve(this.exitFacts)
    return new Promise(resolve => { this.waitersExited.push(() => resolve(this.exitFacts!)) })
  }

  /**
   * Spawn the fixed argv and complete the initialize handshake. Safe to call
   * once per instance; a second call rejects.
   */
  async start(): Promise<void> {
    if (this.started) throw new Error('app-server client already started')
    this.started = true
    this.handle = this.options.subprocess.spawn({
      // Fixed argv only — never shell interpolation, never prompt-derived parts.
      argv: [this.options.codexPath, 'app-server', '--stdio'],
      cwd: this.options.cwd,
      env: this.options.env,
      stdio: {
        stdin: 'pipe',
        stdout: 'pipe',
        stderr: 'pipe',
      },
      graceMs: 5000,
    })

    // Raw piped stdout belongs to us: split into lines ourselves.
    const stdout = this.handle?.stdout
    if (stdout === undefined) throw new Error('app-server stdout pipe missing')
    let buffer = ''
    let overflowReported = false
    stdout.setEncoding('utf8')
    stdout.on('data', (chunk: string) => {
      buffer += chunk
      for (;;) {
        const newlineAt = buffer.indexOf('\n')
        if (newlineAt === -1) {
          if (buffer.length > this.options.maxLineBytes && !overflowReported) {
            overflowReported = true
            this.diagnostic('stdout line exceeded the size cap; dropping until the next newline')
          }
          break
        }
        const line = buffer.slice(0, newlineAt).trim()
        buffer = buffer.slice(newlineAt + 1)
        overflowReported = false
        if (line !== '') this.handleLine(line)
      }
    })

    // Bounded stderr capture through the raw pipe.
    const stderr = this.handle?.stderr
    stderr?.setEncoding('utf8')
    stderr?.on('data', (chunk: string) => { this.appendStderr(chunk) })

    const childHandle = this.handle
    void childHandle.done.then(outcome => {
      this.exited = true
      this.exitFacts = outcome
      // Every in-flight request fails when the process dies.
      for (const [, entry] of this.pending) {
        clearTimeout(entry.timer)
        entry.reject(new Error(`app-server exited (${outcome.exitCode ?? 'signal ' + String(outcome.signal)}) during ${entry.method}`))
      }
      this.pending.clear()
      for (const waiter of this.waitersExited.splice(0)) waiter()
    }, () => {
      this.exited = true
      this.exitFacts = { exitCode: null, signal: null }
      for (const [, entry] of this.pending) {
        clearTimeout(entry.timer)
        entry.reject(new Error(`app-server spawn failed during ${entry.method}`))
      }
      this.pending.clear()
      for (const waiter of this.waitersExited.splice(0)) waiter()
    })

    await this.request('initialize', {
      clientInfo: this.options.clientInfo,
    }, 30_000)
    this.notify('initialized')
  }

  /**
   * Begin the SIGTERM → grace → SIGKILL escalation on the process tree and
   * wait for full exit. Idempotent.
   */
  async dispose(): Promise<void> {
    if (this.handle === undefined) return
    if (this.exited) {
      await this.waitForExit().catch(() => undefined)
      return
    }
    try { this.handle.terminate() } catch { /* already gone */ }
    await this.waitForExit().catch(() => undefined)
  }

  /** Send one request and await its result (rejects on error/timeout/exit). */
  request(method: string, params: unknown, timeoutMs = this.options.requestTimeoutMs): Promise<unknown> {
    if (this.exited) return Promise.reject(new Error(`app-server exited before ${method}`))
    const id = this.nextRequestId += 1
    const key = String(id)
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(key)
        reject(new Error(`${method} timed out after ${Math.round(timeoutMs / 1000)}s`))
      }, timeoutMs)
      timer.unref?.()
      this.pending.set(key, { resolve, reject, timer, method })
      this.write({ jsonrpc: '2.0', id, method, params })
    })
  }

  /** Send one notification (no id, no response expected). */
  notify(method: string, params?: unknown): void {
    this.write({ jsonrpc: '2.0', method, ...(params === undefined ? {} : { params }) })
  }

  /** Start a fresh persistent thread. Returns the created Thread view. */
  async threadStart(params: {
    cwd?: string
    model?: string
    effort?: string
    approvalPolicy?: 'untrusted' | 'on-request' | 'never'
    approvalsReviewer?: 'user' | 'auto_review'
    sandbox?: 'read-only' | 'workspace-write' | 'danger-full-access'
    ephemeral?: boolean
    developerInstructions?: string
  }): Promise<Record<string, unknown>> {
    const result = await this.request('thread/start', {
      ...(params.cwd === undefined ? {} : { cwd: params.cwd }),
      ...(params.model === undefined ? {} : { model: params.model }),
      ...(params.approvalPolicy === undefined ? {} : { approvalPolicy: params.approvalPolicy }),
      ...(params.approvalsReviewer === undefined ? {} : { approvalsReviewer: params.approvalsReviewer }),
      ...(params.sandbox === undefined ? {} : { sandbox: params.sandbox }),
      ...(params.ephemeral === undefined ? {} : { ephemeral: params.ephemeral }),
      ...(params.developerInstructions === undefined ? {} : { developerInstructions: params.developerInstructions }),
    }) as { thread?: Record<string, unknown> } | undefined
    const thread = result?.thread
    if (thread === undefined || typeof thread.id !== 'string') {
      throw new Error('thread/start returned no thread id')
    }
    return thread
  }

  /**
   * Resume a persisted thread. The returned thread id MUST equal the
   * requested one — any mismatch fails loudly (the plan's continuation rule).
   */
  async threadResume(params: {
    threadId: string
    cwd?: string
    model?: string
    approvalPolicy?: 'untrusted' | 'on-request' | 'never'
    sandbox?: 'read-only' | 'workspace-write' | 'danger-full-access'
  }): Promise<Record<string, unknown>> {
    const result = await this.request('thread/resume', {
      threadId: params.threadId,
      ...(params.cwd === undefined ? {} : { cwd: params.cwd }),
      ...(params.model === undefined ? {} : { model: params.model }),
      ...(params.approvalPolicy === undefined ? {} : { approvalPolicy: params.approvalPolicy }),
      ...(params.sandbox === undefined ? {} : { sandbox: params.sandbox }),
    }) as { thread?: Record<string, unknown> } | undefined
    const thread = result?.thread
    if (thread === undefined || typeof thread.id !== 'string') {
      throw new Error('thread/resume returned no thread id')
    }
    if (thread.id !== params.threadId) {
      throw new Error(`thread/resume returned ${String(thread.id)} instead of the requested ${params.threadId}`)
    }
    return thread
  }

  /** Read a persisted thread without resuming or subscribing to it. */
  async threadRead(threadId: string): Promise<Record<string, unknown>> {
    const result = await this.request('thread/read', {
      threadId,
      includeTurns: true,
    }) as { thread?: Record<string, unknown> } | undefined
    const thread = result?.thread
    if (thread === undefined || thread.id !== threadId) {
      throw new Error('thread/read returned no matching thread')
    }
    return thread
  }

  /** Start one turn on a thread. Returns the Turn view (id + status). */
  async turnStart(params: {
    threadId: string
    input: ReadonlyArray<{ type: 'text'; text: string }>
    effort?: string
    model?: string
    cwd?: string
    sandbox?: 'read-only' | 'workspace-write' | 'danger-full-access'
  }): Promise<Record<string, unknown>> {
    const result = await this.request('turn/start', {
      threadId: params.threadId,
      input: params.input,
      ...(params.effort === undefined ? {} : { effort: params.effort }),
      ...(params.model === undefined ? {} : { model: params.model }),
      ...(params.cwd === undefined ? {} : { cwd: params.cwd }),
      ...(params.sandbox === undefined ? {} : { sandbox: params.sandbox }),
    }) as { turn?: Record<string, unknown> } | undefined
    const turn = result?.turn
    if (turn === undefined || typeof turn.id !== 'string') {
      throw new Error('turn/start returned no turn id')
    }
    return turn
  }

  /** Steer the active turn (fails when expectedTurnId is not active). */
  async turnSteer(params: {
    threadId: string
    expectedTurnId: string
    input: ReadonlyArray<{ type: 'text'; text: string }>
  }): Promise<void> {
    await this.request('turn/steer', {
      threadId: params.threadId,
      expectedTurnId: params.expectedTurnId,
      input: params.input,
    })
  }

  /** Interrupt the active turn. Resolves when the server accepts the request. */
  async turnInterrupt(params: { threadId: string; turnId: string }): Promise<void> {
    await this.request('turn/interrupt', { threadId: params.threadId, turnId: params.turnId })
  }

  // --- internals ---------------------------------------------------------------

  private write(message: Record<string, unknown>): void {
    const stdin = this.handle?.stdin
    if (stdin === undefined || this.exited) {
      throw new Error('app-server stdin unavailable')
    }
    stdin.write(JSON.stringify(message) + '\n')
  }

  private handleLine(line: string): void {
    if (line.length > this.options.maxLineBytes) {
      this.diagnostic('dropped an oversized incoming line')
      return
    }
    let message: Record<string, unknown>
    try {
      message = JSON.parse(line) as Record<string, unknown>
    } catch {
      this.diagnostic('dropped a malformed JSON line')
      return
    }
    const method = typeof message.method === 'string' ? message.method : undefined

    if (method !== undefined && message.id !== undefined && message.result === undefined && message.error === undefined) {
      // Server→client request: apply the policy and answer exactly once.
      const id = message.id as string | number
      void Promise.resolve()
        .then(() => this.serverRequestHandler !== undefined
          ? this.serverRequestHandler({ id, method, params: message.params })
          : failClosedResponse(method))
        .then(result => { this.write({ jsonrpc: '2.0', id, result: result ?? {} }) })
        .catch((error: unknown) => {
          this.write({
            jsonrpc: '2.0', id,
            error: { code: -32603, message: error instanceof Error ? error.message : String(error) },
          })
        })
      return
    }

    if (message.id !== undefined && (message.result !== undefined || message.error !== undefined)) {
      const key = String(message.id)
      const entry = this.pending.get(key)
      if (entry === undefined) return // unknown response id: ignore
      this.pending.delete(key)
      clearTimeout(entry.timer)
      if (message.error !== undefined) {
        const error = message.error as { message?: unknown }
        const text = typeof error.message === 'string' && error.message !== ''
          ? error.message
          : 'app-server request failed'
        entry.reject(new Error(`${entry.method} rejected: ${text}`))
      } else {
        entry.resolve(message.result)
      }
      return
    }

    if (method !== undefined) {
      try {
        this.notificationHandler?.(method, message.params)
      } catch (error) {
        this.diagnostic(`notification handler failed: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }

  /** Bounded internal diagnostics (malformed/oversized lines, handler errors). */
  getDiagnostics(): readonly string[] {
    return this.diagnostics
  }

  private diagnostic(line: string): void {
    this.diagnostics.push(`${new Date().toISOString()} ${line}`)
    if (this.diagnostics.length > 50) this.diagnostics.splice(0, this.diagnostics.length - 50)
  }

  /** Append to the bounded stderr tail (called by the owner wiring). */
  appendStderr(text: string): void {
    const max = this.options.stderrMaxBytes
    this.stderrTail = (this.stderrTail + text).slice(-max)
  }
}

/**
 * Allowlisted environment overlay for the codex child: identity paths, temp
 * directories, proxy settings, locale, and XDG dirs. The subprocess seam
 * already strips credential-shaped ambient variables before this overlay.
 */
export function codexChildEnvironment(home: string, codeHome: string): NodeJS.ProcessEnv {
  const overlay: NodeJS.ProcessEnv = {}
  const keepFromParent = [
    'PATH', 'LANG', 'LC_ALL', 'TZ',
    'TMPDIR', 'TMP', 'TEMP',
    'USER', 'LOGNAME', 'SHELL',
    'HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY',
    'http_proxy', 'https_proxy', 'no_proxy',
    'XDG_CONFIG_HOME', 'XDG_CACHE_HOME', 'XDG_DATA_HOME', 'XDG_STATE_HOME',
  ]
  for (const key of keepFromParent) {
    const value = process.env[key]
    if (value !== undefined && value !== '') overlay[key] = value
  }
  overlay.HOME = home
  overlay.CODEX_HOME = codeHome
  return overlay
}
