/**
 * Task detail: the full view of one task — content, prompt, execution
 * history — and the only place execution can be triggered. Also offers
 * delete (with confirmation), manual status moves, a jump to the
 * execution's session transcript (DSH runs), and the git-worktree manager.
 */
import { useEffect, useState } from 'react'
import type { BoardController } from '../../core/controller.ts'
import type { CodexActivityLine } from '../../core/execution.ts'
import { isValidCron } from '../../core/schedule.ts'
import {
  isTaskExecutor, MANUAL_STATUSES, TASK_PERMISSIONS,
  type ExecutionRecord, type TaskExecutor, type TaskPermission, type TaskRecord, type TaskStatus,
} from '../../core/tasks.ts'
import { t, type TaskBoardKey } from '../locales.ts'
import { SCHEDULE_PRESETS } from '../schedule-presets.ts'
import css from '../board.module.css'
import { CodexEffortField, CodexModelField } from './ExecutorFields.tsx'
import { ConfirmDialog } from './ConfirmDialog.tsx'
import { WorktreeDetailSection } from './WorktreeSection.tsx'
import { formatTime } from './TaskCard.tsx'
import { STATUS_KEY } from './status-key.ts'

/** Execution outcome → locale key. */
const RESULT_KEY: Record<NonNullable<ExecutionRecord['result']>, TaskBoardKey> = {
  succeeded: 'detail.result.succeeded',
  failed: 'detail.result.failed',
  cancelled: 'detail.result.cancelled',
}

/** One execution-history row. */
function ExecutionRow({ execution, onOpen }: { execution: ExecutionRecord; onOpen: (sessionId: string) => void }) {
  const result = execution.result
  return (
    <li className={css.executionRow} data-result={result}>
      <span className={css.executionBadge} data-result={result}>
        {result === undefined ? t('detail.result.running') : t(RESULT_KEY[result])}
      </span>
      <span
        className={css.executorChip}
        data-executor={execution.runner ?? 'dsh'}
        title={(execution.runner ?? 'dsh') === 'codex' ? execution.runId : execution.sessionId}
      >
        {(execution.runner ?? 'dsh') === 'codex' ? t('detail.runner.codex') : t('detail.runner.dsh')}
      </span>
      <span className={css.executionTimes}>
        {t('detail.executionStarted')} {formatTime(execution.startedAt)}
        {execution.endedAt !== undefined && ` · ${t('detail.executionEnded')} ${formatTime(execution.endedAt)}`}
      </span>
      {execution.sessionId !== undefined && (
        <button
          type="button"
          className={css.linkButton}
          onClick={() => { onOpen(execution.sessionId as string) }}
          title={execution.sessionId}
        >
          {t('detail.viewSession')} ⌁
        </button>
      )}
      {execution.error !== undefined && execution.error !== '' && (
        <span className={css.executionError}>{execution.error}</span>
      )}
      {execution.outputTail !== undefined && execution.outputTail !== '' && (
        <pre className={css.outputBlock}>{execution.outputTail}</pre>
      )}
    </li>
  )
}

