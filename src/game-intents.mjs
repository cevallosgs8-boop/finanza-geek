import { applyAction } from './logic/finance.mjs';
import { syncGame } from './logic/game.mjs';

export function buildFinancialGameCommit(state, action, { today, onDegraded } = {}) {
  const next = applyAction(state, action);
  try {
    return syncGame(next, { today, previousState: state, awardNewMovements: true });
  } catch (error) {
    onDegraded?.(error);
    return { ...next, game: state.game };
  }
}

export function buildGameActionCommit(state, action) {
  return applyAction(state, action);
}

export function buildSafeGameSync(state, { today, busy = false, hasDraft = false, onDegraded } = {}) {
  if (busy || hasDraft) return null;
  let reconciled;
  try { reconciled = syncGame(state, { today, awardNewMovements: false }); }
  catch (error) { onDegraded?.(error); return null; }
  if (JSON.stringify(reconciled.game) === JSON.stringify(state.game)) return null;
  return { ...reconciled, revision: state.revision + 1 };
}

export async function commitFinancialGameAction({ state, action, today, store }) {
  const next = buildFinancialGameCommit(state, action, { today });
  await store.commit(next, state.revision);
  return next;
}
