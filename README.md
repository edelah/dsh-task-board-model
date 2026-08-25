# dsh-task-board-model

A local fork of the DSH Web GUI task board with **per-task model and reasoning-effort pins**, an **OpenAI Codex CLI executor**, and **per-task git worktrees** that register as real DSH workspaces. It keeps the original kanban, persistence, scheduling, and real-session execution behavior.

## What changed

- Select a provider/model for each task, or leave it at the runtime default.
- An active execution without a native DSH session gets a synthetic sidebar item under its workspace (Codex runs, or the brief DSH session-creation window). Once DSH creates the real session row, the live synthetic item disappears to avoid duplicate live titles. After settlement, a result row remains under the workspace until the task is archived or deleted; DSH results open their native conversation and Codex results open the persisted Codex thread in a chat-first view.
- Select an adapter-provided reasoning effort when the chosen model advertises one.
- Persist the selection in the existing `dsh.taskBoard.v1` localStorage ledger.
- Load choices from the live `llm.models` catalog, so provider/model names and effort choices are not hard-coded.
- A pinned-model run creates a dedicated blank session, calls `sessions.selectModel` before permission and prompt, then runs the task. Unpinned tasks retain the original blank-session reuse path.
- Existing workspace, agent-preset, permission, cron scheduling, archive, and execution-history behavior is retained.

### Codex executor (Codex App Server subagent)

Each task picks its executor:

- **DSH session** (default) — drives a real DSH agent session as before.
- **Codex** — runs the task as a managed **Codex App Server child** (`codex app-server --stdio`, JSON-RPC over stdio), implementing the "Richer DSH Codex Subagent" design:
  - **Live progress**: the detail view streams normalized activity — commands with output tails, file changes, MCP tool calls, warnings — plus the assistant's streaming answer, driven by App Server notifications (`item/started`, `item/completed`, `item/agentMessage/delta`, `turn/completed`).
  - **Multi-turn continuation**: every Codex execution persists a durable binding (`~/.dsh/task-board-model/bindings/<task>.json`, mode 0600 in a 0700 dir, atomic writes) mapping the task to its Codex thread. The detail view's **继续对话 / Continue thread** composer sends follow-ups on the SAME thread (`initialize → thread/resume → turn/start`), and the conversation survives both page reloads and dsh restarts. Resume is fail-closed: a missing binding, a different thread id, or a changed workspace fingerprint (sha256 of the cwd) refuses the continuation.
  - **Chat-first results**: clicking a Codex sidebar row reads the complete stored thread with `thread/read` (`includeTurns: true`) and renders its user/assistant messages with DSH's Markdown component. Tool activity stays collapsible, live output streams into the current turn, and follow-ups remain on the same thread.
  - **Steer**: while a turn is active you can inject additional input (`turn/steer` with the expected turn id).
  - **Interrupt**: 停止 sends `turn/interrupt` first; only after a bounded grace does the process tree get terminated.
  - **Model/effort pins**: populated from the machine's own Codex catalog (`CODEX_HOME/models_cache.json` + `config.toml`), with a custom-slug option.
  - **Security defaults**: prompts travel through protocol fields, never argv; approvals and user-input requests from the child are answered fail-closed (declined / empty) and surfaced as warning activity; the sandbox is always explicit (permission preset, defaulting to `workspace-write`); the child environment is allowlisted (PATH/HOME/temp/proxy/XDG + `CODEX_HOME`) on top of the subprocess seam's credential scrubbing; stderr capture is bounded; at most `DSH_TASK_BOARD_MAX_CODEX_RUNS` (default 8) children run concurrently.

The DSH agent-preset ("mode") and DSH model pins do not apply to Codex runs.

### Git worktrees

Tasks can opt into running inside a dedicated git worktree:

- On first run (or via "create now" in the detail view) the host runs `git worktree add -b <branch>` under `<repoRoot>/.dsh-worktrees/<branch>`; `.dsh-worktrees/` is appended to `.git/info/exclude`, so git status stays clean.
- The directory is registered through the normal workspace create API, so it appears immediately as a **workspace in the sidebar** (titled after the task), and the worktree path/branch/workspace id persist on the task record. Re-runs reuse the same tree; creation is idempotent per branch.
- Works for both executors: Codex executes in the worktree directory; DSH sessions open inside the worktree workspace.
- The detail view can prepare the tree without running, open it as the current workspace, or remove it (`git worktree remove`; the branch and commits are never touched).

