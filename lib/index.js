import { installSettingsSection, settingsNamespace } from "@deepseek-ai/dsh-settings";
import z from "schemastery";
import { chmodSync, closeSync, openSync, realpathSync, statSync, writeSync } from "node:fs";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { createHash, randomUUID } from "node:crypto";
//#region src/core/tasks.ts
/**
* Turn a task title into a usable git branch slug: lowercase ASCII-ish word
* characters kept, everything else collapsed to `-`, trimmed of separators,
* with a compact timestamp suffix so two tasks with the same title never
* collide. Falls back to `task` when nothing survives the cleanup.
*/
function slugifyBranch(title, now) {
	const base = title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/g, "");
	const at = new Date(now);
	const stamp = `${String(at.getMonth() + 1).padStart(2, "0")}${String(at.getDate()).padStart(2, "0")}${String(at.getHours()).padStart(2, "0")}${String(at.getMinutes()).padStart(2, "0")}`;
	return `${base === "" ? "task" : base}-${stamp}`;
}
/** Whether a proposed branch name satisfies git's check-ref-format basics. */
function isValidBranchName(branch) {
	if (!/^[^\s~^:?*[\\]+$/.test(branch)) return false;
	if (branch.startsWith("-") || branch.startsWith("/") || branch.endsWith("/") || branch.endsWith(".") || branch.endsWith(".lock")) return false;
	if (branch.includes("..") || branch.includes("//")) return false;
	return true;
}
//#endregion
//#region src/host/appserver-client.ts
/** Default fail-closed answers per server-request family. */
function failClosedResponse(method) {
	switch (method) {
		case "execCommandApproval":
		case "applyPatchApproval": return { decision: "abort" };
		case "item/commandExecution/requestApproval":
		case "item/fileChange/requestApproval": return { decision: "decline" };
		case "item/permissions/requestApproval": return { permissions: {} };
		case "item/tool/requestUserInput": return { answers: {} };
		case "mcpServer/elicitation/request": return { action: "decline" };
		default: throw new Error(`unsupported server request: ${method}`);
	}
}
/**
* One app-server child process with a typed request surface. Each active
* turn uses a fresh client (process-per-turn MVP), while Codex threads
* persist on disk across processes.
*/
var AppServerClient = class {
	options;
	nextRequestId = 1;
	pending = /* @__PURE__ */ new Map();
	stderrTail = "";
	exitFacts;
	exited = false;
	waitersExited = [];
	handle;
	started = false;
	notificationHandler;
	serverRequestHandler;
	/** Internal diagnostics (malformed lines, oversized lines). */
	diagnostics = [];
	constructor(options) {
		this.options = {
			stderrMaxBytes: 64 * 1024,
			requestTimeoutMs: 12e4,
			maxLineBytes: 8 * 1024 * 1024,
			...options
		};
	}
	/**
	* Register the notification sink. Must be called before start(); the run
	* layer correlates events there.
	*/
	setNotificationHandler(handler) {
		this.notificationHandler = handler;
	}
	/**
	* Register the server→client request policy. When absent, every request is
	* answered with the built-in fail-closed response.
	*/
	setServerRequestHandler(handler) {
		this.serverRequestHandler = handler;
	}
	/** Whether the underlying process has exited. */
	get hasExited() {
		return this.exited;
	}
	/** Bounded tail of everything the process wrote to stderr. */
	getStderrTail() {
		return this.stderrTail;
	}
	/** Resolves once the process tree has exited. */
	waitForExit() {
		if (this.exitFacts !== void 0) return Promise.resolve(this.exitFacts);
		return new Promise((resolve) => {
			this.waitersExited.push(() => resolve(this.exitFacts));
		});
	}
	/**
	* Spawn the fixed argv and complete the initialize handshake. Safe to call
	* once per instance; a second call rejects.
	*/
	async start() {
		if (this.started) throw new Error("app-server client already started");
		this.started = true;
		this.handle = this.options.subprocess.spawn({
			argv: [
				this.options.codexPath,
				"app-server",
				"--stdio"
			],
			cwd: this.options.cwd,
			env: this.options.env,
			stdio: {
				stdin: "pipe",
				stdout: "pipe",
				stderr: "pipe"
			},
			graceMs: 5e3
		});
		const stdout = this.handle?.stdout;
		if (stdout === void 0) throw new Error("app-server stdout pipe missing");
		let buffer = "";
		let overflowReported = false;
		stdout.setEncoding("utf8");
		stdout.on("data", (chunk) => {
			buffer += chunk;
			for (;;) {
				const newlineAt = buffer.indexOf("\n");
				if (newlineAt === -1) {
					if (buffer.length > this.options.maxLineBytes && !overflowReported) {
						overflowReported = true;
						this.diagnostic("stdout line exceeded the size cap; dropping until the next newline");
					}
					break;
				}
				const line = buffer.slice(0, newlineAt).trim();
				buffer = buffer.slice(newlineAt + 1);
				overflowReported = false;
				if (line !== "") this.handleLine(line);
			}
		});
		const stderr = this.handle?.stderr;
		stderr?.setEncoding("utf8");
		stderr?.on("data", (chunk) => {
			this.appendStderr(chunk);
		});
		this.handle.done.then((outcome) => {
			this.exited = true;
			this.exitFacts = outcome;
			for (const [, entry] of this.pending) {
				clearTimeout(entry.timer);
				entry.reject(/* @__PURE__ */ new Error(`app-server exited (${outcome.exitCode ?? "signal " + String(outcome.signal)}) during ${entry.method}`));
			}
			this.pending.clear();
			for (const waiter of this.waitersExited.splice(0)) waiter();
		}, () => {
			this.exited = true;
			this.exitFacts = {
				exitCode: null,
				signal: null
			};
			for (const [, entry] of this.pending) {
				clearTimeout(entry.timer);
				entry.reject(/* @__PURE__ */ new Error(`app-server spawn failed during ${entry.method}`));
			}
			this.pending.clear();
			for (const waiter of this.waitersExited.splice(0)) waiter();
		});
		await this.request("initialize", { clientInfo: this.options.clientInfo }, 3e4);
		this.notify("initialized");
	}
	/**
	* Begin the SIGTERM → grace → SIGKILL escalation on the process tree and
	* wait for full exit. Idempotent.
	*/
	async dispose() {
		if (this.handle === void 0) return;
		if (this.exited) {
			await this.waitForExit().catch(() => void 0);
			return;
		}
		try {
			this.handle.terminate();
		} catch {}
		await this.waitForExit().catch(() => void 0);
	}
	/** Send one request and await its result (rejects on error/timeout/exit). */
	request(method, params, timeoutMs = this.options.requestTimeoutMs) {
		if (this.exited) return Promise.reject(/* @__PURE__ */ new Error(`app-server exited before ${method}`));
		const id = this.nextRequestId += 1;
		const key = String(id);
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				this.pending.delete(key);
				reject(/* @__PURE__ */ new Error(`${method} timed out after ${Math.round(timeoutMs / 1e3)}s`));
			}, timeoutMs);
			timer.unref?.();
			this.pending.set(key, {
				resolve,
				reject,
				timer,
				method
			});
			this.write({
				jsonrpc: "2.0",
				id,
				method,
				params
			});
		});
	}
	/** Send one notification (no id, no response expected). */
	notify(method, params) {
		this.write({
			jsonrpc: "2.0",
			method,
			...params === void 0 ? {} : { params }
		});
	}
	/** Start a fresh persistent thread. Returns the created Thread view. */
	async threadStart(params) {
		const thread = (await this.request("thread/start", {
			...params.cwd === void 0 ? {} : { cwd: params.cwd },
			...params.model === void 0 ? {} : { model: params.model },
			...params.approvalPolicy === void 0 ? {} : { approvalPolicy: params.approvalPolicy },
			...params.approvalsReviewer === void 0 ? {} : { approvalsReviewer: params.approvalsReviewer },
			...params.sandbox === void 0 ? {} : { sandbox: params.sandbox },
			...params.ephemeral === void 0 ? {} : { ephemeral: params.ephemeral },
			...params.developerInstructions === void 0 ? {} : { developerInstructions: params.developerInstructions }
		}))?.thread;
		if (thread === void 0 || typeof thread.id !== "string") throw new Error("thread/start returned no thread id");
		return thread;
	}
	/**
	* Resume a persisted thread. The returned thread id MUST equal the
	* requested one — any mismatch fails loudly (the plan's continuation rule).
	*/
	async threadResume(params) {
		const thread = (await this.request("thread/resume", {
			threadId: params.threadId,
			...params.cwd === void 0 ? {} : { cwd: params.cwd },
			...params.model === void 0 ? {} : { model: params.model },
			...params.approvalPolicy === void 0 ? {} : { approvalPolicy: params.approvalPolicy },
			...params.sandbox === void 0 ? {} : { sandbox: params.sandbox }
		}))?.thread;
		if (thread === void 0 || typeof thread.id !== "string") throw new Error("thread/resume returned no thread id");
		if (thread.id !== params.threadId) throw new Error(`thread/resume returned ${String(thread.id)} instead of the requested ${params.threadId}`);
		return thread;
	}
	/** Read a persisted thread without resuming or subscribing to it. */
	async threadRead(threadId) {
		const thread = (await this.request("thread/read", {
			threadId,
			includeTurns: true
		}))?.thread;
		if (thread === void 0 || thread.id !== threadId) throw new Error("thread/read returned no matching thread");
		return thread;
	}
	/** Start one turn on a thread. Returns the Turn view (id + status). */
	async turnStart(params) {
		const turn = (await this.request("turn/start", {
			threadId: params.threadId,
			input: params.input,
			...params.effort === void 0 ? {} : { effort: params.effort },
			...params.model === void 0 ? {} : { model: params.model },
			...params.cwd === void 0 ? {} : { cwd: params.cwd },
			...params.sandbox === void 0 ? {} : { sandbox: params.sandbox }
		}))?.turn;
		if (turn === void 0 || typeof turn.id !== "string") throw new Error("turn/start returned no turn id");
		return turn;
	}
	/** Steer the active turn (fails when expectedTurnId is not active). */
	async turnSteer(params) {
		await this.request("turn/steer", {
			threadId: params.threadId,
			expectedTurnId: params.expectedTurnId,
			input: params.input
		});
	}
	/** Interrupt the active turn. Resolves when the server accepts the request. */
	async turnInterrupt(params) {
		await this.request("turn/interrupt", {
			threadId: params.threadId,
			turnId: params.turnId
		});
	}
	write(message) {
		const stdin = this.handle?.stdin;
		if (stdin === void 0 || this.exited) throw new Error("app-server stdin unavailable");
		stdin.write(JSON.stringify(message) + "\n");
	}
	handleLine(line) {
		if (line.length > this.options.maxLineBytes) {
			this.diagnostic("dropped an oversized incoming line");
			return;
		}
		let message;
		try {
			message = JSON.parse(line);
		} catch {
			this.diagnostic("dropped a malformed JSON line");
			return;
		}
		const method = typeof message.method === "string" ? message.method : void 0;
		if (method !== void 0 && message.id !== void 0 && message.result === void 0 && message.error === void 0) {
			const id = message.id;
			Promise.resolve().then(() => this.serverRequestHandler !== void 0 ? this.serverRequestHandler({
				id,
				method,
				params: message.params
			}) : failClosedResponse(method)).then((result) => {
				this.write({
					jsonrpc: "2.0",
					id,
					result: result ?? {}
				});
			}).catch((error) => {
				this.write({
					jsonrpc: "2.0",
					id,
					error: {
						code: -32603,
						message: error instanceof Error ? error.message : String(error)
					}
				});
			});
			return;
		}
		if (message.id !== void 0 && (message.result !== void 0 || message.error !== void 0)) {
			const key = String(message.id);
			const entry = this.pending.get(key);
			if (entry === void 0) return;
			this.pending.delete(key);
			clearTimeout(entry.timer);
			if (message.error !== void 0) {
				const error = message.error;
				const text = typeof error.message === "string" && error.message !== "" ? error.message : "app-server request failed";
				entry.reject(/* @__PURE__ */ new Error(`${entry.method} rejected: ${text}`));
			} else entry.resolve(message.result);
			return;
		}
		if (method !== void 0) try {
			this.notificationHandler?.(method, message.params);
		} catch (error) {
			this.diagnostic(`notification handler failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
	/** Bounded internal diagnostics (malformed/oversized lines, handler errors). */
	getDiagnostics() {
		return this.diagnostics;
	}
	diagnostic(line) {
		this.diagnostics.push(`${(/* @__PURE__ */ new Date()).toISOString()} ${line}`);
		if (this.diagnostics.length > 50) this.diagnostics.splice(0, this.diagnostics.length - 50);
	}
	/** Append to the bounded stderr tail (called by the owner wiring). */
	appendStderr(text) {
		const max = this.options.stderrMaxBytes;
		this.stderrTail = (this.stderrTail + text).slice(-max);
	}
};
/**
* Allowlisted environment overlay for the codex child: identity paths, temp
* directories, proxy settings, locale, and XDG dirs. The subprocess seam
* already strips credential-shaped ambient variables before this overlay.
*/
function codexChildEnvironment(home, codeHome) {
	const overlay = {};
	for (const key of [
		"PATH",
		"LANG",
		"LC_ALL",
		"TZ",
		"TMPDIR",
		"TMP",
		"TEMP",
		"USER",
		"LOGNAME",
		"SHELL",
		"HTTP_PROXY",
		"HTTPS_PROXY",
		"NO_PROXY",
		"http_proxy",
		"https_proxy",
		"no_proxy",
		"XDG_CONFIG_HOME",
		"XDG_CACHE_HOME",
		"XDG_DATA_HOME",
		"XDG_STATE_HOME"
	]) {
		const value = process.env[key];
		if (value !== void 0 && value !== "") overlay[key] = value;
	}
	overlay.HOME = home;
	overlay.CODEX_HOME = codeHome;
	return overlay;
}
//#endregion
//#region src/host/thread-bindings.ts
/**
* Durable DSH-session ↔ Codex-thread binding store (the plan's persistence
* layer, scoped to the task board: one binding per task-board task).
*
* Shape (version 1):
* {
*   version: 1,
*   taskId,            // board task the thread belongs to
*   threadId,          // persistent Codex thread
*   cwdFingerprint,    // sha256 of the normalized absolute cwd
*   cliVersion,        // codex CLI that created the thread
*   createdAt          // ms epoch
* }
*
* Rules from the plan:
* - binding files carry mode 0600 inside a 0700 directory where supported;
* - writes are atomic (temp file + rename);
* - malformed / missing / mismatched bindings fail closed;
* - removing a binding never touches board data or the parent history.
*/
/** Resolve the binding directory: DSH_HOME env (or explicit override), else ~/.dsh. */
function bindingDirectory(explicitHome) {
	return join(explicitHome !== void 0 && explicitHome.trim() !== "" ? explicitHome : process.env.DSH_HOME !== void 0 && process.env.DSH_HOME.trim() !== "" ? process.env.DSH_HOME : join(homedir(), ".dsh"), "task-board-model", "bindings");
}
/** Fingerprint a normalized absolute cwd. */
function fingerprintCwd(cwd) {
	return createHash("sha256").update(cwd).digest("hex");
}
/** File name for one task's binding (taskId is a uuid; still encode defensively). */
function bindingPath(directory, taskId) {
	return join(directory, `${encodeURIComponent(taskId)}.json`);
}
/** Structural + semantic validation of one parsed binding file. */
function parseBinding(raw) {
	let parsed;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return;
	}
	if (typeof parsed !== "object" || parsed === null) return void 0;
	const record = parsed;
	if (record.version !== 1) return void 0;
	if (typeof record.taskId !== "string" || record.taskId === "") return void 0;
	if (typeof record.threadId !== "string" || record.threadId === "") return void 0;
	if (typeof record.cwdFingerprint !== "string" || record.cwdFingerprint.length !== 64) return void 0;
	if (record.cliVersion !== void 0 && typeof record.cliVersion !== "string") return void 0;
	if (typeof record.createdAt !== "number" || !Number.isFinite(record.createdAt)) return void 0;
	return {
		version: 1,
		taskId: record.taskId,
		threadId: record.threadId,
		cwdFingerprint: record.cwdFingerprint,
		...record.cliVersion === void 0 ? {} : { cliVersion: record.cliVersion },
		createdAt: record.createdAt
	};
}
/**
* Persist one binding atomically: random temp file in the target directory
* (mode 0600), flush+close, then rename into place.
*/
async function saveBinding(directory, binding) {
	await mkdir(directory, {
		recursive: true,
		mode: 448
	});
	try {
		chmodSync(directory, 448);
	} catch {}
	const target = bindingPath(directory, binding.taskId);
	const temp = `${target}.${process.pid}.${Math.random().toString(36).slice(2, 10)}.tmp`;
	const handle = openSync(temp, "w", 384);
	try {
		const bytes = Buffer.from(JSON.stringify(binding), "utf8");
		let offset = 0;
		while (offset < bytes.length) offset += writeSync(handle, bytes, offset);
	} finally {
		closeSync(handle);
	}
	await rename(temp, target).catch(async (error) => {
		await unlink(temp).catch(() => void 0);
		throw error;
	});
}
/** Load and validate one binding; undefined when missing or malformed. */
async function loadBinding(directory, taskId) {
	let raw;
	try {
		raw = await readFile(bindingPath(directory, taskId), "utf8");
	} catch {
		return;
	}
	const binding = parseBinding(raw);
	if (binding === void 0) return void 0;
	if (binding.taskId !== taskId) return void 0;
	return binding;
}
//#endregion
//#region src/host/codex-routes.ts
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
* - POST /dsh-task-board/codex/import { taskId, threadId, cwd? }
*     → translate the stored Codex transcript into a durable native DSH
*       session and return its sessionId (idempotent per task).
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
/** Maximum accepted request body size (JSON payloads here are tiny). */
const MAX_BODY_BYTES = 64 * 1024;
/** Hard cap for one codex turn (safety net against zombie processes). */
const CODEX_RUN_TIMEOUT_MS = 7200 * 1e3;
/** Grace between turn/interrupt and forced process-tree termination. */
const INTERRUPT_GRACE_MS = 1e4;
/** Cap for one short git command (worktree add can take a moment on big repos). */
const GIT_COMMAND_TIMEOUT_MS = 3e4;
/** Tail length of answer text returned to the browser. */
const ANSWER_TAIL_CHARS = 6e3;
/** Finished runs kept for status queries before pruning. */
const FINISHED_RUN_TTL_MS = 3600 * 1e3;
const MAX_FINISHED_RUNS = 50;
/** Maximum concurrently active codex children (configurable via env). */
const MAX_ACTIVE_RUNS = positiveIntEnv("DSH_TASK_BOARD_MAX_CODEX_RUNS") ?? 8;
function positiveIntEnv(name) {
	const raw = process.env[name];
	if (raw === void 0 || raw.trim() === "") return void 0;
	const value = Number.parseInt(raw, 10);
	return Number.isFinite(value) && value > 0 ? value : void 0;
}
/** Send one JSON response and end it. */
function respond(res, statusCode, payload) {
	res.statusCode = statusCode;
	res.setHeader("content-type", "application/json; charset=utf-8");
	res.end(JSON.stringify(payload));
}
/** Read and size-cap a JSON request body. */
async function readJsonBody(req) {
	const chunks = [];
	let size = 0;
	for await (const chunk of req) {
		size += chunk.length;
		if (size > MAX_BODY_BYTES) throw new Error("request body too large");
		chunks.push(chunk);
	}
	if (chunks.length === 0) return {};
	return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
/** Keep only the last `max` characters, marking loss with an ellipsis. */
function tail(text, max) {
	const trimmed = text.replace(/\n+$/, "");
	if (trimmed.length <= max) return trimmed;
	return `…${trimmed.slice(-max)}`;
}
/** Resolve a directory request field to an existing absolute directory. */
function resolveDirectory(value, label) {
	if (typeof value !== "string" || value.trim() === "") throw new Error(`${label} is required`);
	const resolved = realpathSync(value);
	if (!statSync(resolved).isDirectory()) throw new Error(`${label} is not a directory: ${resolved}`);
	return resolved;
}
async function stringField(args, key) {
	const value = args[key];
	if (value === void 0 || value === null) return void 0;
	if (typeof value !== "string") throw new Error(`${key} must be a string`);
	const trimmed = value.trim();
	return trimmed === "" ? void 0 : trimmed;
}
/** Run one short command to completion, capturing both streams. */
async function runShort(subprocess, argv, cwd, timeoutMs) {
	const resolved = await subprocess.resolveExecutable(argv[0]);
	const handle = subprocess.spawn({
		argv: [resolved, ...argv.slice(1)],
		cwd,
		stdio: {
			stdin: "ignore",
			stdout: { maxBytes: 256 * 1024 },
			stderr: { maxBytes: 256 * 1024 }
		},
		graceMs: 1e3
	});
	let timedOut = false;
	const timer = setTimeout(() => {
		timedOut = true;
		try {
			handle.terminate();
		} catch {}
	}, timeoutMs);
	timer.unref?.();
	try {
		const outcome = await handle.done;
		if (timedOut) throw new Error(`command did not finish within ${Math.round(timeoutMs / 1e3)}s`);
		const read = (reader) => reader?.readFrom(0)?.text ?? "";
		return {
			exitCode: outcome.exitCode,
			signal: outcome.signal,
			stdout: read(handle.collected.stdout),
			stderr: read(handle.collected.stderr)
		};
	} finally {
		clearTimeout(timer);
	}
}
/** All runs of this process; pruned after the finished-run TTL. */
const runs = /* @__PURE__ */ new Map();
function pruneRuns(now) {
	for (const [id, run] of runs) if (run.endedAt !== void 0 && now - run.endedAt > FINISHED_RUN_TTL_MS) runs.delete(id);
	const settled = [...runs.values()].filter((run) => run.endedAt !== void 0).sort((a, b) => (a.endedAt ?? 0) - (b.endedAt ?? 0));
	for (const run of settled.slice(0, Math.max(0, settled.length - MAX_FINISHED_RUNS))) runs.delete(run.id);
}
function pushActivity(run, entry) {
	run.activity.push(entry);
	if (run.activity.length > 80) run.activity.splice(0, run.activity.length - 40);
}
/** Human summary of one ThreadItem (defensive: shapes may evolve). */
function describeItem(item) {
	if (typeof item !== "object" || item === null) return void 0;
	const record = item;
	switch (typeof record.type === "string" ? record.type : void 0) {
		case "commandExecution": return {
			kind: "command",
			text: `$ ${typeof record.command === "string" ? record.command : ""}`.trim()
		};
		case "fileChange": return {
			kind: "fileChange",
			text: summarizeFileChanges(record)
		};
		case "mcpToolCall": return {
			kind: "mcpToolCall",
			text: `${typeof record.server === "string" ? record.server : "mcp"}/${typeof record.tool === "string" ? record.tool : ""}`
		};
		case "webSearch": return {
			kind: "webSearch",
			text: "web search"
		};
		case "planUpdate":
		case "plan": return {
			kind: "plan",
			text: "plan update"
		};
		default: return;
	}
}
function summarizeFileChanges(record) {
	const changes = Array.isArray(record.changes) ? record.changes : [];
	const paths = [];
	for (const change of changes.slice(0, 5)) {
		if (typeof change !== "object" || change === null) continue;
		const path = change.path;
		if (typeof path === "string" && path !== "") paths.push(path);
	}
	const more = changes.length > paths.length ? ` (+${changes.length - paths.length} more)` : "";
	return paths.length > 0 ? `${paths.join(", ")}${more}` : "file change";
}
/** Extract the final-answer phase/text off one agentMessage item (defensive). */
function readAgentMessage(item) {
	if (typeof item !== "object" || item === null) return void 0;
	const record = item;
	if (record.type !== "agentMessage") return void 0;
	return {
		phase: typeof record.phase === "string" ? record.phase : void 0,
		text: typeof record.text === "string" ? record.text : ""
	};
}
/** Project a stored Codex thread onto the safe, chat-facing shape. */
function normalizeConversation(thread) {
	const turns = Array.isArray(thread.turns) ? thread.turns : [];
	return {
		threadId: String(thread.id),
		turns: turns.flatMap((value, turnIndex) => {
			if (typeof value !== "object" || value === null) return [];
			const turn = value;
			const items = Array.isArray(turn.items) ? turn.items : [];
			const messages = [];
			const activity = [];
			for (const [itemIndex, itemValue] of items.entries()) {
				if (typeof itemValue !== "object" || itemValue === null) continue;
				const item = itemValue;
				const id = typeof item.id === "string" && item.id !== "" ? item.id : `turn-${turnIndex}-item-${itemIndex}`;
				if (item.type === "userMessage") {
					const text = (Array.isArray(item.content) ? item.content : []).flatMap((part) => {
						if (typeof part !== "object" || part === null) return [];
						const record = part;
						return record.type === "text" && typeof record.text === "string" ? [record.text] : [];
					}).join("\n").trim();
					if (text !== "") messages.push({
						id,
						role: "user",
						text
					});
					continue;
				}
				const agentMessage = readAgentMessage(item);
				if (agentMessage !== void 0 && agentMessage.text.trim() !== "") {
					const phase = agentMessage.phase === "commentary" || agentMessage.phase === "final_answer" ? agentMessage.phase : void 0;
					messages.push({
						id,
						role: "assistant",
						text: agentMessage.text,
						...phase === void 0 ? {} : { phase }
					});
					continue;
				}
				const summary = describeItem(item);
				if (summary !== void 0) activity.push({
					id,
					...summary
				});
			}
			const errorRecord = typeof turn.error === "object" && turn.error !== null ? turn.error : void 0;
			const error = typeof errorRecord?.message === "string" ? errorRecord.message : void 0;
			return [{
				id: typeof turn.id === "string" && turn.id !== "" ? turn.id : `turn-${turnIndex}`,
				status: typeof turn.status === "string" ? turn.status : "unknown",
				messages,
				activity,
				...error === void 0 ? {} : { error }
			}];
		})
	};
}
/** Read one task-owned thread without resuming it or subscribing to events. */
async function readCodexConversation(subprocess, args) {
	const taskId = typeof args.taskId === "string" ? args.taskId.trim() : "";
	const expectedThreadId = typeof args.threadId === "string" ? args.threadId.trim() : "";
	if (taskId === "" || expectedThreadId === "") return {
		ok: false,
		error: "taskId and threadId are required"
	};
	const binding = await loadBinding(bindingDirectory(), taskId);
	if (binding === void 0) return {
		ok: false,
		error: "no thread binding exists for this task"
	};
	if (binding.threadId !== expectedThreadId) return {
		ok: false,
		error: "thread binding mismatch"
	};
	let codexPath;
	try {
		codexPath = await subprocess.resolveExecutable("codex");
	} catch {
		return {
			ok: false,
			error: "the codex CLI was not found on this machine"
		};
	}
	const client = new AppServerClient({
		subprocess,
		codexPath,
		cwd: homedir(),
		env: codexChildEnvironment(homedir(), codexHome()),
		clientInfo: {
			name: "dsh-task-board-model",
			title: "DSH Task Board",
			version: "0.2.0"
		}
	});
	try {
		await client.start();
		return {
			ok: true,
			conversation: normalizeConversation(await client.threadRead(binding.threadId))
		};
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : String(error)
		};
	} finally {
		await client.dispose();
	}
}
/** Stable native-session identity for one task's imported Codex transcript. */
function nativeSessionIdForTask(taskId) {
	return `task-board-codex-${taskId}`;
}
/** Whether a native session already exists in memory or durable storage. */
async function nativeSessionExists(bridge, sessionId) {
	if (bridge.sessions.get(sessionId) !== void 0) return true;
	if (bridge.persistence === void 0) return false;
	try {
		return (await bridge.persistence.list()).some((header) => header.id === sessionId);
	} catch {
		return false;
	}
}
/** Turn one Codex message into the provider-neutral DSH message shape. */
function nativeMessage(message, taskId, turnId, messageIndex) {
	const text = typeof message.text === "string" ? message.text.trim() : "";
	const role = message.role;
	if (text === "" || role !== "user" && role !== "assistant") return void 0;
	const id = typeof message.id === "string" && message.id !== "" ? `codex-${taskId}-${turnId}-${message.id}` : `codex-${taskId}-${turnId}-message-${messageIndex}`;
	if (role === "user") return {
		id,
		role: "user",
		content: [{
			type: "text",
			text
		}],
		source: { kind: "user" }
	};
	return {
		id,
		role: "assistant",
		content: [{
			type: "text",
			text
		}],
		source: {
			kind: "model",
			provider: "codex",
			model: "codex-app-server"
		}
	};
}
/** Map a Codex turn status to the native DSH turn-end reason vocabulary. */
function nativeTurnReason(turn) {
	const status = typeof turn.status === "string" ? turn.status : "";
	if (status === "completed") return { kind: "completed" };
	if (status === "interrupted" || status === "aborted") return {
		kind: "aborted",
		reason: { kind: "user" }
	};
	const error = typeof turn.error === "object" && turn.error !== null ? turn.error : void 0;
	return {
		kind: "error",
		error: {
			message: (typeof turn.error === "string" ? turn.error : typeof error?.message === "string" ? error.message : void 0) ?? `Codex turn ended with status ${status || "unknown"}`,
			code: "CODEX_TURN_FAILED"
		}
	};
}
/** Append one normalized Codex turn using the ordinary DSH session log API. */
function appendNativeTurn(session, turn, taskId, turnIndex) {
	const turnId = typeof turn.id === "string" && turn.id !== "" ? turn.id : `turn-${turnIndex}`;
	const turnNumber = turnIndex + 1;
	session.append("turn/start", { turn: turnNumber });
	session.append("step/start", {
		turn: turnNumber,
		step: 1
	});
	const messages = Array.isArray(turn.messages) ? turn.messages : [];
	for (const [messageIndex, value] of messages.entries()) {
		if (typeof value !== "object" || value === null) continue;
		const message = nativeMessage(value, taskId, turnId, messageIndex);
		if (message === void 0) continue;
		if (message.role === "user") session.append("user/message", message, { surfaceOp: "append" });
		else session.append("assistant/message", {
			turn: turnNumber,
			step: 1,
			message
		}, {
			surfaceOp: "append",
			sourceEventSeqs: []
		});
	}
	session.append("step/end", {
		turn: turnNumber,
		step: 1
	});
	session.append("turn/end", {
		turn: turnNumber,
		reason: nativeTurnReason(turn)
	});
}
/** Import a validated Codex thread into one durable native DSH session. */
async function importCodexConversation(subprocess, bridge, args) {
	if (bridge === void 0) return {
		ok: false,
		error: "native DSH session persistence is not mounted"
	};
	const taskId = typeof args.taskId === "string" ? args.taskId.trim() : "";
	const expectedThreadId = typeof args.threadId === "string" ? args.threadId.trim() : "";
	if (taskId === "" || expectedThreadId === "") return {
		ok: false,
		error: "taskId and threadId are required"
	};
	const sessionId = nativeSessionIdForTask(taskId);
	if (await nativeSessionExists(bridge, sessionId)) return {
		ok: true,
		sessionId
	};
	const conversationResult = await readCodexConversation(subprocess, args);
	if (conversationResult.ok !== true) return conversationResult;
	const conversation = conversationResult.conversation;
	const turns = Array.isArray(conversation.turns) ? conversation.turns : [];
	if (turns.length === 0) return {
		ok: false,
		error: "the Codex thread contains no importable turns"
	};
	let cwd;
	if (typeof args.cwd === "string" && args.cwd.trim() !== "") try {
		cwd = resolveDirectory(args.cwd, "cwd");
	} catch {}
	let session;
	try {
		session = bridge.sessions.create(sessionId, cwd === void 0 ? void 0 : { meta: { cwd } });
		for (const [turnIndex, value] of turns.entries()) {
			if (typeof value !== "object" || value === null) continue;
			appendNativeTurn(session, value, taskId, turnIndex);
		}
		await bridge.sessions.flush(session);
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : String(error)
		};
	}
	return {
		ok: true,
		sessionId
	};
}
/** Attach notification + server-request handlers to a client for one run. */
function attachRunHandlers(client, run) {
	client.setServerRequestHandler(async (request) => {
		pushActivity(run, {
			at: Date.now(),
			kind: "warning",
			text: `approval request declined (fail-closed): ${request.method}`
		});
		return failClosedDecision(request.method);
	});
	client.setNotificationHandler((method, params) => {
		const at = Date.now();
		const p = params ?? {};
		const eventThread = typeof p.threadId === "string" ? p.threadId : void 0;
		if (eventThread !== void 0 && run.threadId !== void 0 && eventThread !== run.threadId) return;
		switch (method) {
			case "thread/tokenUsage/updated":
				run.usage = p.usage ?? p.tokenUsage ?? void 0;
				return;
			case "warning":
			case "model/rerouted":
			case "deprecationNotice":
				pushActivity(run, {
					at,
					kind: "warning",
					text: method
				});
				return;
			case "item/reasoning/textDelta":
			case "item/reasoning/summaryTextDelta": return;
			case "item/started":
			case "item/completed": {
				const item = p.item;
				const described = describeItem(item);
				if (described !== void 0) {
					let text = described.text;
					if (described.kind === "command" && method === "item/completed") {
						const output = item.aggregatedOutput;
						if (typeof output === "string" && output.trim() !== "") text += ` → ${tail(output.replace(/\s+/g, " ").trim(), 200)}`;
					}
					pushActivity(run, {
						at,
						kind: described.kind,
						text
					});
				}
				if (method === "item/completed") {
					const message = readAgentMessage(item);
					if (message !== void 0 && message.phase === "final_answer" && message.text.trim() !== "") run.finalAnswer = message.text;
				}
				return;
			}
			case "item/agentMessage/delta": {
				const delta = typeof p.delta === "string" ? p.delta : "";
				const itemId = typeof p.itemId === "string" ? p.itemId : "";
				if (itemId !== "" && run.liveAnswerItemId !== itemId) {
					run.liveAnswerItemId = itemId;
					run.liveAnswer = "";
				}
				run.liveAnswer += delta;
				return;
			}
			case "error": {
				const error = p.error;
				run.errorText = error !== void 0 && typeof error.message === "string" ? error.message : method;
				return;
			}
			case "turn/completed": {
				if (run.settled) return;
				const turn = p.turn ?? {};
				const status = typeof turn.status === "string" ? turn.status : void 0;
				const turnError = turn.error;
				if (status === "completed") settleRun(run, "succeeded");
				else if (status === "interrupted") settleRun(run, "interrupted");
				else settleRun(run, "failed", turnError !== void 0 && typeof turnError.message === "string" ? turnError.message : run.errorText);
				run.client?.dispose();
				return;
			}
			default: return;
		}
	});
}
/** Fail-closed decisions for server→client requests. */
function failClosedDecision(method) {
	switch (method) {
		case "execCommandApproval":
		case "applyPatchApproval": return { decision: "abort" };
		case "item/commandExecution/requestApproval":
		case "item/fileChange/requestApproval": return { decision: "decline" };
		case "item/permissions/requestApproval": return { permissions: {} };
		case "item/tool/requestUserInput": return { answers: {} };
		case "mcpServer/elicitation/request": return { action: "decline" };
		default: throw new Error(`unsupported server request: ${method}`);
	}
}
/** Settle a run exactly once. */
function settleRun(run, outcome, errorText) {
	if (run.settled) return;
	run.settled = true;
	run.outcome = outcome;
	run.endedAt = Date.now();
	run.errorText = errorText ?? run.errorText;
	if (outcome === "failed" && (errorText === void 0 || errorText === "") && run.errorText === void 0) run.errorText = "the codex turn failed";
}
/** Start one codex child (new thread OR resumed thread); returns immediately. */
async function startCodexRun(subprocess, args) {
	let cwd;
	let prompt;
	try {
		cwd = resolveDirectory(args.cwd, "cwd");
		const promptValue = args.prompt ?? args.instructions;
		if (typeof promptValue !== "string" || promptValue.trim() === "") throw new Error("prompt is required");
		prompt = promptValue;
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : String(error)
		};
	}
	const model = typeof args.model === "string" ? args.model.trim() : "";
	const effort = typeof args.effort === "string" ? args.effort.trim() : "";
	const sandbox = typeof args.sandbox === "string" ? args.sandbox.trim() : "";
	const taskId = typeof args.taskId === "string" && args.taskId.trim() !== "" ? args.taskId.trim() : void 0;
	const resumeThreadId = typeof args.resumeThreadId === "string" && args.resumeThreadId.trim() !== "" ? args.resumeThreadId.trim() : void 0;
	if (resumeThreadId !== void 0 && taskId === void 0) return {
		ok: false,
		error: "resuming requires the owning taskId"
	};
	const active = [...runs.values()].filter((run) => run.endedAt === void 0).length;
	if (active >= MAX_ACTIVE_RUNS) return {
		ok: false,
		error: `too many active codex runs (${active}/${MAX_ACTIVE_RUNS}); try again later`
	};
	let codexPath;
	try {
		codexPath = await subprocess.resolveExecutable("codex");
	} catch {
		return {
			ok: false,
			error: "the codex CLI was not found on this machine"
		};
	}
	if (resumeThreadId !== void 0) {
		const binding = await loadBinding(bindingDirectory(), taskId);
		if (binding === void 0) return {
			ok: false,
			error: "no thread binding exists for this task; start a fresh run instead"
		};
		if (binding.threadId !== resumeThreadId) return {
			ok: false,
			error: "thread binding mismatch; refusing to resume a different conversation"
		};
		if (binding.cwdFingerprint !== fingerprintCwd(cwd)) return {
			ok: false,
			error: "workspace changed since this thread was created; refusing to resume"
		};
	}
	const runId = randomUUID();
	const run = {
		id: runId,
		cwd,
		startedAt: Date.now(),
		endedAt: void 0,
		threadId: void 0,
		turnId: void 0,
		settled: false,
		outcome: void 0,
		errorText: void 0,
		client: void 0,
		liveAnswer: "",
		finalAnswer: void 0,
		activity: [],
		usage: void 0,
		cancelRequested: false,
		interruptSent: false,
		timedOut: false
	};
	runs.set(runId, run);
	const sandboxMode = sandbox === "read-only" || sandbox === "danger-full-access" ? sandbox : "workspace-write";
	try {
		const client = new AppServerClient({
			subprocess,
			codexPath,
			cwd,
			env: codexChildEnvironment(homedir(), codexHome()),
			clientInfo: {
				name: "dsh-task-board-model",
				title: "DSH Task Board",
				version: "0.2.0"
			}
		});
		attachRunHandlers(client, run);
		run.client = client;
		await client.start();
		let thread;
		if (resumeThreadId !== void 0) thread = await client.threadResume({
			threadId: resumeThreadId,
			...cwd === void 0 ? {} : { cwd },
			...model === "" ? {} : { model },
			approvalPolicy: "never",
			sandbox: sandboxMode
		});
		else thread = await client.threadStart({
			cwd,
			...model === "" ? {} : { model },
			approvalPolicy: "never",
			sandbox: sandboxMode,
			ephemeral: false
		});
		run.threadId = String(thread.id);
		const cliVersion = typeof thread.cliVersion === "string" ? thread.cliVersion : void 0;
		if (taskId !== void 0) await saveBinding(bindingDirectory(), {
			version: 1,
			taskId,
			threadId: run.threadId,
			cwdFingerprint: fingerprintCwd(cwd),
			...cliVersion === void 0 ? {} : { cliVersion },
			createdAt: Date.now()
		}).catch((error) => {
			pushActivity(run, {
				at: Date.now(),
				kind: "warning",
				text: `binding save failed: ${String(error)}`
			});
		});
		const turn = await client.turnStart({
			threadId: run.threadId,
			input: [{
				type: "text",
				text: prompt
			}],
			...effort === "" ? {} : { effort }
		});
		run.turnId = String(turn.id);
		const timer = setTimeout(() => {
			if (runs.get(runId) !== run || run.settled) return;
			run.timedOut = true;
			settleRun(run, "failed", `codex turn exceeded ${Math.round(CODEX_RUN_TIMEOUT_MS / 6e4)} minutes and was stopped`);
			run.client?.dispose();
		}, CODEX_RUN_TIMEOUT_MS);
		timer.unref?.();
		client.waitForExit().then((exit) => {
			clearTimeout(timer);
			if (!run.settled) {
				const crashed = !(exit.exitCode === 0 && exit.signal === null);
				settleRun(run, crashed ? "failed" : "succeeded", crashed ? `app-server exited unexpectedly (${exit.exitCode ?? "signal " + String(exit.signal)})${client.getStderrTail() !== "" ? ": " + tail(client.getStderrTail().replace(/\s+/g, " ").trim(), 300) : ""}` : void 0);
			}
			pruneRuns(Date.now());
		}).catch(() => {
			clearTimeout(timer);
			if (!run.settled) settleRun(run, "failed", "app-server process failed");
		});
	} catch (error) {
		settleRun(run, "failed", error instanceof Error ? error.message : String(error));
		run.client?.dispose();
		return {
			ok: false,
			error: `codex could not be started: ${error instanceof Error ? error.message : String(error)}`
		};
	}
	return {
		ok: true,
		runId,
		...run.threadId === void 0 ? {} : { threadId: run.threadId },
		cwd
	};
}
/** Project one run to its status payload (shared by status polling). */
function runStatus(run) {
	const settled = run.settled;
	const state = !settled ? "running" : run.outcome === "succeeded" ? "succeeded" : run.outcome === "interrupted" ? "interrupted" : "failed";
	const answer = run.finalAnswer ?? run.liveAnswer;
	return {
		ok: true,
		state,
		threadId: run.threadId,
		turnId: run.turnId,
		cwd: run.cwd,
		startedAt: run.startedAt,
		...run.endedAt !== void 0 ? {
			endedAt: run.endedAt,
			durationMs: run.endedAt - run.startedAt
		} : {},
		...run.cancelRequested ? { cancelRequested: true } : {},
		...answer.trim() !== "" ? {
			outputTail: tail(answer, ANSWER_TAIL_CHARS),
			lastMessage: tail(answer, ANSWER_TAIL_CHARS)
		} : {},
		...run.errorText !== void 0 ? { error: tail(run.errorText, 600) } : {},
		...run.activity.length > 0 ? { activity: run.activity.slice(-40) } : {},
		...run.usage !== void 0 ? { usage: run.usage } : {},
		...settled && state === "failed" && run.errorText === void 0 ? { error: "codex run failed" } : {}
	};
}
/** Steer the active turn of one run. */
async function steerCodexRun(args) {
	const runId = typeof args.runId === "string" ? args.runId : "";
	const content = typeof args.content === "string" ? args.content : "";
	if (runId === "" || content.trim() === "") return {
		ok: false,
		error: "runId and content are required"
	};
	const run = runs.get(runId);
	if (run === void 0) return {
		ok: false,
		error: "unknown-run"
	};
	if (run.settled || run.client === void 0 || run.threadId === void 0 || run.turnId === void 0) return {
		ok: false,
		error: "no active turn to steer"
	};
	try {
		await run.client.turnSteer({
			threadId: run.threadId,
			expectedTurnId: run.turnId,
			input: [{
				type: "text",
				text: content
			}]
		});
		pushActivity(run, {
			at: Date.now(),
			kind: "info",
			text: "steered with additional input"
		});
		return { ok: true };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : String(error)
		};
	}
}
/** Cancel one run: interrupt the turn first; force-kill only after grace. */
async function cancelCodexRun(args) {
	const runId = typeof args.runId === "string" ? args.runId : "";
	const run = runs.get(runId);
	if (run === void 0) return {
		ok: false,
		error: "unknown-run"
	};
	if (run.settled) return {
		ok: true,
		state: "already-settled"
	};
	run.cancelRequested = true;
	const client = run.client;
	if (client === void 0) return {
		ok: true,
		state: "cancelling"
	};
	if (!run.interruptSent && run.threadId !== void 0 && run.turnId !== void 0) {
		run.interruptSent = true;
		client.turnInterrupt({
			threadId: run.threadId,
			turnId: run.turnId
		}).catch(() => {});
		setTimeout(() => {
			if (!run.settled) {
				settleRun(run, "interrupted", "codex turn was cancelled");
				client.dispose();
			}
		}, INTERRUPT_GRACE_MS).unref?.();
	}
	return {
		ok: true,
		state: "cancelling"
	};
}
/** Resolve CODEX_HOME the way the CLI does (env override, else ~/.codex). */
function codexHome() {
	return process.env.CODEX_HOME?.trim() !== "" && process.env.CODEX_HOME !== void 0 ? process.env.CODEX_HOME : join(homedir(), ".codex");
}
/** Extract top-level `key = "value"` pairs from config.toml without a TOML dep. Standard TOML requires bare keys to precede the first `[table]` header, so collection stops there. */
function parseTopLevelStrings(toml) {
	const values = /* @__PURE__ */ new Map();
	for (const line of toml.split(/\r?\n/)) {
		if (/^\s*\[/.test(line)) break;
		const match = /^([A-Za-z0-9_-]+)\s*=\s*"((?:[^"\\]|\\.)*)"\s*(?:#.*)?$/.exec(line);
		if (match !== null && !values.has(match[1])) values.set(match[1], match[2].replace(/\\"/g, "\""));
	}
	return values;
}
/** Shape-check one models_cache.json entry before projecting it. */
function projectModel(entry) {
	if (typeof entry !== "object" || entry === null) return void 0;
	const record = entry;
	if (typeof record.slug !== "string" || record.slug === "") return void 0;
	if (record.visibility === "hidden") return void 0;
	const rawEfforts = Array.isArray(record.supported_reasoning_levels) ? record.supported_reasoning_levels : [];
	const efforts = [];
	for (const level of rawEfforts) {
		if (typeof level !== "object" || level === null) continue;
		const effortRecord = level;
		if (typeof effortRecord.effort !== "string" || effortRecord.effort === "") continue;
		efforts.push({
			id: effortRecord.effort,
			...typeof effortRecord.description === "string" ? { description: effortRecord.description } : {}
		});
	}
	return {
		slug: record.slug,
		displayName: typeof record.display_name === "string" && record.display_name !== "" ? record.display_name : record.slug,
		...typeof record.description === "string" ? { description: record.description } : {},
		efforts,
		...typeof record.default_reasoning_level === "string" ? { defaultEffort: record.default_reasoning_level } : {}
	};
}
/** Read the machine's codex environment (best effort; never throws). */
async function readCodexEnv(subprocess) {
	const home = codexHome();
	const payload = {
		available: false,
		home,
		models: []
	};
	try {
		const [cacheRaw, configRaw] = await Promise.all([readFile(join(home, "models_cache.json"), "utf8").catch(() => void 0), readFile(join(home, "config.toml"), "utf8").catch(() => void 0)]);
		if (configRaw !== void 0) {
			const config = parseTopLevelStrings(configRaw);
			payload.defaultModel = config.get("model");
			payload.defaultEffort = config.get("model_reasoning_effort");
		}
		if (cacheRaw !== void 0) {
			const parsed = JSON.parse(cacheRaw);
			if (typeof parsed === "object" && parsed !== null && Array.isArray(parsed.models)) payload.models = parsed.models.map(projectModel).filter((model) => model !== void 0);
		}
	} catch {}
	payload.available = payload.models.length > 0;
	if (!payload.available && subprocess !== void 0) try {
		await subprocess.resolveExecutable("codex");
		payload.available = true;
	} catch {
		payload.available = false;
	}
	return payload;
}
/** Directory name created inside a repo to hold this plugin's worktrees. */
const WORKTREE_DIR_NAME = ".dsh-worktrees";
/**
* Sanitize a user-supplied branch or derive one from the task title:
* git check-ref-format basics enforced, always non-empty.
*/
function sanitizeBranchName(branch, title, now) {
	const candidate = (branch ?? "").trim().replace(/^refs\/heads\//, "");
	if (candidate !== "") {
		if (!isValidBranchName(candidate)) throw new Error(`invalid branch name: ${candidate}`);
		return candidate;
	}
	return slugifyBranch(title ?? "", now);
}
/**
* Create (or reuse) a git worktree for one repo. The worktree lives at
* `<repoRoot>/.dsh-worktrees/<branch with / → ->`, and that directory is
* appended to `.git/info/exclude` so it never shows up in git status.
*/
async function createWorktree(subprocess, args) {
	let repoPath;
	try {
		repoPath = resolveDirectory(args.repoPath ?? args.cwd, "repoPath");
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : String(error)
		};
	}
	let branch;
	try {
		branch = sanitizeBranchName(await stringField(args, "branch"), await stringField(args, "title"), Date.now());
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : String(error)
		};
	}
	let root;
	try {
		const probe = await runShort(subprocess, [
			"git",
			"rev-parse",
			"--show-toplevel"
		], repoPath, GIT_COMMAND_TIMEOUT_MS);
		if (probe.exitCode !== 0) return {
			ok: false,
			error: `not a git repository: ${repoPath}`.concat(probe.stderr.trim() === "" ? "" : ` (${tail(probe.stderr, 200)})`)
		};
		root = probe.stdout.trim().split(/\r?\n/)[0] ?? "";
		if (root === "") return {
			ok: false,
			error: "git did not report a repository root"
		};
	} catch (error) {
		return {
			ok: false,
			error: `git rev-parse failed: ${error instanceof Error ? error.message : String(error)}`
		};
	}
	const parentDir = join(root, WORKTREE_DIR_NAME);
	const worktreePath = join(parentDir, branch.replace(/\//g, "-"));
	try {
		if (statSync(worktreePath).isDirectory()) {
			const inside = await runShort(subprocess, [
				"git",
				"rev-parse",
				"--is-inside-work-tree"
			], worktreePath, GIT_COMMAND_TIMEOUT_MS);
			if (inside.exitCode === 0 && inside.stdout.trim() === "true") return {
				ok: true,
				path: realpathSync(worktreePath),
				branch,
				repoRoot: root,
				created: false
			};
			return {
				ok: false,
				error: `target exists but is not a worktree: ${worktreePath}`
			};
		}
	} catch {}
	try {
		const mkdir = await runShort(subprocess, [
			"mkdir",
			"-p",
			parentDir
		], root, GIT_COMMAND_TIMEOUT_MS);
		if (mkdir.exitCode !== 0) return {
			ok: false,
			error: `failed to create ${parentDir}: ${tail(mkdir.stderr, 200)}`
		};
		const excludePath = join(root, ".git", "info", "exclude");
		const excludeLine = `${WORKTREE_DIR_NAME}/`;
		const current = await readFile(excludePath, "utf8").catch(() => "");
		if (!current.split(/\r?\n/).some((line) => line.trim() === excludeLine)) await writeFile(excludePath, `${current}${current !== "" && !current.endsWith("\n") ? "\n" : ""}${excludeLine}\n`, "utf8");
		const added = await runShort(subprocess, (await runShort(subprocess, [
			"git",
			"show-ref",
			"--verify",
			"--quiet",
			`refs/heads/${branch}`
		], root, GIT_COMMAND_TIMEOUT_MS)).exitCode === 0 ? [
			"git",
			"worktree",
			"add",
			worktreePath,
			branch
		] : [
			"git",
			"worktree",
			"add",
			"-b",
			branch,
			worktreePath
		], root, GIT_COMMAND_TIMEOUT_MS);
		if (added.exitCode !== 0) return {
			ok: false,
			error: `git worktree add failed: ${tail(added.stderr !== "" ? added.stderr : added.stdout, 400)}`
		};
		return {
			ok: true,
			path: realpathSync(worktreePath),
			branch,
			repoRoot: root,
			created: true
		};
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : String(error)
		};
	}
}
/** Remove a worktree created earlier (`git worktree remove`). */
async function removeWorktree(subprocess, args) {
	const path = typeof args.path === "string" ? args.path.trim() : "";
	if (path === "") return {
		ok: false,
		error: "path is required"
	};
	const force = args.force === true;
	try {
		const removed = await runShort(subprocess, force ? [
			"git",
			"worktree",
			"remove",
			"--force",
			path
		] : [
			"git",
			"worktree",
			"remove",
			path
		], path, GIT_COMMAND_TIMEOUT_MS);
		if (removed.exitCode !== 0) return {
			ok: false,
			error: tail(removed.stderr !== "" ? removed.stderr : removed.stdout, 400)
		};
		return { ok: true };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : String(error)
		};
	}
}
/** Route paths served on the harness web server. */
const ROUTE_CODEX_START = "/dsh-task-board/codex/start";
const ROUTE_CODEX_STATUS = "/dsh-task-board/codex/status";
const ROUTE_CODEX_CANCEL = "/dsh-task-board/codex/cancel";
const ROUTE_CODEX_STEER = "/dsh-task-board/codex/steer";
const ROUTE_CODEX_THREAD = "/dsh-task-board/codex/thread";
const ROUTE_CODEX_IMPORT = "/dsh-task-board/codex/import";
const ROUTE_CODEX_ENV = "/dsh-task-board/codex/env";
const ROUTE_WORKTREE_CREATE = "/dsh-task-board/worktree/create";
const ROUTE_WORKTREE_REMOVE = "/dsh-task-board/worktree/remove";
/**
* The business logic of every task-board host route, keyed by path and free
* of HTTP concerns (each takes a parsed JSON body, returns a JSON-able
* payload with an `ok` field). Exposed separately so tests can drive the
* flows without faking http.ServerResponse.
*/
function taskBoardRouteHandlers(subprocess, nativeBridge) {
	return /* @__PURE__ */ new Map([
		[ROUTE_CODEX_ENV, async () => {
			return {
				ok: true,
				...await readCodexEnv(subprocess)
			};
		}],
		[ROUTE_CODEX_START, async (args) => {
			if (subprocess === void 0) return {
				ok: false,
				error: "the subprocess service is not mounted"
			};
			return startCodexRun(subprocess, args);
		}],
		[ROUTE_CODEX_STATUS, async (args) => {
			const runId = typeof args.runId === "string" ? args.runId : "";
			const run = runs.get(runId);
			if (run === void 0) return {
				ok: false,
				error: "unknown-run"
			};
			return runStatus(run);
		}],
		[ROUTE_CODEX_STEER, async (args) => steerCodexRun(args)],
		[ROUTE_CODEX_THREAD, async (args) => {
			if (subprocess === void 0) return {
				ok: false,
				error: "the subprocess service is not mounted"
			};
			return readCodexConversation(subprocess, args);
		}],
		[ROUTE_CODEX_IMPORT, async (args) => {
			if (subprocess === void 0) return {
				ok: false,
				error: "the subprocess service is not mounted"
			};
			return importCodexConversation(subprocess, nativeBridge, args);
		}],
		[ROUTE_CODEX_CANCEL, async (args) => cancelCodexRun(args)],
		[ROUTE_WORKTREE_CREATE, async (args) => {
			if (subprocess === void 0) return {
				ok: false,
				error: "the subprocess service is not mounted"
			};
			return createWorktree(subprocess, args);
		}],
		[ROUTE_WORKTREE_REMOVE, async (args) => {
			if (subprocess === void 0) return {
				ok: false,
				error: "the subprocess service is not mounted"
			};
			return removeWorktree(subprocess, args);
		}]
	]);
}
/**
* Register every task-board host route on the harness web server. Each
* handler owns its full response. Returns the registration results (cordis
* treats them as disposers when returned from ctx.effect).
*/
function registerTaskBoardRoutes(webServer, subprocess, nativeBridge) {
	return [...taskBoardRouteHandlers(subprocess, nativeBridge).entries()].map(([path, handle]) => webServer.register({
		kind: "exact",
		path,
		async handler(req, res) {
			if (req.method !== "POST") {
				respond(res, 405, {
					ok: false,
					error: "method not allowed; use POST"
				});
				return;
			}
			try {
				respond(res, 200, await handle(await readJsonBody(req)));
			} catch (error) {
				respond(res, 200, {
					ok: false,
					error: error instanceof Error ? error.message : String(error)
				});
			}
		}
	}));
}
//#endregion
//#region src/mount-once.ts
/**
* Host single-instance guard shared by the plugin family. The family bundle
* (dsh-web-ui-all / dsh-skins) namespaces every child row id (web-ui-*), so
* the loader accepts a standalone install of the same package side by side;
* without this guard the second instance would still re-register the same
* webserver routes, tools, settings namespaces, and system-prompt sections
* and fail the boot. mountOnce makes the second host apply a no-op for the
* lifetime of the first instance (the browser half is already deduped by
* package name in the client module host).
*
* The registry rides a global symbol so two module instances of the same
* package (npm copy vs repository link) still share one verdict. cordis
* `ctx.effect` runs its callback immediately and treats the callback's
* return value as the fiber disposer, so the unmarker is returned, not run.
*/
const MOUNTED = Symbol.for("dsh-web-ui.mounted-plugins");
function mountedSet() {
	const registry = globalThis;
	return registry[MOUNTED] ??= /* @__PURE__ */ new Set();
}
/**
* Wrap a cordis plugin apply so the package runs at most once per process.
* The first mount registers normally and unmarks when its fiber disposes;
* any later mount of the same package name is a no-op.
* @param packageName - npm package identity shared by every install source.
* @param fn - the original plugin apply.
* @returns an apply of the same shape.
*/
function mountOnce(packageName, fn) {
	return ((...args) => {
		const mounted = mountedSet();
		if (mounted.has(packageName)) return;
		mounted.add(packageName);
		args[0]?.effect?.(() => () => {
			mounted.delete(packageName);
		});
		return fn(...args);
	});
}
//#endregion
//#region src/index.ts
/** Order of the announcement section within the tool-guidance band. */
const SECTION_ORDER = 200;
const inject = ["systemPrompt"];
/** Model-facing announcement: plugin presence, capabilities, and limits. */
const TASK_BOARD_GUIDANCE = "本机已安装 dsh-task-board-model 插件（DSH Web GUI 的任务看板）：侧边栏「任务看板」入口。能力：多列看板管理任务；任务可真实执行；任务可钉住执行目标——工作区 / 模式（agent 预设）/ 权限（read-only / workspace-write / danger-full-access）/ 模型 / 推理力度，缺省用运行时默认；执行者可选 DSH 会话或 OpenAI Codex（经宿主机 codex app-server 运行：可选模型与推理力度、实时活动流、进行中可 steer 注入输入、结束后可在同一线程继续追问、重启后凭绑定恢复线程）；可为任务创建 git worktree 执行（自动注册为工作区，出现在侧边栏）；任务支持 5 段 cron 定时执行（如 0 23 * * *）；数据存浏览器 localStorage（键 dsh.taskBoard.v1）。限制：定时调度在浏览器端，需 GUI 标签页打开，错过即跳过；Codex 子代理审批请求一律拒绝（fail-closed），沙箱随权限预设固定；执行消耗 API 额度。用户提到「任务看板 / 看板 / 定时任务」时即指本插件，请据此协作。";
/**
* Settings namespace of the board's announcement capability — the section the
* web settings surface edits. Spelled here rather than imported: the browser
* half spells the same value and must not depend on a Host package.
*/
const TASK_BOARD_SETTINGS_NAMESPACE = settingsNamespace("task-board");
const Config = z.object({
	announceToAgent: z.boolean().default(true),
	enabled: z.boolean().default(true)
});
/** Schema default, re-read for hand-built test contexts (the loader applies them normally). */
const DEFAULT_ANNOUNCE = true;
/**
* Register the board's announcement section, gated on the composition entry's
* `announceToAgent` (and the live settings value once the web settings
* surface is served). The section is re-registered whenever the source
* changes, so a settings edit takes effect without a restart.
* @param ctx - the plugin context (systemPrompt injected).
* @param config - resolved plugin config (schema defaults applied by the loader).
*/
const apply = mountOnce("dsh-task-board-model", applyImpl);
function applyImpl(ctx, config) {
	let current = () => config ?? {};
	let disposeSection;
	ctx.inject(["webServer"], (webCtx) => {
		const webServer = webCtx.get("webServer");
		if (webServer === void 0) return;
		const subprocess = webCtx.get("subprocess");
		const nativeSessions = webCtx.get("sessions");
		const nativePersistence = webCtx.get("sessionPersistence");
		const nativeBridge = nativeSessions === void 0 || nativePersistence === void 0 ? void 0 : {
			sessions: nativeSessions,
			persistence: nativePersistence
		};
		webCtx.effect(() => {
			const registrations = registerTaskBoardRoutes(webServer, subprocess, nativeBridge);
			return () => {
				for (const registration of registrations) if (typeof registration === "function") registration();
			};
		}, "task-board: host routes");
	});
	const sync = () => {
		if (disposeSection !== void 0) {
			disposeSection();
			disposeSection = void 0;
		}
		if ((current().enabled ?? true) === false) return;
		if ((current().announceToAgent ?? DEFAULT_ANNOUNCE) === false) return;
		disposeSection = ctx.systemPrompt.section({
			name: "plugin:task-board-model",
			order: SECTION_ORDER,
			text: TASK_BOARD_GUIDANCE
		});
	};
	installSettingsSection(ctx, TASK_BOARD_SETTINGS_NAMESPACE, Config, config ?? {}, {
		setSource: (source) => {
			current = source;
		},
		onChange: sync
	});
	sync();
}
//#endregion
export { Config, TASK_BOARD_GUIDANCE, TASK_BOARD_SETTINGS_NAMESPACE, apply, inject };

//# sourceMappingURL=index.js.map