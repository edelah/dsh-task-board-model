# dsh-task-board-model

A local fork of the DSH Web GUI task board with **per-task model and reasoning-effort pins**. It keeps the original kanban, persistence, scheduling, and real-session execution behavior while adding model selection to the new-task and task-detail forms.

## What changed

- Select a provider/model for each task, or leave it at the runtime default.
- Select an adapter-provided reasoning effort when the chosen model advertises one.
- Persist the selection in the existing `dsh.taskBoard.v1` localStorage ledger.
- Load choices from the live `llm.models` catalog, so provider/model names and effort choices are not hard-coded.
- A pinned-model run creates a dedicated blank session, calls `sessions.selectModel` before permission and prompt, then runs the task. Unpinned tasks retain the original blank-session reuse path.
- Existing workspace, agent-preset, permission, cron scheduling, archive, and execution-history behavior is retained.

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

- `src/core/tasks.ts` — task records and model-selection normalization.
- `src/core/store.ts` — localStorage validation and migration-safe repair.
- `src/core/execution.ts` — dedicated-session model application and prompt ordering.
- `src/core/controller.ts` — live workspace, preset, and model option snapshots.
- `src/client/board/NewTaskModal.tsx` and `TaskDetail.tsx` — model/effort selectors.
- `src/client/index.ts` — DSH runtime/catalog adapters.
- `cordis.patch.yml` — profile-bundle replacement row.

## Verification performed

- `pnpm test` — 8 regression tests pass, including runtime-locale selection.
- `pnpm run typecheck` — passes.
- `pnpm run build` — host and lazy browser bundles pass.
- The built browser bundle was evaluated through a fake `window.__ModuleLoader__.load` registration and exported `apply`/`inject` successfully.
- The package was temporarily linked with `dsh plugin --profile web add link:...`; `dsh --profile web --dump-config` showed the original aggregate row disabled and `ui-task-board-model` inserted. The temporary profile link was removed afterward.

## License

BSD 3-Clause, inherited from the original task-board package.
