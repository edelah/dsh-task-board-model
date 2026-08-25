/**
 * Task-board client plugin: wires the framework-free core (controller,
 * execution service, store) to the real client runtime and mounts the two
 * DOM surfaces — the sidebar entry row and the board view in the center
 * column.
 *
 * Failure policy: DOM mounting problems are logged, never thrown — the web
 * shell fails the whole boot when a plugin apply throws, and an external
 * plugin must not take the GUI down.
 */
import type { ClientContext, SessionId, SettingsScope, SettingsScopeSpec, WorkspaceId } from '@deepseek-ai/dsh-client-runtime/client'
import type { ConnectionHandle, PromptContentPart } from '@deepseek-ai/dsh-client-connection/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: pulls the locale plugin's Context merge (ctx.locale) and its
// LocaleNamespaceMap merge table.
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the settings-surface Context merge (ctx.settingsScope).
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { BoardController, EMPTY_CODEX_OPTIONS, type CodexModelChoice } from '../core/controller.ts'
import { ExecutionService, type CodexExecutionFace, type WorktreeExecutionFace } from '../core/execution.ts'
import { SchedulerService } from '../core/scheduler.ts'
import { LocalStorageTaskStore } from '../core/store.ts'
import { claimTaskboardApply, releaseTaskboardApply } from './apply-guard.ts'
import { mountBoard } from './board-mount.tsx'
import { mountSidebarEntry } from './sidebar-entry.ts'
import { TaskBoardSettingsCard, TaskBoardSettingsCardController, type TaskBoardSettings } from './TaskBoardSettingsCard.tsx'
import { en, setTaskBoardLocale, zh, type TaskBoardKey } from './locales.ts'

/** Locale namespace this plugin owns. */
const NS = 'task-board'

/** Settings namespace the settings card edits (the Host plugin registers it). */
const TASK_BOARD_NS = 'task-board'

/** Host routes this package serves (see src/host/codex-routes.ts). */
const ROUTE_CODEX_ENV = '/dsh-task-board/codex/env'
const ROUTE_CODEX_START = '/dsh-task-board/codex/start'
const ROUTE_CODEX_STATUS = '/dsh-task-board/codex/status'
const ROUTE_CODEX_CANCEL = '/dsh-task-board/codex/cancel'
const ROUTE_CODEX_STEER = '/dsh-task-board/codex/steer'
const ROUTE_WORKTREE_CREATE = '/dsh-task-board/worktree/create'
const ROUTE_WORKTREE_REMOVE = '/dsh-task-board/worktree/remove'

/** POST one JSON body to a host route of this package (same-origin fetch). */
async function postHostRoute(path: string, body: unknown): Promise<Record<string, unknown>> {
  try {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    })
    if (!response.ok) return { ok: false, error: `HTTP ${response.status} ${response.statusText}` }
    return await response.json() as Record<string, unknown>
  } catch (error) {
    return { ok: false, error }
  }
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Task-board surface copy. */
    'task-board': TaskBoardKey
  }

  interface SlotMap {
    /**
     * The child slot the Web UI plugin group declares; this card registers
     * into the group instead of the top-level `settings.plugin.item` list.
     * Spelled here with the same shape so this package can register without
     * depending on the sibling UI package.
     */
    'web-ui.plugin.item': { kind: 'list'; scope: 'root'; owner: SettingsPluginItemOwnerProps }
  }
}

/** Owner share of a plugin card (the section supplies nothing). */
export interface SettingsPluginItemOwnerProps {
  /** Marker field: card owner props are intentionally empty. */
  children?: never
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    /**
     * Optional rc.6 compatibility binder provided by dsh-web-ui-settings;
     * absent when that group plugin is not installed, so callers fall back to
     * the official settings scope.
     */
    webUiSettings?: { bind<S>(spec: SettingsScopeSpec<S>): SettingsScope<S> }
  }
}


/** Required services (fiber inject waiting — the runtime must be up first). */
export const inject = ['slots', 'sessions', 'workspaces', 'connection', 'settingsScope', 'locale', 'remote']