Host routes added: `/dsh-task-board/codex/{env,start,status,steer,cancel}` and `/dsh-task-board/worktree/{create,remove}` (all JSON POSTs except env, following the dsh-open-terminal route pattern). They degrade gracefully when the web-server or subprocess service is absent.

### Important DSH API caveat

The current DSH `sessions.selectModel` API also saves the accepted selection as the deployment default. The dedicated session prevents task executions from racing over a reused blank session, but it cannot make the selection globally neutral. This plugin therefore documents the behavior rather than pretending that a task pin is isolated from the deployment default. A future DSH API such as `persistDefault: false` would remove this caveat.

## Build and test

```sh
cd /home/ubuntu/debug/dsh-task-board-model
pnpm install
pnpm run typecheck
pnpm test
pnpm run build
```

`build` emits the host bundle at `lib/index.js`, the lazy-CJS browser bundle at `lib/client.js`, and declaration files under `lib/types/`. The CSS is embedded into the browser bundle because DSH's client module loader expects a self-registering bundle.

## Install into DSH Web

Build first, then link the package into the web profile:

```sh
cd /home/ubuntu/debug/dsh-task-board-model
pnpm install
pnpm run build
dsh plugin --profile web add link:/home/ubuntu/debug/dsh-task-board-model
```

The package patch automatically disables the original `web-ui-task-board` aggregate row (and a standalone `ui-task-board` row, if present), then inserts `ui-task-board-model`. Restart the existing `dsh web` process; a browser refresh alone cannot load a newly composed host/client plugin graph. Verify the current GUI at `http://127.0.0.1:3080` after the restart.

To uninstall:

```sh
dsh plugin --profile web remove dsh-task-board-model
```

The task ledger remains in browser storage. Remove it explicitly with:

```js
localStorage.removeItem('dsh.taskBoard.v1')
```

## Layout and data flow

- `src/core/tasks.ts` — task records, executor/worktree pins, and model-selection normalization.
- `src/core/store.ts` — localStorage validation and migration-safe repair.
- `src/core/execution.ts` — dedicated-session model application, prompt ordering, the Codex run loop (start/resume/steer/poll/reconcile), and worktree resolution.
- `src/core/controller.ts` — live workspace, preset, model, and Codex option snapshots; worktree adoption; follow-ups.
- `src/host/appserver-client.ts` — typed JSON-RPC App Server client (framing, handshake, thread/turn ops, fail-closed server-request policy, bounded stderr).
- `src/host/thread-bindings.ts` — durable task↔thread binding store (atomic writes, 0600/0700 modes, cwd fingerprints).
- `src/host/codex-routes.ts` — host HTTP routes: run registry + event normalization, env catalog, git worktrees.
- `src/client/board/NewTaskModal.tsx`, `TaskDetail.tsx`, and `CodexConversation.tsx` — executor settings, task management, and the persisted Codex chat surface.
- `src/client/running-jobs.ts` — synthetic live/result execution rows under workspace groups, with terminal results retained for inspection.
- `src/client/index.ts` — DSH runtime/catalog adapters and host-route bridges.
- `cordis.patch.yml` — profile-bundle replacement row.

## Verification performed

- `pnpm test` — regression tests cover locale selection, ledger normalization, the Codex lifecycle against a **fake App Server executable** (handshake, thread/start vs validated resume, `thread/read` history normalization, fail-closed approvals, steer, interrupt; no network or credentials needed), binding-store validation/atomicity, real-git worktree integration, the DSH-side codex execution paths, and the synthetic execution sidebar rows (creation, native-session handoff, terminal-result retention, click-through, archive/delete cleanup, and self-healing placement) under jsdom.
- `pnpm run typecheck` — passes.
- `pnpm run build` — host and lazy browser bundles pass.
- The built browser bundle was evaluated through a fake `window.__ModuleLoader__.load` registration and exported `apply`/`inject` successfully.
- The package was temporarily linked with `dsh plugin --profile web add link:...`; `dsh --profile web --dump-config` showed the original aggregate row disabled and `ui-task-board-model` inserted. The temporary profile link was removed afterward.

## License

BSD 3-Clause, inherited from the original task-board package.