/** The execution-target editor: workspace / mode / permission pickers. */
function ExecutionSettingsSection({ controller, task }: { controller: BoardController; task: TaskRecord }) {
  const [options, setOptions] = useState(controller.getSnapshot().executionOptions)
  useEffect(
    () => controller.subscribe(() => setOptions(controller.getSnapshot().executionOptions)),
    [controller],
  )
  const workspaceId = task.workspaceId ?? ''
  const mode = task.mode ?? ''
  const permission = task.permission ?? ''
  const modelSelection = task.modelSelection
  const modelKey = modelSelection === undefined ? '' : `${modelSelection.provider}/${modelSelection.model}`
  const selectedModel = options.models.find(model => `${model.provider}/${model.model}` === modelKey)
  const selectedEffort = modelSelection?.reasoningEffort ?? ''
  const executor: TaskExecutor = isTaskExecutor(task.executor) && task.executor === 'codex' ? 'codex' : 'dsh'
  const codexSelected = executor === 'codex'
  // A pinned target may disappear from the runtime (workspace deleted,
  // preset removed); keep it selectable as a stale row instead of silently
  // dropping it, so the user sees exactly what the task will ask for.
  const workspaceKnown = workspaceId === '' || options.workspaces.some(item => item.workspaceId === workspaceId)
  const modeKnown = mode === '' || options.presets.some(item => item.id === mode)
  const modelKnown = modelKey === '' || selectedModel !== undefined
  const effortKnown = selectedEffort === '' || selectedModel?.reasoning?.efforts.some(effort => effort.id === selectedEffort) === true
  return (
    <section className={css.detailSection}>
      <h4>{t('detail.executionSettings')}</h4>
      <p className={css.detailText}>{codexSelected ? t('exec.hint.codex') : t('exec.hint')}</p>
      <label className={css.field}>
        <span className={css.fieldLabel}>{t('new.workspace')}</span>
        <select
          className={css.select}
          value={workspaceId}
          onChange={event => { controller.updateTask(task.id, { workspaceId: event.target.value }) }}
        >
          <option value="">{t('exec.workspace.recent')}</option>
          {!workspaceKnown && <option value={workspaceId}>{workspaceId}{t('exec.mode.removed')}</option>}
          {options.workspaces.map(workspace => (
            <option key={workspace.workspaceId} value={workspace.workspaceId}>{workspace.title}</option>
          ))}
        </select>
      </label>
      <label className={css.field}>
        <span className={css.fieldLabel}>{t('new.executor')}</span>
        <select
          className={css.select}
          value={executor}
          onChange={event => {
            const next = event.target.value
            controller.updateTask(task.id, {
              executor: isTaskExecutor(next) ? next as TaskExecutor : undefined,
            })
          }}
        >
          <option value="dsh">{t('exec.executor.dsh')}</option>
          <option value="codex">
            {t('exec.executor.codex')}
            {options.codex.available ? '' : t('exec.executor.codexUnavailable')}
          </option>
        </select>
      </label>
      <label className={css.field}>
        <span className={css.fieldLabel}>{t('new.permission')}</span>
        <select
          className={css.select}
          value={permission}
          onChange={event => { controller.updateTask(task.id, { permission: event.target.value === '' ? undefined : event.target.value as TaskPermission }) }}
        >
          <option value="">{t('exec.permission.default')}</option>
          {TASK_PERMISSIONS.map(id => (
            <option key={id} value={id}>{t(`exec.permission.${id}` as TaskBoardKey)}</option>
          ))}
        </select>
      </label>
      {!codexSelected && (
        <>
          <label className={css.field}>
            <span className={css.fieldLabel}>{t('new.mode')}</span>
            <select
              className={css.select}
              value={mode}
              onChange={event => { controller.updateTask(task.id, { mode: event.target.value }) }}
            >
              <option value="">{t('exec.mode.default')}</option>
              {!modeKnown && <option value={mode}>{mode}{t('exec.mode.removed')}</option>}
              {options.presets.map(preset => (
                <option key={preset.id} value={preset.id} disabled={preset.broken !== undefined}>
                  {preset.name ?? preset.id}
                  {preset.isDefault ? t('exec.mode.defaultSuffix') : ''}
                  {preset.broken !== undefined ? t('exec.mode.brokenSuffix') : ''}
                </option>
              ))}
            </select>
          </label>
          <label className={css.field}>
            <span className={css.fieldLabel}>{t('new.model')}</span>
            <select
              className={css.select}
              value={modelKey}
              onChange={event => {
                const next = options.models.find(item => `${item.provider}/${item.model}` === event.target.value)
                controller.updateTask(task.id, {
                  modelSelection: next === undefined ? undefined : { provider: next.provider, model: next.model },
                })
              }}
            >
              <option value="">{t('exec.model.default')}</option>
              {!modelKnown && <option value={modelKey}>{modelKey}{t('exec.model.removedSuffix')}</option>}
              {options.models.map(model => (
                <option key={`${model.provider}/${model.model}`} value={`${model.provider}/${model.model}`}>
                  {model.providerName} / {model.name}
                </option>
              ))}
            </select>
          </label>
          <label className={css.field}>
            <span className={css.fieldLabel}>{t('new.reasoningEffort')}</span>
            <select
              className={css.select}
              value={selectedEffort}
              disabled={selectedModel === undefined || selectedModel.reasoning?.efforts.length === 0}
              onChange={event => {
                if (selectedModel === undefined) return
                controller.updateTask(task.id, {
                  modelSelection: {
                    provider: selectedModel.provider,
                    model: selectedModel.model,
                    ...(event.target.value === '' ? {} : { reasoningEffort: event.target.value }),
                  },
                })
              }}
            >
              <option value="">{selectedModel?.reasoning?.defaultEffort !== undefined
                ? t('exec.effort.defaultWithValue', { value: selectedModel.reasoning.defaultEffort })
                : t('exec.effort.default')}</option>
              {!effortKnown && <option value={selectedEffort}>{selectedEffort}{t('exec.effort.removedSuffix')}</option>}
              {selectedModel?.reasoning?.efforts.map(effort => (
                <option key={effort.id} value={effort.id}>{effort.name}</option>
              ))}
            </select>
          </label>
        </>
      )}
      {codexSelected && (
        <>
          <CodexModelField
            options={options.codex}
            value={task.codexModel}
            onChange={slug => { controller.updateTask(task.id, { codexModel: slug }) }}
          />
          <CodexEffortField
            options={options.codex}
            modelSlug={task.codexModel ?? options.codex.defaultModel}
            value={task.codexEffort}
            onChange={effort => { controller.updateTask(task.id, { codexEffort: effort }) }}
          />
        </>
      )}
    </section>
  )
}

