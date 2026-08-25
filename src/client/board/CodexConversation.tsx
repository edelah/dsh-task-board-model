import { MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { BoardController } from '../../core/controller.ts'
import type { CodexConversation as Conversation, CodexRunSnapshot } from '../../core/execution.ts'
import type { TaskRecord } from '../../core/tasks.ts'
import { t } from '../locales.ts'
import css from '../board.module.css'
import { STATUS_KEY } from './status-key.ts'

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; conversation: Conversation }
  | { kind: 'error'; error: string }

/** Chat-first view of one persisted Codex App Server thread. */
export function CodexConversation({ controller, task }: { controller: BoardController; task: TaskRecord }) {
  const latest = task.executions[task.executions.length - 1]
  const running = task.status === 'running' && latest?.runner === 'codex' && latest.endedAt === undefined
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [live, setLive] = useState<CodexRunSnapshot | undefined>()
  const [followUp, setFollowUp] = useState('')
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState<string | undefined>()
  const bottomRef = useRef<HTMLDivElement>(null)
  const loadSequence = useRef(0)

  const load = useCallback((): void => {
    const sequence = ++loadSequence.current
    setState({ kind: 'loading' })
    void controller.codexConversation(task.id).then(result => {
      if (sequence !== loadSequence.current) return
      setState(result.ok
        ? { kind: 'ready', conversation: result.conversation }
        : { kind: 'error', error: result.error })
    })
  }, [controller, task.id])

  useEffect(load, [load, latest?.id, latest?.threadId, latest?.endedAt])

  useEffect(() => {
    if (!running) {
      setLive(undefined)
      return
    }
    let alive = true
    const tick = (): void => {
      void controller.codexRunSnapshot(task.id).then(snapshot => {
        if (alive) setLive(snapshot)
      })
    }
    tick()
    const timer = setInterval(tick, 1500)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [controller, task.id, running])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [state, live?.liveAnswer, running])

  const sendFollowUp = async (): Promise<void> => {
    const content = followUp.trim()
    if (content === '' || sending) return
    setSending(true)
    setNotice(undefined)
    setFollowUp('')
    try {
      if (!await controller.followUpTask(task.id, content)) {
        setFollowUp(content)
        setNotice(t('detail.followUpUnavailable'))
      }
    } finally {
      setSending(false)
    }
  }

  const savedTail = latest?.outputTail
  const turns = state.kind === 'ready' ? state.conversation.turns : []
  const hasMessages = turns.some(turn => turn.messages.length > 0 || turn.activity.length > 0)

  return (
    <div className={css.codexChat} data-dsh-taskboard-codex-chat="">
      <header className={css.codexChatHeader}>
        <button type="button" className={css.ghostButton} onClick={() => { controller.openBoard() }}>
          ‹ {t('board.backToBoard')}
        </button>
        <div className={css.codexChatTitleGroup}>
          <h2 className={css.codexChatTitle}>{task.title}</h2>
          <span className={css.statusBadge} data-status={task.status}>{t(STATUS_KEY[task.status])}</span>
        </div>
        <button type="button" className={css.ghostButton} onClick={() => { controller.openTask(task.id) }}>
          {t('chat.taskSettings')}
        </button>
      </header>

      <main className={css.codexChatMessages}>
        {state.kind === 'loading' && <p className={css.codexChatNotice}>{t('chat.loading')}</p>}
        {state.kind === 'error' && (
          <section className={css.codexChatError}>
            <p>{state.error}</p>
            <button type="button" className={css.ghostButton} onClick={load}>{t('chat.retry')}</button>
            {savedTail !== undefined && savedTail !== '' && (
              <>
                <p className={css.codexChatNotice}>{t('chat.fallback')}</p>
                <div className={css.codexAssistantMessage}><MarkdownText text={savedTail} /></div>
              </>
            )}
          </section>
        )}

        {state.kind === 'ready' && !hasMessages && !running && (
          <p className={css.codexChatNotice}>{t('chat.empty')}</p>
        )}

        {turns.map(turn => (
          <section key={turn.id} className={css.codexTurn} data-status={turn.status}>
            {turn.messages.map(message => message.role === 'user' ? (
              <div key={message.id} className={css.codexUserMessage}>{message.text}</div>
            ) : (
              <div
                key={message.id}
                className={message.phase === 'commentary' ? css.codexCommentaryMessage : css.codexAssistantMessage}
              >
                <MarkdownText text={message.text} />
              </div>
            ))}
            {turn.activity.length > 0 && (
              <details className={css.codexActivity}>
                <summary>{t('chat.activity')} · {turn.activity.length}</summary>
                <ul>
                  {turn.activity.map(item => <li key={item.id} data-kind={item.kind}>{item.text}</li>)}
                </ul>
              </details>
            )}
            {turn.error !== undefined && <p className={css.codexTurnError}>{turn.error}</p>}
          </section>
        ))}

        {running && (
          <section className={css.codexTurn} data-status="inProgress">
            <p className={css.codexRunningLabel}><span className={css.cardSpinner} /> {t('chat.running')}</p>
            {live?.liveAnswer !== undefined && live.liveAnswer.trim() !== '' && (
              <div className={css.codexAssistantMessage}>
                <MarkdownText text={live.liveAnswer} streaming />
              </div>
            )}
          </section>
        )}
        <div ref={bottomRef} />
      </main>

      <footer className={css.codexComposer}>
        <textarea
          className={css.codexComposerInput}
          rows={2}
          value={followUp}
          disabled={running || sending}
          placeholder={t('detail.followUpPlaceholder')}
          onChange={event => { setFollowUp(event.target.value); setNotice(undefined) }}
        />
        <button
          type="button"
          className={css.primaryButton}
          disabled={running || sending || followUp.trim() === ''}
          onClick={() => { void sendFollowUp() }}
        >
          {sending ? t('detail.sending') : t('detail.send')}
        </button>
        {notice !== undefined && <p className={css.codexTurnError}>{notice}</p>}
      </footer>
    </div>
  )
}
