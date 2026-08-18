import { afterEach, describe, expect, it } from 'vitest'
import { setTaskBoardLocale, t } from './locales.ts'

afterEach(() => { setTaskBoardLocale(undefined) })

describe('task-board locale selection', () => {
  it('uses DSH active English locale instead of the document default', () => {
    setTaskBoardLocale('en')
    expect(t('board.title')).toBe('Task Board')
    expect(t('new.model')).toBe('Model')
  })

  it('supports the active Chinese locale', () => {
    setTaskBoardLocale('zh')
    expect(t('board.title')).toBe('任务看板')
    expect(t('new.model')).toBe('模型')
  })
})