/** The scheduled-runs editor: enable toggle, cron input + presets, next-run info. */
function ScheduleSection({ controller, task }: { controller: BoardController; task: TaskRecord }) {
  const schedule = task.schedule
  const [cron, setCron] = useState(schedule?.cron ?? '0 9 * * *')
  const [enabled, setEnabled] = useState(schedule?.enabled ?? false)
  const [nextRunAt, setNextRunAt] = useState<number | undefined>(schedule?.nextRunAt)
  const [lastTriggeredAt, setLastTriggeredAt] = useState<number | undefined>(schedule?.lastTriggeredAt)
  const [error, setError] = useState<string | undefined>(undefined)

  // Keep the editor in sync when the task record changes underneath (the
  // schedule rolls forward as runs trigger).
  useEffect(() => {
    setCron(schedule?.cron ?? '0 9 * * *')
    setEnabled(schedule?.enabled ?? false)
    setNextRunAt(schedule?.nextRunAt)
    setLastTriggeredAt(schedule?.lastTriggeredAt)
    setError(undefined)
  }, [task.id, schedule?.enabled, schedule?.cron, schedule?.nextRunAt, schedule?.lastTriggeredAt])

  /** Validate + persist the current cron text (Enter or blur). */
  const saveCron = (value: string): void => {
    const trimmed = value.trim()
    setCron(trimmed)
    if (trimmed === '' || !isValidCron(trimmed)) {
      setError(t('detail.schedule.invalid'))
      return
    }
    setError(undefined)
    controller.setSchedule(task.id, { cron: trimmed })
  }

  /** Arm/disarm the schedule (arming first persists the edited cron). */
  const toggleEnabled = (next: boolean): void => {
    const trimmed = cron.trim()
    if (next && (trimmed === '' || !isValidCron(trimmed))) {
      setError(t('detail.schedule.invalid'))
      return
    }
    setError(undefined)
    if (next && trimmed !== schedule?.cron) controller.setSchedule(task.id, { cron: trimmed })
    if (controller.setSchedule(task.id, { enabled: next })) setEnabled(next)
  }

  const applyPreset = (preset: string): void => {
    if (preset === '') return
    setCron(preset)
    setError(undefined)
    controller.setSchedule(task.id, { cron: preset })
  }

  const nextLabel = !enabled || nextRunAt === undefined
    ? t('detail.schedule.notScheduled')
    : nextRunAt <= Date.now()
      ? t('detail.schedule.dueSoon')
      : new Date(nextRunAt).toLocaleString()
  const lastLabel = lastTriggeredAt === undefined ? '—' : new Date(lastTriggeredAt).toLocaleString()

  return (
    <section className={css.detailSection}>
      <h4>{t('detail.schedule')}</h4>
      <label className={css.scheduleToggle}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={event => { toggleEnabled(event.target.checked) }}
        />
        <span>{t('detail.schedule.enable')}</span>
      </label>
      <div className={css.scheduleRow}>
        <input
          className={`${css.input} ${css.scheduleInput}${error !== undefined ? ` ${css.scheduleInputInvalid}` : ''}`}
          value={cron}
          placeholder="0 9 * * *"
          spellCheck={false}
          aria-label={t('detail.schedule.cron')}
          onChange={event => { setCron(event.target.value); setError(undefined) }}
          onBlur={() => { saveCron(cron) }}
          onKeyDown={event => { if (event.key === 'Enter') saveCron(cron) }}
        />
        <select
          className={css.schedulePreset}
          value=""
          aria-label={t('detail.schedule.presets')}
          onChange={event => { applyPreset(event.target.value) }}
        >
          <option value="">{t('detail.schedule.presets')}…</option>
          {SCHEDULE_PRESETS.map(preset => (
            <option key={preset.cron} value={preset.cron}>{t(preset.label)}</option>
          ))}
        </select>
      </div>
      {error !== undefined && <p className={css.formError}>{error}</p>}
      <p className={css.scheduleMeta}>
        {t('detail.schedule.nextRun')} {nextLabel}
        {' · '}{t('detail.schedule.lastTriggered')} {lastLabel}
      </p>
    </section>
  )
}

