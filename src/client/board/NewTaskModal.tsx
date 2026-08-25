/**
 * New-task modal: title + description + the prompt that execution will send.
 * Creates through the controller (which persists immediately). Execution
 * targets include the executor (DSH session or Codex CLI) and an optional
 * dedicated git worktree.
 */
import { useEffect, useState } from 'react'
import type { BoardController } from '../../core/controller.ts'
import { isValidCron, nextRunAtMs } from '../../core/schedule.ts'
import {
  isTaskExecutor, isValidBranchName, slugifyBranch,
  TASK_PERMISSIONS, type TaskExecutor, type TaskPermission,
} from '../../core/tasks.ts'
import { t, type TaskBoardKey } from '../locales.ts'
import { SCHEDULE_PRESETS } from '../schedule-presets.ts'
import css from '../board.module.css'
import { CodexEffortField, CodexModelField } from './ExecutorFields.tsx'
import { WorktreeCreateFields } from './WorktreeSection.tsx'

/** New-task form overlay. */
export function NewTaskModal({ controller, onClose }: { controller: BoardController; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [prompt, setPrompt] = useState('')
  const [workspaceId, setWorkspaceId] = useState('')
  const [mode, setMode] = useState('')
  const [permission, setPermission] = useState('')
  const [modelKey, setModelKey] = useState('')
  const [reasoningEffort, setReasoningEffort] = useState('')
  const [executor, setExecutor] = useState<TaskExecutor>('dsh')
  const [codexModel, setCodexModel] = useState<string | undefined>(undefined)
  const [codexEffort, setCodexEffort] = useState<string | undefined>(undefined)
  const [worktreeEnabled, setWorktreeEnabled] = useState(false)
  const [worktreeBranch, setWorktreeBranch] = useState('')
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [scheduleCron, setScheduleCron] = useState('')
  const [scheduleError, setScheduleError] = useState<string | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)
  const [options, setOptions] = useState(controller.getSnapshot().executionOptions)

  // The workspace list and preset roster arrive from the runtime after mount;
  // follow them so the pickers never freeze on an empty snapshot.
  useEffect(
    () => controller.subscribe(() => setOptions(controller.getSnapshot().executionOptions)),
    [controller],
  )

  const selectedModel = options.models.find(model => `${model.provider}/${model.model}` === modelKey)
  const codex = options.codex
  const branchInvalid = worktreeBranch.trim() !== '' && !isValidBranchName(worktreeBranch.trim())
  const codexSelected = executor === 'codex'

  const submit = (): void => {
    if (scheduleEnabled) {
      const cron = scheduleCron.trim()
      if (cron === '' || !isValidCron(cron)) {
        setScheduleError(t('detail.schedule.invalid'))
        return
      }
    }
    if (branchInvalid) return
    const task = controller.createTask({
      title,
      description,
      prompt,
      workspaceId: workspaceId === '' ? undefined : workspaceId,
      mode: mode === '' ? undefined : mode,
      permission: permission === '' ? undefined : permission as TaskPermission,
       modelSelection: selectedModel === undefined || codexSelected ? undefined : {
         provider: selectedModel.provider,
         model: selectedModel.model,
         ...(reasoningEffort === '' ? {} : { reasoningEffort }),
       },
      // A blank branch auto-naming here keeps one stable branch per task
      // instead of re-deriving a new one on every run.
      ...(worktreeEnabled ? {
        worktree: {
          branch: worktreeBranch.trim() !== ''
            ? worktreeBranch.trim()
            : slugifyBranch(title, Date.now()),
        },
      } : {}),
      executor: codexSelected ? 'codex' : 'dsh',
      ...(codexSelected && codexModel !== undefined ? { codexModel } : {}),
      ...(codexSelected && codexEffort !== undefined ? { codexEffort } : {}),
      schedule: scheduleEnabled ? { enabled: true, cron: scheduleCron.trim() } : undefined,
    })
    if (task === undefined) {
      setError(t('new.required'))
      return
    }
    onClose()
  }

  /** Next-run preview for a valid armed cron (creation-time only). */
  const scheduleNextRun = scheduleEnabled && scheduleCron.trim() !== '' && isValidCron(scheduleCron)
    ? nextRunAtMs(scheduleCron, Date.now())
    : undefined

  return (
    <div className={css.modalBackdrop} onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <form
        className={css.modal}
        role="dialog"
        aria-label={t('board.new')}
        onSubmit={event => { event.preventDefault(); submit() }}
      >
        <h2 className={css.modalTitle}>{t('board.new')}</h2>

        <label className={css.field}>
          <span className={css.fieldLabel}>{t('new.title')}</span>
          <input
            className={css.input}
            value={title}
            autoFocus
            placeholder={t('new.titlePlaceholder')}
            onChange={event => { setTitle(event.target.value); setError(undefined) }}
          />
        </label>

        <label className={css.field}>
          <span className={css.fieldLabel}>{t('new.description')}</span>
          <textarea
            className={css.input}
            rows={3}
            value={description}
            placeholder={t('new.descriptionPlaceholder')}
            onChange={event => { setDescription(event.target.value) }}
          />
        </label>

        <label className={css.field}>
          <span className={css.fieldLabel}>{t('new.prompt')}</span>
          <textarea
            className={css.input}
            rows={4}
            value={prompt}
            placeholder={t('new.promptPlaceholder')}
            onChange={event => { setPrompt(event.target.value) }}
          />
        </label>

        <label className={css.field}>
          <span className={css.fieldLabel}>{t('new.workspace')}</span>
          <select
            className={css.select}
            value={workspaceId}
            onChange={event => { setWorkspaceId(event.target.value) }}
          >
            <option value="">{t('exec.workspace.recent')}</option>
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
              setExecutor(isTaskExecutor(next) ? next : 'dsh')
            }}
          >
            <option value="dsh">{t('exec.executor.dsh')}</option>
            <option value="codex">
              {t('exec.executor.codex')}
              {codex.available ? '' : t('exec.executor.codexUnavailable')}
            </option>
          </select>
        </label>

        <label className={css.field}>
          <span className={css.fieldLabel}>{t('new.permission')}</span>
          <select
            className={css.select}
            value={permission}
            onChange={event => { setPermission(event.target.value) }}
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
                onChange={event => { setMode(event.target.value) }}
              >
                <option value="">{t('exec.mode.default')}</option>
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
                  const nextKey = event.target.value
                  setModelKey(nextKey)
                  setReasoningEffort('')
                }}
              >
                <option value="">{t('exec.model.default')}</option>
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
                value={reasoningEffort}
                disabled={selectedModel === undefined || selectedModel.reasoning?.efforts.length === 0}
                onChange={event => { setReasoningEffort(event.target.value) }}
              >
                <option value="">{selectedModel?.reasoning?.defaultEffort !== undefined
                  ? t('exec.effort.defaultWithValue', { value: selectedModel.reasoning.defaultEffort })
                  : t('exec.effort.default')}</option>
                {selectedModel?.reasoning?.efforts.map(effort => (
                  <option key={effort.id} value={effort.id}>{effort.name}</option>
                ))}
              </select>
            </label>
          </>
        )}

        {codexSelected && (
          <>
            <CodexModelField options={codex} value={codexModel} onChange={setCodexModel} />
            <CodexEffortField options={codex} modelSlug={codexModel ?? codex.defaultModel} value={codexEffort} onChange={setCodexEffort} />
            <p className={css.worktreeMeta}>{t('exec.hint.codex')}</p>
          </>
        )}

        <section className={css.detailSection}>
          <h4>{t('new.worktree')}</h4>
          <WorktreeCreateFields
            enabled={worktreeEnabled}
            branch={worktreeBranch}
            invalid={branchInvalid}
            onEnabledChange={setWorktreeEnabled}
            onBranchChange={setWorktreeBranch}
          />
        </section>

        <section className={css.detailSection}>
          <h4>{t('detail.schedule')}</h4>
          <label className={css.scheduleToggle}>
            <input
              type="checkbox"
              checked={scheduleEnabled}
              onChange={event => {
                setScheduleEnabled(event.target.checked)
                if (!event.target.checked) setScheduleError(undefined)
              }}
            />
            <span>{t('detail.schedule.enable')}</span>
          </label>
          {scheduleEnabled && (
            <>
              <div className={css.scheduleRow}>
                <input
                  className={`${css.input} ${css.scheduleInput}${scheduleError !== undefined ? ` ${css.scheduleInputInvalid}` : ''}`}
                  value={scheduleCron}
                  placeholder="0 9 * * *"
                  spellCheck={false}
                  aria-label={t('detail.schedule.cron')}
                  onChange={event => { setScheduleCron(event.target.value); setScheduleError(undefined) }}
                />
                <select
                  className={css.schedulePreset}
                  value=""
                  aria-label={t('detail.schedule.presets')}
                  onChange={event => {
                    if (event.target.value === '') return
                    setScheduleCron(event.target.value)
                    setScheduleError(undefined)
                  }}
                >
                  <option value="">{t('detail.schedule.presets')}…</option>
                  {SCHEDULE_PRESETS.map(preset => (
                    <option key={preset.cron} value={preset.cron}>{t(preset.label)}</option>
                  ))}
                </select>
              </div>
              {scheduleError !== undefined && <p className={css.formError}>{scheduleError}</p>}
              {scheduleError === undefined && scheduleNextRun !== undefined && (
                <p className={css.scheduleMeta}>
                  {t('detail.schedule.nextRun')} {new Date(scheduleNextRun).toLocaleString()}
                </p>
              )}
            </>
          )}
        </section>

        {error !== undefined && <p className={css.formError}>{error}</p>}

        <footer className={css.modalFooter}>
          <button type="button" className={css.ghostButton} onClick={onClose}>
            {t('new.cancel')}
          </button>
          <button type="submit" className={css.primaryButton}>
            {t('new.submit')}
          </button>
        </footer>
      </form>
    </div>
  )
}
