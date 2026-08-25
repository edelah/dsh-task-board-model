/**
 * Executor editor fields shared by the new-task modal and the task detail
 * view: the Codex model picker (catalog + custom slug) and the Codex
 * reasoning-effort picker. Purely presentational over the controller's
 * codex option snapshot.
 */
import type { CodexOptionsSnapshot } from '../../core/controller.ts'
import { t } from '../locales.ts'
import css from '../board.module.css'

/** Sentinel select value for the "custom slug" choice. */
export const CODEX_MODEL_CUSTOM = '__custom__'

/** Props of the codex model picker. */
export interface CodexModelFieldProps {
  options: CodexOptionsSnapshot
  value: string | undefined
  onChange: (slug: string | undefined) => void
}

/**
 * The Codex model picker. When the host catalog is readable it lists real
 * models; a custom entry always remains available for slugs the cache does
 * not know about.
 */
export function CodexModelField({ options, value, onChange }: CodexModelFieldProps) {
  const known = value !== undefined && options.models.some(model => model.slug === value)
  const custom = value !== undefined && value !== '' && !known
  return (
    <>
      <label className={css.field}>
        <span className={css.fieldLabel}>{t('new.codexModel')}</span>
        <select
          className={css.select}
          value={custom ? CODEX_MODEL_CUSTOM : value ?? ''}
          onChange={event => {
            const next = event.target.value
            if (next === CODEX_MODEL_CUSTOM) {
              onChange(custom ? value : '')
              return
            }
            onChange(next === '' ? undefined : next)
          }}
        >
          <option value="">
            {options.defaultModel !== undefined
              ? t('exec.codexModel.default', { value: options.defaultModel })
              : t('exec.codexModel.defaultPlain')}
          </option>
          {!known && custom && <option value={CODEX_MODEL_CUSTOM}>{value}</option>}
          {options.models.map(model => (
            <option key={model.slug} value={model.slug}>{model.displayName}</option>
          ))}
          <option value={CODEX_MODEL_CUSTOM}>{t('exec.codexModel.custom')}</option>
        </select>
      </label>
      {custom && (
        <label className={css.field}>
          <span className={css.fieldLabel}>{t('exec.codexModel.customLabel')}</span>
          <input
            className={css.input}
            value={value ?? ''}
            spellCheck={false}
            placeholder="gpt-5.6-sol"
            onChange={event => { onChange(event.target.value === '' ? undefined : event.target.value) }}
          />
        </label>
      )}
    </>
  )
}

/** Props of the codex effort picker. */
export interface CodexEffortFieldProps {
  options: CodexOptionsSnapshot
  /** The currently pinned (or custom) model slug; picks the efforts to offer. */
  modelSlug: string | undefined
  value: string | undefined
  onChange: (effort: string | undefined) => void
}

/** The Codex reasoning-effort picker over the selected model's levels. */
export function CodexEffortField({ options, modelSlug, value, onChange }: CodexEffortFieldProps) {
  const model = options.models.find(candidate => candidate.slug === modelSlug)
  const defaultEffort = model?.defaultEffort ?? options.defaultEffort
  const known = value !== undefined && (model === undefined || model.efforts.some(effort => effort.id === value))
  return (
    <label className={css.field}>
      <span className={css.fieldLabel}>{t('new.codexEffort')}</span>
      <select
        className={css.select}
        value={value ?? ''}
        onChange={event => { onChange(event.target.value === '' ? undefined : event.target.value) }}
      >
        <option value="">
          {defaultEffort !== undefined
            ? t('exec.codexEffort.default', { value: defaultEffort })
            : t('exec.codexEffort.defaultPlain')}
        </option>
        {!known && value !== undefined && value !== '' && <option value={value}>{value}</option>}
        {(model?.efforts ?? []).map(effort => (
          <option key={effort.id} value={effort.id}>{effort.id}</option>
        ))}
      </select>
    </label>
  )
}