/**
 * Live view of a hosted Codex run: normalized activity (commands, file
 * changes, MCP calls), the streaming answer while running, a steer input
 * for the ACTIVE turn, and a follow-up composer that resumes the persisted
 * thread after the run settled.
 */
function CodexLiveSection({ controller, task }: { controller: BoardController; task: TaskRecord }) {
  const latest = task.executions[task.executions.length - 1]
  const isCodex = task.executor === 'codex'
  const running = task.status === 'running' && latest?.runner === 'codex' && latest?.endedAt === undefined
  const canFollow = controller !== undefined && !running && isCodex && latest?.threadId !== undefined
  const [snapshot, setSnapshot] = useState<{ activity?: readonly CodexActivityLine[]; liveAnswer?: string } | undefined>(undefined)
  const [steerText, setSteerText] = useState('')
  const [followUp, setFollowUp] = useState('')
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState<string | undefined>(undefined)

  // Poll the host route directly while the run is active so commands and
  // answer text stream in without touching the ledger.
  useEffect(() => {
    if (!running) {
      setSnapshot(undefined)
      return
    }
    let alive = true
    const tick = (): void => {
      void controller.codexRunSnapshot(task.id).then(view => {
        if (alive) setSnapshot(view ?? { activity: [] })
      })
    }
    tick()
    const timer = setInterval(tick, 2000)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [controller, task.id, running])

  if (!isCodex) return null
  const activity = snapshot?.activity ?? []
  const liveAnswer = snapshot?.liveAnswer

  const sendSteer = async (): Promise<void> => {
    const content = steerText.trim()
    if (content === '') return
    setSending(true)
    try {
      const result = await controller.steerExecution(task.id, content)
      if (!result.ok) setNotice(result.error)
      else setNotice(undefined)
      setSteerText('')
    } finally {
      setSending(false)
    }
  }

  const sendFollowUp = async (): Promise<void> => {
    const content = followUp.trim()
    if (content === '' || sending) return
    setSending(true)
    setNotice(undefined)
    try {
      const launched = await controller.followUpTask(task.id, content)
      if (launched) {
        setFollowUp('')
        // The board flips to running; the poll effect above takes over.
      } else {
        setNotice(t('detail.followUpUnavailable'))
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <section className={css.detailSection}>
      <h4>{t('detail.activity')}</h4>
      {activity.length > 0 && (
        <ul className={css.activityList}>
          {[...activity].slice(-12).map((entry, index) => (
            <li key={`${entry.at}-${index}`}>
              <span className={css.activityTime}>{formatTime(entry.at)}</span>
              {entry.text}
            </li>
          ))}
        </ul>
      )}
      {running && liveAnswer !== undefined && liveAnswer.trim() !== '' && (
        <>
          <p className={css.worktreeMeta}>{t('detail.liveAnswer')}</p>
          <pre className={css.outputBlock}>{liveAnswer}</pre>
        </>
      )}
      {running && (
        <div className={css.followUpRow}>
          <input
            className={css.input}
            value={steerText}
            placeholder={t('detail.steerPlaceholder')}
            onChange={event => { setSteerText(event.target.value) }}
            onKeyDown={event => { if (event.key === 'Enter') void sendSteer() }}
          />
          <button
            type="button"
            className={css.ghostButton}
            disabled={sending || steerText.trim() === ''}
            onClick={() => { void sendSteer() }}
          >
            {t('detail.steer')}
          </button>
        </div>
      )}
      {!running && canFollow && (
        <>
          <label className={css.field}>
            <span className={css.fieldLabel}>{t('detail.followUp')}</span>
            <textarea
              className={`${css.input} ${css.followUpInput}`}
              rows={2}
              value={followUp}
              placeholder={t('detail.followUpPlaceholder')}
              onChange={event => { setFollowUp(event.target.value); setNotice(undefined) }}
            />
          </label>
          <div className={css.worktreeRow}>
            <button
              type="button"
              className={css.primaryButton}
              disabled={sending || followUp.trim() === ''}
              onClick={() => { void sendFollowUp() }}
            >
              {sending ? t('detail.sending') : t('detail.send')}
            </button>
            <span className={css.worktreeMeta}>{t('detail.followUpHint')}</span>
          </div>
        </>
      )}
      {notice !== undefined && <p className={css.formError}>{notice}</p>}
    </section>
  )
}

/** Task detail overlay. */
export function TaskDetail({ controller, task }: { controller: BoardController; task: TaskRecord }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const running = task.status === 'running'
  // Only hosted Codex runs have a cancel verb today.
  const latest = task.executions[task.executions.length - 1]
  const canStop = running && latest?.runner === 'codex' && latest.endedAt === undefined

  // Keep the overlay in sync if the task record changes underneath.
  const [latestTask, setLatestTask] = useState(task)
  useEffect(() => { setLatestTask(task) }, [task])
  const current = latestTask

  return (
    <div className={css.modalBackdrop} onMouseDown={event => { if (event.target === event.currentTarget) controller.closeTask() }}>
      <div className={css.detail} role="dialog" aria-label={t('detail.title')}>
        <header className={css.detailHeader}>
          <h2 className={css.detailTitle}>{current.title}</h2>
          <span className={css.statusBadge} data-status={current.status}>{t(STATUS_KEY[current.status])}</span>
          <button
            type="button"
            className={css.iconButton}
            aria-label={t('detail.close')}
            onClick={() => { controller.closeTask() }}
          >
            ×
          </button>
        </header>

        <div className={css.detailBody}>
          <section className={css.detailSection}>
            <h4>{t('detail.description')}</h4>
            <p className={css.detailText}>{current.description !== '' ? current.description : '—'}</p>
          </section>

          <section className={css.detailSection}>
            <h4>{t('detail.prompt')}</h4>
            <pre className={css.promptBlock}>{current.prompt !== '' ? current.prompt : current.title}</pre>
          </section>

          <ExecutionSettingsSection controller={controller} task={current} />

          <WorktreeDetailSection controller={controller} task={current} />

          <ScheduleSection controller={controller} task={current} />

          <CodexLiveSection controller={controller} task={current} />

          <section className={css.detailSection}>
            <h4>{t('detail.execution')}</h4>
            {current.executions.length === 0 ? (
              <p className={css.detailText}>{t('detail.noExecution')}</p>
            ) : (
              <ul className={css.executionList}>
                {[...current.executions].reverse().map(execution => (
                  <ExecutionRow
                    key={execution.id}
                    execution={execution}
                    onOpen={sessionId => { controller.openSession(sessionId) }}
                  />
                ))}
              </ul>
            )}
          </section>

          <section className={css.detailSection}>
            <h4>{t('board.status')}</h4>
            <div className={css.moveRow}>
              {MANUAL_STATUSES.map(status => (
                <button
                  key={status}
                  type="button"
                  className={css.ghostButton}
                  disabled={current.status === status || running}
                  onClick={() => { controller.moveTask(current.id, status) }}
                >
                  {t(`status.move.${status}` as TaskBoardKey)}
                </button>
              ))}
            </div>
          </section>
        </div>

        <footer className={css.detailFooter}>
          {canStop && (
            <button
              type="button"
              className={css.dangerButton}
              onClick={() => { void controller.cancelExecution(current.id) }}
            >
              {t('detail.stop')}
            </button>
          )}
          <button
            type="button"
            className={css.primaryButton}
            disabled={running}
            onClick={() => {
              // Running kicks off a real agent session; close the detail so
              // the whole board stays visible while the task executes.
              controller.closeTask()
              void controller.rerunTask(current.id)
            }}
          >
            {current.executions.length === 0 ? t('detail.run') : t('detail.rerun')}
          </button>
          {current.archivedAt !== undefined ? (
            <button
              type="button"
              className={css.primaryButton}
              onClick={() => {
                controller.restoreTask(current.id)
                controller.closeTask()
              }}
            >
              {t('detail.restore')}
            </button>
          ) : (
            (current.status === 'done' || current.status === 'failed') && (
              <button
                type="button"
                className={css.ghostButton}
                onClick={() => {
                  controller.archiveTask(current.id)
                  controller.closeTask()
                }}
              >
                {t('detail.archive')}
              </button>
            )
          )}
          <button
            type="button"
            className={css.dangerButton}
            onClick={() => { setConfirmDelete(true) }}
          >
            {t('detail.delete')}
          </button>
          <span className={css.detailMeta}>
            {t('board.created')} {formatTime(current.createdAt)}
            {current.archivedAt !== undefined && ` · ${t('detail.archivedAt', { time: formatTime(current.archivedAt) })}`}
          </span>
        </footer>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title={t('delete.title')}
          message={t('delete.confirm', { name: current.title })}
          confirmLabel={t('delete.ok')}
          danger
          onCancel={() => { setConfirmDelete(false) }}
          onConfirm={() => {
            setConfirmDelete(false)
            controller.deleteTask(current.id)
            controller.closeTask()
          }}
        />
      )}
    </div>
  )
}