/**
 * Mount the task board.
 * @param ctx - client root context (services: sessions, workspaces).
 */
export function apply(ctx: ClientContext): void {
  // A duplicated client injection (module factory executed twice in one page
  // lifetime) would otherwise mount a second sidebar entry and board view.
  // First application wins; later calls become no-ops (see apply-guard.ts).
  if (!claimTaskboardApply()) return

  // Release the claim when this fiber unloads (the loader supports plugin
  // unloads / hot-reloads), so a rebuilt bundle can claim again in the same
  // page instead of being silently dropped.
  ctx.effect(() => releaseTaskboardApply, 'task-board: apply claim')

  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'task-board: dictionaries')

  // Plugin configuration card: one staged form over the `task-board` settings
  // namespace, contributed to the Web UI plugin group.
  const binder = ctx.get('webUiSettings') ?? ctx.settingsScope
  const settingsScope = binder.bind<TaskBoardSettings>({ namespace: TASK_BOARD_NS })
  const settingsCard = new TaskBoardSettingsCardController(settingsScope)
  ctx.slots.inject('web-ui.plugin.item', () => {
    const unregister = ctx.slots.register({
      name: 'web-ui.plugin.item',
      id: 'task-board',
      order: 110,
      locale: NS,
      inject: () => settingsCard.inject(),
    }, TaskBoardSettingsCard)
    return () => {
      settingsCard.dispose()
      unregister()
    }
  })

  // The sidebar entry and board view mount once the settings scope settles;
  // while the scope is still loading, the composition default is unknown, so
  // nothing mounts yet. Only an unavailable scope (no settings surface served)
  // falls back to the composition default (enabled).
  let uiDisposer: (() => void) | undefined
  const mountUi = (): void => {
    if (uiDisposer !== undefined) return
    const sessions = ctx.sessions
    const workspaces = ctx.workspaces
    const connection = ctx.get('connection') as ConnectionHandle

    // Core wiring: real runtime faces into the framework-free services.
    const store = new LocalStorageTaskStore()

    // Codex executor + worktree faces over the host routes. The narrow
    // result contracts mirror the host payloads; failures degrade to
    // { ok: false } so the board keeps working without the features.
    const codexFace: CodexExecutionFace = {
      start: async request => {
        const payload = await postHostRoute(ROUTE_CODEX_START, request)
        if (payload.ok === true && typeof payload.runId === 'string') {
          return {
            ok: true as const,
            runId: payload.runId,
            ...(typeof payload.threadId === 'string' ? { threadId: payload.threadId } : {}),
          }
        }
        return { ok: false as const, error: payload.error ?? 'codex start failed' }
      },
      status: async runId => {
        const payload = await postHostRoute(ROUTE_CODEX_STATUS, { runId })
        if (payload.ok !== true) {
          return { ok: false as const, error: payload.error ?? 'codex status failed' }
        }
        // Normalized activity lines pass through untouched (bounded ring).
        const activity = Array.isArray(payload.activity) ? payload.activity : undefined
        const threadId = typeof payload.threadId === 'string' ? payload.threadId : undefined
        if (payload.state === 'running') {
          return {
            ok: true as const, state: 'running' as const,
            ...(threadId === undefined ? {} : { threadId }),
            ...(activity === undefined ? {} : { activity }),
            ...(typeof payload.lastMessage === 'string' ? { liveAnswer: payload.lastMessage } : {}),
          }
        }
        if (payload.state === 'succeeded') {
          return {
            ok: true as const, state: 'succeeded' as const,
            ...(threadId === undefined ? {} : { threadId }),
            ...(typeof payload.lastMessage === 'string' ? { lastMessage: payload.lastMessage } : {}),
            ...(typeof payload.outputTail === 'string' ? { outputTail: payload.outputTail } : {}),
            ...(activity === undefined ? {} : { activity }),
            ...(typeof payload.usage === 'object' && payload.usage !== null
              ? { usage: payload.usage as Record<string, unknown> }
              : {}),
          }
        }
        if (payload.state === 'interrupted') {
          return {
            ok: true as const, state: 'interrupted' as const,
            ...(threadId === undefined ? {} : { threadId }),
            ...(typeof payload.outputTail === 'string' ? { outputTail: payload.outputTail } : {}),
          }
        }
        return {
          ok: true as const, state: 'failed' as const,
          ...(payload.error === undefined ? {} : { error: String(payload.error) }),
          ...(typeof payload.outputTail === 'string' ? { outputTail: payload.outputTail } : {}),
          ...(activity === undefined ? {} : { activity }),
        }
      },
      steer: async (runId, content) => {
        const payload = await postHostRoute(ROUTE_CODEX_STEER, { runId, content })
        if (payload.ok === true) return { ok: true }
        return { ok: false, error: String(payload.error ?? 'steer rejected') }
      },
      cancel: async runId => {
        await postHostRoute(ROUTE_CODEX_CANCEL, { runId })
      },
    }
    const worktreeFace: WorktreeExecutionFace = {
      ensure: async request => {
        const payload = await postHostRoute(ROUTE_WORKTREE_CREATE, request)
        if (payload.ok === true && typeof payload.path === 'string' && typeof payload.branch === 'string') {
          return { ok: true as const, path: payload.path, branch: payload.branch, created: payload.created === true }
        }
        return { ok: false as const, error: payload.error ?? 'git worktree could not be created' }
      },
      remove: async request => {
        const payload = await postHostRoute(ROUTE_WORKTREE_REMOVE, request)
        return payload.ok === true ? { ok: true as const } : { ok: false as const, error: payload.error ?? 'git worktree removal failed' }
      },
    }

    // Registering an existing path is idempotent per path on the host; the
    // display title is then pointed at the task so the sidebar entry reads
    // like the task it serves. Shared by the execution service (worktree
    // adoption during runs) and the controller (prepare action).
    const registerWorkspace = async (path: string, title: string): Promise<string | undefined> => {
      const view = await workspaces.create({ path })
      if (view.title !== title && title.trim() !== '') {
        try {
          const renamed = await workspaces.rename(view.workspaceId, title)
          return renamed.workspaceId as string
        } catch {
          return view.workspaceId as string
        }
      }
      return view.workspaceId as string
    }

    const exec = new ExecutionService({
      sessions: {
        list: sessions.list,
        create: async ({ workspaceId }) => {
          const response = await connection.api.sessions.create({ workspaceId: workspaceId as WorkspaceId })
          if (!response.result.ok) throw new Error(`${response.result.error.code}: ${response.result.error.message}`)
          return response.result.value.sessionId as string
        },
        binding: id => {
          const binding = sessions.binding(id as SessionId)
          if (binding === undefined) return undefined
          const { session } = binding
          return {
            session: {
              rename: title => session.rename(title),
              prompt: (content, mode) =>
                session.prompt(content as PromptContentPart[], mode).then(result =>
                  result.ok ? { ok: true as const } : { ok: false as const, error: result.error }),
              command: line =>
                session.command(line).then(result =>
                  result.ok ? { ok: true as const, matched: result.value.matched } : { ok: false as const, error: result.error }),
              getSnapshot: () => session.getSnapshot(),
              subscribe: fn => session.subscribe(fn),
            },
          }
        },
        noteAgentPreset: (sessionId, agentPreset) => sessions.noteAgentPreset(sessionId as SessionId, agentPreset),
      },
      workspaces: {
        list: workspaces.list,
        connectWorkspace: id => workspaces.connectWorkspace(id as WorkspaceId),
      },
      presets: {
        select: async (sessionId, agentPreset) => {
          try {
            const response = await connection.api.agentPresets.select({ sessionId: sessionId as SessionId, agentPreset })
            return response.result.ok ? { ok: true as const } : { ok: false as const, error: response.result.error }
          } catch (error) {
            return { ok: false as const, error }
          }
        },
      },
      models: {
        select: async (sessionId, selection) => {
          try {
            const response = await connection.api.sessions.selectModel({
              sessionId: sessionId as SessionId,
              provider: selection.provider,
              model: selection.model,
              ...(selection.reasoningEffort === undefined ? {} : { reasoningEffort: selection.reasoningEffort }),
            })
            return response.result.ok ? { ok: true as const } : { ok: false as const, error: response.result.error }
          } catch (error) {
            return { ok: false as const, error }
          }
        },
      },
      history: {
        loadTail: async sessionId => {
          const response = await connection.api.sessions.history({
            sessionId: sessionId as SessionId,
            maxMessages: 20,
          })
          return response.result.ok
            ? { events: response.result.value.events.map(entry => entry.event) }
            : undefined
        },
      },
      codex: codexFace,
      worktrees: worktreeFace,
      registerWorkspace,
    })
    const controller = new BoardController({
      store,
      exec,
      sessions: {
        list: sessions.list,
        open: id => sessions.open(id as SessionId),
      },
      registerWorkspace,
      deleteWorkspace: async workspaceId => {
        await workspaces.delete(workspaceId as WorkspaceId)
      },
      openWorkspace: workspaceId => {
        void workspaces.connectWorkspace(workspaceId as WorkspaceId).then(
          sessionId => { sessions.open(sessionId) },
          error => { console.error('[dsh-task-board] open workspace failed', error) },
        )
      },
    })
    controller.start()

    // Scheduled runs: a browser-side heartbeat that triggers due tasks through
    // the same run path as the manual Run button. The first tick is gated on
    // the session list baseline so a page-load catch-up never fires into a
    // not-yet-ready runtime; tab visibility recovery ticks immediately.
    const scheduler = new SchedulerService({
      tasks: () => controller.getSnapshot().tasks,
      // Re-read the persisted ledger before every fire decision: a task
      // deleted in another tab must never fire from a stale in-memory copy.
      refresh: () => controller.reloadFromStore(),
      now: () => Date.now(),
      runTask: id => controller.runTask(id),
      applySchedule: (id, nextRunAt, lastTriggeredAt) =>
        controller.applyScheduleNextRun(id, nextRunAt, lastTriggeredAt),
      ready: () => sessions.list.getSnapshot().phase === 'ready',
      environment: {
        addEventListener: (type, listener) => document.addEventListener(type, listener),
        removeEventListener: (type, listener) => document.removeEventListener(type, listener),
      },
    })
    scheduler.start()

    const disposers: Array<() => void> = []
    const syncLocale = (): void => {
      setTaskBoardLocale(ctx.locale.getLocale().active)
      controller.refresh()
    }
    syncLocale()
    disposers.push(ctx.locale.subscribe(syncLocale))

    // Execution-target option feeds: workspace, agent-preset, and model
    // catalogs are runtime facts (not ledger state), so the wiring pushes them
    // into the controller. The remote catalogs are re-read after reconnects
    // because a reconnect may serve a different deployment.
    const pushWorkspaceOptions = (): void => {
      const snapshot = workspaces.list.getSnapshot()
      controller.setExecutionOptions({
        workspaces: snapshot.items.map(item => ({
          workspaceId: item.workspaceId,
          title: item.title !== '' ? item.title : item.path,
          path: item.path,
        })),
      })
    }
    pushWorkspaceOptions()
    disposers.push(workspaces.list.subscribe(pushWorkspaceOptions))
    // Codex executor facts (availability + the machine's model catalog) come
    // from this package's host route; re-read after reconnects like the other
    // runtime catalogs.
    const pushCodexOptions = async (): Promise<void> => {
      const payload = await postHostRoute(ROUTE_CODEX_ENV, {})
      if (payload.ok !== true) {
        controller.setExecutionOptions({ codex: EMPTY_CODEX_OPTIONS })
        return
      }
      const models = Array.isArray(payload.models) ? payload.models : []
      const choices: CodexModelChoice[] = []
      for (const model of models) {
        if (typeof model !== 'object' || model === null) continue
        const record = model as Record<string, unknown>
        if (typeof record.slug !== 'string' || record.slug === '') continue
        const efforts = Array.isArray(record.efforts)
          ? record.efforts.flatMap(effort => {
              if (typeof effort !== 'object' || effort === null) return []
              const effortRecord = effort as Record<string, unknown>
              if (typeof effortRecord.id !== 'string' || effortRecord.id === '') return []
              return [{
                id: effortRecord.id,
                ...(typeof effortRecord.description === 'string' ? { description: effortRecord.description } : {}),
              }]
            })
          : []
        choices.push({
          slug: record.slug,
          displayName: typeof record.displayName === 'string' && record.displayName !== ''
            ? record.displayName
            : record.slug,
          ...(typeof record.description === 'string' ? { description: record.description } : {}),
          efforts,
          ...(typeof record.defaultEffort === 'string' ? { defaultEffort: record.defaultEffort } : {}),
        })
      }
      controller.setExecutionOptions({
        codex: {
          available: payload.available === true,
          models: choices,
          ...(typeof payload.defaultModel === 'string' && payload.defaultModel !== ''
            ? { defaultModel: payload.defaultModel }
            : {}),
          ...(typeof payload.defaultEffort === 'string' && payload.defaultEffort !== ''
            ? { defaultEffort: payload.defaultEffort }
            : {}),
        },
      })
    }
    void pushCodexOptions()
    const pushPresetOptions = async (): Promise<void> => {
      try {
        const response = await connection.api.agentPresets.list({})
        if (!response.result.ok) return
        controller.setExecutionOptions({
          presets: response.result.value.presets.map(preset => ({
            id: preset.id,
            name: preset.name,
            description: preset.description,
            broken: preset.broken,
            isDefault: preset.isDefault,
          })),
        })
      } catch (error) {
        // A failed roster read leaves the previous options in place; the
        // picker stays usable and the next reconnect retries the read.
        console.error('[dsh-task-board] agent preset roster read failed', error)
      }
    }
    void pushPresetOptions()
    const pushModelOptions = async (): Promise<void> => {
      try {
        const response = await connection.api.llm.models({})
        if (!response.result.ok) return
        controller.setExecutionOptions({
          models: response.result.value.groups.flatMap(group => group.models.map(model => ({
            provider: group.id,
            providerName: group.name,
            model: model.id,
            name: model.name,
            description: model.description,
            reasoning: model.reasoning === undefined ? undefined : {
              defaultEffort: model.reasoning.defaultEffort,
              efforts: model.reasoning.efforts.map(effort => ({
                id: effort.id,
                name: effort.name,
                description: effort.description,
              })),
            },
          }))),
        })
      } catch (error) {
        // A failed catalog read leaves the previous options in place; the
        // picker remains usable and reconnect retries the read.
        console.error('[dsh-task-board-model] model catalog read failed', error)
      }
    }
    void pushModelOptions()
    ctx.remote.$on('llm/adapters-updated', () => { void pushModelOptions() })
    ctx.remote.$on('settings/document-updated', () => { void pushModelOptions() })
    disposers.push(ctx.on('connection/reset', () => {
      void pushPresetOptions()
      void pushModelOptions()
      void pushCodexOptions()
    }))
    try {
      disposers.push(mountSidebarEntry(controller))
      disposers.push(mountBoard(controller))
    } catch (error) {
      // DOM failures degrade the board, never the GUI.
      console.error('[dsh-task-board] mount failed:', error)
    }

    uiDisposer = () => {
      for (const dispose of disposers.splice(0)) dispose()
      scheduler.dispose()
      controller.dispose()
      uiDisposer = undefined
    }
  }
  const syncEnabled = (): void => {
    const snapshot = settingsScope.getSnapshot()
    const enabled = snapshot.status === 'ready'
      ? snapshot.value?.enabled ?? true
      : snapshot.status === 'unavailable'
    if (enabled) mountUi()
    else uiDisposer?.()
  }
  settingsScope.subscribe(syncEnabled)
  syncEnabled()
}
