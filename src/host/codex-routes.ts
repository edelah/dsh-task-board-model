/**
 * Host half of the task board's Codex executor and git-worktree support.
 *
 * The browser cannot spawn processes, so this module registers same-origin
 * HTTP routes on the harness web server (the pattern the dsh-open-terminal
 * plugin uses) and keeps the long-lived state server-side:
 *
 * - POST /dsh-task-board/codex/start   { cwd, prompt, taskId?, resumeThreadId?,
 *       model?, effort?, sandbox? }
 *     → launch one Codex App Server child (`codex app-server --stdio`),
 *       initialize it, start or RESUME a persistent thread, persist the
 *       thread binding, and start one turn. Resolves immediately with runId.
 * - POST /dsh-task-board/codex/status  { runId }
 *     → running/succeeded/failed/interrupted plus normalized live activity
 *       (commands, file changes, MCP calls), the streaming answer text, and
 *       the final answer once settled.
 * - POST /dsh-task-board/codex/steer   { runId, content }
 *     → turn/steer on the active turn (fails when no turn is active).
 * - POST /dsh-task-board/codex/cancel  { runId }
 *     → turn/interrupt first; terminates the process tree after a grace
 *       period if the turn does not settle.
 * - GET  /dsh-task-board/codex/env
 *     → availability + the machine's Codex model catalog (models_cache.json)
 *       and config defaults, so the UI can offer real choices.
 * - POST /dsh-task-board/worktree/create { repoPath, branch?, title? }
 * - POST /dsh-task-board/worktree/remove { path, force? }
 *
 * Lifecycle model (per the "Richer DSH Codex Subagent" plan): process-per-
 * active-turn with a persistent Codex thread per task. The thread id — not
 * the process — is the conversation identity, so follow-ups survive dsh
 * restarts through the durable binding store.
 */
import { realpathSync, statSync } from 'node:fs'
import { readFile, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { isValidBranchName, slugifyBranch } from '../core/tasks.ts'
import { AppServerClient, codexChildEnvironment } from './appserver-client.ts'
import {
  bindingDirectory, fingerprintCwd, loadBinding, removeBinding, saveBinding,
} from './thread-bindings.ts'

/** The narrow web-server face used here (exact-route registration). */
export interface WebServerFace {
  register(route: {
    kind: 'exact'
    path: string
    handler(req: IncomingMessage, res: ServerResponse): Promise<void> | void
  }): unknown
}

/** Collected-output reader slice of the subprocess seam. */
export interface SubprocessOutputReaderFace {
  readFrom(fromByte: number): { text: string; nextOffset: number; lossy: boolean }
}

/** One live child handle slice of the subprocess seam. */
export interface SubprocessHandleFace {
  readonly pid: number
  /** Child stdin when spawned with `stdin: 'pipe'`. */
  readonly stdin?: { write(data: string): void; end(): void }
  /** Raw stdout/stderr when spawned with the matching `'pipe'` mode. */
  readonly stdout?: WireStreamFace
  readonly stderr?: WireStreamFace
  readonly done: Promise<{ exitCode: number | null; signal: string | null }>
  readonly collected: {
    readonly stdout?: SubprocessOutputReaderFace
    readonly stderr?: SubprocessOutputReaderFace
  }
  terminate(): void
  waitForExit(signal?: AbortSignal): Promise<boolean>
}

/** A raw byte stream face (node Readable slice). */
export interface WireStreamFace {
  setEncoding(encoding: 'utf8'): void
  on(event: 'data', listener: (chunk: string) => void): void
}

/** The narrow subprocess face used here. */
export interface SubprocessFace {
  resolveExecutable(command: string): Promise<string>
  spawn(spec: {
    argv: readonly string[]
    cwd: string
    stdio: {
      stdin: 'ignore' | 'pipe' | { data: string }
      stdout: 'ignore' | 'pipe' | { maxBytes: number }
      stderr: 'ignore' | 'pipe' | { maxBytes: number }
    }
    graceMs: number
    signal?: AbortSignal
    /** Explicit environment entries merged onto the scrubbed parent base. */
    env?: NodeJS.ProcessEnv
  }): SubprocessHandleFace
}

// --- shared small helpers -----------------------------------------------------

/** Maximum accepted request body size (JSON payloads here are tiny). */
const MAX_BODY_BYTES = 64 * 1024

/** Hard cap for one codex turn (safety net against zombie processes). */
export const CODEX_RUN_TIMEOUT_MS = 2 * 60 * 60 * 1000

/** Grace between turn/interrupt and forced process-tree termination. */
export const INTERRUPT_GRACE_MS = 10_000

/** Cap for one short git command (worktree add can take a moment on big repos). */
const GIT_COMMAND_TIMEOUT_MS = 30_000

/** Tail length of answer text returned to the browser. */
const ANSWER_TAIL_CHARS = 6000

/** Finished runs kept for status queries before pruning. */
const FINISHED_RUN_TTL_MS = 60 * 60 * 1000
const MAX_FINISHED_RUNS = 50

/** Maximum concurrently active codex children (configurable via env). */
export const MAX_ACTIVE_RUNS = positiveIntEnv('DSH_TASK_BOARD_MAX_CODEX_RUNS') ?? 8

/** Activity ring length returned to the browser. */
export const ACTIVITY_RING = 40

function positiveIntEnv(name: string): number | undefined {
  const raw = process.env[name]
  if (raw === undefined || raw.trim() === '') return undefined
  const value = Number.parseInt(raw, 10)
  return Number.isFinite(value) && value > 0 ? value : undefined
}

/** Send one JSON response and end it. */
function respond(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

/** Read and size-cap a JSON request body. */
async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    size += (chunk as Buffer).length
    if (size > MAX_BODY_BYTES) throw new Error('request body too large')
    chunks.push(chunk as Buffer)
  }
  if (chunks.length === 0) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>
}

