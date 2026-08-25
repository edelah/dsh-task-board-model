/**
 * Sidebar entry injection.
 *
 * dsh's sidebar shell exposes no slot an external plugin can register into
 * (`sidebar.workspaces` / `sidebar.settings` are single-occupant and already
 * taken), so — following the skin precedent of DOM-level extension — the
 * entry row is injected between the shell's New Session button and the
 * workspace browser. The injection self-heals: a MutationObserver watches the
 * sidebar root and re-inserts the row whenever a React re-render displaces it
 * (re-insertion happens in the same frame, before paint, so no flicker).
 *
 * The row is plain DOM (no React tree) so it can never disturb the shell's
 * reconciliation; the board view it toggles is a separate React root mounted
 * in the center column (see board-mount.ts).
 */
import type { BoardController } from '../core/controller.ts';
/** Stable data attribute identifying the injected entry row. */
export declare const ENTRY_SELECTOR = "[data-dsh-taskboard-entry]";
/**
 * Find the sidebar shell root element, or undefined while not yet mounted.
 * Shared with running-jobs.ts, which injects its dynamic rows into the same
 * root and must track the same element across shell rebuilds.
 */
export declare function sidebarRoot(): HTMLElement | undefined;
/** The New Session button: nested in the logo row on current shells, a direct child on legacy shells. */
export declare function newSessionButton(root: HTMLElement): HTMLButtonElement | undefined;
/**
 * Mount the sidebar entry, waiting for the shell to render and self-healing
 * on later React re-renders.
 * @param controller - the board controller the entry toggles.
 * @returns disposer removing the entry and its observers.
 */
export declare function mountSidebarEntry(controller: BoardController): () => void;
//# sourceMappingURL=sidebar-entry.d.ts.map