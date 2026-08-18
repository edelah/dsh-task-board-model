window.__ModuleLoader__.load({ id: "dsh-task-board-model", factory: (require) => { var module = { exports: {} }; var exports = module.exports;
const __dshTaskBoardCss = "[data-pane=\"conversation\"], [class*=\"centerCol\"] {\n  position: relative;\n}\n\n[data-dsh-taskboard-view] {\n  z-index: 60;\n  background: var(--dsw-alias-bg-base);\n  display: none;\n  position: absolute;\n  inset: 0;\n  container: JEp9Zq_task-board-view / inline-size;\n}\n\nhtml[data-dsh-taskboard-active]:not([data-dsh-ssh-active]) [data-dsh-taskboard-view] {\n  display: block;\n}\n\nhtml[data-dsh-taskboard-active]:not([data-dsh-ssh-active]) [data-pane=\"conversation\"] > :not([data-dsh-taskboard-view]), html[data-dsh-taskboard-active]:not([data-dsh-ssh-active]) [class*=\"centerCol\"] > :not([data-dsh-taskboard-view]) {\n  display: none !important;\n}\n\n.JEp9Zq_entry {\n  width: 100%;\n  height: 32px;\n  color: var(--dsw-alias-label-secondary);\n  cursor: pointer;\n  white-space: nowrap;\n  background: none;\n  border: none;\n  border-radius: 8px;\n  align-items: center;\n  gap: 8px;\n  padding: 0 12px;\n  font-size: 13px;\n  display: flex;\n}\n\n.JEp9Zq_entry:hover {\n  background: var(--dsw-specific-sidebar-nav-item-hover);\n  color: var(--dsw-alias-label-primary);\n}\n\n.JEp9Zq_entry[data-active] {\n  background: var(--dsw-specific-sidebar-nav-item-active);\n  color: var(--dsw-alias-label-primary);\n  font-weight: 600;\n}\n\n.JEp9Zq_entryIcon {\n  flex: none;\n  justify-content: center;\n  align-items: center;\n  display: inline-flex;\n}\n\n.JEp9Zq_entryLabel {\n  text-overflow: ellipsis;\n  overflow: hidden;\n}\n\n[data-dsh-frame][data-sidebar-collapsed] .JEp9Zq_entry {\n  justify-content: center;\n  width: 100%;\n  padding: 0;\n}\n\n[data-dsh-frame][data-sidebar-collapsed] .JEp9Zq_entryLabel {\n  display: none;\n}\n\n.JEp9Zq_board {\n  box-sizing: border-box;\n  background: var(--dsw-alias-bg-base);\n  min-width: 0;\n  height: 100%;\n  min-height: 0;\n  color: var(--dsw-alias-label-primary);\n  font-family: var(--dsw-font-family);\n  flex-direction: column;\n  gap: 12px;\n  padding: 14px 16px 16px;\n  display: flex;\n}\n\n.JEp9Zq_boardHeader {\n  flex: none;\n  align-items: center;\n  gap: 10px;\n  display: flex;\n}\n\n.JEp9Zq_boardTitle {\n  color: var(--dsw-alias-label-primary);\n  white-space: nowrap;\n  margin: 0;\n  font-size: 16px;\n  font-weight: 700;\n}\n\n.JEp9Zq_backButton {\n  align-items: center;\n  gap: 4px;\n  display: inline-flex;\n}\n\n.JEp9Zq_search {\n  min-width: 120px;\n  color: var(--dsw-alias-label-primary);\n  background: var(--dsw-specific-input-major);\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: 8px;\n  outline: none;\n  flex: 0 260px;\n  padding: 6px 10px;\n  font-size: 13px;\n}\n\n.JEp9Zq_search::placeholder {\n  color: var(--dsw-alias-label-tertiary);\n}\n\n.JEp9Zq_columns {\n  overscroll-behavior-inline: contain;\n  scrollbar-color: var(--dsw-alias-border-l3) var(--dsw-alias-interactive-bg-hover);\n  scrollbar-width: thin;\n  flex: 1;\n  grid-auto-columns: minmax(220px, 1fr);\n  grid-auto-flow: column;\n  gap: 12px;\n  min-height: 0;\n  padding-bottom: 6px;\n  display: grid;\n  overflow: auto hidden;\n}\n\n.JEp9Zq_columns::-webkit-scrollbar {\n  height: 10px;\n}\n\n.JEp9Zq_columns::-webkit-scrollbar-track {\n  background: var(--dsw-alias-interactive-bg-hover);\n  border-radius: 999px;\n}\n\n.JEp9Zq_columns::-webkit-scrollbar-thumb {\n  background: var(--dsw-alias-border-l3);\n  background-clip: content-box;\n  border: 2px solid #0000;\n  border-radius: 999px;\n}\n\n.JEp9Zq_columns::-webkit-scrollbar-thumb:hover {\n  background: var(--dsw-alias-border-l4);\n  background-clip: content-box;\n}\n\n.JEp9Zq_column {\n  background: var(--dsw-alias-bg-layer-2);\n  border: 1px solid var(--dsw-alias-border-l1);\n  border-radius: 12px;\n  flex-direction: column;\n  min-height: 0;\n  display: flex;\n  overflow: hidden;\n}\n\n.JEp9Zq_columnHeader {\n  flex: none;\n  align-items: center;\n  gap: 6px;\n  padding: 10px 12px;\n  display: flex;\n}\n\n.JEp9Zq_columnTitle {\n  color: var(--dsw-alias-label-primary);\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  flex: 1;\n  margin: 0;\n  font-size: 13px;\n  font-weight: 700;\n  overflow: hidden;\n}\n\n.JEp9Zq_columnCount {\n  min-width: 0;\n  color: var(--dsw-alias-label-tertiary);\n  background: var(--dsw-alias-interactive-bg-hover);\n  border-radius: 999px;\n  flex: none;\n  padding: 1px 8px;\n  font-size: 12px;\n}\n\n.JEp9Zq_statusDot {\n  border-radius: 50%;\n  flex: none;\n  width: 8px;\n  height: 8px;\n}\n\n.JEp9Zq_statusDot[data-status=\"backlog\"] {\n  background: var(--dsw-alias-label-tertiary);\n}\n\n.JEp9Zq_statusDot[data-status=\"todo\"] {\n  background: var(--dsw-alias-state-business-primary);\n}\n\n.JEp9Zq_statusDot[data-status=\"running\"] {\n  background: var(--dsw-alias-state-warn-primary);\n}\n\n.JEp9Zq_statusDot[data-status=\"done\"] {\n  background: var(--dsw-alias-state-success-primary);\n}\n\n.JEp9Zq_statusDot[data-status=\"failed\"] {\n  background: var(--dsw-alias-state-error-primary);\n}\n\n.JEp9Zq_cards {\n  flex-direction: column;\n  flex: 1;\n  gap: 8px;\n  min-height: 0;\n  padding: 2px 8px 10px;\n  display: flex;\n  overflow-y: auto;\n}\n\n.JEp9Zq_columnEmpty {\n  text-align: center;\n  color: var(--dsw-alias-label-tertiary);\n  padding: 24px 8px;\n  font-size: 12px;\n}\n\n.JEp9Zq_card {\n  text-align: left;\n  background: var(--dsw-alias-bg-base);\n  border: 1px solid var(--dsw-alias-border-l2);\n  cursor: pointer;\n  color: var(--dsw-alias-label-primary);\n  border-radius: 10px;\n  flex-direction: column;\n  gap: 6px;\n  padding: 10px 12px;\n  font-family: inherit;\n  transition: box-shadow .12s, border-color .12s, transform .12s;\n  display: flex;\n}\n\n.JEp9Zq_card:hover {\n  box-shadow: var(--dsw-shadow-lv2);\n  border-color: var(--dsw-alias-border-l3);\n  transform: translateY(-1px);\n}\n\n.JEp9Zq_card[data-status=\"running\"] {\n  border-color: var(--dsw-alias-state-warn-primary);\n}\n\n.JEp9Zq_cardTitle {\n  -webkit-line-clamp: 2;\n  -webkit-box-orient: vertical;\n  font-size: 13px;\n  font-weight: 600;\n  line-height: 1.35;\n  display: -webkit-box;\n  overflow: hidden;\n}\n\n.JEp9Zq_cardExcerpt {\n  color: var(--dsw-alias-label-secondary);\n  -webkit-line-clamp: 2;\n  -webkit-box-orient: vertical;\n  font-size: 12px;\n  line-height: 1.4;\n  display: -webkit-box;\n  overflow: hidden;\n}\n\n.JEp9Zq_cardMeta {\n  color: var(--dsw-alias-label-tertiary);\n  align-items: center;\n  gap: 8px;\n  font-size: 11px;\n  display: flex;\n}\n\n.JEp9Zq_cardTime {\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  flex: 1;\n  overflow: hidden;\n}\n\n.JEp9Zq_cardSchedule {\n  white-space: nowrap;\n  min-width: 0;\n  color: var(--dsw-alias-label-secondary);\n  background: var(--dsw-alias-interactive-bg-hover);\n  border-radius: 999px;\n  flex: none;\n  padding: 2px 6px;\n  font-size: 12px;\n  line-height: 1;\n}\n\n.JEp9Zq_cardRun {\n  flex: none;\n}\n\n.JEp9Zq_cardRun[data-result=\"failed\"] {\n  color: var(--dsw-alias-state-error-primary);\n}\n\n.JEp9Zq_cardRun[data-result=\"succeeded\"] {\n  color: var(--dsw-alias-state-success-primary);\n}\n\n.JEp9Zq_cardSession {\n  color: var(--dsw-alias-state-business-primary);\n  flex: none;\n}\n\n.JEp9Zq_cardRunningLabel {\n  color: var(--dsw-alias-state-warn-primary);\n  font-size: 11px;\n}\n\n.JEp9Zq_cardSpinner {\n  border: 2px solid var(--dsw-alias-state-warn-primary);\n  border-top-color: #0000;\n  border-radius: 50%;\n  flex: none;\n  width: 10px;\n  height: 10px;\n  animation: .8s linear infinite JEp9Zq_dshTbSpin;\n}\n\n@keyframes JEp9Zq_dshTbSpin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n\n.JEp9Zq_primaryButton {\n  color: var(--dsw-alias-label-primary-foreground);\n  background: var(--dsw-alias-button-info-fill);\n  cursor: pointer;\n  white-space: nowrap;\n  border: none;\n  border-radius: 8px;\n  padding: 6px 14px;\n  font-size: 13px;\n  font-weight: 600;\n}\n\n.JEp9Zq_primaryButton:hover:not(:disabled) {\n  background: var(--dsw-alias-button-info-hover);\n}\n\n.JEp9Zq_primaryButton:disabled {\n  opacity: .5;\n  cursor: default;\n}\n\n.JEp9Zq_ghostButton {\n  color: var(--dsw-alias-label-primary);\n  border: 1px solid var(--dsw-alias-border-l2);\n  cursor: pointer;\n  white-space: nowrap;\n  background: none;\n  border-radius: 8px;\n  padding: 5px 12px;\n  font-size: 12px;\n}\n\n.JEp9Zq_ghostButton:hover:not(:disabled) {\n  background: var(--dsw-alias-interactive-bg-hover);\n}\n\n.JEp9Zq_ghostButton:disabled {\n  opacity: .45;\n  cursor: default;\n}\n\n.JEp9Zq_dangerButton {\n  color: #fff;\n  background: var(--dsw-alias-state-error-primary);\n  cursor: pointer;\n  white-space: nowrap;\n  border: none;\n  border-radius: 8px;\n  padding: 6px 14px;\n  font-size: 13px;\n  font-weight: 600;\n}\n\n.JEp9Zq_dangerButton:hover:not(:disabled) {\n  filter: brightness(1.08);\n}\n\n.JEp9Zq_dangerButton:active:not(:disabled) {\n  filter: brightness(.94);\n}\n\n.JEp9Zq_dangerButton:disabled {\n  opacity: .5;\n  cursor: default;\n}\n\n.JEp9Zq_iconButton {\n  width: 26px;\n  height: 26px;\n  color: var(--dsw-alias-label-secondary);\n  cursor: pointer;\n  background: none;\n  border: none;\n  border-radius: 6px;\n  justify-content: center;\n  align-items: center;\n  padding: 0;\n  font-size: 13px;\n  display: inline-flex;\n}\n\n.JEp9Zq_iconButton:hover {\n  background: var(--dsw-alias-interactive-bg-hover);\n  color: var(--dsw-alias-label-primary);\n}\n\n.JEp9Zq_linkButton {\n  color: var(--dsw-alias-state-business-primary);\n  cursor: pointer;\n  white-space: nowrap;\n  background: none;\n  border: none;\n  padding: 0;\n  font-size: 12px;\n}\n\n.JEp9Zq_linkButton:hover {\n  text-decoration: underline;\n}\n\n.JEp9Zq_modalBackdrop {\n  z-index: 1300;\n  background: var(--dsw-alias-bg-mask-1);\n  justify-content: center;\n  align-items: center;\n  display: flex;\n  position: fixed;\n  inset: 0;\n}\n\n.JEp9Zq_modal {\n  background: var(--dsw-alias-bg-base);\n  border: 1px solid var(--dsw-alias-border-l2);\n  width: min(520px, 100vw - 48px);\n  max-height: calc(100vh - 96px);\n  box-shadow: var(--dsw-shadow-lv3);\n  color: var(--dsw-alias-label-primary);\n  border-radius: 14px;\n  flex-direction: column;\n  gap: 12px;\n  padding: 18px;\n  display: flex;\n  overflow-y: auto;\n}\n\n.JEp9Zq_modalTitle {\n  margin: 0;\n  font-size: 15px;\n  font-weight: 700;\n}\n\n.JEp9Zq_confirmMessage {\n  color: var(--dsw-alias-label-secondary);\n  white-space: pre-wrap;\n  overflow-wrap: anywhere;\n  margin: 0;\n  font-size: 13px;\n  line-height: 1.5;\n}\n\n.JEp9Zq_modalFooter {\n  justify-content: flex-end;\n  gap: 10px;\n  margin-top: 4px;\n  display: flex;\n}\n\n.JEp9Zq_field {\n  flex-direction: column;\n  gap: 5px;\n  display: flex;\n}\n\n.JEp9Zq_fieldLabel {\n  color: var(--dsw-alias-label-secondary);\n  font-size: 12px;\n  font-weight: 600;\n}\n\n.JEp9Zq_input {\n  color: var(--dsw-alias-label-primary);\n  background: var(--dsw-specific-input-major);\n  border: 1px solid var(--dsw-alias-border-l2);\n  resize: vertical;\n  border-radius: 8px;\n  outline: none;\n  padding: 7px 10px;\n  font-family: inherit;\n  font-size: 13px;\n}\n\n.JEp9Zq_input:focus {\n  border-color: var(--dsw-alias-state-business-primary);\n}\n\n.JEp9Zq_select {\n  color: var(--dsw-alias-label-primary);\n  background: var(--dsw-specific-input-major);\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: 8px;\n  outline: none;\n  max-width: 100%;\n  padding: 7px 10px;\n  font-family: inherit;\n  font-size: 13px;\n}\n\n.JEp9Zq_input::placeholder {\n  color: var(--dsw-alias-label-tertiary);\n}\n\n.JEp9Zq_formError {\n  color: var(--dsw-alias-state-error-primary);\n  margin: 0;\n  font-size: 12px;\n}\n\n.JEp9Zq_detail {\n  background: var(--dsw-alias-bg-base);\n  border: 1px solid var(--dsw-alias-border-l2);\n  width: min(640px, 100vw - 48px);\n  max-height: calc(100vh - 80px);\n  box-shadow: var(--dsw-shadow-lv3);\n  color: var(--dsw-alias-label-primary);\n  border-radius: 14px;\n  flex-direction: column;\n  display: flex;\n  overflow: hidden;\n}\n\n.JEp9Zq_detailHeader {\n  border-bottom: 1px solid var(--dsw-alias-separator-primary);\n  flex: none;\n  align-items: center;\n  gap: 10px;\n  padding: 14px 18px;\n  display: flex;\n}\n\n.JEp9Zq_detailTitle {\n  overflow-wrap: anywhere;\n  flex: 1;\n  margin: 0;\n  font-size: 15px;\n  font-weight: 700;\n}\n\n.JEp9Zq_statusBadge {\n  border: 1px solid var(--dsw-alias-border-l2);\n  color: var(--dsw-alias-label-secondary);\n  border-radius: 999px;\n  flex: none;\n  padding: 2px 10px;\n  font-size: 12px;\n}\n\n.JEp9Zq_statusBadge[data-status=\"running\"] {\n  color: var(--dsw-alias-state-warn-primary);\n  border-color: var(--dsw-alias-state-warn-primary);\n}\n\n.JEp9Zq_statusBadge[data-status=\"done\"] {\n  color: var(--dsw-alias-state-success-primary);\n  border-color: var(--dsw-alias-state-success-primary);\n}\n\n.JEp9Zq_statusBadge[data-status=\"failed\"] {\n  color: var(--dsw-alias-state-error-primary);\n  border-color: var(--dsw-alias-state-error-primary);\n}\n\n.JEp9Zq_detailBody {\n  flex-direction: column;\n  flex: 1;\n  gap: 16px;\n  padding: 14px 18px;\n  display: flex;\n  overflow-y: auto;\n}\n\n.JEp9Zq_detailSection {\n  flex-direction: column;\n  gap: 6px;\n  display: flex;\n}\n\n.JEp9Zq_detailSection h4 {\n  color: var(--dsw-alias-label-tertiary);\n  text-transform: none;\n  margin: 0;\n  font-size: 12px;\n  font-weight: 700;\n}\n\n.JEp9Zq_detailText {\n  color: var(--dsw-alias-label-primary);\n  white-space: pre-wrap;\n  overflow-wrap: anywhere;\n  margin: 0;\n  font-size: 13px;\n  line-height: 1.55;\n}\n\n.JEp9Zq_scheduleToggle {\n  color: var(--dsw-alias-label-primary);\n  cursor: pointer;\n  user-select: none;\n  align-items: center;\n  gap: 8px;\n  font-size: 13px;\n  display: flex;\n}\n\n.JEp9Zq_scheduleToggle input {\n  accent-color: var(--dsw-alias-state-business-primary);\n}\n\n.JEp9Zq_scheduleRow {\n  align-items: center;\n  gap: 8px;\n  display: flex;\n}\n\n.JEp9Zq_scheduleInput {\n  min-width: 0;\n  font-family: var(--dsw-font-markdown-code-block-small);\n  flex: 1;\n  font-size: 12.5px;\n}\n\n.JEp9Zq_scheduleInputInvalid, .JEp9Zq_scheduleInputInvalid:focus {\n  border-color: var(--dsw-alias-state-error-primary);\n}\n\n.JEp9Zq_schedulePreset {\n  color: var(--dsw-alias-label-primary);\n  background: var(--dsw-specific-input-major);\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: 8px;\n  outline: none;\n  flex: none;\n  padding: 7px 8px;\n  font-size: 12.5px;\n}\n\n.JEp9Zq_scheduleMeta {\n  color: var(--dsw-alias-label-secondary);\n  overflow-wrap: anywhere;\n  margin: 0;\n  font-size: 12px;\n}\n\n.JEp9Zq_promptBlock {\n  font-size: 12.5px;\n  line-height: 1.5;\n  font-family: var(--dsw-font-markdown-code-block-small);\n  color: var(--dsw-alias-label-primary);\n  background: var(--dsw-alias-markdown-code-block);\n  border: 1px solid var(--dsw-alias-border-l1);\n  white-space: pre-wrap;\n  overflow-wrap: anywhere;\n  border-radius: 8px;\n  max-height: 240px;\n  margin: 0;\n  padding: 10px 12px;\n  overflow-y: auto;\n}\n\n.JEp9Zq_executionList {\n  flex-direction: column;\n  gap: 8px;\n  margin: 0;\n  padding: 0;\n  list-style: none;\n  display: flex;\n}\n\n.JEp9Zq_executionRow {\n  border: 1px solid var(--dsw-alias-border-l1);\n  border-radius: 8px;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 10px;\n  padding: 8px 10px;\n  display: flex;\n}\n\n.JEp9Zq_executionBadge {\n  color: var(--dsw-alias-state-warn-primary);\n  background: var(--dsw-alias-state-warn-secondary);\n  border-radius: 999px;\n  flex: none;\n  padding: 1px 8px;\n  font-size: 11px;\n  font-weight: 600;\n}\n\n.JEp9Zq_executionBadge[data-result=\"succeeded\"] {\n  color: var(--dsw-alias-state-success-primary);\n  background: none;\n}\n\n.JEp9Zq_executionBadge[data-result=\"failed\"] {\n  color: var(--dsw-alias-state-error-primary);\n  background: none;\n}\n\n.JEp9Zq_executionBadge[data-result=\"cancelled\"] {\n  color: var(--dsw-alias-label-tertiary);\n  background: none;\n}\n\n.JEp9Zq_executionTimes {\n  color: var(--dsw-alias-label-secondary);\n  font-size: 12px;\n}\n\n.JEp9Zq_executionError {\n  width: 100%;\n  color: var(--dsw-alias-state-error-primary);\n  overflow-wrap: anywhere;\n  font-size: 12px;\n}\n\n.JEp9Zq_moveRow {\n  flex-wrap: wrap;\n  gap: 8px;\n  display: flex;\n}\n\n.JEp9Zq_detailFooter {\n  border-top: 1px solid var(--dsw-alias-separator-primary);\n  flex: none;\n  align-items: center;\n  gap: 10px;\n  padding: 12px 18px;\n  display: flex;\n}\n\n.JEp9Zq_detailMeta {\n  color: var(--dsw-alias-label-tertiary);\n  margin-left: auto;\n  font-size: 11px;\n}\n\n@container JEp9Zq_task-board-view (width <= 720px) {\n  .JEp9Zq_board {\n    gap: 10px;\n    padding: 10px;\n  }\n\n  .JEp9Zq_columns {\n    gap: 10px;\n  }\n}\n\n@container JEp9Zq_task-board-view (width <= 600px) {\n  .JEp9Zq_boardHeader {\n    flex-wrap: wrap;\n    gap: 8px;\n  }\n\n  .JEp9Zq_search {\n    flex: calc(100% - 72px);\n    min-width: 0;\n  }\n\n  .JEp9Zq_boardHeader > button {\n    flex: 1 1 0;\n    min-width: max-content;\n  }\n}\n\n.JEp9Zq_entry:focus-visible, .JEp9Zq_card:focus-visible, .JEp9Zq_primaryButton:focus-visible, .JEp9Zq_ghostButton:focus-visible, .JEp9Zq_dangerButton:focus-visible, .JEp9Zq_iconButton:focus-visible, .JEp9Zq_linkButton:focus-visible, .JEp9Zq_search:focus-visible, .JEp9Zq_input:focus-visible, .JEp9Zq_select:focus-visible, .JEp9Zq_schedulePreset:focus-visible, .JEp9Zq_scheduleToggle input:focus-visible {\n  outline: 2px solid var(--dsw-alias-state-business-primary);\n  outline-offset: 2px;\n}\n\n.JEp9Zq_entry, .JEp9Zq_primaryButton, .JEp9Zq_ghostButton, .JEp9Zq_dangerButton, .JEp9Zq_iconButton, .JEp9Zq_linkButton, .JEp9Zq_search, .JEp9Zq_input, .JEp9Zq_select, .JEp9Zq_schedulePreset, .JEp9Zq_scheduleToggle input {\n  transition: background-color .12s, color .12s, border-color .12s, outline-color .12s, box-shadow .12s, transform .12s;\n}\n\n.JEp9Zq_card:active {\n  box-shadow: var(--dsw-shadow-lv1);\n  transform: translateY(0);\n}\n\n.JEp9Zq_entry:active, .JEp9Zq_primaryButton:active:not(:disabled), .JEp9Zq_ghostButton:active:not(:disabled), .JEp9Zq_dangerButton:active:not(:disabled), .JEp9Zq_iconButton:active:not(:disabled), .JEp9Zq_linkButton:active:not(:disabled) {\n  transform: translateY(1px);\n}\n\n.JEp9Zq_entry[data-active]:hover {\n  background: var(--dsw-specific-sidebar-nav-item-active);\n}\n\n.JEp9Zq_iconButton:hover:not(:disabled) {\n  background: var(--dsw-alias-interactive-bg-hover);\n  color: var(--dsw-alias-label-primary);\n}\n\n.JEp9Zq_linkButton:hover:not(:disabled) {\n  text-decoration: underline;\n}\n\n.JEp9Zq_iconButton:disabled, .JEp9Zq_linkButton:disabled {\n  opacity: .45;\n  cursor: default;\n}\n\n.JEp9Zq_search:focus, .JEp9Zq_select:focus, .JEp9Zq_schedulePreset:focus {\n  border-color: var(--dsw-alias-state-business-primary);\n}\n\n.JEp9Zq_scheduleToggle input {\n  margin: 0;\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .JEp9Zq_entry, .JEp9Zq_card, .JEp9Zq_primaryButton, .JEp9Zq_ghostButton, .JEp9Zq_dangerButton, .JEp9Zq_iconButton, .JEp9Zq_linkButton, .JEp9Zq_search, .JEp9Zq_input, .JEp9Zq_select, .JEp9Zq_schedulePreset, .JEp9Zq_scheduleToggle input {\n    transition: none;\n  }\n\n  .JEp9Zq_cardSpinner {\n    animation: none;\n  }\n}\n.I6HMua_card {\n  border: 1px solid var(--dsw-alias-border-l2);\n  background: var(--dsw-alias-bg-layer-3);\n  border-radius: 12px;\n  list-style: none;\n  transition: border-color .16s, background .16s;\n}\n\n.I6HMua_card:hover {\n  border-color: var(--dsw-alias-label-dimmed);\n}\n\n.I6HMua_cardOpen {\n  background: var(--dsw-alias-bg-layer-2);\n  border-color: var(--dsw-alias-label-dimmed);\n}\n\n.I6HMua_header {\n  appearance: none;\n  width: 100%;\n  font: inherit;\n  color: inherit;\n  text-align: left;\n  cursor: pointer;\n  background: none;\n  border: 0;\n  border-radius: 12px;\n  align-items: center;\n  gap: 12px;\n  padding: 14px 16px;\n  display: flex;\n}\n\n.I6HMua_header:focus-visible {\n  outline: 2px solid var(--dsw-alias-brand-primary);\n  outline-offset: -2px;\n}\n\n.I6HMua_headerStatic {\n  border-radius: 12px;\n  align-items: center;\n  gap: 12px;\n  width: 100%;\n  padding: 14px 16px;\n  display: flex;\n}\n\n.I6HMua_headText {\n  flex-direction: column;\n  flex: 1;\n  gap: 4px;\n  min-width: 0;\n  display: flex;\n}\n\n.I6HMua_name {\n  color: var(--dsw-alias-label-primary);\n  font-size: 15px;\n  font-weight: 600;\n  line-height: 1.4;\n}\n\n.I6HMua_description {\n  color: var(--dsw-alias-label-tertiary);\n  font-size: 13px;\n  line-height: 1.5;\n}\n\n.I6HMua_pending {\n  white-space: nowrap;\n  background: var(--dsw-alias-bg-module-platform);\n  color: var(--dsw-alias-label-secondary);\n  border-radius: 999px;\n  flex: none;\n  padding: 1px 8px;\n  font-size: 11px;\n  font-weight: 500;\n  line-height: 17px;\n}\n\n.I6HMua_chevron {\n  color: var(--dsw-alias-label-tertiary);\n  flex: none;\n  transition: transform .16s;\n}\n\n.I6HMua_chevronOpen {\n  transform: rotate(180deg);\n}\n\n.I6HMua_body {\n  border-top: 1px solid var(--dsw-alias-border-l2);\n  margin: 0 16px;\n  padding-bottom: 8px;\n}\n\n.I6HMua_readOnly {\n  color: var(--dsw-alias-label-tertiary);\n  margin: 12px 0 0;\n  font-size: 12px;\n  line-height: 1.5;\n}\n\n.I6HMua_notExposed {\n  color: var(--dsw-alias-state-warn-primary);\n  margin: 12px 0 0;\n  font-size: 12px;\n  line-height: 1.5;\n}\n\n.I6HMua_footer {\n  border-top: 1px solid var(--dsw-alias-border-l2);\n  justify-content: flex-end;\n  align-items: center;\n  gap: 8px;\n  padding: 12px 0 4px;\n  display: flex;\n}\n\n.I6HMua_failed {\n  min-width: 0;\n  color: var(--dsw-alias-label-error);\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  flex: 1;\n  margin: 0;\n  font-size: 12px;\n  line-height: 1.5;\n  overflow: hidden;\n}\n\n.I6HMua_discard, .I6HMua_save {\n  appearance: none;\n  font: inherit;\n  cursor: pointer;\n  border: 1px solid #0000;\n  border-radius: 8px;\n  padding: 5px 14px;\n  font-size: 13px;\n  line-height: 1.5;\n}\n\n.I6HMua_discard {\n  border-color: var(--dsw-alias-border-l2);\n  color: var(--dsw-alias-label-secondary);\n  background: none;\n}\n\n.I6HMua_discard:hover:not(:disabled) {\n  color: var(--dsw-alias-label-primary);\n  border-color: var(--dsw-alias-label-dimmed);\n}\n\n.I6HMua_save {\n  background: var(--dsw-alias-label-primary);\n  color: var(--dsw-alias-bg-layer-3);\n}\n\n.I6HMua_discard:disabled, .I6HMua_save:disabled {\n  opacity: .4;\n  cursor: default;\n}\n\n.I6HMua_discard:focus-visible, .I6HMua_save:focus-visible {\n  outline: 2px solid var(--dsw-alias-brand-primary);\n  outline-offset: 1px;\n}\n\n.I6HMua_field {\n  flex-direction: column;\n  gap: 6px;\n  padding: 12px 0;\n  display: flex;\n}\n\n.I6HMua_field + .I6HMua_field {\n  border-top: 1px solid var(--dsw-alias-border-l2);\n}\n\n.I6HMua_head {\n  align-items: center;\n  gap: 8px;\n  display: flex;\n}\n\n.I6HMua_label {\n  min-width: 0;\n  color: var(--dsw-alias-label-primary);\n  flex: 1;\n  font-size: 13px;\n  font-weight: 500;\n  line-height: 1.5;\n}\n\n.I6HMua_badges {\n  align-items: center;\n  gap: 8px;\n  display: inline-flex;\n}\n\n.I6HMua_badge {\n  white-space: nowrap;\n  background: var(--dsw-alias-bg-module-platform);\n  color: var(--dsw-alias-label-secondary);\n  border-radius: 999px;\n  padding: 1px 8px;\n  font-size: 11px;\n  font-weight: 500;\n  line-height: 17px;\n}\n\n.I6HMua_reset {\n  font: inherit;\n  color: var(--dsw-alias-label-secondary);\n  cursor: pointer;\n  background: none;\n  border: none;\n  padding: 0;\n  font-size: 12px;\n  line-height: 1.5;\n}\n\n.I6HMua_reset:hover:not(:disabled) {\n  color: var(--dsw-alias-label-primary);\n}\n\n.I6HMua_reset:disabled {\n  cursor: default;\n}\n\n.I6HMua_reset:focus-visible {\n  outline: 2px solid var(--dsw-alias-brand-primary);\n  outline-offset: 2px;\n  outline: 2px solid var(--dsw-alias-brand-primary);\n  outline-offset: 2px;\n}\n\n.I6HMua_input, .I6HMua_select {\n  border: 1px solid var(--dsw-alias-border-l2);\n  background: var(--dsw-alias-bg-layer-3);\n  height: 34px;\n  font: inherit;\n  color: var(--dsw-alias-label-primary);\n  border-radius: 8px;\n  padding: 0 12px;\n  font-size: 13px;\n  line-height: 1.5;\n}\n\n.I6HMua_input:focus-visible, .I6HMua_select:focus-visible {\n  border-color: var(--dsw-alias-brand-primary);\n  outline: none;\n}\n\n.I6HMua_input:disabled, .I6HMua_select:disabled {\n  color: var(--dsw-alias-label-tertiary);\n  cursor: default;\n}\n\n.I6HMua_inputInvalid {\n  border: 1px solid var(--dsw-alias-label-error);\n  background: var(--dsw-alias-bg-layer-3);\n  height: 34px;\n  font: inherit;\n  color: var(--dsw-alias-label-primary);\n  border-radius: 8px;\n  padding: 0 12px;\n  font-size: 13px;\n  line-height: 1.5;\n}\n\n.I6HMua_inputInvalid:focus-visible {\n  outline: 2px solid var(--dsw-alias-label-error);\n  outline-offset: 1px;\n  border-color: var(--dsw-alias-label-error);\n}\n\n.I6HMua_invalid {\n  color: var(--dsw-alias-label-error);\n  margin: 0;\n  font-size: 12px;\n  line-height: 1.5;\n}\n\n.I6HMua_hint {\n  color: var(--dsw-alias-label-tertiary);\n  margin: 0;\n  font-size: 12px;\n  line-height: 1.5;\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .I6HMua_card, .I6HMua_header, .I6HMua_chevron, .I6HMua_chevronOpen, .I6HMua_discard, .I6HMua_save {\n    transition: none;\n  }\n}\n";
if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=\"dsh-task-board-model\"]") === null) {
  const __dshTaskBoardStyle = document.createElement("style");
  __dshTaskBoardStyle.setAttribute("data-plugin-css", "dsh-task-board-model");
  __dshTaskBoardStyle.textContent = __dshTaskBoardCss;
  document.head.appendChild(__dshTaskBoardStyle);
}

Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
let react_dom_client = require("react-dom/client");
let react = require("react");
let react_jsx_runtime = require("react/jsx-runtime");
let _deepseek_ai_dsh_client_runtime_client = require("@deepseek-ai/dsh-client-runtime/client");
//#region src/core/execution.ts
/** Human copy for a run failure. */
function messageOf(error) {
	if (error instanceof Error) return error.message;
	return String(error);
}
/**
* Whether a rejected preset switch actually means "the session already runs
* this preset" (the host's agent-preset-conflict with a matching
* existingPreset). A blank-session reuse race can produce this even though
* the requested composition is in place.
*/
function presetAlreadyRuns(error, mode) {
	if (typeof error !== "object" || error === null) return false;
	const details = error.details;
	if (typeof details !== "object" || details === null) return false;
	return details.existingPreset === mode;
}
/** Whether a `turn/end` payload closed the turn with an error reason. */
function isErrorTurnEnd(data) {
	if (typeof data !== "object" || data === null) return false;
	const reason = data.reason;
	return typeof reason === "object" && reason !== null && reason.kind === "error";
}
/**
* Run one task to completion (or to a settled failure).
*
* @param task - the task being executed.
* @param execution - the freshly opened execution record (id + start time).
* @param onEvent - callback for started/settled events.
* @returns resolves when the run settles (or fails to start); never rejects —
*   every failure path is reported as a settled event.
*/
var ExecutionService = class {
	env;
	/**
	* In-flight preset switches keyed by `sessionId\u0000mode`. The session
	* list mirror can lag behind a just-applied switch, so concurrent runs
	* against one blank session would otherwise each issue the same select
	* RPC (an amplified storm); sharing one in-flight call keeps the wire to
	* a single request. The settled entry is forgotten so a later run can
	* switch again.
	*/
	presetSwitches = /* @__PURE__ */ new Map();
	/** @param env - the runtime faces (real or fake). */
	constructor(env) {
		this.env = env;
	}
	async run(task, execution, onEvent) {
		const settleFailed = (error) => {
			onEvent({
				kind: "settled",
				taskId: task.id,
				executionId: execution.id,
				outcome: "failed",
				error
			});
		};
		try {
			const sessionId = await this.connectSession(task.workspaceId, task.modelSelection !== void 0);
			onEvent({
				kind: "started",
				taskId: task.id,
				executionId: execution.id,
				sessionId
			});
			const driver = this.driverOf(sessionId);
			if (driver === void 0) {
				settleFailed("execution session is not ready");
				return;
			}
			if (!await this.applyMode(driver, task, sessionId, settleFailed)) return;
			if (!await this.applyModel(task, sessionId, settleFailed)) return;
			if (!await this.applyPermission(driver, task, settleFailed)) return;
			await driver.rename(task.title).catch(() => {});
			const baseline = driver.getSnapshot().turnEnds.size;
			const accepted = await this.sendPrompt(driver, task);
			if (!accepted.ok) {
				settleFailed(messageOf(accepted.error));
				return;
			}
			this.watchForSettlement(driver, task.id, execution.id, onEvent, baseline);
		} catch (error) {
			settleFailed(messageOf(error));
		}
	}
	/**
	* Recompose the execution session's agent from the task-pinned preset.
	* No-op when the task pins none or the session already runs it; fails the
	* run when the session is no longer blank, the preset face is missing, or
	* the wire refuses.
	*/
	async applyMode(driver, task, sessionId, settleFailed) {
		const mode = task.mode;
		if (mode === void 0 || mode === "") return true;
		const summary = this.env.sessions.list.getSnapshot().byId[sessionId];
		if (summary?.blank === false) {
			settleFailed(`cannot switch agent preset to ${mode}: the execution session is not blank`);
			return false;
		}
		if (summary?.agentPreset === mode) return true;
		const presets = this.env.presets;
		if (presets === void 0) {
			settleFailed(`this deployment does not support agent presets (task asks for ${mode})`);
			return false;
		}
		try {
			const result = await this.switchPreset(presets, sessionId, mode);
			if (!result.ok) {
				if (presetAlreadyRuns(result.error, mode)) {
					this.env.sessions.noteAgentPreset?.(sessionId, mode);
					return true;
				}
				settleFailed(`agent preset switch to ${mode} rejected: ${messageOf(result.error)}`);
				return false;
			}
		} catch (error) {
			settleFailed(`agent preset switch to ${mode} failed: ${messageOf(error)}`);
			return false;
		}
		this.env.sessions.noteAgentPreset?.(sessionId, mode);
		return true;
	}
	/**
	* One in-flight `select` per (session, preset): concurrent runs against
	* the same blank session share the same wire call instead of each issuing
	* a duplicate RPC. The entry is removed once the call settles, so a later
	* run (after a shared failure, say) issues a fresh switch.
	*/
	switchPreset(presets, sessionId, mode) {
		const key = `${sessionId}\u0000${mode}`;
		const inflight = this.presetSwitches.get(key);
		if (inflight !== void 0) return inflight;
		const attempt = presets.select(sessionId, mode).finally(() => {
			if (this.presetSwitches.get(key) === attempt) this.presetSwitches.delete(key);
		});
		this.presetSwitches.set(key, attempt);
		return attempt;
	}
	/**
	* Select the task-pinned model and effort before the first prompt. The
	* current DSH API also updates the deployment default when this succeeds;
	* the dedicated session above prevents a reused blank session from racing.
	*/
	async applyModel(task, sessionId, settleFailed) {
		const selection = task.modelSelection;
		if (selection === void 0) return true;
		const models = this.env.models;
		if (models === void 0) {
			settleFailed(`this deployment does not support task model selection (${selection.provider}/${selection.model})`);
			return false;
		}
		try {
			const result = await models.select(sessionId, selection);
			if (!result.ok) {
				settleFailed(`model selection rejected for ${selection.provider}/${selection.model}: ${messageOf(result.error)}`);
				return false;
			}
		} catch (error) {
			settleFailed(`model selection failed for ${selection.provider}/${selection.model}: ${messageOf(error)}`);
			return false;
		}
		return true;
	}
	/**
	* Apply the task-pinned permission preset through the `/permission <id>`
	* slash command. No-op when the task pins none; fails the run when the
	* admission is rejected or no command claimed the line.
	*/
	async applyPermission(driver, task, settleFailed) {
		const permission = task.permission;
		if (permission === void 0) return true;
		const line = `/permission ${permission}`;
		try {
			const result = await driver.command(line);
			if (!result.ok) {
				settleFailed(`permission command rejected: ${messageOf(result.error)}`);
				return false;
			}
			if (!result.matched) {
				settleFailed(`permission command not recognized: ${line}`);
				return false;
			}
		} catch (error) {
			settleFailed(`permission command failed: ${messageOf(error)}`);
			return false;
		}
		return true;
	}
	/**
	* Inspect a reloaded/background task that was left 'running' and emit a
	* settled event when its session already finished.
	*
	* A session that was never opened keeps a cold conversation snapshot (the
	* runtime only maintains the window for the staged/current session), so the
	* settled outcome is decided by the strongest available signal, in order:
	* 1. the list summary — missing session → cancelled; still running → pending;
	* 2. a warm conversation snapshot → `lastAgentError` decides failed/succeeded;
	* 3. the raw history tail (when a history face is wired) — a `turn/end`
	*    error reason proves failure;
	* 4. otherwise a finished session counts as succeeded.
	*
	* @param task - a task whose latest execution has no endedAt.
	* @returns a settled event when the session state proves completion, else undefined.
	*/
	async reconcile(task) {
		const execution = task.executions[task.executions.length - 1];
		if (execution === void 0 || execution.sessionId === void 0 || execution.endedAt !== void 0) return void 0;
		const list = this.env.sessions.list.getSnapshot();
		if (list.phase !== "ready") return void 0;
		const summary = list.byId[execution.sessionId];
		if (summary === void 0) return {
			kind: "settled",
			taskId: task.id,
			executionId: execution.id,
			outcome: "cancelled",
			error: "execution session no longer exists"
		};
		if (summary.running) return void 0;
		const driver = this.driverOf(execution.sessionId);
		if (driver !== void 0) {
			const snapshot = driver.getSnapshot();
			if (snapshot.turnEnds.size > 0) {
				const outcome = snapshot.lastAgentError !== null ? "failed" : "succeeded";
				return {
					kind: "settled",
					taskId: task.id,
					executionId: execution.id,
					outcome,
					error: snapshot.lastAgentError ?? void 0
				};
			}
		}
		if (await this.historyShowsFailure(execution.sessionId)) return {
			kind: "settled",
			taskId: task.id,
			executionId: execution.id,
			outcome: "failed",
			error: "agent turn failed"
		};
		return {
			kind: "settled",
			taskId: task.id,
			executionId: execution.id,
			outcome: "succeeded"
		};
	}
	/** Best-effort failure probe over the raw history tail (false when unavailable). */
	async historyShowsFailure(sessionId) {
		const history = this.env.history;
		if (history === void 0) return false;
		try {
			const tail = await history.loadTail(sessionId);
			if (tail === void 0) return false;
			return tail.events.some((event) => event.type === "turn/end" && isErrorTurnEnd(event.data));
		} catch (error) {
			console.error("[dsh-task-board] history failure probe failed", error);
			return false;
		}
	}
	async connectSession(taskWorkspaceId, dedicated) {
		const workspace = this.env.workspaces.list.getSnapshot();
		if (taskWorkspaceId !== void 0 && taskWorkspaceId !== "") {
			if (!workspace.items.some((item) => item.workspaceId === taskWorkspaceId)) throw new Error(`task workspace is not available: ${taskWorkspaceId}`);
			return dedicated ? this.env.sessions.create({ workspaceId: taskWorkspaceId }) : this.env.workspaces.connectWorkspace(taskWorkspaceId);
		}
		const workspaceId = workspace.recentWorkspaceId ?? workspace.items[0]?.workspaceId;
		if (workspaceId === void 0) throw new Error("no workspace available to run the task in");
		return dedicated ? this.env.sessions.create({ workspaceId }) : this.env.workspaces.connectWorkspace(workspaceId);
	}
	driverOf(sessionId) {
		return this.env.sessions.binding(sessionId)?.session;
	}
	async sendPrompt(driver, task) {
		const text = task.prompt.trim() !== "" ? task.prompt : task.title;
		try {
			return await driver.prompt([{
				type: "text",
				text
			}], "queue");
		} catch (error) {
			return {
				ok: false,
				error
			};
		}
	}
	/**
	* Subscribe to the execution session and settle the run once the accepted
	* turn completes (turn counter advanced past the acceptance baseline and
	* the session is no longer running). Never settles while the session is
	* still running; unsubscribes on settle.
	*/
	watchForSettlement(driver, taskId, executionId, onEvent, baseline) {
		let settled = false;
		let unsubscribe = () => {};
		const check = () => {
			if (settled) return;
			const snapshot = driver.getSnapshot();
			if (snapshot.running || snapshot.turnEnds.size <= baseline) return;
			settled = true;
			unsubscribe();
			onEvent({
				kind: "settled",
				taskId,
				executionId,
				outcome: snapshot.lastAgentError !== null ? "failed" : "succeeded",
				error: snapshot.lastAgentError ?? void 0
			});
		};
		unsubscribe = driver.subscribe(check);
		check();
	}
};
//#endregion
//#region src/core/tasks.ts
/** Statuses a settled task may be archived from. */
const ARCHIVABLE_STATUSES = ["done", "failed"];
/** Permission presets a task may pin on its execution session (the `/permission <id>` ids). */
const TASK_PERMISSIONS = [
	"read-only",
	"workspace-write",
	"danger-full-access"
];
/** Whether an unknown value is a known permission preset id. */
function isTaskPermission(value) {
	return typeof value === "string" && TASK_PERMISSIONS.includes(value);
}
/** The five kanban columns, in display order. */
const COLUMNS = [
	{
		status: "backlog",
		label: "待规划"
	},
	{
		status: "todo",
		label: "待办"
	},
	{
		status: "running",
		label: "进行中"
	},
	{
		status: "done",
		label: "已完成"
	},
	{
		status: "failed",
		label: "已失败"
	}
];
/** Statuses a user may move a card to manually (execution states are owned by the runner). */
const MANUAL_STATUSES = ["backlog", "todo"];
/** All valid statuses (closed union guard). */
const ALL_STATUSES = [
	"backlog",
	"todo",
	"running",
	"done",
	"failed"
];
/** Brand an unknown string as a status; undefined when it is not one. */
function isTaskStatus(value) {
	return typeof value === "string" && ALL_STATUSES.includes(value);
}
/** Normalize one optional execution-target string: trim; blank collapses to undefined. */
function normalizeTargetId(value) {
	const trimmed = value?.trim();
	return trimmed === void 0 || trimmed === "" ? void 0 : trimmed;
}
/** Whether an unknown value is a structurally usable model selection. */
function isTaskModelSelection(value) {
	if (typeof value !== "object" || value === null) return false;
	const selection = value;
	return typeof selection.provider === "string" && selection.provider.trim() !== "" && typeof selection.model === "string" && selection.model.trim() !== "" && (selection.reasoningEffort === void 0 || typeof selection.reasoningEffort === "string");
}
/** Normalize a model selection persisted or supplied by the UI. */
function normalizeModelSelection(value) {
	if (!isTaskModelSelection(value)) return void 0;
	const provider = value.provider.trim();
	const model = value.model.trim();
	const reasoningEffort = value.reasoningEffort?.trim();
	return {
		provider,
		model,
		...reasoningEffort === void 0 || reasoningEffort === "" ? {} : { reasoningEffort }
	};
}
/** Create a task from user input. */
function createTask(input, now, id) {
	return {
		id,
		title: input.title.trim(),
		description: input.description.trim(),
		prompt: input.prompt.trim(),
		status: "todo",
		createdAt: now,
		updatedAt: now,
		executions: [],
		workspaceId: normalizeTargetId(input.workspaceId),
		mode: normalizeTargetId(input.mode),
		permission: isTaskPermission(input.permission) ? input.permission : void 0,
		modelSelection: normalizeModelSelection(input.modelSelection)
	};
}
/** Clone a task with an updated status and a fresh updatedAt. */
function withStatus(task, status, now) {
	return {
		...task,
		status,
		updatedAt: now
	};
}
/**
* Merge a schedule patch into a task's schedule rule (creating it when
* absent), with a fresh updatedAt. Keys present in the patch overwrite the
* current value — including explicit `undefined`, which clears a field (used
* to disarm `nextRunAt`); absent keys keep their current value.
*/
function withSchedule(task, patch, now) {
	const current = task.schedule;
	const schedule = {
		enabled: current?.enabled ?? false,
		cron: current?.cron ?? "",
		nextRunAt: current?.nextRunAt,
		lastTriggeredAt: current?.lastTriggeredAt
	};
	if ("enabled" in patch) schedule.enabled = patch.enabled ?? false;
	if ("cron" in patch) schedule.cron = patch.cron ?? "";
	if ("nextRunAt" in patch) schedule.nextRunAt = patch.nextRunAt;
	if ("lastTriggeredAt" in patch) schedule.lastTriggeredAt = patch.lastTriggeredAt;
	return {
		...task,
		updatedAt: now,
		schedule
	};
}
/**
* Open a fresh execution on a task: move it to 'running' and append a
* running execution record. Returns the new task and the new execution.
*/
function startExecution(task, now, executionId) {
	const execution = {
		id: executionId,
		sessionId: void 0,
		startedAt: now,
		endedAt: void 0,
		result: void 0,
		error: void 0
	};
	return {
		task: {
			...task,
			status: "running",
			updatedAt: now,
			executions: [...task.executions, execution]
		},
		execution
	};
}
/**
* Settle a running execution: record the outcome and move the task into the
* matching column. No-op (returns the input task) when the execution is not
* the task's latest or is already settled.
*/
function settleExecution(task, executionId, outcome, now, error) {
	const index = task.executions.findIndex((execution) => execution.id === executionId);
	if (index === -1) return task;
	const execution = task.executions[index];
	if (execution.endedAt !== void 0) return task;
	const settled = {
		...execution,
		endedAt: now,
		result: outcome,
		error
	};
	const executions = [...task.executions];
	executions[index] = settled;
	const status = outcome === "succeeded" ? "done" : outcome === "failed" ? "failed" : task.status === "running" ? "todo" : task.status;
	return {
		...task,
		status,
		updatedAt: now,
		executions
	};
}
/** A settled-execution summary string for the detail view. */
function executionLabel(execution) {
	if (execution.result === "succeeded") return "succeeded";
	if (execution.result === "failed") return "failed";
	if (execution.result === "cancelled") return "cancelled";
	return "running";
}
//#endregion
//#region src/core/use-cases/task-archive.ts
/**
* Archive one task: only settled statuses (done/failed) can be archived;
* a running or not-yet-settled task stays on the board (its runner still
* owns its lifecycle). Already-archived tasks are a no-op.
*/
function applyArchiveTask(tasks, id, now) {
	let applied = false;
	return {
		tasks: tasks.map((task) => {
			if (task.id !== id || task.archivedAt !== void 0) return task;
			if (!ARCHIVABLE_STATUSES.includes(task.status)) return task;
			applied = true;
			return {
				...task,
				archivedAt: now,
				updatedAt: now
			};
		}),
		archived: applied
	};
}
/** Restore one task back onto the main board (clears the archive marker). */
function applyRestoreTask(tasks, id, now) {
	let applied = false;
	return {
		tasks: tasks.map((task) => {
			if (task.id !== id || task.archivedAt === void 0) return task;
			applied = true;
			const { archivedAt: _archived, ...rest } = task;
			return {
				...rest,
				updatedAt: now
			};
		}),
		archived: applied
	};
}
//#endregion
//#region src/core/schedule.ts
/** Inclusive ranges per field, in cron order. */
const FIELD_RANGES = [
	[0, 59],
	[0, 23],
	[1, 31],
	[1, 12],
	[0, 7]
];
/**
* Parse a 5-field cron expression.
* @returns the match sets, or null when the expression is invalid.
*/
function parseCron(expr) {
	const fields = expr.trim().split(/\s+/);
	if (fields.length !== 5) return null;
	const sets = [];
	for (let index = 0; index < 5; index++) {
		const [min, max] = FIELD_RANGES[index];
		const set = /* @__PURE__ */ new Set();
		if (!parseField(fields[index], min, max, set)) return null;
		sets.push(set);
	}
	const weekdays = /* @__PURE__ */ new Set();
	for (const day of sets[4]) weekdays.add(day === 7 ? 0 : day);
	return {
		minutes: sets[0],
		hours: sets[1],
		days: sets[2],
		months: sets[3],
		weekdays,
		dayWildcard: fields[2] === "*",
		weekdayWildcard: fields[4] === "*"
	};
}
/** Whether the expression parses. */
function isValidCron(expr) {
	return parseCron(expr) !== null;
}
/**
* Compute the next matching instant after `fromMs` (ms epoch), in local time,
* at minute granularity, strictly greater than `fromMs`. Returns the ms epoch
* of the matching minute's start, or undefined when nothing matches within
* 366 days (e.g. `0 0 30 2 *`).
*/
function nextRunAtMs(expr, fromMs) {
	const schedule = parseCron(expr);
	if (schedule === null) return void 0;
	const from = new Date(fromMs);
	const scan = new Date(from.getFullYear(), from.getMonth(), from.getDate(), from.getHours(), from.getMinutes() + 1, 0, 0);
	const limitMs = fromMs + 366 * 24 * 60 * 60 * 1e3;
	while (scan.getTime() <= limitMs) {
		if (matches(schedule, scan)) return scan.getTime();
		scan.setMinutes(scan.getMinutes() + 1);
	}
}
/** Parse one comma-list field into the match set. */
function parseField(field, min, max, out) {
	if (field === "*") {
		for (let value = min; value <= max; value++) out.add(value);
		return true;
	}
	for (const part of field.split(",")) {
		if (part === "") return false;
		const [range, stepRaw] = part.split("/");
		let low;
		let high;
		if (range === "*") {
			low = min;
			high = max;
		} else if (range.includes("-")) {
			const [a, b] = range.split("-");
			if (a === "" || b === "" || !isDigits(a) || !isDigits(b)) return false;
			low = Number(a);
			high = Number(b);
		} else if (isDigits(range)) {
			low = Number(range);
			high = Number(range);
		} else return false;
		if (low < min || high > max || low > high) return false;
		const step = stepRaw === void 0 ? 1 : isDigits(stepRaw) ? Number(stepRaw) : NaN;
		if (!Number.isInteger(step) || step < 1) return false;
		for (let value = low; value <= high; value += step) out.add(value);
	}
	return true;
}
/** Day/weekday OR semantics: a restricted day field alone gates, and vice versa. */
function matches(schedule, date) {
	if (!schedule.minutes.has(date.getMinutes())) return false;
	if (!schedule.hours.has(date.getHours())) return false;
	if (!schedule.months.has(date.getMonth() + 1)) return false;
	const dayMatches = schedule.days.has(date.getDate());
	const weekdayMatches = schedule.weekdays.has(date.getDay());
	if (schedule.dayWildcard) return weekdayMatches;
	if (schedule.weekdayWildcard) return dayMatches;
	return dayMatches || weekdayMatches;
}
function isDigits(value) {
	return /^\d+$/.test(value);
}
//#endregion
//#region src/core/use-cases/task-create.ts
/**
* Create-task use case: mint a new task from user input, rejecting a blank
* title. Pure ledger transition (no persistence or notify — the controller
* orchestrates those), so it is unit-testable without any runtime face.
*/
/**
* Apply a create against the current ledger. Returns the new task and the
* appended ledger, or the unchanged ledger when the title is blank.
* @param tasks - current ledger.
* @param input - raw user input (title/description/prompt + optional schedule).
* @param now - clock instant (ms epoch).
* @param id - minted task id.
*/
function applyCreateTask(tasks, input, now, id) {
	if (input.title.trim() === "") return {
		task: void 0,
		tasks
	};
	let task = createTask(input, now, id);
	const requested = input.schedule;
	if (requested?.enabled === true && requested.cron.trim() !== "" && isValidCron(requested.cron)) {
		const cron = requested.cron.trim();
		task = withSchedule(task, {
			enabled: true,
			cron,
			nextRunAt: nextRunAtMs(cron, now)
		}, now);
	}
	return {
		task,
		tasks: [...tasks, task]
	};
}
//#endregion
//#region src/core/use-cases/task-delete.ts
/**
* Apply a delete across the ledger. The selection (a task id) is cleared when
* it matches the removed task, so the UI never lingers on a vanished detail.
* @param tasks - current ledger.
* @param selectedTaskId - the currently selected task id (may be undefined).
* @param id - the task to remove.
*/
function applyDeleteTask(tasks, selectedTaskId, id) {
	return {
		tasks: tasks.filter((task) => task.id !== id),
		selectionCleared: selectedTaskId === id
	};
}
//#endregion
//#region src/core/use-cases/task-schedule.ts
/**
* Schedule use case: arm/disarm a task's cron rule and roll a rule forward.
* Pure ledger transitions (no persistence or notify — the controller
* orchestrates those). Validation and next-run computation live here, sharing
* the core cron parser (schedule.ts) and the withSchedule transition.
*/
/**
* Set a task's schedule rule. A blank or invalid cron is rejected (state
* untouched); an enabled rule computes the next run instant immediately, a
* disabled or invalid one carries no next-run instant.
* @param tasks - current ledger.
* @param id - the task to schedule.
* @param patch - rule fields to change (absent fields keep their current value).
* @param now - clock instant (ms epoch).
*/
function applySetSchedule(tasks, id, patch, now) {
	const task = tasks.find((candidate) => candidate.id === id);
	if (task === void 0) return {
		tasks,
		applied: false
	};
	const current = task.schedule;
	const cron = (patch.cron ?? current?.cron ?? "").trim();
	if (cron === "" || !isValidCron(cron)) return {
		tasks,
		applied: false
	};
	const enabled = patch.enabled ?? current?.enabled ?? false;
	const nextRunAt = enabled ? nextRunAtMs(cron, now) : void 0;
	return {
		tasks: tasks.map((candidate) => candidate.id === id ? withSchedule(candidate, {
			enabled,
			cron,
			nextRunAt
		}, now) : candidate),
		applied: true
	};
}
/**
* Roll a task's schedule rule forward (scheduler callback): persist the next
* due instant and the trigger instant. No-op for tasks without a rule (deleted
* mid-tick, for example).
* @param tasks - current ledger.
* @param id - the task to roll forward.
* @param nextRunAt - next due instant (may be undefined to clear).
* @param lastTriggeredAt - the trigger instant of this run.
* @param now - clock instant (ms epoch).
*/
function applyScheduleNextRun(tasks, id, nextRunAt, lastTriggeredAt, now) {
	return tasks.map((task) => task.id === id && task.schedule !== void 0 ? withSchedule(task, {
		nextRunAt,
		lastTriggeredAt
	}, now) : task);
}
//#endregion
//#region src/core/use-cases/task-update.ts
/**
* Update-task use case: apply an editable-field patch (title/description/
* prompt plus the execution targets workspaceId/mode/permission/modelSelection) with a
* fresh updatedAt. Pure ledger transition (no persistence or notify — the
* controller orchestrates those).
*
* An explicit `undefined` in the patch clears the field (the task falls
* back to the runtime default); an unknown permission string is ignored so
* stale UI can never persist a value the execution service rejects.
*/
/** Keep an unknown permission string from entering the ledger. */
function normalizePermission(current, value) {
	if (value === void 0) return void 0;
	return isTaskPermission(value) ? value : current;
}
/**
* Apply an update across the ledger. Tasks that do not match the id are left
* untouched; the matched task receives the patch plus a fresh updatedAt.
* @param tasks - current ledger.
* @param id - the task to update.
* @param patch - editable-field changes.
* @param now - clock instant (ms epoch).
*/
function applyUpdateTask(tasks, id, patch, now) {
	return tasks.map((task) => {
		if (task.id !== id) return task;
		const workspaceId = "workspaceId" in patch ? normalizeTargetId(patch.workspaceId) : void 0;
		const mode = "mode" in patch ? normalizeTargetId(patch.mode) : void 0;
		const permission = "permission" in patch ? normalizePermission(task.permission, patch.permission) : void 0;
		const modelSelection = "modelSelection" in patch ? normalizeModelSelection(patch.modelSelection) : void 0;
		const next = {
			...task,
			...patch,
			updatedAt: now
		};
		if (workspaceId !== void 0 || "workspaceId" in patch) next.workspaceId = workspaceId;
		if (mode !== void 0 || "mode" in patch) next.mode = mode;
		if (permission !== void 0 || "permission" in patch) next.permission = permission;
		if (modelSelection !== void 0 || "modelSelection" in patch) next.modelSelection = modelSelection;
		return next;
	});
}
//#endregion
//#region src/core/controller.ts
/** The selected task (resolved from the ledger), or undefined. */
function selectedTaskOf(snapshot) {
	if (snapshot.selectedTaskId === void 0) return void 0;
	return snapshot.tasks.find((task) => task.id === snapshot.selectedTaskId);
}
function randomUuid() {
	const randomUUID = globalThis.crypto?.randomUUID;
	if (randomUUID !== void 0) return randomUUID.call(globalThis.crypto);
	const bytes = globalThis.crypto?.getRandomValues(/* @__PURE__ */ new Uint8Array(16));
	if (bytes === void 0) return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
	bytes[6] = bytes[6] & 15 | 64;
	bytes[8] = bytes[8] & 63 | 128;
	const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
/** Read the current selection off a session-list snapshot (structural). */
function currentOf(sessions) {
	return sessions.list.getSnapshot().current;
}
/**
* Board controller (see module doc). All mutations bump the snapshot and
* persist through the store; UI and DOM mounts subscribe and re-render.
*/
var BoardController = class {
	deps;
	tasks = [];
	boardOpen = false;
	archiveView = false;
	selectedTaskId;
	executionOptions = {
		workspaces: [],
		presets: [],
		models: []
	};
	listeners = /* @__PURE__ */ new Set();
	disposers = [];
	now;
	uuid;
	/** @param deps - store, execution service, and the sessions navigation face. */
	constructor(deps) {
		this.deps = deps;
		this.now = deps.now ?? (() => Date.now());
		this.uuid = deps.uuid ?? randomUuid;
	}
	/** Load the persisted ledger and start the navigation/status subscriptions. */
	start() {
		this.tasks = this.deps.store.load();
		this.reconcileRunningTasks();
		const unsubscribeExternal = this.deps.store.subscribeExternal?.(() => {
			this.tasks = this.deps.store.load();
			this.notify();
		});
		if (unsubscribeExternal !== void 0) this.disposers.push(unsubscribeExternal);
		this.disposers.push(this.deps.sessions.list.subscribe(() => {
			this.onSessionsChanged();
		}));
		this.notify();
	}
	/** Stop all subscriptions and drop retained state (idempotent). */
	dispose() {
		for (const dispose of this.disposers.splice(0)) dispose();
		this.listeners.clear();
		if (this.reconcileTimer !== void 0) clearTimeout(this.reconcileTimer);
		this.reconcileTimer = void 0;
	}
	getSnapshot() {
		return {
			tasks: this.tasks,
			boardOpen: this.boardOpen,
			archiveView: this.archiveView,
			selectedTaskId: this.selectedTaskId,
			executionOptions: this.executionOptions
		};
	}
	subscribe(fn) {
		this.listeners.add(fn);
		return () => {
			this.listeners.delete(fn);
		};
	}
	/** Notify views that an external presentation input, such as locale, changed. */
	refresh() {
		this.notify();
	}
	openBoard() {
		if (this.boardOpen) return;
		this.lastCurrent = currentOf(this.deps.sessions);
		this.boardOpen = true;
		this.notify();
	}
	closeBoard() {
		if (!this.boardOpen) return;
		this.boardOpen = false;
		this.notify();
	}
	toggleBoard() {
		if (this.boardOpen) this.closeBoard();
		else this.openBoard();
	}
	/**
	* Switch between the kanban columns and the archive view. Leaving the
	* archive view with an archived task still selected closes the selection —
	* the detail overlay must not linger over a task that is off-board.
	*/
	toggleArchiveView() {
		this.archiveView = !this.archiveView;
		if (!this.archiveView && this.selectedTaskId !== void 0) {
			if (this.tasks.find((task) => task.id === this.selectedTaskId)?.archivedAt !== void 0) this.selectedTaskId = void 0;
		}
		this.notify();
	}
	openTask(id) {
		if (this.tasks.some((task) => task.id === id)) {
			this.selectedTaskId = id;
			this.notify();
		}
	}
	closeTask() {
		if (this.selectedTaskId === void 0) return;
		this.selectedTaskId = void 0;
		this.notify();
	}
	createTask(input) {
		const { task, tasks } = applyCreateTask(this.tasks, input, this.now(), this.uuid());
		if (task === void 0) return void 0;
		this.tasks = [...tasks];
		this.persistAndNotify();
		return task;
	}
	updateTask(id, patch) {
		this.tasks = [...applyUpdateTask(this.tasks, id, patch, this.now())];
		this.persistAndNotify();
	}
	/**
	* Replace (a part of) the picker option sets the UI feeds (workspace list
	* and agent-preset roster come from the runtime, not the ledger).
	*/
	setExecutionOptions(patch) {
		this.executionOptions = {
			...this.executionOptions,
			...patch
		};
		this.notify();
	}
	moveTask(id, status) {
		this.tasks = this.tasks.map((task) => task.id === id ? withStatus(task, status, this.now()) : task);
		this.persistAndNotify();
	}
	deleteTask(id) {
		const { tasks, selectionCleared } = applyDeleteTask(this.tasks, this.selectedTaskId, id);
		this.tasks = [...tasks];
		if (selectionCleared) this.selectedTaskId = void 0;
		this.persistAndNotify();
	}
	/**
	* Archive a settled task (done/failed). Running or on-board-unsettled
	* tasks are refused so the runner keeps exclusive ownership of their
	* lifecycle.
	* @returns true when applied.
	*/
	archiveTask(id) {
		const { tasks, archived } = applyArchiveTask(this.tasks, id, this.now());
		if (!archived) return false;
		this.tasks = [...tasks];
		this.persistAndNotify();
		return true;
	}
	/** Restore an archived task back onto the board (same status column). */
	restoreTask(id) {
		const { tasks, archived } = applyRestoreTask(this.tasks, id, this.now());
		if (!archived) return false;
		this.tasks = [...tasks];
		this.persistAndNotify();
		return true;
	}
	/**
	* Update a task's schedule rule. A blank or invalid cron expression is
	* rejected (returns false, state untouched). When the rule ends up enabled
	* the next run instant is computed immediately; a disabled rule carries no
	* next-run instant. Delegates the domain transition to the schedule use case.
	* @param id - the task to schedule.
	* @param patch - fields to change (absent fields keep their current value).
	* @returns true when applied, false when rejected (invalid cron / unknown task).
	*/
	setSchedule(id, patch) {
		const { tasks, applied } = applySetSchedule(this.tasks, id, patch, this.now());
		if (!applied) return false;
		this.tasks = [...tasks];
		this.persistAndNotify();
		return true;
	}
	/**
	* Roll a task's schedule forward (scheduler callback): persist the next due
	* instant and the trigger instant of this run. No-op when the task has no
	* schedule rule (it was deleted mid-tick, for example).
	*/
	applyScheduleNextRun(id, nextRunAt, lastTriggeredAt) {
		const next = applyScheduleNextRun(this.tasks, id, nextRunAt, lastTriggeredAt, this.now());
		this.tasks = [...next];
		this.persistAndNotify();
	}
	/**
	* Reload the ledger from the persisted store without notifying subscribers.
	* The scheduler calls this before every tick so a task deleted in another
	* tab (or a stale in-memory copy) can never be fired from this tab: the
	* fire decision and the subsequent roll-forward both run on the freshest
	* persisted truth. Deliberately silent — same-origin external changes still
	* reach subscribers through the storage-event subscription.
	*/
	reloadFromStore() {
		this.tasks = this.deps.store.load();
	}
	/**
	* Jump to an execution's session transcript. Selecting the session changes
	* `current`, which closes the board (the conversation view takes over).
	* @param sessionId - the execution session to open.
	*/
	openSession(sessionId) {
		this.deps.sessions.open(sessionId);
	}
	/**
	* Execute a task for real: move it to 'running', open an execution record,
	* and hand off to the ExecutionService. A second call while the task is
	* already running is ignored.
	*/
	async runTask(id) {
		const task = this.tasks.find((candidate) => candidate.id === id);
		if (task === void 0 || task.status === "running") return false;
		const { task: next, execution } = startExecution(task, this.now(), this.uuid());
		this.tasks = this.tasks.map((candidate) => candidate.id === id ? next : candidate);
		this.persistAndNotify();
		this.activeExecutionIds.add(execution.id);
		await this.deps.exec.run(next, execution, (event) => {
			this.handleExecutionEvent(event);
		});
		return true;
	}
	/** Re-run a settled task: move it back to 'todo' first, then execute. */
	async rerunTask(id) {
		const task = this.tasks.find((candidate) => candidate.id === id);
		if (task === void 0) return;
		if (task.status !== "running") {
			this.tasks = this.tasks.map((candidate) => candidate.id === id ? withStatus(candidate, "todo", this.now()) : candidate);
			this.persistAndNotify();
		}
		await this.runTask(id);
	}
	handleExecutionEvent(event) {
		if (event.kind === "started") {
			this.tasks = this.tasks.map((task) => task.id === event.taskId ? attachSessionId(task, event.executionId, event.sessionId, this.now()) : task);
			this.persistAndNotify();
			return;
		}
		this.activeExecutionIds.delete(event.executionId);
		this.tasks = this.tasks.map((task) => task.id === event.taskId ? settleExecution(task, event.executionId, event.outcome, this.now(), event.error) : task);
		this.persistAndNotify();
	}
	/** Reconcile running tasks and close the board when the user navigates. */
	onSessionsChanged() {
		this.scheduleReconcile();
		if (!this.boardOpen) return;
		const current = currentOf(this.deps.sessions);
		if (current !== this.lastCurrent) this.closeBoard();
		this.lastCurrent = current;
	}
	lastCurrent = void 0;
	/** Execution ids launched on this page; they settle via their live watch, never list reconciliation. */
	activeExecutionIds = /* @__PURE__ */ new Set();
	/** Debounce timer for {@link reconcileRunningTasks}. */
	reconcileTimer = void 0;
	/** Whether a reconcile pass is underway (single-flight guard). */
	reconcileInFlight = false;
	/**
	* Debounce + single-flight trigger for the running-task reconciliation.
	* Session-list notifications arrive in bursts (one per session status
	* change); both guards together keep a burst from reading the history API
	* once per running task.
	*/
	scheduleReconcile() {
		if (this.reconcileTimer !== void 0) return;
		this.reconcileTimer = setTimeout(() => {
			this.reconcileTimer = void 0;
			this.reconcileRunningTasks();
		}, this.deps.reconcileDebounceMs ?? 350);
	}
	/** Settle tasks left 'running' whose sessions already finished. */
	async reconcileRunningTasks() {
		if (this.reconcileInFlight) return;
		this.reconcileInFlight = true;
		try {
			const events = [];
			for (const task of this.tasks) {
				if (task.status !== "running") continue;
				const execution = task.executions[task.executions.length - 1];
				if (execution !== void 0 && this.activeExecutionIds.has(execution.id)) continue;
				const event = await this.deps.exec.reconcile(task);
				if (event !== void 0 && event.kind === "settled") events.push({
					taskId: task.id,
					event
				});
			}
			if (events.length === 0) return;
			let changed = false;
			for (const { taskId, event } of events) {
				const task = this.tasks.find((candidate) => candidate.id === taskId);
				if (task === void 0) continue;
				const next = settleExecution(task, event.executionId, event.outcome, this.now(), event.error);
				if (next === task) continue;
				this.tasks = this.tasks.map((candidate) => candidate.id === taskId ? next : candidate);
				changed = true;
			}
			if (changed) this.persistAndNotify();
		} finally {
			this.reconcileInFlight = false;
		}
	}
	persistAndNotify() {
		this.deps.store.save(this.tasks);
		this.notify();
	}
	notify() {
		for (const fn of [...this.listeners]) fn();
	}
};
/** Record which session ran an execution (once the execution service reports it). */
function attachSessionId(task, executionId, sessionId, now) {
	return {
		...task,
		updatedAt: now,
		executions: task.executions.map((execution) => execution.id === executionId ? {
			...execution,
			sessionId
		} : execution)
	};
}
//#endregion
//#region src/core/scheduler.ts
/**
* Browser-side scheduler: the heartbeat behind scheduled task runs.
*
* The board is a pure client plugin with no server channel, so "定时任务"
* lives in the tab: a timer ticks every minute (plus immediately on tab
* visibility recovery) and triggers any task whose `schedule.nextRunAt` is
* due, rolling the schedule forward to the next cron match before triggering
* so the same tick never double-fires. Missed runs are skipped, never queued:
* a task still running at its due instant is skipped by the controller's
* runTask guard and simply waits for the next cron match.
*
* A deleted task can never fire again from a stale in-memory copy: every
* tick first re-reads the persisted ledger through the optional `refresh`
* hook (the controller reloads its store), so the fire decision and the
* subsequent roll-forward both run on the freshest persisted truth.
*
* The ticker is controlled: `start` arms a single interval guarded by an
* idempotence check (a second start while running is a no-op, so wiring can
* never leak a duplicate timer), and `stop`/`dispose` clear the timer and
* drop the environment listeners. The board unmount path calls stop/dispose,
* so no interval or listener outlives the board.
*
* Framework-free: all runtime access flows through the injected deps
* (structural faces), so tests drive ticks directly without timers.
*/
/**
* The schedule heartbeat (see module doc). `tick` is public so tests and
* callers can drive a check without waiting for the interval.
*/
var SchedulerService = class {
	deps;
	timer;
	environmentListener;
	disposed = false;
	started = false;
	/** Cron expressions that matched no instant in the scan window, per task —
	*  remembered so a never-matching rule is not re-scanned on every tick. */
	unmatchableRepair = /* @__PURE__ */ new Map();
	/** @param deps - tasks/clock/trigger/apply faces (see {@link SchedulerDeps}). */
	constructor(deps) {
		this.deps = deps;
	}
	/**
	* Start ticking: one immediate check (catch-up after reload) + the interval.
	* Single-instance: a second start while already armed is a no-op, so a
	* re-entrant mount can never stack a duplicate timer.
	*/
	start() {
		if (this.disposed) return;
		if (this.started) return;
		this.started = true;
		this.tick();
		this.timer = setInterval(() => {
			this.tick();
		}, this.deps.tickMs ?? 6e4);
		if (this.deps.environment !== void 0) {
			this.environmentListener = () => {
				this.tick();
			};
			this.deps.environment.addEventListener("visibilitychange", this.environmentListener);
		}
	}
	/**
	* Stop ticking and drop listeners (idempotent). Preferred shutdown verb for
	* callers that treat the scheduler as a controlled ticker; `dispose` is an
	* alias.
	*/
	stop() {
		this.dispose();
	}
	/** Stop ticking and drop listeners (idempotent). */
	dispose() {
		if (this.disposed && this.timer === void 0 && this.environmentListener === void 0) return;
		this.disposed = true;
		this.started = false;
		if (this.timer !== void 0) {
			clearInterval(this.timer);
			this.timer = void 0;
		}
		if (this.environmentListener !== void 0 && this.deps.environment !== void 0) {
			this.deps.environment.removeEventListener("visibilitychange", this.environmentListener);
			this.environmentListener = void 0;
		}
	}
	/**
	* Check every enabled schedule and trigger the due ones. Idempotent per
	* task per tick: the schedule is rolled forward only after runTask accepts
	* the run, so a rejected run keeps its due slot and is retried on the next
	* tick instead of being silently dropped.
	*/
	async tick() {
		if (this.disposed) return;
		if (this.deps.ready !== void 0 && !this.deps.ready()) return;
		this.deps.refresh?.();
		const now = this.deps.now();
		for (const task of this.deps.tasks()) {
			const schedule = task.schedule;
			if (schedule === void 0 || !schedule.enabled) continue;
			if (schedule.nextRunAt === void 0) {
				if (this.unmatchableRepair.get(task.id) === schedule.cron) continue;
				const repaired = nextRunAtMs(schedule.cron, now);
				if (repaired === void 0) {
					this.unmatchableRepair.set(task.id, schedule.cron);
					continue;
				}
				this.unmatchableRepair.delete(task.id);
				this.deps.applySchedule(task.id, repaired, void 0);
				continue;
			}
			if (schedule.nextRunAt > now) continue;
			const next = nextRunAtMs(schedule.cron, schedule.nextRunAt);
			if (await this.deps.runTask(task.id)) this.deps.applySchedule(task.id, next, now);
		}
	}
};
//#endregion
//#region src/core/store.ts
/**
* Task persistence: a small storage seam with a localStorage backend.
*
* The task-board client plugin runs in the browser, and dsh exposes no
* browser-writable file channel (same conclusion the skin-center research
* reached for cordis.patch.yml), so tasks persist in the browser's
* localStorage under a versioned key — the same persistence mechanism dsh's
* own client snapshot stores use (`createSnapshotStore` persist). Data
* survives page refreshes and dsh restarts (same origin), and survives
* plugin uninstall (the key is simply left in place).
*
* The seam keeps the backend swappable (e.g. an IndexedDB or a host-file
* channel later); tests run against the in-memory backend and a jsdom
* localStorage backend.
*/
/** Storage key for the task ledger document. */
const DEFAULT_STORAGE_KEY = "dsh.taskBoard.v1";
/**
* Structural row check with the status left unvalidated (see {@link parseLedger}).
* The `schedule` field is deliberately NOT checked here: a malformed schedule
* never drops the task row — {@link normalizeSchedule} repairs or drops the
* schedule alone.
*/
function isTaskRecordShape(value) {
	if (typeof value !== "object" || value === null) return false;
	const record = value;
	if (typeof record.id !== "string" || record.id === "") return false;
	if (typeof record.title !== "string") return false;
	if (typeof record.description !== "string") return false;
	if (typeof record.prompt !== "string") return false;
	if (typeof record.createdAt !== "number") return false;
	if (typeof record.updatedAt !== "number") return false;
	if (record.workspaceId !== void 0 && typeof record.workspaceId !== "string") return false;
	if (record.mode !== void 0 && typeof record.mode !== "string") return false;
	if (record.permission !== void 0 && typeof record.permission !== "string") return false;
	if (!Array.isArray(record.executions)) return false;
	for (const execution of record.executions) {
		if (typeof execution !== "object" || execution === null) return false;
		const entry = execution;
		if (typeof entry.id !== "string") return false;
		if (entry.sessionId !== void 0 && typeof entry.sessionId !== "string") return false;
		if (typeof entry.startedAt !== "number") return false;
		if (entry.endedAt !== void 0 && typeof entry.endedAt !== "number") return false;
		if (entry.result !== void 0 && entry.result !== "succeeded" && entry.result !== "failed" && entry.result !== "cancelled") return false;
		if (entry.error !== void 0 && typeof entry.error !== "string") return false;
	}
	return true;
}
/** Normalize an unknown persisted status back into the closed status union. */
function normalizeStatus(status) {
	return isTaskStatus(status) ? status : "todo";
}
/**
* Repair a persisted schedule rule: drop rules without a usable cron string,
* coerce booleans/numbers, and leave `nextRunAt`/`lastTriggeredAt` undefined
* when missing (a fresh recompute or the next tick fixes them).
*/
function normalizeSchedule(schedule) {
	if (typeof schedule !== "object" || schedule === null) return void 0;
	const rule = schedule;
	if (typeof rule.cron !== "string") return void 0;
	if (rule.cron.trim() === "" || !isValidCron(rule.cron)) return void 0;
	return {
		enabled: rule.enabled === true,
		cron: rule.cron,
		nextRunAt: typeof rule.nextRunAt === "number" ? rule.nextRunAt : void 0,
		lastTriggeredAt: typeof rule.lastTriggeredAt === "number" ? rule.lastTriggeredAt : void 0
	};
}
/** Parse + validate a persisted ledger document; invalid rows are dropped. */
function parseLedger(raw) {
	if (raw === null) return [];
	let parsed;
	try {
		parsed = JSON.parse(raw);
	} catch (error) {
		console.error("[dsh-task-board] persisted task ledger is not valid JSON; starting empty", error);
		return [];
	}
	if (!Array.isArray(parsed)) {
		console.error("[dsh-task-board] persisted task ledger is not an array; starting empty");
		return [];
	}
	const tasks = [];
	for (const row of parsed) {
		if (!isTaskRecordShape(row)) {
			console.warn("[dsh-task-board] dropping invalid task row from persisted ledger", row);
			continue;
		}
		const task = {
			...row,
			status: normalizeStatus(row.status)
		};
		task.schedule = normalizeSchedule(row.schedule);
		task.workspaceId = normalizeTargetId(row.workspaceId);
		task.mode = normalizeTargetId(row.mode);
		task.modelSelection = normalizeModelSelection(row.modelSelection);
		task.archivedAt = typeof row.archivedAt === "number" && Number.isFinite(row.archivedAt) ? row.archivedAt : void 0;
		task.permission = isTaskPermission(row.permission) ? row.permission : void 0;
		tasks.push(task);
	}
	return tasks;
}
/** localStorage-backed store (the browser backend). */
var LocalStorageTaskStore = class {
	key;
	storage;
	events;
	/**
	* @param key - storage key for the ledger document.
	* @param storage - storage backend (defaults to the global localStorage; tests inject fakes).
	* @param events - storage-event target for cross-tab notifications (defaults
	*   to the browser global; undefined in non-browser runtimes, where the
	*   subscription becomes a no-op).
	*/
	constructor(key = DEFAULT_STORAGE_KEY, storage = globalThis.localStorage, events = typeof globalThis.addEventListener === "function" ? globalThis : void 0) {
		this.key = key;
		this.storage = storage;
		this.events = events;
	}
	load() {
		if (this.storage === void 0) return [];
		try {
			return parseLedger(this.storage.getItem(this.key));
		} catch (error) {
			console.error("[dsh-task-board] task ledger read failed; starting empty", error);
			return [];
		}
	}
	save(tasks) {
		if (this.storage === void 0) return;
		try {
			this.storage.setItem(this.key, JSON.stringify(tasks));
		} catch (error) {
			console.error("[dsh-task-board] task ledger write failed (persistence skipped)", error);
		}
	}
	clear() {
		if (this.storage === void 0) return;
		try {
			this.storage.removeItem(this.key);
		} catch (error) {
			console.error("[dsh-task-board] task ledger clear failed", error);
		}
	}
	/**
	* Cross-tab change subscription (see {@link TaskStore.subscribeExternal}).
	* The browser fires the storage event in every OTHER tab of the same origin
	* when one tab writes; a null key means the whole storage was cleared. Both
	* cases reload the ledger here; unrelated keys are ignored.
	*/
	subscribeExternal(listener) {
		if (this.events === void 0) return () => {};
		const onStorage = (event) => {
			if (event.key !== null && event.key !== this.key) return;
			listener();
		};
		this.events.addEventListener("storage", onStorage);
		return () => {
			this.events?.removeEventListener("storage", onStorage);
		};
	}
};
//#endregion
//#region src/client/apply-guard.ts
/** Claims the plugin apply slot. Returns true when this call won the slot. */
function claimTaskboardApply() {
	if (globalThis.__dshTaskboardApplied === true) return false;
	globalThis.__dshTaskboardApplied = true;
	return true;
}
/**
* Releases the claim. Called from the client fiber cleanup so that a
* hot-reloaded bundle (the loader unloads the old plugin fiber and invokes
* the rebuilt one in the same page) can claim again instead of being
* silently dropped.
*/
function releaseTaskboardApply() {
	globalThis.__dshTaskboardApplied = void 0;
}
//#endregion
//#region src/client/locales.ts
/**
* Task-board copy: zh-first dictionaries with an English fallback. The client
* adapter supplies DSH's active locale; the document language remains a
* fallback for tests and standalone use. The DOM-injected entry row and the
* standalone board tree share one tiny lookup.
*/
/** zh dictionary (key-set source of truth). */
const zh = {
	"entry.label": "任务看板",
	"board.title": "任务看板",
	"board.close": "返回会话",
	"board.new": "新建任务",
	"board.search": "筛选任务…",
	"board.empty": "这个状态还没有任务",
	"board.filterAll": "全部",
	"board.archive": "归档",
	"board.archiveView": "归档 ({count})",
	"board.backToBoard": "返回看板",
	"archive.empty": "没有已归档的任务",
	"board.status": "状态",
	"board.status.backlog": "待规划",
	"board.status.todo": "待办",
	"board.status.running": "进行中",
	"board.status.done": "已完成",
	"board.status.failed": "已失败",
	"board.runs": "次执行",
	"board.updated": "更新于",
	"board.created": "创建于",
	"new.title": "标题",
	"new.titlePlaceholder": "一句话描述要做什么",
	"new.description": "描述",
	"new.descriptionPlaceholder": "补充背景、范围与验收（可选）",
	"new.prompt": "执行 Prompt",
	"new.promptPlaceholder": "发给 agent 的完整指令（留空则使用标题）",
	"new.submit": "创建",
	"new.cancel": "取消",
	"new.required": "标题不能为空",
	"detail.title": "任务详情",
	"detail.close": "关闭",
	"detail.prompt": "执行 Prompt",
	"detail.description": "描述",
	"detail.execution": "执行记录",
	"detail.noExecution": "尚未执行",
	"detail.run": "执行",
	"detail.rerun": "重新执行",
	"detail.delete": "删除",
	"detail.archive": "归档",
	"detail.restore": "恢复",
	"detail.archivedAt": "已归档 · {time}",
	"detail.viewSession": "查看会话",
	"detail.noSession": "暂无会话",
	"detail.executionStarted": "已启动",
	"detail.executionEnded": "已结束",
	"detail.result.succeeded": "成功",
	"detail.result.failed": "失败",
	"detail.result.cancelled": "已取消",
	"detail.result.running": "进行中",
	"delete.title": "删除任务",
	"delete.confirm": "确定删除「{name}」吗？删除后不可恢复。",
	"delete.ok": "删除",
	"delete.cancel": "取消",
	"status.move.backlog": "移到待规划",
	"status.move.todo": "移到待办",
	"exec.error.noWorkspace": "没有可用工作区，无法执行任务",
	"exec.error.promptRejected": "Prompt 被拒绝",
	"run.failed": "执行失败：{error}",
	"time.justNow": "刚刚",
	"detail.schedule": "定时运行",
	"detail.schedule.enable": "启用定时执行",
	"detail.schedule.cron": "Cron 表达式",
	"detail.schedule.presets": "预设",
	"detail.schedule.preset.daily9": "每天 09:00",
	"detail.schedule.preset.hourly": "每小时",
	"detail.schedule.preset.tenMin": "每 10 分钟",
	"detail.schedule.preset.weeklyMon9": "每周一 09:00",
	"detail.schedule.nextRun": "下次运行",
	"detail.schedule.lastTriggered": "上次触发",
	"detail.schedule.invalid": "Cron 表达式无效",
	"detail.schedule.notScheduled": "尚未排程",
	"detail.schedule.dueSoon": "即将运行",
	"card.scheduled": "定时",
	"new.workspace": "工作区",
	"new.mode": "模式",
	"new.permission": "权限",
	"new.model": "模型",
	"new.reasoningEffort": "推理力度",
	"exec.workspace.recent": "最近使用（默认）",
	"exec.mode.default": "部署默认",
	"exec.mode.defaultSuffix": "（默认）",
	"exec.mode.brokenSuffix": "（不可用）",
	"exec.mode.removed": "（已移除）",
	"exec.permission.default": "会话默认",
	"exec.permission.read-only": "只读",
	"exec.permission.workspace-write": "工作区可写",
	"exec.permission.danger-full-access": "完全访问",
	"exec.model.default": "运行时默认模型",
	"exec.model.removedSuffix": "（已移除）",
	"exec.effort.default": "模型默认",
	"exec.effort.defaultWithValue": "模型默认（{value}）",
	"exec.effort.removedSuffix": "（已移除）",
	"detail.executionSettings": "执行设置",
	"exec.hint": "执行时生效：工作区决定执行会话落在哪个工作区；模式决定会话的 agent 预设；权限经 /permission 命令应用到会话；模型和推理力度固定本次任务的模型路由。留空则使用运行时默认。",
	"settings.title": "任务看板",
	"settings.description": "控制看板在 agent 系统提示中的播报行为。",
	"settings.enabled": "启用任务看板",
	"settings.enabledHint": "关闭后隐藏侧边栏入口与看板视图。",
	"settings.announceToAgent": "向 agent 播报任务看板",
	"settings.announceToAgentHint": "开启：每条 agent 系统提示都会包含本看板的说明；关闭：不播报，agent 仅在用户主动提及时了解看板。",
	"settings.inherit": "继承",
	"settings.on": "开",
	"settings.off": "关",
	"settings.overridden": "已覆盖",
	"settings.reset": "恢复默认",
	"settings.notExposed": "当前 DSH 版本未向设置页暴露本插件的配置命名空间，表单不可用。可编辑 ~/.dsh/settings.yaml 直接配置，或为 dsh-host-apiproxy 的 WEB_SETTINGS_NAMESPACES 白名单补充本命名空间后重启。",
	"settings.readOnly": "当前部署的设置只读。",
	"settings.expand": "展开设置",
	"settings.collapse": "收起设置",
	"settings.save": "保存",
	"settings.saving": "保存中…",
	"settings.discard": "放弃",
	"settings.unsaved": "未保存",
	"settings.saveFailed": "部署未接受这些值，已保留供你修改。",
	"settings.invalidNumber": "请输入数字，留空则使用默认值。"
};
/** en dictionary, complete against the zh key set. */
const en = {
	"entry.label": "Task Board",
	"board.title": "Task Board",
	"board.close": "Back to chat",
	"board.new": "New Task",
	"board.search": "Filter tasks…",
	"board.empty": "No tasks in this column",
	"board.filterAll": "All",
	"board.archive": "Archive",
	"board.archiveView": "Archived ({count})",
	"board.backToBoard": "Back to board",
	"archive.empty": "No archived tasks",
	"board.status": "Status",
	"board.status.backlog": "Backlog",
	"board.status.todo": "To Do",
	"board.status.running": "In Progress",
	"board.status.done": "Done",
	"board.status.failed": "Failed",
	"board.runs": "runs",
	"board.updated": "Updated",
	"board.created": "Created",
	"new.title": "Title",
	"new.titlePlaceholder": "What should be done, in one line",
	"new.description": "Description",
	"new.descriptionPlaceholder": "Background, scope, acceptance criteria (optional)",
	"new.prompt": "Run Prompt",
	"new.promptPlaceholder": "The full instruction sent to the agent (title is used when blank)",
	"new.submit": "Create",
	"new.cancel": "Cancel",
	"new.required": "Title is required",
	"detail.title": "Task Detail",
	"detail.close": "Close",
	"detail.prompt": "Run Prompt",
	"detail.description": "Description",
	"detail.execution": "Execution History",
	"detail.noExecution": "Not executed yet",
	"detail.run": "Run",
	"detail.rerun": "Run Again",
	"detail.delete": "Delete",
	"detail.archive": "Archive",
	"detail.restore": "Restore",
	"detail.archivedAt": "Archived · {time}",
	"detail.viewSession": "View Session",
	"detail.noSession": "No session",
	"detail.executionStarted": "Started",
	"detail.executionEnded": "Ended",
	"detail.result.succeeded": "Succeeded",
	"detail.result.failed": "Failed",
	"detail.result.cancelled": "Cancelled",
	"detail.result.running": "Running",
	"delete.title": "Delete Task",
	"delete.confirm": "Delete \"{name}\"? This cannot be undone.",
	"delete.ok": "Delete",
	"delete.cancel": "Cancel",
	"status.move.backlog": "Move to Backlog",
	"status.move.todo": "Move to To Do",
	"exec.error.noWorkspace": "No workspace is available to run the task",
	"exec.error.promptRejected": "Prompt rejected",
	"run.failed": "Run failed: {error}",
	"time.justNow": "just now",
	"detail.schedule": "Scheduled Runs",
	"detail.schedule.enable": "Enable scheduled runs",
	"detail.schedule.cron": "Cron expression",
	"detail.schedule.presets": "Presets",
	"detail.schedule.preset.daily9": "Every day 09:00",
	"detail.schedule.preset.hourly": "Every hour",
	"detail.schedule.preset.tenMin": "Every 10 minutes",
	"detail.schedule.preset.weeklyMon9": "Every Monday 09:00",
	"detail.schedule.nextRun": "Next run",
	"detail.schedule.lastTriggered": "Last triggered",
	"detail.schedule.invalid": "Invalid cron expression",
	"detail.schedule.notScheduled": "Not scheduled yet",
	"detail.schedule.dueSoon": "Due soon",
	"card.scheduled": "scheduled",
	"new.workspace": "Workspace",
	"new.mode": "Mode",
	"new.permission": "Permission",
	"new.model": "Model",
	"new.reasoningEffort": "Reasoning effort",
	"exec.workspace.recent": "Most recent (default)",
	"exec.mode.default": "Deployment default",
	"exec.mode.defaultSuffix": " (default)",
	"exec.mode.brokenSuffix": " (unavailable)",
	"exec.mode.removed": " (removed)",
	"exec.permission.default": "Session default",
	"exec.permission.read-only": "Read-only",
	"exec.permission.workspace-write": "Workspace Write",
	"exec.permission.danger-full-access": "Full Access",
	"exec.model.default": "Runtime default model",
	"exec.model.removedSuffix": " (removed)",
	"exec.effort.default": "Model default",
	"exec.effort.defaultWithValue": "Model default ({value})",
	"exec.effort.removedSuffix": " (removed)",
	"detail.executionSettings": "Execution Settings",
	"exec.hint": "Applied when the task runs: workspace decides where the execution session lands; mode composes the agent preset; permission is applied through /permission; model and effort pin the request route. Blank = runtime default.",
	"settings.title": "Task Board",
	"settings.description": "How the board announces itself in each agent system prompt.",
	"settings.enabled": "Enable the task board",
	"settings.enabledHint": "When off, the sidebar entry and board view are hidden.",
	"settings.announceToAgent": "Announce the task board to agents",
	"settings.announceToAgentHint": "On: every agent system prompt includes a note about this board. Off: no announcement; agents learn about the board only when you mention it.",
	"settings.inherit": "Inherit",
	"settings.on": "On",
	"settings.off": "Off",
	"settings.overridden": "Overridden",
	"settings.reset": "Reset to default",
	"settings.notExposed": "This DSH version does not expose this plugin's settings namespace to the configuration page, so the form is unavailable. Edit ~/.dsh/settings.yaml directly, or add the namespace to dsh-host-apiproxy's WEB_SETTINGS_NAMESPACES allowlist and restart.",
	"settings.readOnly": "This deployment stores settings read-only.",
	"settings.expand": "Show settings",
	"settings.collapse": "Hide settings",
	"settings.save": "Save",
	"settings.saving": "Saving…",
	"settings.discard": "Discard",
	"settings.unsaved": "Unsaved",
	"settings.saveFailed": "The deployment did not accept these values; they were left for you to correct.",
	"settings.invalidNumber": "Enter a number, or leave blank to use the default."
};
/** Locale supplied by DSH's locale runtime after the client mounts. */
let runtimeLocale;
/** Set or clear the runtime locale used by task-board copy. */
function setTaskBoardLocale(locale) {
	runtimeLocale = locale;
}
/** Active dictionary, picked for the active locale at call time. */
function dictionary() {
	return (runtimeLocale ?? (typeof document !== "undefined" ? document.documentElement.lang : "zh")).toLowerCase().startsWith("en") ? en : zh;
}
/** Translate a key with optional {name} template params. */
function t(key, params) {
	let text = dictionary()[key];
	if (params !== void 0) for (const [name, value] of Object.entries(params)) text = text.replaceAll(`{${name}}`, value);
	return text;
}
//#endregion
//#region src/client/board.module.css
var board_module_default = {
	"backButton": "JEp9Zq_backButton",
	"board": "JEp9Zq_board",
	"boardHeader": "JEp9Zq_boardHeader",
	"boardTitle": "JEp9Zq_boardTitle",
	"card": "JEp9Zq_card",
	"cardExcerpt": "JEp9Zq_cardExcerpt",
	"cardMeta": "JEp9Zq_cardMeta",
	"cardRun": "JEp9Zq_cardRun",
	"cardRunningLabel": "JEp9Zq_cardRunningLabel",
	"cards": "JEp9Zq_cards",
	"cardSchedule": "JEp9Zq_cardSchedule",
	"cardSession": "JEp9Zq_cardSession",
	"cardSpinner": "JEp9Zq_cardSpinner",
	"cardTime": "JEp9Zq_cardTime",
	"cardTitle": "JEp9Zq_cardTitle",
	"column": "JEp9Zq_column",
	"columnCount": "JEp9Zq_columnCount",
	"columnEmpty": "JEp9Zq_columnEmpty",
	"columnHeader": "JEp9Zq_columnHeader",
	"columns": "JEp9Zq_columns",
	"columnTitle": "JEp9Zq_columnTitle",
	"confirmMessage": "JEp9Zq_confirmMessage",
	"dangerButton": "JEp9Zq_dangerButton",
	"detail": "JEp9Zq_detail",
	"detailBody": "JEp9Zq_detailBody",
	"detailFooter": "JEp9Zq_detailFooter",
	"detailHeader": "JEp9Zq_detailHeader",
	"detailMeta": "JEp9Zq_detailMeta",
	"detailSection": "JEp9Zq_detailSection",
	"detailText": "JEp9Zq_detailText",
	"detailTitle": "JEp9Zq_detailTitle",
	"dshTbSpin": "JEp9Zq_dshTbSpin",
	"entry": "JEp9Zq_entry",
	"entryIcon": "JEp9Zq_entryIcon",
	"entryLabel": "JEp9Zq_entryLabel",
	"executionBadge": "JEp9Zq_executionBadge",
	"executionError": "JEp9Zq_executionError",
	"executionList": "JEp9Zq_executionList",
	"executionRow": "JEp9Zq_executionRow",
	"executionTimes": "JEp9Zq_executionTimes",
	"field": "JEp9Zq_field",
	"fieldLabel": "JEp9Zq_fieldLabel",
	"formError": "JEp9Zq_formError",
	"ghostButton": "JEp9Zq_ghostButton",
	"iconButton": "JEp9Zq_iconButton",
	"input": "JEp9Zq_input",
	"linkButton": "JEp9Zq_linkButton",
	"modal": "JEp9Zq_modal",
	"modalBackdrop": "JEp9Zq_modalBackdrop",
	"modalFooter": "JEp9Zq_modalFooter",
	"modalTitle": "JEp9Zq_modalTitle",
	"moveRow": "JEp9Zq_moveRow",
	"primaryButton": "JEp9Zq_primaryButton",
	"promptBlock": "JEp9Zq_promptBlock",
	"scheduleInput": "JEp9Zq_scheduleInput",
	"scheduleInputInvalid": "JEp9Zq_scheduleInputInvalid",
	"scheduleMeta": "JEp9Zq_scheduleMeta",
	"schedulePreset": "JEp9Zq_schedulePreset",
	"scheduleRow": "JEp9Zq_scheduleRow",
	"scheduleToggle": "JEp9Zq_scheduleToggle",
	"search": "JEp9Zq_search",
	"select": "JEp9Zq_select",
	"statusBadge": "JEp9Zq_statusBadge",
	"statusDot": "JEp9Zq_statusDot",
	"task-board-view": "JEp9Zq_task-board-view"
};
//#endregion
//#region src/client/schedule-presets.ts
/** Common scheduled-run presets (cron → locale label). */
const SCHEDULE_PRESETS = [
	{
		cron: "0 9 * * *",
		label: "detail.schedule.preset.daily9"
	},
	{
		cron: "0 * * * *",
		label: "detail.schedule.preset.hourly"
	},
	{
		cron: "*/10 * * * *",
		label: "detail.schedule.preset.tenMin"
	},
	{
		cron: "0 9 * * 1",
		label: "detail.schedule.preset.weeklyMon9"
	}
];
//#endregion
//#region src/client/board/NewTaskModal.tsx
/**
* New-task modal: title + description + the prompt that execution will send.
* Creates through the controller (which persists immediately).
*/
/** New-task form overlay. */
function NewTaskModal({ controller, onClose }) {
	const [title, setTitle] = (0, react.useState)("");
	const [description, setDescription] = (0, react.useState)("");
	const [prompt, setPrompt] = (0, react.useState)("");
	const [workspaceId, setWorkspaceId] = (0, react.useState)("");
	const [mode, setMode] = (0, react.useState)("");
	const [permission, setPermission] = (0, react.useState)("");
	const [modelKey, setModelKey] = (0, react.useState)("");
	const [reasoningEffort, setReasoningEffort] = (0, react.useState)("");
	const [scheduleEnabled, setScheduleEnabled] = (0, react.useState)(false);
	const [scheduleCron, setScheduleCron] = (0, react.useState)("");
	const [scheduleError, setScheduleError] = (0, react.useState)(void 0);
	const [error, setError] = (0, react.useState)(void 0);
	const [options, setOptions] = (0, react.useState)(controller.getSnapshot().executionOptions);
	(0, react.useEffect)(() => controller.subscribe(() => setOptions(controller.getSnapshot().executionOptions)), [controller]);
	const selectedModel = options.models.find((model) => `${model.provider}/${model.model}` === modelKey);
	const submit = () => {
		if (scheduleEnabled) {
			const cron = scheduleCron.trim();
			if (cron === "" || !isValidCron(cron)) {
				setScheduleError(t("detail.schedule.invalid"));
				return;
			}
		}
		if (controller.createTask({
			title,
			description,
			prompt,
			workspaceId: workspaceId === "" ? void 0 : workspaceId,
			mode: mode === "" ? void 0 : mode,
			permission: permission === "" ? void 0 : permission,
			modelSelection: selectedModel === void 0 ? void 0 : {
				provider: selectedModel.provider,
				model: selectedModel.model,
				...reasoningEffort === "" ? {} : { reasoningEffort }
			},
			schedule: scheduleEnabled ? {
				enabled: true,
				cron: scheduleCron.trim()
			} : void 0
		}) === void 0) {
			setError(t("new.required"));
			return;
		}
		onClose();
	};
	/** Next-run preview for a valid armed cron (creation-time only). */
	const scheduleNextRun = scheduleEnabled && scheduleCron.trim() !== "" && isValidCron(scheduleCron) ? nextRunAtMs(scheduleCron, Date.now()) : void 0;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		className: board_module_default.modalBackdrop,
		onMouseDown: (event) => {
			if (event.target === event.currentTarget) onClose();
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
			className: board_module_default.modal,
			role: "dialog",
			"aria-label": t("board.new"),
			onSubmit: (event) => {
				event.preventDefault();
				submit();
			},
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
					className: board_module_default.modalTitle,
					children: t("board.new")
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
					className: board_module_default.field,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: board_module_default.fieldLabel,
						children: t("new.title")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						className: board_module_default.input,
						value: title,
						autoFocus: true,
						placeholder: t("new.titlePlaceholder"),
						onChange: (event) => {
							setTitle(event.target.value);
							setError(void 0);
						}
					})]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
					className: board_module_default.field,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: board_module_default.fieldLabel,
						children: t("new.description")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
						className: board_module_default.input,
						rows: 3,
						value: description,
						placeholder: t("new.descriptionPlaceholder"),
						onChange: (event) => {
							setDescription(event.target.value);
						}
					})]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
					className: board_module_default.field,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: board_module_default.fieldLabel,
						children: t("new.prompt")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
						className: board_module_default.input,
						rows: 4,
						value: prompt,
						placeholder: t("new.promptPlaceholder"),
						onChange: (event) => {
							setPrompt(event.target.value);
						}
					})]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
					className: board_module_default.field,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: board_module_default.fieldLabel,
						children: t("new.workspace")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
						className: board_module_default.select,
						value: workspaceId,
						onChange: (event) => {
							setWorkspaceId(event.target.value);
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
							value: "",
							children: t("exec.workspace.recent")
						}), options.workspaces.map((workspace) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
							value: workspace.workspaceId,
							children: workspace.title
						}, workspace.workspaceId))]
					})]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
					className: board_module_default.field,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: board_module_default.fieldLabel,
						children: t("new.mode")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
						className: board_module_default.select,
						value: mode,
						onChange: (event) => {
							setMode(event.target.value);
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
							value: "",
							children: t("exec.mode.default")
						}), options.presets.map((preset) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
							value: preset.id,
							disabled: preset.broken !== void 0,
							children: [
								preset.name ?? preset.id,
								preset.isDefault ? t("exec.mode.defaultSuffix") : "",
								preset.broken !== void 0 ? t("exec.mode.brokenSuffix") : ""
							]
						}, preset.id))]
					})]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
					className: board_module_default.field,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: board_module_default.fieldLabel,
						children: t("new.permission")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
						className: board_module_default.select,
						value: permission,
						onChange: (event) => {
							setPermission(event.target.value);
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
							value: "",
							children: t("exec.permission.default")
						}), TASK_PERMISSIONS.map((id) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
							value: id,
							children: t(`exec.permission.${id}`)
						}, id))]
					})]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
					className: board_module_default.field,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: board_module_default.fieldLabel,
						children: t("new.model")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
						className: board_module_default.select,
						value: modelKey,
						onChange: (event) => {
							const nextKey = event.target.value;
							setModelKey(nextKey);
							setReasoningEffort("");
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
							value: "",
							children: t("exec.model.default")
						}), options.models.map((model) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
							value: `${model.provider}/${model.model}`,
							children: [
								model.providerName,
								" / ",
								model.name
							]
						}, `${model.provider}/${model.model}`))]
					})]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
					className: board_module_default.field,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: board_module_default.fieldLabel,
						children: t("new.reasoningEffort")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
						className: board_module_default.select,
						value: reasoningEffort,
						disabled: selectedModel === void 0 || selectedModel.reasoning?.efforts.length === 0,
						onChange: (event) => {
							setReasoningEffort(event.target.value);
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
							value: "",
							children: selectedModel?.reasoning?.defaultEffort !== void 0 ? t("exec.effort.defaultWithValue", { value: selectedModel.reasoning.defaultEffort }) : t("exec.effort.default")
						}), selectedModel?.reasoning?.efforts.map((effort) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
							value: effort.id,
							children: effort.name
						}, effort.id))]
					})]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					className: board_module_default.detailSection,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", { children: t("detail.schedule") }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: board_module_default.scheduleToggle,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: scheduleEnabled,
								onChange: (event) => {
									setScheduleEnabled(event.target.checked);
									if (!event.target.checked) setScheduleError(void 0);
								}
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("detail.schedule.enable") })]
						}),
						scheduleEnabled && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: board_module_default.scheduleRow,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: `${board_module_default.input} ${board_module_default.scheduleInput}${scheduleError !== void 0 ? ` ${board_module_default.scheduleInputInvalid}` : ""}`,
									value: scheduleCron,
									placeholder: "0 9 * * *",
									spellCheck: false,
									"aria-label": t("detail.schedule.cron"),
									onChange: (event) => {
										setScheduleCron(event.target.value);
										setScheduleError(void 0);
									}
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									className: board_module_default.schedulePreset,
									value: "",
									"aria-label": t("detail.schedule.presets"),
									onChange: (event) => {
										if (event.target.value === "") return;
										setScheduleCron(event.target.value);
										setScheduleError(void 0);
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
										value: "",
										children: [t("detail.schedule.presets"), "…"]
									}), SCHEDULE_PRESETS.map((preset) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: preset.cron,
										children: t(preset.label)
									}, preset.cron))]
								})]
							}),
							scheduleError !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: board_module_default.formError,
								children: scheduleError
							}),
							scheduleError === void 0 && scheduleNextRun !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
								className: board_module_default.scheduleMeta,
								children: [
									t("detail.schedule.nextRun"),
									" ",
									new Date(scheduleNextRun).toLocaleString()
								]
							})
						] })
					]
				}),
				error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: board_module_default.formError,
					children: error
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("footer", {
					className: board_module_default.modalFooter,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: board_module_default.ghostButton,
						onClick: onClose,
						children: t("new.cancel")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "submit",
						className: board_module_default.primaryButton,
						children: t("new.submit")
					})]
				})
			]
		})
	});
}
//#endregion
//#region src/client/board/status-key.ts
/** Task status → locale key (board column titles and the detail badge). */
const STATUS_KEY = {
	backlog: "board.status.backlog",
	todo: "board.status.todo",
	running: "board.status.running",
	done: "board.status.done",
	failed: "board.status.failed"
};
//#endregion
//#region src/client/board/TaskCard.tsx
/**
* Task card: the board's column item. Clicking opens the task detail — it
* never executes anything directly (detail holds the Run button).
*
* Memoized: the card re-renders only when its own task record changes, so a
* status/filter update on one card (or scrolling) never re-renders every
* card on the board. The per-card onClick is built with a stable task reference
* by the board, so the memo boundary is effective.
*/
/** Compact relative/absolute time label. */
function formatTime(ms) {
	const date = new Date(ms);
	const minutes = Math.floor((Date.now() - ms) / 6e4);
	if (minutes < 1) return t("time.justNow");
	if (minutes < 60) return `${minutes}m`;
	if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
/** One card in a column. */
function TaskCardInner({ task, onClick }) {
	const latest = task.executions[task.executions.length - 1];
	const runs = task.executions.length;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
		type: "button",
		className: board_module_default.card,
		"data-status": task.status,
		onClick,
		title: task.description !== "" ? task.description : task.title,
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: board_module_default.cardTitle,
				children: task.title
			}),
			task.description !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: board_module_default.cardExcerpt,
				children: task.description
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: board_module_default.cardMeta,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: board_module_default.cardTime,
						children: [
							t("board.updated"),
							" ",
							formatTime(task.updatedAt)
						]
					}),
					task.schedule?.enabled === true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: board_module_default.cardSchedule,
						title: task.schedule.nextRunAt !== void 0 ? `${t("card.scheduled")} · ${new Date(task.schedule.nextRunAt).toLocaleString()}` : t("card.scheduled"),
						children: t("card.scheduled")
					}),
					latest !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: board_module_default.cardRun,
						"data-result": latest.result,
						children: [
							runs,
							" ",
							t("board.runs")
						]
					}),
					latest?.sessionId !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: board_module_default.cardSession,
						title: latest.sessionId,
						children: "⌁"
					}),
					task.status === "running" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: board_module_default.cardSpinner,
						"aria-hidden": "true"
					})
				]
			}),
			latest !== void 0 && executionLabel(latest) === "running" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: board_module_default.cardRunningLabel,
				children: [t("detail.result.running"), "…"]
			})
		]
	});
}
/** Memoized card: re-renders only when the card's own task record changes. */
const TaskCard = (0, react.memo)(TaskCardInner);
//#endregion
//#region src/client/board/ConfirmDialog.tsx
/**
* Generic confirm dialog used by destructive actions (task delete).
*/
/** Small confirm overlay. */
function ConfirmDialog({ title, message, confirmLabel, danger, onCancel, onConfirm }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		className: board_module_default.modalBackdrop,
		onMouseDown: (event) => {
			if (event.target === event.currentTarget) onCancel();
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: board_module_default.modal,
			role: "alertdialog",
			"aria-label": title,
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
					className: board_module_default.modalTitle,
					children: title
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: board_module_default.confirmMessage,
					children: message
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("footer", {
					className: board_module_default.modalFooter,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: board_module_default.ghostButton,
						onClick: onCancel,
						children: t("delete.cancel")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: danger ? board_module_default.dangerButton : board_module_default.primaryButton,
						onClick: onConfirm,
						children: confirmLabel
					})]
				})
			]
		})
	});
}
//#endregion
//#region src/client/board/TaskDetail.tsx
/**
* Task detail: the full view of one task — content, prompt, execution
* history — and the only place execution can be triggered. Also offers
* delete (with confirmation), manual status moves, and a jump to the
* execution's session transcript.
*/
/** Execution outcome → locale key. */
const RESULT_KEY = {
	succeeded: "detail.result.succeeded",
	failed: "detail.result.failed",
	cancelled: "detail.result.cancelled"
};
/** One execution-history row. */
function ExecutionRow({ execution, onOpen }) {
	const result = execution.result;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
		className: board_module_default.executionRow,
		"data-result": result,
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: board_module_default.executionBadge,
				"data-result": result,
				children: result === void 0 ? t("detail.result.running") : t(RESULT_KEY[result])
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: board_module_default.executionTimes,
				children: [
					t("detail.executionStarted"),
					" ",
					formatTime(execution.startedAt),
					execution.endedAt !== void 0 && ` · ${t("detail.executionEnded")} ${formatTime(execution.endedAt)}`
				]
			}),
			execution.sessionId !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				className: board_module_default.linkButton,
				onClick: () => {
					onOpen(execution.sessionId);
				},
				title: execution.sessionId,
				children: [t("detail.viewSession"), " ⌁"]
			}),
			execution.error !== void 0 && execution.error !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: board_module_default.executionError,
				children: execution.error
			})
		]
	});
}
/** The execution-target editor: workspace / mode / permission pickers. */
function ExecutionSettingsSection({ controller, task }) {
	const [options, setOptions] = (0, react.useState)(controller.getSnapshot().executionOptions);
	(0, react.useEffect)(() => controller.subscribe(() => setOptions(controller.getSnapshot().executionOptions)), [controller]);
	const workspaceId = task.workspaceId ?? "";
	const mode = task.mode ?? "";
	const permission = task.permission ?? "";
	const modelSelection = task.modelSelection;
	const modelKey = modelSelection === void 0 ? "" : `${modelSelection.provider}/${modelSelection.model}`;
	const selectedModel = options.models.find((model) => `${model.provider}/${model.model}` === modelKey);
	const selectedEffort = modelSelection?.reasoningEffort ?? "";
	const workspaceKnown = workspaceId === "" || options.workspaces.some((item) => item.workspaceId === workspaceId);
	const modeKnown = mode === "" || options.presets.some((item) => item.id === mode);
	const modelKnown = modelKey === "" || selectedModel !== void 0;
	const effortKnown = selectedEffort === "" || selectedModel?.reasoning?.efforts.some((effort) => effort.id === selectedEffort) === true;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
		className: board_module_default.detailSection,
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", { children: t("detail.executionSettings") }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: board_module_default.detailText,
				children: t("exec.hint")
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				className: board_module_default.field,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: board_module_default.fieldLabel,
					children: t("new.workspace")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
					className: board_module_default.select,
					value: workspaceId,
					onChange: (event) => {
						controller.updateTask(task.id, { workspaceId: event.target.value });
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
							value: "",
							children: t("exec.workspace.recent")
						}),
						!workspaceKnown && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
							value: workspaceId,
							children: [workspaceId, t("exec.mode.removed")]
						}),
						options.workspaces.map((workspace) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
							value: workspace.workspaceId,
							children: workspace.title
						}, workspace.workspaceId))
					]
				})]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				className: board_module_default.field,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: board_module_default.fieldLabel,
					children: t("new.mode")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
					className: board_module_default.select,
					value: mode,
					onChange: (event) => {
						controller.updateTask(task.id, { mode: event.target.value });
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
							value: "",
							children: t("exec.mode.default")
						}),
						!modeKnown && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
							value: mode,
							children: [mode, t("exec.mode.removed")]
						}),
						options.presets.map((preset) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
							value: preset.id,
							disabled: preset.broken !== void 0,
							children: [
								preset.name ?? preset.id,
								preset.isDefault ? t("exec.mode.defaultSuffix") : "",
								preset.broken !== void 0 ? t("exec.mode.brokenSuffix") : ""
							]
						}, preset.id))
					]
				})]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				className: board_module_default.field,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: board_module_default.fieldLabel,
					children: t("new.permission")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
					className: board_module_default.select,
					value: permission,
					onChange: (event) => {
						controller.updateTask(task.id, { permission: event.target.value === "" ? void 0 : event.target.value });
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
						value: "",
						children: t("exec.permission.default")
					}), TASK_PERMISSIONS.map((id) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
						value: id,
						children: t(`exec.permission.${id}`)
					}, id))]
				})]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				className: board_module_default.field,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: board_module_default.fieldLabel,
					children: t("new.model")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
					className: board_module_default.select,
					value: modelKey,
					onChange: (event) => {
						const next = options.models.find((item) => `${item.provider}/${item.model}` === event.target.value);
						controller.updateTask(task.id, { modelSelection: next === void 0 ? void 0 : {
							provider: next.provider,
							model: next.model
						} });
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
							value: "",
							children: t("exec.model.default")
						}),
						!modelKnown && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
							value: modelKey,
							children: [modelKey, t("exec.model.removedSuffix")]
						}),
						options.models.map((model) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
							value: `${model.provider}/${model.model}`,
							children: [
								model.providerName,
								" / ",
								model.name
							]
						}, `${model.provider}/${model.model}`))
					]
				})]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				className: board_module_default.field,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: board_module_default.fieldLabel,
					children: t("new.reasoningEffort")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
					className: board_module_default.select,
					value: selectedEffort,
					disabled: selectedModel === void 0 || selectedModel.reasoning?.efforts.length === 0,
					onChange: (event) => {
						if (selectedModel === void 0) return;
						controller.updateTask(task.id, { modelSelection: {
							provider: selectedModel.provider,
							model: selectedModel.model,
							...event.target.value === "" ? {} : { reasoningEffort: event.target.value }
						} });
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
							value: "",
							children: selectedModel?.reasoning?.defaultEffort !== void 0 ? t("exec.effort.defaultWithValue", { value: selectedModel.reasoning.defaultEffort }) : t("exec.effort.default")
						}),
						!effortKnown && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
							value: selectedEffort,
							children: [selectedEffort, t("exec.effort.removedSuffix")]
						}),
						selectedModel?.reasoning?.efforts.map((effort) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
							value: effort.id,
							children: effort.name
						}, effort.id))
					]
				})]
			})
		]
	});
}
/** The scheduled-runs editor: enable toggle, cron input + presets, next-run info. */
function ScheduleSection({ controller, task }) {
	const schedule = task.schedule;
	const [cron, setCron] = (0, react.useState)(schedule?.cron ?? "0 9 * * *");
	const [enabled, setEnabled] = (0, react.useState)(schedule?.enabled ?? false);
	const [nextRunAt, setNextRunAt] = (0, react.useState)(schedule?.nextRunAt);
	const [lastTriggeredAt, setLastTriggeredAt] = (0, react.useState)(schedule?.lastTriggeredAt);
	const [error, setError] = (0, react.useState)(void 0);
	(0, react.useEffect)(() => {
		setCron(schedule?.cron ?? "0 9 * * *");
		setEnabled(schedule?.enabled ?? false);
		setNextRunAt(schedule?.nextRunAt);
		setLastTriggeredAt(schedule?.lastTriggeredAt);
		setError(void 0);
	}, [
		task.id,
		schedule?.enabled,
		schedule?.cron,
		schedule?.nextRunAt,
		schedule?.lastTriggeredAt
	]);
	/** Validate + persist the current cron text (Enter or blur). */
	const saveCron = (value) => {
		const trimmed = value.trim();
		setCron(trimmed);
		if (trimmed === "" || !isValidCron(trimmed)) {
			setError(t("detail.schedule.invalid"));
			return;
		}
		setError(void 0);
		controller.setSchedule(task.id, { cron: trimmed });
	};
	/** Arm/disarm the schedule (arming first persists the edited cron). */
	const toggleEnabled = (next) => {
		const trimmed = cron.trim();
		if (next && (trimmed === "" || !isValidCron(trimmed))) {
			setError(t("detail.schedule.invalid"));
			return;
		}
		setError(void 0);
		if (next && trimmed !== schedule?.cron) controller.setSchedule(task.id, { cron: trimmed });
		if (controller.setSchedule(task.id, { enabled: next })) setEnabled(next);
	};
	const applyPreset = (preset) => {
		if (preset === "") return;
		setCron(preset);
		setError(void 0);
		controller.setSchedule(task.id, { cron: preset });
	};
	const nextLabel = !enabled || nextRunAt === void 0 ? t("detail.schedule.notScheduled") : nextRunAt <= Date.now() ? t("detail.schedule.dueSoon") : new Date(nextRunAt).toLocaleString();
	const lastLabel = lastTriggeredAt === void 0 ? "—" : new Date(lastTriggeredAt).toLocaleString();
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
		className: board_module_default.detailSection,
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", { children: t("detail.schedule") }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				className: board_module_default.scheduleToggle,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					type: "checkbox",
					checked: enabled,
					onChange: (event) => {
						toggleEnabled(event.target.checked);
					}
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("detail.schedule.enable") })]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: board_module_default.scheduleRow,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					className: `${board_module_default.input} ${board_module_default.scheduleInput}${error !== void 0 ? ` ${board_module_default.scheduleInputInvalid}` : ""}`,
					value: cron,
					placeholder: "0 9 * * *",
					spellCheck: false,
					"aria-label": t("detail.schedule.cron"),
					onChange: (event) => {
						setCron(event.target.value);
						setError(void 0);
					},
					onBlur: () => {
						saveCron(cron);
					},
					onKeyDown: (event) => {
						if (event.key === "Enter") saveCron(cron);
					}
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
					className: board_module_default.schedulePreset,
					value: "",
					"aria-label": t("detail.schedule.presets"),
					onChange: (event) => {
						applyPreset(event.target.value);
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
						value: "",
						children: [t("detail.schedule.presets"), "…"]
					}), SCHEDULE_PRESETS.map((preset) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
						value: preset.cron,
						children: t(preset.label)
					}, preset.cron))]
				})]
			}),
			error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: board_module_default.formError,
				children: error
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
				className: board_module_default.scheduleMeta,
				children: [
					t("detail.schedule.nextRun"),
					" ",
					nextLabel,
					" · ",
					t("detail.schedule.lastTriggered"),
					" ",
					lastLabel
				]
			})
		]
	});
}
/** Task detail overlay. */
function TaskDetail({ controller, task }) {
	const [confirmDelete, setConfirmDelete] = (0, react.useState)(false);
	const running = task.status === "running";
	const [latest, setLatest] = (0, react.useState)(task);
	(0, react.useEffect)(() => {
		setLatest(task);
	}, [task]);
	const current = latest;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: board_module_default.modalBackdrop,
		onMouseDown: (event) => {
			if (event.target === event.currentTarget) controller.closeTask();
		},
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: board_module_default.detail,
			role: "dialog",
			"aria-label": t("detail.title"),
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
					className: board_module_default.detailHeader,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
							className: board_module_default.detailTitle,
							children: current.title
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: board_module_default.statusBadge,
							"data-status": current.status,
							children: t(STATUS_KEY[current.status])
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: board_module_default.iconButton,
							"aria-label": t("detail.close"),
							onClick: () => {
								controller.closeTask();
							},
							children: "×"
						})
					]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: board_module_default.detailBody,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
							className: board_module_default.detailSection,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", { children: t("detail.description") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: board_module_default.detailText,
								children: current.description !== "" ? current.description : "—"
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
							className: board_module_default.detailSection,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", { children: t("detail.prompt") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
								className: board_module_default.promptBlock,
								children: current.prompt !== "" ? current.prompt : current.title
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExecutionSettingsSection, {
							controller,
							task: current
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ScheduleSection, {
							controller,
							task: current
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
							className: board_module_default.detailSection,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", { children: t("detail.execution") }), current.executions.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: board_module_default.detailText,
								children: t("detail.noExecution")
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
								className: board_module_default.executionList,
								children: [...current.executions].reverse().map((execution) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExecutionRow, {
									execution,
									onOpen: (sessionId) => {
										controller.openSession(sessionId);
									}
								}, execution.id))
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
							className: board_module_default.detailSection,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", { children: t("board.status") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: board_module_default.moveRow,
								children: MANUAL_STATUSES.map((status) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: board_module_default.ghostButton,
									disabled: current.status === status || running,
									onClick: () => {
										controller.moveTask(current.id, status);
									},
									children: t(`status.move.${status}`)
								}, status))
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("footer", {
					className: board_module_default.detailFooter,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: board_module_default.primaryButton,
							disabled: running,
							onClick: () => {
								controller.closeTask();
								controller.rerunTask(current.id);
							},
							children: current.executions.length === 0 ? t("detail.run") : t("detail.rerun")
						}),
						current.archivedAt !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: board_module_default.primaryButton,
							onClick: () => {
								controller.restoreTask(current.id);
								controller.closeTask();
							},
							children: t("detail.restore")
						}) : (current.status === "done" || current.status === "failed") && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: board_module_default.ghostButton,
							onClick: () => {
								controller.archiveTask(current.id);
								controller.closeTask();
							},
							children: t("detail.archive")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: board_module_default.dangerButton,
							onClick: () => {
								setConfirmDelete(true);
							},
							children: t("detail.delete")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: board_module_default.detailMeta,
							children: [
								t("board.created"),
								" ",
								formatTime(current.createdAt),
								current.archivedAt !== void 0 && ` · ${t("detail.archivedAt", { time: formatTime(current.archivedAt) })}`
							]
						})
					]
				})
			]
		}), confirmDelete && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConfirmDialog, {
			title: t("delete.title"),
			message: t("delete.confirm", { name: current.title }),
			confirmLabel: t("delete.ok"),
			danger: true,
			onCancel: () => {
				setConfirmDelete(false);
			},
			onConfirm: () => {
				setConfirmDelete(false);
				controller.deleteTask(current.id);
				controller.closeTask();
			}
		})]
	});
}
//#endregion
//#region src/client/board/TaskBoard.tsx
/**
* Board view: the multi-column kanban that replaces the middle column while
* active. Cards open the task detail (never execute directly); the header
* offers filter, new-task, and a back-to-chat escape.
*/
/** Case-insensitive title/description match. */
function matchesFilter(task, filter) {
	if (filter.trim() === "") return true;
	const needle = filter.trim().toLowerCase();
	return task.title.toLowerCase().includes(needle) || task.description.toLowerCase().includes(needle);
}
/**
* Memoized per-card adapter: with a stable `onOpen` from the board and an
* immutable task record (only the changed card gets a new object ref), a card
* re-renders only when its own task changes — not when a sibling card status,
* the filter, or the selection moves.
*/
const MemoTaskCard = (0, react.memo)(function MemoTaskCard({ task, onOpen }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TaskCard, {
		task,
		onClick: (0, react.useCallback)(() => {
			onOpen(task.id);
		}, [task.id, onOpen])
	});
});
/** Board component; subscribes to the controller snapshot. */
function TaskBoard({ controller }) {
	const [snapshot, setSnapshot] = (0, react.useState)(controller.getSnapshot());
	(0, react.useEffect)(() => controller.subscribe(() => setSnapshot(controller.getSnapshot())), [controller]);
	const [filter, setFilter] = (0, react.useState)("");
	const [showNew, setShowNew] = (0, react.useState)(false);
	const selected = selectedTaskOf(snapshot);
	const archiveView = snapshot.archiveView;
	const visible = snapshot.tasks.filter((task) => (archiveView ? task.archivedAt !== void 0 : task.archivedAt === void 0) && matchesFilter(task, filter));
	const openTask = (0, react.useCallback)((id) => {
		controller.openTask(id);
	}, [controller]);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: board_module_default.board,
		"data-dsh-taskboard-board": "",
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
				className: board_module_default.boardHeader,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: `${board_module_default.ghostButton} ${board_module_default.backButton}`,
						"aria-label": t("board.close"),
						onClick: () => {
							controller.closeBoard();
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							"aria-hidden": "true",
							children: "‹"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("board.close") })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
						className: board_module_default.boardTitle,
						children: t("board.title")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						className: board_module_default.search,
						type: "search",
						placeholder: t("board.search"),
						value: filter,
						onChange: (event) => {
							setFilter(event.target.value);
						},
						"aria-label": t("board.search")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: archiveView ? board_module_default.primaryButton : board_module_default.ghostButton,
						onClick: () => {
							controller.toggleArchiveView();
						},
						children: archiveView ? t("board.backToBoard") : t("board.archiveView", { count: String(snapshot.tasks.filter((task) => task.archivedAt !== void 0).length) })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: board_module_default.primaryButton,
						onClick: () => {
							setShowNew(true);
						},
						children: ["+ ", t("board.new")]
					})
				]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: board_module_default.columns,
				children: archiveView ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					className: board_module_default.column,
					"data-status": "archived",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						className: board_module_default.columnHeader,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
							className: board_module_default.columnTitle,
							children: t("board.archive")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: board_module_default.columnCount,
							children: visible.length
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: board_module_default.cards,
						children: [visible.map((task) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MemoTaskCard, {
							task,
							onOpen: openTask
						}, task.id)), visible.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: board_module_default.columnEmpty,
							children: t("archive.empty")
						})]
					})]
				}) : COLUMNS.map((column) => {
					const tasks = visible.filter((task) => task.status === column.status);
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: board_module_default.column,
						"data-status": column.status,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
							className: board_module_default.columnHeader,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: board_module_default.statusDot,
									"data-status": column.status,
									"aria-hidden": "true"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
									className: board_module_default.columnTitle,
									children: t(STATUS_KEY[column.status])
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: board_module_default.columnCount,
									children: tasks.length
								})
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: board_module_default.cards,
							children: [tasks.map((task) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MemoTaskCard, {
								task,
								onOpen: openTask
							}, task.id)), tasks.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: board_module_default.columnEmpty,
								children: t("board.empty")
							})]
						})]
					}, column.status);
				})
			}),
			selected !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TaskDetail, {
				controller,
				task: selected
			}),
			showNew && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NewTaskModal, {
				controller,
				onClose: () => {
					setShowNew(false);
				}
			})
		]
	});
}
//#endregion
//#region src/client/board-mount.tsx
/**
* Board view mounting.
*
* The `conversation` slot is single-occupant (ui-conversation) and external
* plugins cannot declare slots, so the board takes over the center column at
* the DOM level: a container is appended inside the center column
* (`[class*="centerCol"]`, the dsh 0.1.0-rc.6 AppFrame layout; previously
* `[data-pane="conversation"]` on older shells — the mount selector keeps both)
* as an extra trailing child
* React never manages, and a stylesheet
* rule hides the conversation content while the board is active. Toggling is
* a data attribute on <html> — no React involvement, so the conversation
* subtree underneath stays mounted and stateful.
*/
const CONVERSATION_COLUMN_SELECTOR = "[data-pane=\"conversation\"], [class*=\"centerCol\"]";
const ACTIVE_ATTR = "data-dsh-taskboard-active";
/** The sibling panel's activation attribute (ssh), removed when this panel opens. */
const OTHER_ACTIVE_ATTR = "data-dsh-ssh-active";
/** Cross-plugin activation event; detail is the activating panel name. */
const ACTIVATE_EVENT = "dsh-panel-activate";
const PANEL_NAME = "taskboard";
/** Find the center column, or undefined while the frame is not mounted. */
function conversationColumn() {
	return document.querySelector(CONVERSATION_COLUMN_SELECTOR) ?? void 0;
}
/**
* Mount the board React tree into the center column and bind its visibility
* to the controller's boardOpen state.
* @param controller - the board controller driving the view.
* @returns disposer unmounting the tree and restoring the column.
*/
function mountBoard(controller) {
	let root;
	let container;
	const ensure = () => {
		if (container !== void 0) return;
		const column = conversationColumn();
		if (column === void 0) return;
		container = document.createElement("div");
		container.dataset.dshTaskboardView = "";
		container.className = board_module_default.boardView;
		column.appendChild(container);
		root = (0, react_dom_client.createRoot)(container);
		root.render(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TaskBoard, { controller }));
	};
	const waitObserver = new MutationObserver(() => {
		ensure();
	});
	waitObserver.observe(document.body, {
		childList: true,
		subtree: true
	});
	const applyActive = () => {
		if (controller.getSnapshot().boardOpen) {
			document.documentElement.removeAttribute(OTHER_ACTIVE_ATTR);
			document.documentElement.setAttribute(ACTIVE_ATTR, "");
			document.dispatchEvent(new CustomEvent(ACTIVATE_EVENT, { detail: PANEL_NAME }));
		} else document.documentElement.removeAttribute(ACTIVE_ATTR);
	};
	const onOtherActivate = (event) => {
		if (event.detail === "ssh" && controller.getSnapshot().boardOpen) controller.closeBoard();
	};
	const SIDEBAR_ROW_SELECTOR = "[class*=\"sessionRow\"], [class*=\"projectRow\"], [class*=\"searchResultRow\"], [class*=\"searchResultWorkspace\"], [class*=\"newSession\"]";
	const onClickSidebarRow = (event) => {
		if (!controller.getSnapshot().boardOpen) return;
		const target = event.target;
		if (target === null) return;
		if (target.closest(SIDEBAR_ROW_SELECTOR) !== null) controller.closeBoard();
	};
	document.addEventListener("click", onClickSidebarRow, true);
	document.addEventListener(ACTIVATE_EVENT, onOtherActivate);
	const unsubscribe = controller.subscribe(applyActive);
	applyActive();
	ensure();
	return () => {
		document.removeEventListener("click", onClickSidebarRow, true);
		document.removeEventListener(ACTIVATE_EVENT, onOtherActivate);
		waitObserver.disconnect();
		unsubscribe();
		document.documentElement.removeAttribute(ACTIVE_ATTR);
		root?.unmount();
		root = void 0;
		container?.remove();
		container = void 0;
	};
}
//#endregion
//#region src/client/sidebar-entry.ts
/** Inline icon (matches the shell's 16px nav-icon look). */
const ICON = `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2.5" width="12" height="11" rx="1.5"/><path d="M2 6.5h12M6.5 6.5v7"/></svg>`;
/** Find the sidebar shell root element, or undefined while not yet mounted. */
function sidebarRoot() {
	const column = document.querySelector("[data-pane=\"sidebar\"], [class*=\"sidebarCol\"]");
	if (column === null) return void 0;
	return column.querySelector("[class*=\"logoRow\"]")?.parentElement ?? column.firstElementChild;
}
/** The New Session button: nested in the logo row on current shells, a direct child on legacy shells. */
function newSessionButton(root) {
	const nested = root.querySelector("button[class*=\"newSession\"]");
	if (nested !== null) return nested;
	for (const child of root.children) if (child.tagName === "BUTTON") return child;
}
/** Build the entry row (a detached button; insert once the shell is up). */
function createEntry(controller) {
	const entry = document.createElement("button");
	entry.type = "button";
	entry.dataset.dshTaskboardEntry = "";
	entry.className = board_module_default.entry;
	entry.setAttribute("aria-label", t("entry.label"));
	entry.innerHTML = `<span class="${board_module_default.entryIcon}">${ICON}</span><span class="${board_module_default.entryLabel}">${t("entry.label")}</span>`;
	entry.addEventListener("click", () => {
		controller.toggleBoard();
	});
	return entry;
}
/** Re-insert the entry after the New Session row (before the browser region). */
function placeEntry(root, entry) {
	const button = newSessionButton(root);
	if (button === void 0) return false;
	if (entry.parentElement !== root) {
		const row = button.closest("[class*=\"logoRow\"]");
		const base = row !== null && row.parentElement === root ? row : button;
		const family = Array.from(root.children).filter((el) => el instanceof HTMLElement && el.matches("[data-dsh-taskboard-entry], [data-dsh-ssh-entry]"));
		const anchor = family.length > 0 ? family[0] : base.nextElementSibling;
		root.insertBefore(entry, anchor);
	}
	return true;
}
/**
* Mount the sidebar entry, waiting for the shell to render and self-healing
* on later React re-renders.
* @param controller - the board controller the entry toggles.
* @returns disposer removing the entry and its observers.
*/
function mountSidebarEntry(controller) {
	if (typeof document !== "undefined" && document.querySelector("[data-dsh-taskboard-entry]") !== null) return () => {};
	const entry = createEntry(controller);
	let root;
	let placed = false;
	const tryPlace = () => {
		if (root !== void 0 && !root.isConnected) {
			rootObserver.disconnect();
			root = void 0;
			placed = false;
		}
		if (placed) {
			if (document.body.contains(entry)) return;
			rootObserver.disconnect();
			root = void 0;
			placed = false;
		}
		root ??= sidebarRoot();
		if (root === void 0) return;
		placed = placeEntry(root, entry);
		if (placed) rootObserver.observe(root, {
			childList: true,
			subtree: true
		});
	};
	const waitObserver = new MutationObserver(() => {
		tryPlace();
	});
	waitObserver.observe(document.body, {
		childList: true,
		subtree: true
	});
	const rootObserver = new MutationObserver(() => {
		if (root === void 0 || !root.isConnected) {
			placed = false;
			tryPlace();
			return;
		}
		if (!root.contains(entry)) placed = placeEntry(root, entry);
	});
	const syncActive = () => {
		if (controller.getSnapshot().boardOpen) entry.dataset.active = "true";
		else delete entry.dataset.active;
	};
	const syncCopy = () => {
		const label = t("entry.label");
		entry.setAttribute("aria-label", label);
		const labelNode = entry.querySelector(`.${board_module_default.entryLabel}`);
		if (labelNode !== null) labelNode.textContent = label;
	};
	const unsubscribe = controller.subscribe(() => {
		syncActive();
		syncCopy();
	});
	syncActive();
	syncCopy();
	tryPlace();
	return () => {
		waitObserver.disconnect();
		rootObserver.disconnect();
		unsubscribe();
		entry.remove();
	};
}
//#endregion
//#region src/client/settings-card.module.css
var settings_card_module_default = {
	"badge": "I6HMua_badge",
	"badges": "I6HMua_badges",
	"body": "I6HMua_body",
	"card": "I6HMua_card",
	"cardOpen": "I6HMua_cardOpen",
	"chevron": "I6HMua_chevron",
	"chevronOpen": "I6HMua_chevronOpen",
	"description": "I6HMua_description",
	"discard": "I6HMua_discard",
	"failed": "I6HMua_failed",
	"field": "I6HMua_field",
	"footer": "I6HMua_footer",
	"head": "I6HMua_head",
	"header": "I6HMua_header",
	"headerStatic": "I6HMua_headerStatic",
	"headText": "I6HMua_headText",
	"hint": "I6HMua_hint",
	"input": "I6HMua_input",
	"inputInvalid": "I6HMua_inputInvalid",
	"invalid": "I6HMua_invalid",
	"label": "I6HMua_label",
	"name": "I6HMua_name",
	"notExposed": "I6HMua_notExposed",
	"pending": "I6HMua_pending",
	"readOnly": "I6HMua_readOnly",
	"reset": "I6HMua_reset",
	"save": "I6HMua_save",
	"select": "I6HMua_select"
};
//#endregion
//#region src/client/PluginSettingsCard.tsx
/**
* Family-shared chrome for plugin settings cards: a disclosure header naming
* the plugin and what its settings govern, the controls inside, and the save
* that writes them. Renders nothing while the namespace is unavailable — a
* deployment that does not compose the owning plugin should show no trace of
* it. Inlined into each consumer's client bundle; mirrors the official
* ui-plugin-config PluginCard in a self-contained slice.
*/
/**
* Render one plugin settings card.
* @param props - the plugin's copy keys, its form state, and its controls.
* @returns the card, or nothing while the namespace is still loading.
*/
function PluginSettingsCard(props) {
	const [open, setOpen] = (0, react.useState)(props.defaultOpen ?? true);
	const { state, alwaysOpen } = props;
	if (!state.available) return null;
	const title = props.t(props.titleKey);
	const description = props.t(props.descriptionKey);
	const blocked = !state.dirty || state.invalid || state.saving;
	const expanded = alwaysOpen === true || open;
	const cardClass = expanded ? `${settings_card_module_default.cardOpen} ${settings_card_module_default.card}` : settings_card_module_default.card;
	const header = alwaysOpen === true ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: settings_card_module_default.headerStatic,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
			className: settings_card_module_default.headText,
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: settings_card_module_default.name,
				title,
				children: title
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: settings_card_module_default.description,
				title: description,
				children: description
			})]
		}), state.dirty ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
			className: settings_card_module_default.pending,
			title: props.t("settings.unsaved"),
			children: props.t("settings.unsaved")
		}) : null]
	}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
		type: "button",
		className: settings_card_module_default.header,
		"aria-expanded": open,
		"aria-label": `${props.t(open ? "settings.collapse" : "settings.expand")}: ${title}`,
		onClick: () => {
			setOpen(!open);
		},
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: settings_card_module_default.headText,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: settings_card_module_default.name,
					title,
					children: title
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: settings_card_module_default.description,
					title: description,
					children: description
				})]
			}),
			state.dirty ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: settings_card_module_default.pending,
				title: props.t("settings.unsaved"),
				children: props.t("settings.unsaved")
			}) : null,
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				width: "14",
				height: "14",
				viewBox: "0 0 14 14",
				fill: "none",
				xmlns: "http://www.w3.org/2000/svg",
				className: open ? `${settings_card_module_default.chevron} ${settings_card_module_default.chevronOpen}` : settings_card_module_default.chevron,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M11.8486 5.5L11.4238 5.92383L8.69727 8.65137C8.44157 8.90706 8.21562 9.13382 8.01172 9.29785C7.79912 9.46883 7.55595 9.61756 7.25 9.66602C7.08435 9.69222 6.91565 9.69222 6.75 9.66602C6.44405 9.61756 6.20088 9.46883 5.98828 9.29785C5.78438 9.13382 5.55843 8.90706 5.30273 8.65137L2.57617 5.92383L2.15137 5.5L3 4.65137L3.42383 5.07617L6.15137 7.80273C6.42595 8.07732 6.59876 8.24849 6.74023 8.3623C6.87291 8.46904 6.92272 8.47813 6.9375 8.48047C6.97895 8.48703 7.02105 8.48703 7.0625 8.48047C7.07728 8.47813 7.12709 8.46904 7.25977 8.3623C7.40124 8.24849 7.57405 8.07732 7.84863 7.80273L10.5762 5.07617L11 4.65137L11.8486 5.5Z",
					fill: "currentColor"
				})
			})
		]
	});
	if (!state.exposed) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
		className: cardClass,
		children: [header, expanded ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			className: settings_card_module_default.body,
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: settings_card_module_default.notExposed,
				role: "status",
				children: props.t("settings.notExposed")
			})
		}) : null]
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
		className: cardClass,
		children: [header, expanded ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: settings_card_module_default.body,
			children: [
				!state.writable ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: settings_card_module_default.readOnly,
					role: "status",
					children: props.t("settings.readOnly")
				}) : null,
				props.children,
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: settings_card_module_default.footer,
					children: [
						state.failed ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
							className: settings_card_module_default.failed,
							role: "status",
							children: [props.t("settings.saveFailed"), state.failedReason ? " - " + state.failedReason : ""]
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: settings_card_module_default.discard,
							disabled: !state.dirty || state.saving,
							onClick: props.onDiscard,
							children: props.t("settings.discard")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: settings_card_module_default.save,
							disabled: blocked,
							onClick: props.onSave,
							children: props.t(!state.saving ? "settings.save" : "settings.saving")
						})
					]
				})
			]
		}) : null]
	});
}
/** A staged boolean field: 继承 / 开 / 关. */
function BooleanField(props) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: settings_card_module_default.field,
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: settings_card_module_default.head,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
					className: settings_card_module_default.label,
					htmlFor: props.id,
					children: props.label
				}), props.overridden ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: settings_card_module_default.badges,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: settings_card_module_default.badge,
						children: props.overriddenLabel
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: settings_card_module_default.reset,
						disabled: props.disabled,
						onClick: props.onReset,
						children: props.resetLabel
					})]
				}) : null]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
				id: props.id,
				className: settings_card_module_default.select,
				value: props.text,
				disabled: props.disabled,
				onChange: (event) => {
					props.onEdit(event.target.value);
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
						value: "",
						children: props.inheritLabel
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
						value: "true",
						children: props.onLabel
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
						value: "false",
						children: props.offLabel
					})
				]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: settings_card_module_default.hint,
				children: props.hint
			})
		]
	});
}
//#endregion
//#region src/client/settings-form.ts
/** A boolean field, edited through true/false draft text. */
function booleanField(field) {
	return {
		field,
		format: (value) => typeof value === "boolean" ? String(value) : "",
		parse: (text) => {
			const trimmed = text.trim();
			if (trimmed === "") return { kind: "clear" };
			if (trimmed === "true") return {
				kind: "set",
				value: true
			};
			if (trimmed === "false") return {
				kind: "set",
				value: false
			};
		}
	};
}
/**
* Stages one card's edits over one settings namespace and writes them on save.
*
* The Host is the only authority on whether a value was accepted — its
* validators own the constraints no schema can express — so the outcome is
* read back from the section rather than predicted here. A save that did not
* land keeps its drafts, so the user can correct them instead of retyping.
*/
var CardForm = class {
	scope;
	specs;
	staged = /* @__PURE__ */ new Map();
	listeners = /* @__PURE__ */ new Set();
	/** The scope subscription installed in the constructor; released by dispose(). */
	disposeScope;
	disposed = false;
	saving = false;
	failed = false;
	failedReason;
	/** @param scope - the bound settings scope for this card's namespace. */
	constructor(scope, specs) {
		this.scope = scope;
		this.specs = new Map(specs.map((spec) => [spec.field, spec]));
		this.disposeScope = scope.subscribe(() => {
			this.publish();
		});
	}
	/**
	* Release the scope subscription and every bound store listener. The card
	* must call this on teardown; later calls are no-ops.
	*/
	dispose() {
		if (this.disposed) return;
		this.disposed = true;
		this.disposeScope();
		this.listeners.clear();
	}
	/** Publish a projection of this form, rebuilt whenever the scope or a draft changes. */
	bind(project) {
		const store = (0, _deepseek_ai_dsh_client_runtime_client.createSnapshotStore)(project());
		this.listeners.add(() => {
			store.set(project());
		});
		return store;
	}
	/** Read the card-level state: what the Host serves, and what a save would do. */
	shell() {
		const snapshot = this.scope.getSnapshot();
		const plan = this.plan();
		return {
			available: snapshot.status !== "loading",
			exposed: snapshot.status === "ready",
			writable: snapshot.writable,
			dirty: plan.length > 0,
			invalid: plan.some((item) => item.run === void 0),
			saving: this.saving,
			failed: this.failed,
			...this.failedReason === void 0 ? {} : { failedReason: this.failedReason }
		};
	}
	/** Read one field's state from the effective section and its staged draft. */
	field(field) {
		const spec = this.specOf(field);
		const staged = this.staged.get(field);
		if (staged === void 0) return {
			text: spec.format(this.sectionValue(field)),
			overridden: this.stored(field),
			invalid: false
		};
		const write = staged.clear ? { kind: "clear" } : spec.parse(staged.text);
		return {
			text: staged.text,
			overridden: write?.kind === "set",
			invalid: write === void 0
		};
	}
	/** The actions the card's slot registration injects. */
	actions() {
		return {
			edit: (field, text) => {
				this.stage(field, {
					text,
					clear: false
				});
			},
			resetField: (field) => {
				this.stage(field, {
					text: this.specOf(field).format(this.baseValue(field)),
					clear: true
				});
			},
			save: () => {
				this.save();
			},
			discard: () => {
				if (this.staged.size === 0 && !this.failed) return;
				this.staged.clear();
				this.failed = false;
				this.failedReason = void 0;
				this.publish();
			}
		};
	}
	/**
	* Write every staged edit, then re-seed from what the Host accepted.
	*
	* When the scope carries the optional batch surface (the dsh-web-ui
	* bridge scope), every planned write rides one mutation so cross-field
	* validate hooks (baseURL+model) judge the batch as a unit instead of
	* deadlocking on per-field writes. Otherwise the per-field loop runs.
	* A field lands only when the Host reports it held the staged value; a
	* landed field's draft is dropped, a failed one stays staged for the user.
	* @returns settlement after every write and the read-back.
	*/
	async save() {
		const plan = this.plan();
		const valid = plan.filter((item) => item.run !== void 0);
		if (plan.length === 0 || this.saving || valid.length !== plan.length) return;
		const plannedWrites = valid.map((item) => item.op);
		const fields = new Set(plan.map((item) => item.field));
		this.saving = true;
		this.failed = false;
		this.failedReason = void 0;
		this.publish();
		const landed = /* @__PURE__ */ new Set();
		const batch = this.batchedScope();
		if (batch !== void 0) {
			const result = await batch.mutate(plannedWrites);
			if (result.ok) {
				for (const field of result.fields) if (field.landed) landed.add(field.field);
			} else this.failedReason = result.message;
		} else for (const item of valid) if (await item.run()) landed.add(item.field);
		for (const field of fields) if (landed.has(field)) this.staged.delete(field);
		this.saving = false;
		this.failed = landed.size !== fields.size;
		this.publish();
	}
	/** The scope's batch surface when it supports one; undefined conservatively otherwise. */
	batchedScope() {
		const candidate = this.scope;
		return typeof candidate?.mutate === "function" ? candidate : void 0;
	}
	/**
	* Every staged edit a save would write. An entry whose draft is not a value
	* its field accepts carries no write: the form is still dirty, and the save
	* refuses rather than dropping the edit. A staged edit that matches the
	* effective section is not a write at all.
	* @returns the planned writes, in the order the fields were staged.
	*/
	plan() {
		const plan = [];
		for (const [field, staged] of this.staged) {
			const spec = this.specOf(field);
			if (staged.clear) {
				if (this.stored(field)) plan.push({
					field,
					op: {
						field,
						op: "unset"
					},
					run: () => this.clear(field)
				});
				continue;
			}
			if (staged.text === spec.format(this.sectionValue(field))) continue;
			const write = spec.parse(staged.text);
			if (write === void 0) plan.push({
				field,
				op: {
					field,
					op: "unset"
				},
				run: void 0
			});
			else if (write.kind === "clear") plan.push({
				field,
				op: {
					field,
					op: "unset"
				},
				run: () => this.clear(field)
			});
			else plan.push({
				field,
				op: {
					field,
					op: "set",
					value: write.value
				},
				run: () => this.store(field, write.value)
			});
		}
		return plan;
	}
	async clear(field) {
		await this.scope.unset(field);
		return !this.stored(field);
	}
	async store(field, value) {
		await this.scope.set(field, value);
		if (this.specOf(field).secret) return true;
		return this.userLayer()?.[field] === value;
	}
	stage(field, edit) {
		this.staged.set(field, edit);
		this.failed = false;
		this.failedReason = void 0;
		this.publish();
	}
	specOf(field) {
		const spec = this.specs.get(field);
		if (spec === void 0) throw new Error(`settings card has no field ${field}`);
		return spec;
	}
	snapshotOf() {
		return this.scope.getSnapshot();
	}
	sectionValue(field) {
		return this.snapshotOf().value?.[field];
	}
	baseValue(field) {
		return this.snapshotOf().base?.[field];
	}
	userLayer() {
		return this.snapshotOf().user;
	}
	stored(field) {
		const user = this.userLayer();
		return user !== void 0 && Object.hasOwn(user, field);
	}
	publish() {
		for (const listener of this.listeners) listener();
	}
};
//#endregion
//#region src/client/TaskBoardSettingsCard.tsx
/** Bridges the `task-board` scope onto the card's staged form. */
var TaskBoardSettingsCardController = class {
	form;
	store;
	/** @param scope - the bound settings scope for the `task-board` namespace. */
	constructor(scope) {
		this.form = new CardForm(scope, [booleanField("enabled"), booleanField("announceToAgent")]);
		this.store = this.form.bind(() => this.projection());
	}
	projection() {
		return {
			...this.form.shell(),
			enabled: this.form.field("enabled"),
			announceToAgent: this.form.field("announceToAgent")
		};
	}
	/**
	* Build the face the card's slot registration injects.
	* @returns the card's snapshot and its form actions.
	*/
	inject() {
		return {
			hooks: { taskBoardSettingsCard: this.store },
			...this.form.actions()
		};
	}
	/**
	* Release the card's scope subscription and bound stores; the slot
	* disposer calls this on teardown.
	*/
	dispose() {
		this.form.dispose();
	}
};
/**
* Render the task-board card.
* @param props - locale copy, the card snapshot, and its form actions.
* @returns the card.
*/
function TaskBoardSettingsCard(props) {
	const { t } = props;
	const state = props.useTaskBoardSettingsCard((snapshot) => snapshot);
	const disabled = !state.writable;
	const fieldProps = {
		overriddenLabel: t("settings.overridden"),
		resetLabel: t("settings.reset"),
		invalidLabel: t("settings.invalidNumber"),
		disabled
	};
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(PluginSettingsCard, {
		t,
		titleKey: "settings.title",
		descriptionKey: "settings.description",
		state,
		onSave: props.save,
		onDiscard: props.discard,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BooleanField, {
			id: "settings-task-board-enabled",
			label: t("settings.enabled"),
			hint: t("settings.enabledHint"),
			inheritLabel: t("settings.inherit"),
			onLabel: t("settings.on"),
			offLabel: t("settings.off"),
			...fieldProps,
			...state.enabled,
			onEdit: (text) => {
				props.edit("enabled", text);
			},
			onReset: () => {
				props.resetField("enabled");
			}
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BooleanField, {
			id: "settings-task-board-announce",
			label: t("settings.announceToAgent"),
			hint: t("settings.announceToAgentHint"),
			inheritLabel: t("settings.inherit"),
			onLabel: t("settings.on"),
			offLabel: t("settings.off"),
			...fieldProps,
			...state.announceToAgent,
			onEdit: (text) => {
				props.edit("announceToAgent", text);
			},
			onReset: () => {
				props.resetField("announceToAgent");
			}
		})]
	});
}
//#endregion
//#region src/client/index.ts
/** Locale namespace this plugin owns. */
const NS = "task-board";
/** Settings namespace the settings card edits (the Host plugin registers it). */
const TASK_BOARD_NS = "task-board";
/** Required services (fiber inject waiting — the runtime must be up first). */
const inject = [
	"slots",
	"sessions",
	"workspaces",
	"connection",
	"settingsScope",
	"locale",
	"remote"
];
/**
* Mount the task board.
* @param ctx - client root context (services: sessions, workspaces).
*/
function apply(ctx) {
	if (!claimTaskboardApply()) return;
	ctx.effect(() => releaseTaskboardApply, "task-board: apply claim");
	ctx.effect(() => ctx.locale.register(NS, {
		zh,
		en
	}), "task-board: dictionaries");
	const settingsScope = (ctx.get("webUiSettings") ?? ctx.settingsScope).bind({ namespace: TASK_BOARD_NS });
	const settingsCard = new TaskBoardSettingsCardController(settingsScope);
	ctx.slots.inject("web-ui.plugin.item", () => {
		const unregister = ctx.slots.register({
			name: "web-ui.plugin.item",
			id: "task-board",
			order: 110,
			locale: NS,
			inject: () => settingsCard.inject()
		}, TaskBoardSettingsCard);
		return () => {
			settingsCard.dispose();
			unregister();
		};
	});
	let uiDisposer;
	const mountUi = () => {
		if (uiDisposer !== void 0) return;
		const sessions = ctx.sessions;
		const workspaces = ctx.workspaces;
		const connection = ctx.get("connection");
		const controller = new BoardController({
			store: new LocalStorageTaskStore(),
			exec: new ExecutionService({
				sessions: {
					list: sessions.list,
					create: async ({ workspaceId }) => {
						const response = await connection.api.sessions.create({ workspaceId });
						if (!response.result.ok) throw new Error(`${response.result.error.code}: ${response.result.error.message}`);
						return response.result.value.sessionId;
					},
					binding: (id) => {
						const binding = sessions.binding(id);
						if (binding === void 0) return void 0;
						const { session } = binding;
						return { session: {
							rename: (title) => session.rename(title),
							prompt: (content, mode) => session.prompt(content, mode).then((result) => result.ok ? { ok: true } : {
								ok: false,
								error: result.error
							}),
							command: (line) => session.command(line).then((result) => result.ok ? {
								ok: true,
								matched: result.value.matched
							} : {
								ok: false,
								error: result.error
							}),
							getSnapshot: () => session.getSnapshot(),
							subscribe: (fn) => session.subscribe(fn)
						} };
					},
					noteAgentPreset: (sessionId, agentPreset) => sessions.noteAgentPreset(sessionId, agentPreset)
				},
				workspaces: {
					list: workspaces.list,
					connectWorkspace: (id) => workspaces.connectWorkspace(id)
				},
				presets: { select: async (sessionId, agentPreset) => {
					try {
						const response = await connection.api.agentPresets.select({
							sessionId,
							agentPreset
						});
						return response.result.ok ? { ok: true } : {
							ok: false,
							error: response.result.error
						};
					} catch (error) {
						return {
							ok: false,
							error
						};
					}
				} },
				models: { select: async (sessionId, selection) => {
					try {
						const response = await connection.api.sessions.selectModel({
							sessionId,
							provider: selection.provider,
							model: selection.model,
							...selection.reasoningEffort === void 0 ? {} : { reasoningEffort: selection.reasoningEffort }
						});
						return response.result.ok ? { ok: true } : {
							ok: false,
							error: response.result.error
						};
					} catch (error) {
						return {
							ok: false,
							error
						};
					}
				} },
				history: { loadTail: async (sessionId) => {
					const response = await connection.api.sessions.history({
						sessionId,
						maxMessages: 20
					});
					return response.result.ok ? { events: response.result.value.events.map((entry) => entry.event) } : void 0;
				} }
			}),
			sessions: {
				list: sessions.list,
				open: (id) => sessions.open(id)
			}
		});
		controller.start();
		const scheduler = new SchedulerService({
			tasks: () => controller.getSnapshot().tasks,
			refresh: () => controller.reloadFromStore(),
			now: () => Date.now(),
			runTask: (id) => controller.runTask(id),
			applySchedule: (id, nextRunAt, lastTriggeredAt) => controller.applyScheduleNextRun(id, nextRunAt, lastTriggeredAt),
			ready: () => sessions.list.getSnapshot().phase === "ready",
			environment: {
				addEventListener: (type, listener) => document.addEventListener(type, listener),
				removeEventListener: (type, listener) => document.removeEventListener(type, listener)
			}
		});
		scheduler.start();
		const disposers = [];
		const syncLocale = () => {
			setTaskBoardLocale(ctx.locale.getLocale().active);
			controller.refresh();
		};
		syncLocale();
		disposers.push(ctx.locale.subscribe(syncLocale));
		const pushWorkspaceOptions = () => {
			const snapshot = workspaces.list.getSnapshot();
			controller.setExecutionOptions({ workspaces: snapshot.items.map((item) => ({
				workspaceId: item.workspaceId,
				title: item.title !== "" ? item.title : item.path
			})) });
		};
		pushWorkspaceOptions();
		disposers.push(workspaces.list.subscribe(pushWorkspaceOptions));
		const pushPresetOptions = async () => {
			try {
				const response = await connection.api.agentPresets.list({});
				if (!response.result.ok) return;
				controller.setExecutionOptions({ presets: response.result.value.presets.map((preset) => ({
					id: preset.id,
					name: preset.name,
					description: preset.description,
					broken: preset.broken,
					isDefault: preset.isDefault
				})) });
			} catch (error) {
				console.error("[dsh-task-board] agent preset roster read failed", error);
			}
		};
		pushPresetOptions();
		const pushModelOptions = async () => {
			try {
				const response = await connection.api.llm.models({});
				if (!response.result.ok) return;
				controller.setExecutionOptions({ models: response.result.value.groups.flatMap((group) => group.models.map((model) => ({
					provider: group.id,
					providerName: group.name,
					model: model.id,
					name: model.name,
					description: model.description,
					reasoning: model.reasoning === void 0 ? void 0 : {
						defaultEffort: model.reasoning.defaultEffort,
						efforts: model.reasoning.efforts.map((effort) => ({
							id: effort.id,
							name: effort.name,
							description: effort.description
						}))
					}
				}))) });
			} catch (error) {
				console.error("[dsh-task-board-model] model catalog read failed", error);
			}
		};
		pushModelOptions();
		ctx.remote.$on("llm/adapters-updated", () => {
			pushModelOptions();
		});
		ctx.remote.$on("settings/document-updated", () => {
			pushModelOptions();
		});
		disposers.push(ctx.on("connection/reset", () => {
			pushPresetOptions();
			pushModelOptions();
		}));
		try {
			disposers.push(mountSidebarEntry(controller));
			disposers.push(mountBoard(controller));
		} catch (error) {
			console.error("[dsh-task-board] mount failed:", error);
		}
		uiDisposer = () => {
			for (const dispose of disposers.splice(0)) dispose();
			scheduler.dispose();
			controller.dispose();
			uiDisposer = void 0;
		};
	};
	const syncEnabled = () => {
		const snapshot = settingsScope.getSnapshot();
		if (snapshot.status === "ready" ? snapshot.value?.enabled ?? true : snapshot.status === "unavailable") mountUi();
		else uiDisposer?.();
	};
	settingsScope.subscribe(syncEnabled);
	syncEnabled();
}
//#endregion
exports.apply = apply;
exports.inject = inject;

return module.exports; }});
//# sourceMappingURL=client.js.map