/** Keep only the last `max` characters, marking loss with an ellipsis. */
function tail(text: string, max: number): string {
  const trimmed = text.replace(/\n+$/, '')
  if (trimmed.length <= max) return trimmed
  return `…${trimmed.slice(-max)}`
}

/** Resolve a directory request field to an existing absolute directory. */
function resolveDirectory(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${label} is required`)
  const resolved = realpathSync(value)
  if (!statSync(resolved).isDirectory()) throw new Error(`${label} is not a directory: ${resolved}`)
  return resolved
}

async function stringField(args: Record<string, unknown>, key: string): Promise<string | undefined> {
  const value = args[key]
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') throw new Error(`${key} must be a string`)
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

/** Run one short command to completion, capturing both streams. */
async function runShort(
  subprocess: SubprocessFace,
  argv: readonly string[],
  cwd: string,
  timeoutMs: number,
): Promise<{ exitCode: number | null; signal: string | null; stdout: string; stderr: string }> {
  const resolved = await subprocess.resolveExecutable(argv[0]!)
  const handle = subprocess.spawn({
    argv: [resolved, ...argv.slice(1)],
    cwd,
    stdio: {
      stdin: 'ignore',
      stdout: { maxBytes: 256 * 1024 },
      stderr: { maxBytes: 256 * 1024 },
    },
    graceMs: 1000,
  })
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    try { handle.terminate() } catch { /* already gone */ }
  }, timeoutMs)
  timer.unref?.()
  try {
    const outcome = await handle.done
    if (timedOut) throw new Error(`command did not finish within ${Math.round(timeoutMs / 1000)}s`)
    const read = (reader: SubprocessOutputReaderFace | undefined): string =>
      reader?.readFrom(0)?.text ?? ''
    return {
      exitCode: outcome.exitCode,
      signal: outcome.signal,
      stdout: read(handle.collected.stdout),
      stderr: read(handle.collected.stderr),
    }
  } finally {
    clearTimeout(timer)
  }
}

// --- codex run registry ---------------------------------------------------------

/** One normalized activity line shown in the board while/after a run. */
export interface CodexActivityEntry {
  at: number
  kind: 'command' | 'fileChange' | 'mcpToolCall' | 'plan' | 'webSearch' | 'warning' | 'info'
  text: string
}

/** Run state: exactly one active turn on one persistent thread. */
interface CodexRun {
  id: string
  cwd: string
  startedAt: number
  endedAt: number | undefined
  threadId: string | undefined
  turnId: string | undefined
  /** Coarse lifecycle derived from notifications (never the process alone). */
  settled: boolean
  outcome: 'succeeded' | 'failed' | 'interrupted' | undefined
  errorText: string | undefined
  client: AppServerClient | undefined
  /** Streaming text of the current agent message (deltas). */
  liveAnswer: string
  /** Item id currently receiving agentMessage deltas. */
  liveAnswerItemId?: string
  /** Final answer text once an authoritative item lands. */
  finalAnswer: string | undefined
  activity: CodexActivityEntry[]
  usage: Record<string, unknown> | undefined
  cancelRequested: boolean
  interruptSent: boolean
  timedOut: boolean
}

/** All runs of this process; pruned after the finished-run TTL. */
const runs = new Map<string, CodexRun>()

function pruneRuns(now: number): void {
  for (const [id, run] of runs) {
    if (run.endedAt !== undefined && now - run.endedAt > FINISHED_RUN_TTL_MS) runs.delete(id)
  }
  const settled = [...runs.values()]
    .filter(run => run.endedAt !== undefined)
    .sort((a, b) => (a.endedAt ?? 0) - (b.endedAt ?? 0))
  for (const run of settled.slice(0, Math.max(0, settled.length - MAX_FINISHED_RUNS))) {
    runs.delete(run.id)
  }
}

function pushActivity(run: CodexRun, entry: CodexActivityEntry): void {
  run.activity.push(entry)
  if (run.activity.length > ACTIVITY_RING * 2) {
    run.activity.splice(0, run.activity.length - ACTIVITY_RING)
  }
}

/** Human summary of one ThreadItem (defensive: shapes may evolve). */
function describeItem(item: unknown): { kind: CodexActivityEntry['kind']; text: string } | undefined {
  if (typeof item !== 'object' || item === null) return undefined
  const record = item as Record<string, unknown>
  const type = typeof record.type === 'string' ? record.type : undefined
  switch (type) {
    case 'commandExecution': {
      const command = typeof record.command === 'string' ? record.command : ''
      return { kind: 'command', text: `$ ${command}`.trim() }
    }
    case 'fileChange':
      return { kind: 'fileChange', text: summarizeFileChanges(record) }
    case 'mcpToolCall': {
      const server = typeof record.server === 'string' ? record.server : 'mcp'
      const tool = typeof record.tool === 'string' ? record.tool : ''
      return { kind: 'mcpToolCall', text: `${server}/${tool}` }
    }
    case 'webSearch':
      return { kind: 'webSearch', text: 'web search' }
    case 'planUpdate':
    case 'plan':
      return { kind: 'plan', text: 'plan update' }
    default:
      return undefined
  }
}

function summarizeFileChanges(record: Record<string, unknown>): string {
  const changes = Array.isArray(record.changes) ? record.changes : []
  const paths: string[] = []
  for (const change of changes.slice(0, 5)) {
    if (typeof change !== 'object' || change === null) continue
    const path = (change as Record<string, unknown>).path
    if (typeof path === 'string' && path !== '') paths.push(path)
  }
  const more = changes.length > paths.length ? ` (+${changes.length - paths.length} more)` : ''
  return paths.length > 0 ? `${paths.join(', ')}${more}` : 'file change'
}

/** Extract the final-answer phase/text off one agentMessage item (defensive). */
function readAgentMessage(item: unknown): { phase: string | undefined; text: string } | undefined {
  if (typeof item !== 'object' || item === null) return undefined
  const record = item as Record<string, unknown>
  if (record.type !== 'agentMessage') return undefined
  const phase = typeof record.phase === 'string' ? record.phase : undefined
  const text = typeof record.text === 'string' ? record.text : ''
  return { phase, text }
}

/** Attach notification + server-request handlers to a client for one run. */
function attachRunHandlers(client: AppServerClient, run: CodexRun): void {
  // Server→client requests: fail closed (decline approvals, empty answers).
  client.setServerRequestHandler(async request => {
    pushActivity(run, {
      at: Date.now(), kind: 'warning',
      text: `approval request declined (fail-closed): ${request.method}`,
    })
    return failClosedDecision(request.method)
  })

  client.setNotificationHandler((method, params) => {
    const at = Date.now()
    const p = (params ?? {}) as Record<string, unknown>

    // Correlation: ignore events that name another thread.
    const eventThread = typeof p.threadId === 'string' ? p.threadId : undefined
    if (eventThread !== undefined && run.threadId !== undefined && eventThread !== run.threadId) return

    switch (method) {
      case 'thread/tokenUsage/updated':
        run.usage = (p.usage ?? p.tokenUsage ?? undefined) as Record<string, unknown> | undefined
        return
      case 'warning':
      case 'model/rerouted':
      case 'deprecationNotice':
        pushActivity(run, { at, kind: 'warning', text: method })
        return
      case 'item/reasoning/textDelta':
      case 'item/reasoning/summaryTextDelta':
        // Reasoning forwarding stays off by default (config level later);
        // only its existence is visible as an info beat.
        return
      case 'item/started':
      case 'item/completed': {
        const item = p.item
        const described = describeItem(item)
        if (described !== undefined) {
          let text = described.text
          if (described.kind === 'command' && method === 'item/completed') {
            const output = (item as Record<string, unknown>).aggregatedOutput
            if (typeof output === 'string' && output.trim() !== '') {
              text += ` → ${tail(output.replace(/\s+/g, ' ').trim(), 200)}`
            }
          }
          pushActivity(run, { at, kind: described.kind, text })
        }
        if (method === 'item/completed') {
          const message = readAgentMessage(item)
          if (message !== undefined && message.phase === 'final_answer' && message.text.trim() !== '') {
            run.finalAnswer = message.text
          }
        }
        return
      }
      case 'item/agentMessage/delta': {
        const delta = typeof p.delta === 'string' ? p.delta : ''
        const itemId = typeof p.itemId === 'string' ? p.itemId : ''
        if (itemId !== '' && run.liveAnswerItemId !== itemId) {
          run.liveAnswerItemId = itemId
          run.liveAnswer = ''
        }
        run.liveAnswer += delta
        return
      }
      case 'error': {
        const error = p.error as { message?: unknown } | undefined
        const message = error !== undefined && typeof error.message === 'string' ? error.message : method
        run.errorText = message
        return
      }
      case 'turn/completed': {
        if (run.settled) return
        const turn = (p.turn ?? {}) as Record<string, unknown>
        const status = typeof turn.status === 'string' ? turn.status : undefined
        const turnError = turn.error as { message?: unknown } | undefined
        if (status === 'completed') {
          settleRun(run, 'succeeded')
        } else if (status === 'interrupted') {
          settleRun(run, 'interrupted')
        } else {
          const detail = turnError !== undefined && typeof turnError.message === 'string'
            ? turnError.message
            : run.errorText
          settleRun(run, 'failed', detail)
        }
        // Release the process promptly after settlement.
        void run.client?.dispose()
        return
      }
      default:
        return
    }
  })
}

// The live-answer item id rides on the run record without polluting the type.

/** Fail-closed decisions for server→client requests. */
function failClosedDecision(method: string): unknown {
  switch (method) {
    case 'execCommandApproval':
    case 'applyPatchApproval':
      return { decision: 'abort' }
    case 'item/commandExecution/requestApproval':
    case 'item/fileChange/requestApproval':
      return { decision: 'decline' }
    case 'item/permissions/requestApproval':
      return { permissions: {} }
    case 'item/tool/requestUserInput':
      return { answers: {} }
    case 'mcpServer/elicitation/request':
      return { action: 'decline' }
    default:
      throw new Error(`unsupported server request: ${method}`)
  }
}

/** Settle a run exactly once. */
function settleRun(
  run: CodexRun,
  outcome: 'succeeded' | 'failed' | 'interrupted',
  errorText?: string,
): void {
  if (run.settled) return
  run.settled = true
  run.outcome = outcome
  run.endedAt = Date.now()
  run.errorText = errorText ?? run.errorText
  if (outcome === 'failed' && (errorText === undefined || errorText === '') && run.errorText === undefined) {
    run.errorText = 'the codex turn failed'
  }
}

/** Start one codex child (new thread OR resumed thread); returns immediately. */
async function startCodexRun(
  subprocess: SubprocessFace,
  args: Record<string, unknown>,
): Promise<{ ok: true; runId: string; threadId?: string } | { ok: false; error: string }> {
  let cwd: string
  let prompt: string
  try {
    cwd = resolveDirectory(args.cwd, 'cwd')
    const promptValue = args.prompt ?? args.instructions
    if (typeof promptValue !== 'string' || promptValue.trim() === '') throw new Error('prompt is required')
    prompt = promptValue
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
  const model = typeof args.model === 'string' ? args.model.trim() : ''
  const effort = typeof args.effort === 'string' ? args.effort.trim() : ''
  const sandbox = typeof args.sandbox === 'string' ? args.sandbox.trim() : ''
  const taskId = typeof args.taskId === 'string' && args.taskId.trim() !== '' ? args.taskId.trim() : undefined
  const resumeThreadId = typeof args.resumeThreadId === 'string' && args.resumeThreadId.trim() !== ''
    ? args.resumeThreadId.trim()
    : undefined
  if (resumeThreadId !== undefined && taskId === undefined) {
    return { ok: false, error: 'resuming requires the owning taskId' }
  }

  // Concurrency guard: bounded active children (fail loud, never queue silently).
  const active = [...runs.values()].filter(run => run.endedAt === undefined).length
  if (active >= MAX_ACTIVE_RUNS) {
    return { ok: false, error: `too many active codex runs (${active}/${MAX_ACTIVE_RUNS}); try again later` }
  }

  let codexPath: string
  try {
    codexPath = await subprocess.resolveExecutable('codex')
  } catch {
    return { ok: false, error: 'the codex CLI was not found on this machine' }
  }

  // Continuation is fail-closed: the binding must exist, name the same
  // thread, and fingerprint the same workspace.
  if (resumeThreadId !== undefined) {
    const bindingsDir = bindingDirectory()
    const binding = await loadBinding(bindingsDir, taskId!)
    if (binding === undefined) {
      return { ok: false, error: 'no thread binding exists for this task; start a fresh run instead' }
    }
    if (binding.threadId !== resumeThreadId) {
      return { ok: false, error: 'thread binding mismatch; refusing to resume a different conversation' }
    }
    if (binding.cwdFingerprint !== fingerprintCwd(cwd)) {
      return { ok: false, error: 'workspace changed since this thread was created; refusing to resume' }
    }
  }

  const runId = randomUUID()
  const run: CodexRun = {
    id: runId,
    cwd,
    startedAt: Date.now(),
    endedAt: undefined,
    threadId: undefined,
    turnId: undefined,
    settled: false,
    outcome: undefined,
    errorText: undefined,
    client: undefined,
    liveAnswer: '',
    finalAnswer: undefined,
    activity: [],
    usage: undefined,
    cancelRequested: false,
    interruptSent: false,
    timedOut: false,
  }
  runs.set(runId, run)

  // Explicit sandbox always (plan §8): a pinned permission preset maps 1:1;
  // absent defaults to workspace-scoped writes, never the server default.
  const sandboxMode: 'read-only' | 'workspace-write' | 'danger-full-access' =
    sandbox === 'read-only' || sandbox === 'danger-full-access'
      ? sandbox as 'read-only' | 'danger-full-access'
      : 'workspace-write'

  try {
    const client = new AppServerClient({
      subprocess,
      codexPath,
      cwd,
      env: codexChildEnvironment(homedir(), codexHome()),
      clientInfo: { name: 'dsh-task-board-model', title: 'DSH Task Board', version: '0.2.0' },
    })
    attachRunHandlers(client, run)
    run.client = client

    await client.start()

    // New thread, or validated resume of the persisted one.
    let thread: Record<string, unknown>
    if (resumeThreadId !== undefined) {
      thread = await client.threadResume({
        threadId: resumeThreadId,
        ...(cwd === undefined ? {} : { cwd }),
        ...(model === '' ? {} : { model }),
        approvalPolicy: 'never',
        sandbox: sandboxMode,
      })
    } else {
      thread = await client.threadStart({
        cwd,
        ...(model === '' ? {} : { model }),
        approvalPolicy: 'never',
        sandbox: sandboxMode,
        ephemeral: false,
      })
    }
    run.threadId = String(thread.id)
    const cliVersion = typeof thread.cliVersion === 'string' ? thread.cliVersion : undefined

    // Persist the binding BEFORE the first prompt of the thread (the plan's
    // ordering rule) so a crash mid-turn still leaves a resumable identity.
    if (taskId !== undefined) {
      await saveBinding(bindingDirectory(), {
        version: 1,
        taskId,
        threadId: run.threadId,
        cwdFingerprint: fingerprintCwd(cwd),
        ...(cliVersion === undefined ? {} : { cliVersion }),
        createdAt: Date.now(),
      }).catch(error => {
        pushActivity(run, { at: Date.now(), kind: 'warning', text: `binding save failed: ${String(error)}` })
      })
    }

    const turn = await client.turnStart({
      threadId: run.threadId,
      input: [{ type: 'text', text: prompt }],
      ...(effort === '' ? {} : { effort }),
    })
    run.turnId = String(turn.id)

    // Safety-net timeout + exit watcher (both release resources).
    const timer = setTimeout(() => {
      if (runs.get(runId) !== run || run.settled) return
      run.timedOut = true
      settleRun(run, 'failed', `codex turn exceeded ${Math.round(CODEX_RUN_TIMEOUT_MS / 60000)} minutes and was stopped`)
      void run.client?.dispose()
    }, CODEX_RUN_TIMEOUT_MS)
    timer.unref?.()

    void client.waitForExit().then(exit => {
      clearTimeout(timer)
      if (!run.settled) {
        const crashed = !(exit.exitCode === 0 && exit.signal === null)
        settleRun(run, crashed ? 'failed' : 'succeeded',
          crashed ? `app-server exited unexpectedly (${exit.exitCode ?? 'signal ' + String(exit.signal)})${client.getStderrTail() !== '' ? ': ' + tail(client.getStderrTail().replace(/\s+/g, ' ').trim(), 300) : ''}` : undefined)
      }
      pruneRuns(Date.now())
    }).catch(() => {
      clearTimeout(timer)
      if (!run.settled) settleRun(run, 'failed', 'app-server process failed')
    })
  } catch (error) {
    settleRun(run, 'failed', error instanceof Error ? error.message : String(error))
    void run.client?.dispose()
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, error: `codex could not be started: ${message}` }
  }

  return { ok: true, runId, ...(run.threadId === undefined ? {} : { threadId: run.threadId }) }
}

/** Project one run to its status payload (shared by status polling). */
function runStatus(run: CodexRun): Record<string, unknown> {
  const settled = run.settled
  const state = !settled
    ? 'running'
    : run.outcome === 'succeeded' ? 'succeeded'
      : run.outcome === 'interrupted' ? 'interrupted'
        : 'failed'
  const answer = run.finalAnswer ?? run.liveAnswer
  return {
    ok: true,
    state,
    threadId: run.threadId,
    turnId: run.turnId,
    cwd: run.cwd,
    startedAt: run.startedAt,
    ...(run.endedAt !== undefined ? { endedAt: run.endedAt, durationMs: run.endedAt - run.startedAt } : {}),
    ...(run.cancelRequested ? { cancelRequested: true } : {}),
    ...(answer.trim() !== '' ? { outputTail: tail(answer, ANSWER_TAIL_CHARS), lastMessage: tail(answer, ANSWER_TAIL_CHARS) } : {}),
    ...(run.errorText !== undefined ? { error: tail(run.errorText, 600) } : {}),
    ...(run.activity.length > 0 ? { activity: run.activity.slice(-ACTIVITY_RING) } : {}),
    ...(run.usage !== undefined ? { usage: run.usage } : {}),
    ...(settled && state === 'failed' && run.errorText === undefined ? { error: 'codex run failed' } : {}),
  }
}

/** Steer the active turn of one run. */
async function steerCodexRun(args: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  const runId = typeof args.runId === 'string' ? args.runId : ''
  const content = typeof args.content === 'string' ? args.content : ''
  if (runId === '' || content.trim() === '') return { ok: false, error: 'runId and content are required' }
  const run = runs.get(runId)
  if (run === undefined) return { ok: false, error: 'unknown-run' }
  if (run.settled || run.client === undefined || run.threadId === undefined || run.turnId === undefined) {
    return { ok: false, error: 'no active turn to steer' }
  }
  try {
    await run.client.turnSteer({ threadId: run.threadId, expectedTurnId: run.turnId, input: [{ type: 'text', text: content }] })
    pushActivity(run, { at: Date.now(), kind: 'info', text: 'steered with additional input' })
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/** Cancel one run: interrupt the turn first; force-kill only after grace. */
async function cancelCodexRun(args: Record<string, unknown>): Promise<{ ok: boolean; error?: string; state?: string }> {
  const runId = typeof args.runId === 'string' ? args.runId : ''
  const run = runs.get(runId)
  if (run === undefined) return { ok: false, error: 'unknown-run' }
  if (run.settled) return { ok: true, state: 'already-settled' }
  run.cancelRequested = true
  const client = run.client
  if (client === undefined) return { ok: true, state: 'cancelling' }

  if (!run.interruptSent && run.threadId !== undefined && run.turnId !== undefined) {
    run.interruptSent = true
    void client.turnInterrupt({ threadId: run.threadId, turnId: run.turnId }).catch(() => {
      // Interrupt rejected (turn already finishing): grace path handles it.
    })
    // If the turn does not settle within the grace period, escalate.
    setTimeout(() => {
      if (!run.settled) {
        settleRun(run, 'interrupted', 'codex turn was cancelled')
        void client.dispose()
      }
    }, INTERRUPT_GRACE_MS).unref?.()
  }
  return { ok: true, state: 'cancelling' }
}

// --- codex environment ----------------------------------------------------------

/** One reasoning level advertised by one codex model. */
export interface CodexEffortOption {
  id: string
  description?: string
}

/** One codex model projected from models_cache.json. */
export interface CodexModelOption {
  slug: string
  displayName: string
  description?: string
  efforts: readonly CodexEffortOption[]
  defaultEffort?: string
}

/** The env payload served to the browser. */
export interface CodexEnvPayload {
  available: boolean
  version?: string
  home: string
  defaultModel?: string
  defaultEffort?: string
  models: readonly CodexModelOption[]
}

/** Resolve CODEX_HOME the way the CLI does (env override, else ~/.codex). */
export function codexHome(): string {
  return process.env.CODEX_HOME?.trim() !== '' && process.env.CODEX_HOME !== undefined
    ? process.env.CODEX_HOME
    : join(homedir(), '.codex')
}

/** Extract top-level `key = "value"` pairs from config.toml without a TOML dep. Standard TOML requires bare keys to precede the first `[table]` header, so collection stops there. */
export function parseTopLevelStrings(toml: string): Map<string, string> {
  const values = new Map<string, string>()
  for (const line of toml.split(/\r?\n/)) {
    if (/^\s*\[/.test(line)) break
    const match = /^([A-Za-z0-9_-]+)\s*=\s*"((?:[^"\\]|\\.)*)"\s*(?:#.*)?$/.exec(line)
    if (match !== null && !values.has(match[1]!)) values.set(match[1]!, match[2]!.replace(/\\"/g, '"'))
  }
  return values
}

/** Shape-check one models_cache.json entry before projecting it. */
function projectModel(entry: unknown): CodexModelOption | undefined {
  if (typeof entry !== 'object' || entry === null) return undefined
  const record = entry as Record<string, unknown>
  if (typeof record.slug !== 'string' || record.slug === '') return undefined
  // Entries the CLI hides from its own pickers stay hidden here; unknown
  // visibility strings degrade to visible (forward compatibility).
  if (record.visibility === 'hidden') return undefined
  const rawEfforts = Array.isArray(record.supported_reasoning_levels) ? record.supported_reasoning_levels : []
  const efforts: CodexEffortOption[] = []
  for (const level of rawEfforts) {
    if (typeof level !== 'object' || level === null) continue
    const effortRecord = level as Record<string, unknown>
    if (typeof effortRecord.effort !== 'string' || effortRecord.effort === '') continue
    efforts.push({
      id: effortRecord.effort,
      ...(typeof effortRecord.description === 'string' ? { description: effortRecord.description } : {}),
    })
  }
  return {
    slug: record.slug,
    displayName: typeof record.display_name === 'string' && record.display_name !== ''
      ? record.display_name
      : record.slug,
    ...(typeof record.description === 'string' ? { description: record.description } : {}),
    efforts,
    ...(typeof record.default_reasoning_level === 'string' ? { defaultEffort: record.default_reasoning_level } : {}),
  }
}

/** Read the machine's codex environment (best effort; never throws). */
export async function readCodexEnv(subprocess: SubprocessFace | undefined): Promise<CodexEnvPayload> {
  const home = codexHome()
  const payload: CodexEnvPayload = { available: false, home, models: [] }
  try {
    const [cacheRaw, configRaw] = await Promise.all([
      readFile(join(home, 'models_cache.json'), 'utf8').catch(() => undefined),
      readFile(join(home, 'config.toml'), 'utf8').catch(() => undefined),
    ])
    if (configRaw !== undefined) {
      const config = parseTopLevelStrings(configRaw)
      payload.defaultModel = config.get('model')
      payload.defaultEffort = config.get('model_reasoning_effort')
    }
    if (cacheRaw !== undefined) {
      const parsed: unknown = JSON.parse(cacheRaw)
      if (typeof parsed === 'object' && parsed !== null && Array.isArray((parsed as Record<string, unknown>).models)) {
        const models = ((parsed as Record<string, unknown>).models as unknown[])
          .map(projectModel)
          .filter((model): model is CodexModelOption => model !== undefined)
        payload.models = models
      }
    }
  } catch {
    // Malformed cache/config degrades to an empty catalog; availability below still probes the bin.
  }
  payload.available = payload.models.length > 0
  if (!payload.available && subprocess !== undefined) {
    try {
      await subprocess.resolveExecutable('codex')
      payload.available = true
    } catch {
      payload.available = false
    }
  }
  return payload
}

// --- git worktrees ---------------------------------------------------------------

/** Directory name created inside a repo to hold this plugin's worktrees. */
export const WORKTREE_DIR_NAME = '.dsh-worktrees'

/**
 * Sanitize a user-supplied branch or derive one from the task title:
 * git check-ref-format basics enforced, always non-empty.
 */
export function sanitizeBranchName(branch: string | undefined, title: string | undefined, now: number): string {
  const candidate = (branch ?? '').trim().replace(/^refs\/heads\//, '')
  if (candidate !== '') {
    if (!isValidBranchName(candidate)) throw new Error(`invalid branch name: ${candidate}`)
    return candidate
  }
  return slugifyBranch(title ?? '', now)
}

/**
 * Create (or reuse) a git worktree for one repo. The worktree lives at
 * `<repoRoot>/.dsh-worktrees/<branch with / → ->`, and that directory is
 * appended to `.git/info/exclude` so it never shows up in git status.
 */
export async function createWorktree(
  subprocess: SubprocessFace,
  args: Record<string, unknown>,
): Promise<{ ok: true; path: string; branch: string; repoRoot: string; created: boolean } | { ok: false; error: string }> {
  let repoPath: string
  try {
    repoPath = resolveDirectory(args.repoPath ?? args.cwd, 'repoPath')
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
  let branch: string
  try {
    branch = sanitizeBranchName(await stringField(args, 'branch'), await stringField(args, 'title'), Date.now())
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }

  let root: string
  try {
    const probe = await runShort(subprocess, ['git', 'rev-parse', '--show-toplevel'], repoPath, GIT_COMMAND_TIMEOUT_MS)
    if (probe.exitCode !== 0) {
      return { ok: false, error: `not a git repository: ${repoPath}`.concat(probe.stderr.trim() === '' ? '' : ` (${tail(probe.stderr, 200)})`) }
    }
    root = probe.stdout.trim().split(/\r?\n/)[0] ?? ''
    if (root === '') return { ok: false, error: 'git did not report a repository root' }
  } catch (error) {
    return { ok: false, error: `git rev-parse failed: ${error instanceof Error ? error.message : String(error)}` }
  }

  const parentDir = join(root, WORKTREE_DIR_NAME)
  const dirName = branch.replace(/\//g, '-')
  const worktreePath = join(parentDir, dirName)

  // Idempotent reuse: an existing worktree checked out at this branch wins.
  try {
    const stat = statSync(worktreePath)
    if (stat.isDirectory()) {
      const inside = await runShort(subprocess, ['git', 'rev-parse', '--is-inside-work-tree'], worktreePath, GIT_COMMAND_TIMEOUT_MS)
      if (inside.exitCode === 0 && inside.stdout.trim() === 'true') {
        return { ok: true, path: realpathSync(worktreePath), branch, repoRoot: root, created: false }
      }
      return { ok: false, error: `target exists but is not a worktree: ${worktreePath}` }
    }
  } catch {
    // Not there yet — fall through and create it.
  }

  try {
    const mkdir = await runShort(subprocess, ['mkdir', '-p', parentDir], root, GIT_COMMAND_TIMEOUT_MS)
    if (mkdir.exitCode !== 0) return { ok: false, error: `failed to create ${parentDir}: ${tail(mkdir.stderr, 200)}` }
    // Local-only ignore so the worktree parent never dirties git status.
    const excludePath = join(root, '.git', 'info', 'exclude')
    const excludeLine = `${WORKTREE_DIR_NAME}/`
    const current = await readFile(excludePath, 'utf8').catch(() => '')
    if (!current.split(/\r?\n/).some(line => line.trim() === excludeLine)) {
      await writeFile(excludePath, `${current}${current !== '' && !current.endsWith('\n') ? '\n' : ''}${excludeLine}\n`, 'utf8')
    }
    // Reuse the branch when it already exists; otherwise create it here.
    const showRef = await runShort(subprocess, ['git', 'show-ref', '--verify', '--quiet', `refs/heads/${branch}`], root, GIT_COMMAND_TIMEOUT_MS)
    const createArgv = showRef.exitCode === 0
      ? ['git', 'worktree', 'add', worktreePath, branch]
      : ['git', 'worktree', 'add', '-b', branch, worktreePath]
    const added = await runShort(subprocess, createArgv, root, GIT_COMMAND_TIMEOUT_MS)
    if (added.exitCode !== 0) {
      return { ok: false, error: `git worktree add failed: ${tail(added.stderr !== '' ? added.stderr : added.stdout, 400)}` }
    }
    return { ok: true, path: realpathSync(worktreePath), branch, repoRoot: root, created: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/** Remove a worktree created earlier (`git worktree remove`). */
export async function removeWorktree(
  subprocess: SubprocessFace,
  args: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  const path = typeof args.path === 'string' ? args.path.trim() : ''
  if (path === '') return { ok: false, error: 'path is required' }
  const force = args.force === true
  try {
    const argv = force ? ['git', 'worktree', 'remove', '--force', path] : ['git', 'worktree', 'remove', path]
    const removed = await runShort(subprocess, argv, path, GIT_COMMAND_TIMEOUT_MS)
    if (removed.exitCode !== 0) {
      return { ok: false, error: tail(removed.stderr !== '' ? removed.stderr : removed.stdout, 400) }
    }
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// --- route registration -------------------------------------------------------------

/** Route paths served on the harness web server. */
export const ROUTE_CODEX_START = '/dsh-task-board/codex/start'
export const ROUTE_CODEX_STATUS = '/dsh-task-board/codex/status'
export const ROUTE_CODEX_CANCEL = '/dsh-task-board/codex/cancel'
export const ROUTE_CODEX_STEER = '/dsh-task-board/codex/steer'
export const ROUTE_CODEX_ENV = '/dsh-task-board/codex/env'
export const ROUTE_WORKTREE_CREATE = '/dsh-task-board/worktree/create'
export const ROUTE_WORKTREE_REMOVE = '/dsh-task-board/worktree/remove'

/**
 * The business logic of every task-board host route, keyed by path and free
 * of HTTP concerns (each takes a parsed JSON body, returns a JSON-able
 * payload with an `ok` field). Exposed separately so tests can drive the
 * flows without faking http.ServerResponse.
 */
export function taskBoardRouteHandlers(
  subprocess: SubprocessFace | undefined,
): Map<string, (args: Record<string, unknown>) => Promise<unknown>> {
  type RouteHandler = (args: Record<string, unknown>) => Promise<unknown>
  const handlers = new Map<string, RouteHandler>([
    [ROUTE_CODEX_ENV, async () => {
      const env = await readCodexEnv(subprocess)
      return { ok: true, ...env }
    }],
    [ROUTE_CODEX_START, async args => {
      if (subprocess === undefined) return { ok: false, error: 'the subprocess service is not mounted' }
      return startCodexRun(subprocess, args)
    }],
    [ROUTE_CODEX_STATUS, async args => {
      const runId = typeof args.runId === 'string' ? args.runId : ''
      const run = runs.get(runId)
      if (run === undefined) return { ok: false, error: 'unknown-run' }
      return runStatus(run)
    }],
    [ROUTE_CODEX_STEER, async args => steerCodexRun(args)],
    [ROUTE_CODEX_CANCEL, async args => cancelCodexRun(args)],
    [ROUTE_WORKTREE_CREATE, async args => {
      if (subprocess === undefined) return { ok: false, error: 'the subprocess service is not mounted' }
      return createWorktree(subprocess, args)
    }],
    [ROUTE_WORKTREE_REMOVE, async args => {
      if (subprocess === undefined) return { ok: false, error: 'the subprocess service is not mounted' }
      return removeWorktree(subprocess, args)
    }],
  ])
  return handlers
}

/**
 * Register every task-board host route on the harness web server. Each
 * handler owns its full response. Returns the registration results (cordis
 * treats them as disposers when returned from ctx.effect).
 */
export function registerTaskBoardRoutes(webServer: WebServerFace, subprocess: SubprocessFace | undefined): Array<unknown> {
  const handlers = taskBoardRouteHandlers(subprocess)
  return [...handlers.entries()].map(([path, handle]) =>
    webServer.register({
      kind: 'exact',
      path,
      async handler(req, res) {
        if (req.method !== 'POST') {
          respond(res, 405, { ok: false, error: 'method not allowed; use POST' })
          return
        }
        try {
          respond(res, 200, await handle(await readJsonBody(req)))
        } catch (error) {
          respond(res, 200, { ok: false, error: error instanceof Error ? error.message : String(error) })
        }
      },
    }))
}

/** Test-only visibility into the run registry. */
export function peekRunForTests(runId: string): CodexRun | undefined {
  return runs.get(runId)
}

/** Test hook: clear all runs between tests. */
export function resetRunsForTests(): void {
  runs.clear()
}

/** Exposed for tests: how many children may run at once. */
export function maxActiveRunsForTests(): number {
  return MAX_ACTIVE_RUNS
}
