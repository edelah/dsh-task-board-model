/**
 * Host loader entry for the task-board plugin.
 *
 * Everything the board does is browser work (DOM, localStorage, driving the
 * client runtime's session services over the wire), so the host half's main
 * behavior is a system-prompt section announcing the plugin to every agent.
 * The section registers while this plugin is in the host composition (mount /
 * DSH restart) and disappears when the plugin leaves it (unmount / restart),
 * so agents always know the board exists and how to cooperate with it. The
 * announcement can be turned off through the web settings plugin-configuration
 * surface (`announceToAgent`); the section then disappears live.
 */

import type { Context } from '@deepseek-ai/cordis'
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings'
import z from 'schemastery'
import type {} from '@deepseek-ai/dsh-system-prompt'
import type {
  NativeSessionBridge, NativeSessionPersistenceFace, NativeSessionsFace,
  SubprocessFace, WebServerFace,
} from './host/codex-routes.ts'
import { registerTaskBoardRoutes } from './host/codex-routes.ts'
import { mountOnce } from './mount-once.ts'

/** Order of the announcement section within the tool-guidance band. */
const SECTION_ORDER = 200

export const inject = ['systemPrompt']

/** Model-facing announcement: plugin presence, capabilities, and limits. */
export const TASK_BOARD_GUIDANCE = '本机已安装 dsh-task-board-model 插件（DSH Web GUI 的任务看板）：侧边栏「任务看板」入口。能力：多列看板管理任务；任务可真实执行；任务可钉住执行目标——工作区 / 模式（agent 预设）/ 权限（read-only / workspace-write / danger-full-access）/ 模型 / 推理力度，缺省用运行时默认；执行者可选 DSH 会话或 OpenAI Codex（经宿主机 codex app-server 运行：可选模型与推理力度、实时活动流、进行中可 steer 注入输入、结束后可在同一线程继续追问、重启后凭绑定恢复线程）；可为任务创建 git worktree 执行（自动注册为工作区，出现在侧边栏）；任务支持 5 段 cron 定时执行（如 0 23 * * *）；数据存浏览器 localStorage（键 dsh.taskBoard.v1）。限制：定时调度在浏览器端，需 GUI 标签页打开，错过即跳过；Codex 子代理审批请求一律拒绝（fail-closed），沙箱随权限预设固定；执行消耗 API 额度。用户提到「任务看板 / 看板 / 定时任务」时即指本插件，请据此协作。'

/**
 * Settings namespace of the board's announcement capability — the section the
 * web settings surface edits. Spelled here rather than imported: the browser
 * half spells the same value and must not depend on a Host package.
 */
export const TASK_BOARD_SETTINGS_NAMESPACE = settingsNamespace('task-board')

/** Plugin config, validated by the same-named schemastery schema. */
export interface Config {
  /**
   * When true (default), a system-prompt section announces the board to every
   * agent. Set false to keep the board silent in prompts; agents then learn
   * about it only when the user mentions it.
   */
  announceToAgent?: boolean
  /** Master switch for the plugin (browser half + host announcement). */
  enabled?: boolean
}

export const Config: z<Config> = z.object({
  announceToAgent: z.boolean().default(true),
  enabled: z.boolean().default(true),
})

/** Schema default, re-read for hand-built test contexts (the loader applies them normally). */
const DEFAULT_ANNOUNCE = true

/**
 * Register the board's announcement section, gated on the composition entry's
 * `announceToAgent` (and the live settings value once the web settings
 * surface is served). The section is re-registered whenever the source
 * changes, so a settings edit takes effect without a restart.
 * @param ctx - the plugin context (systemPrompt injected).
 * @param config - resolved plugin config (schema defaults applied by the loader).
 */
export const apply = mountOnce('dsh-task-board-model', applyImpl)

function applyImpl(ctx: Context, config?: Config): void {
  // The live source the announcement reads: the settings section once the web
  // settings surface is served, the composition entry otherwise
  // (installSettingsSection swaps it when the namespace registers).
  let current: () => Config = () => config ?? {}
  let disposeSection: (() => void) | undefined

  // Host routes for the Codex executor and git worktrees. The web server is
  // optional to this plugin, so wait for it in a child injection instead of
  // reading an undeclared property (Cordis rejects that access). The
  // subprocess seam is optional and is therefore read through `get`; route
  // handlers report its absence when a deployment does not mount it. The
  // nested fiber and its effects disappear with the parent plugin.
  ctx.inject(['webServer'], webCtx => {
    const webServer = webCtx.get('webServer') as WebServerFace | undefined
    if (webServer === undefined) return
    const subprocess = webCtx.get('subprocess') as SubprocessFace | undefined
    const nativeSessions = webCtx.get('sessions') as NativeSessionsFace | undefined
    const nativePersistence = webCtx.get('sessionPersistence') as NativeSessionPersistenceFace | undefined
    const nativeBridge: NativeSessionBridge | undefined = nativeSessions === undefined || nativePersistence === undefined
      ? undefined
      : {
          sessions: nativeSessions,
          persistence: nativePersistence,
        }
    webCtx.effect(() => {
      const registrations = registerTaskBoardRoutes(webServer, subprocess, nativeBridge)
      return () => {
        for (const registration of registrations) {
          if (typeof registration === 'function') (registration as () => void)()
        }
      }
    }, 'task-board: host routes')
  })

  // Register (or drop) the announcement to match the current source. The
  // section is kept under one disposer: re-registering first tears the old
  // one down so a duplicate-name registration never throws.
  const sync = (): void => {
    if (disposeSection !== undefined) {
      disposeSection()
      disposeSection = undefined
    }
    if ((current().enabled ?? true) === false) return
    if ((current().announceToAgent ?? DEFAULT_ANNOUNCE) === false) return
    disposeSection = ctx.systemPrompt.section({
      name: 'plugin:task-board-model',
      order: SECTION_ORDER,
      text: TASK_BOARD_GUIDANCE,
    })
  }

  installSettingsSection(ctx, TASK_BOARD_SETTINGS_NAMESPACE, Config, config ?? {}, {
    setSource: (source) => { current = source },
    onChange: sync,
  })

  // Initial registration from the composition entry (covers deployments with
  // no settings service, whose installSettingsSection never fires its hooks).
  sync()
}
