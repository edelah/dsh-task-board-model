/**
 * Git-worktree editors. The modal gets the compact opt-in (enable toggle +
 * optional branch name); the detail view gets the full section: branch edit,
 * materialization state, prepare/open/remove actions.
 */
import { useState } from 'react'
import type { BoardController } from '../../core/controller.ts'
import { isValidBranchName, slugifyBranch, type TaskRecord } from '../../core/tasks.ts'
import { t } from '../locales.ts'
import css from '../board.module.css'
import { ConfirmDialog } from './ConfirmDialog.tsx'

/** Compact worktree opt-in used by the new-task modal. */
export function WorktreeCreateFields({
  enabled,
  branch,
  onEnabledChange,
  onBranchChange,
  invalid,
}: {
  enabled: boolean
  branch: string
  onEnabledChange: (next: boolean) => void
  onBranchChange: (next: string) => void
  invalid: boolean
}) {
  return (
    <div className={css.field}>
      <label className={css.scheduleToggle}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={event => { onEnabledChange(event.target.checked) }}
        />
        <span>{t('worktree.enable')}</span>
      </label>
      {enabled && (
        <>
          <input
            className={`${css.input}${invalid ? ` ${css.scheduleInputInvalid}` : ''}`}
            value={branch}
            placeholder={t('worktree.branchPlaceholder')}
            spellCheck={false}
            aria-label={t('worktree.branch')}
            onChange={event => { onBranchChange(event.target.value) }}
          />
          {invalid && <p className={css.formError}>{t('worktree.invalidBranch')}</p>}
        </>
      )}
    </div>
  )
}

/** The detail view's worktree section: state + prepare / open / remove. */
export function WorktreeDetailSection({ controller, task }: { controller: BoardController; task: TaskRecord }) {
  const spec = task.worktree
  const [branchDraft, setBranchDraft] = useState(spec?.branch ?? '')
  const [invalid, setInvalid] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [confirmRemove, setConfirmRemove] = useState(false)

  // Follow record changes made elsewhere (a run adopting the path, another tab).
  const [recorded, setRecorded] = useState(spec)
  if (recorded !== spec) {
    setRecorded(spec)
    setBranchDraft(spec?.branch ?? '')
    setInvalid(false)
    setError(undefined)
  }

  const running = task.status === 'running'

  /** Persist a branch edit (Enter or blur); blank falls back to auto-naming. */
  const saveBranch = (): void => {
    const trimmed = branchDraft.trim()
    if (trimmed !== '' && !isValidBranchName(trimmed)) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    setError(undefined)
    controller.updateTask(task.id, {
      worktree: { branch: trimmed === '' ? slugifyBranch(task.title, Date.now()) : trimmed },
    })
  }

  /** Create/reuse the worktree right now, without executing the task. */
  const prepare = async (): Promise<void> => {
    if (spec === undefined) return
    setPreparing(true)
    setError(undefined)
    try {
      const result = await controller.prepareWorktree(task.id)
      if (!result.ok) setError(t('worktree.prepareFailed', { error: result.error ?? '' }))
    } finally {
      setPreparing(false)
    }
  }

  const remove = async (force: boolean): Promise<void> => {
    setConfirmRemove(false)
    setError(undefined)
    const removed = await controller.removeWorktree(task.id, force)
    if (!removed) setError(t('worktree.prepareFailed', { error: t('worktree.remove') }))
  }

  return (
    <section className={css.detailSection}>
      <h4>{t('detail.worktree')}</h4>
      <label className={css.scheduleToggle}>
        <input
          type="checkbox"
          checked={spec !== undefined}
          disabled={running}
          onChange={event => {
            controller.updateTask(task.id, {
              worktree: event.target.checked ? { branch: slugifyBranch(task.title, Date.now()) } : undefined,
            })
          }}
        />
        <span>{t('worktree.enable')}</span>
      </label>
      {spec !== undefined && (
        <>
          <div className={css.scheduleRow}>
            <input
              className={`${css.input} ${css.scheduleInput}${invalid ? ` ${css.scheduleInputInvalid}` : ''}`}
              value={branchDraft}
              placeholder={t('worktree.branchPlaceholder')}
              spellCheck={false}
              aria-label={t('worktree.branch')}
              disabled={running}
              onChange={event => { setBranchDraft(event.target.value); setInvalid(false) }}
              onBlur={saveBranch}
              onKeyDown={event => { if (event.key === 'Enter') saveBranch() }}
            />
          </div>
          {invalid && <p className={css.formError}>{t('worktree.invalidBranch')}</p>}
          {spec.path !== undefined ? (
            <p className={css.worktreeMeta}>
              {t('worktree.status.readyLabel')}{' '}
              <span className={css.worktreePath}>{spec.path}</span>
            </p>
          ) : (
            <p className={css.worktreeMeta}>{t('worktree.status.pending')}</p>
          )}
          <div className={css.worktreeRow}>
            {spec.path === undefined && !running && (
              <button type="button" className={css.ghostButton} disabled={preparing} onClick={() => { void prepare() }}>
                {preparing ? t('worktree.preparing') : t('worktree.prepare')}
              </button>
            )}
            {spec.workspaceId !== undefined && (
              <button type="button" className={css.ghostButton} onClick={() => { controller.openTaskWorkspace(task.id) }}>
                {t('worktree.openWorkspace')}
              </button>
            )}
            {spec.path !== undefined && !running && (
              <button type="button" className={css.dangerButton} onClick={() => { setConfirmRemove(true) }}>
                {t('worktree.remove')}
              </button>
            )}
          </div>
        </>
      )}
      {error !== undefined && <p className={css.formError}>{error}</p>}

      {confirmRemove && (
        <ConfirmDialog
          title={t('worktree.removeConfirmTitle')}
          message={t('worktree.removeConfirm', { name: task.title })}
          confirmLabel={t('worktree.removeOk')}
          danger
          onCancel={() => { setConfirmRemove(false) }}
          onConfirm={() => { void remove(false) }}
        />
      )}
    </section>
  )
}
