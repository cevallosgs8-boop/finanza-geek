import { inspectStatement, parseStatement, reconcileStatement, movementSignature, statementInboxItems } from './logic/reconciliation.mjs';
import { parseReceiptText, receiptInboxItem } from './logic/receipts.mjs';
import { localDate } from './logic/finance.mjs';

const clone = value => structuredClone(value);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const empty = () => ({
 csvText: '', encoding: 'utf-8', delimiter: ',', mappingStrategy: 'signed', headers: [], rowCount: 0,
 mapping: { id: '', label: '', delimiter: ',', dateFormat: 'iso', decimal: 'dot', dateColumn: null, descriptionColumn: null, amountColumn: null, debitColumn: null, creditColumn: null, balanceColumn: null },
 accountId: '', startDate: '', endDate: '', rows: [], parseErrors: [], result: null, selected: [], pages: {}, error: '',
 receipt: { text: '', items: [], warnings: [], preview: '', fields: {} }
});
const exactMapping = m => ({
 id: String(m.id || ''), label: String(m.label || '').trim().slice(0, 60), delimiter: m.delimiter, dateFormat: m.dateFormat,
 decimal: m.decimal, dateColumn: m.dateColumn, descriptionColumn: m.descriptionColumn, amountColumn: m.amountColumn ?? null,
 debitColumn: m.debitColumn ?? null, creditColumn: m.creditColumn ?? null, balanceColumn: m.balanceColumn ?? null
});
const unseenInboxItems = (items, state) => {
 const seen = new Set(state.automation?.seenFingerprints || []);
 return items.filter(item => {
  const fingerprint = item?.fingerprint;
  if (typeof fingerprint !== 'string') return true;
  if (seen.has(fingerprint)) return false;
  seen.add(fingerprint); return true;
 });
};
const receiptValues = fields => ({
 date: fields.date || null, merchant: String(fields.merchant || ''), amountCents: fields.amountCents ?? null,
 currency: String(fields.currency || ''), accountId: String(fields.accountId || ''), category: String(fields.category || '')
});

export function createReconciliationController({ getState, getRevision, persistAction, api = {}, idFactory = () => crypto.randomUUID(), onChange = () => {} }) {
 let draft = empty(), generation = 0, source = null, observedRevision = null, preview = null;
 const changed = () => onChange(snapshot());
 const snapshot = () => clone(draft);
 const revision = () => getRevision?.() ?? getState().revision;
 const invalidate = () => { generation++; preview = null; draft.result = null; draft.rows = []; draft.parseErrors = []; draft.selected = []; draft.error = ''; };
 const context = () => ({ accountId: draft.accountId, startDate: draft.startDate, endDate: draft.endDate });
 const setReceiptFields = patch => { const next = { ...draft.receipt.fields, ...patch }; if (same(next, draft.receipt.fields)) return; draft.receipt.fields = next; generation++; changed(); };
 const update = patch => {
  const next = { ...draft, ...patch };
  if (same(Object.fromEntries(Object.keys(patch).map(k => [k, draft[k]])), Object.fromEntries(Object.keys(patch).map(k => [k, next[k]])))) return snapshot();
  invalidate(); draft = next; changed(); return snapshot();
 };
 const updateCSVText = text => { source = null; const next = String(text ?? ''); if (draft.csvText === next) return; invalidate(); draft.csvText = next; changed(); };
 const beginCSVFile = () => { source = null; invalidate(); draft.csvText = ''; changed(); };
 const updateReceiptText = text => { generation++; draft.receipt = { text: String(text || ''), items: [], warnings: [], preview: '', fields: {} }; draft.error = ''; changed(); };
 const updateReceiptFields = fields => setReceiptFields(receiptValues(fields));
 const selectRows = selected => { const next = [...new Set(selected)]; if (same(next, draft.selected)) return; draft.selected = next; changed(); };
 const setPage = (list, page) => { draft.pages = { ...draft.pages, [list]: Math.max(0, Number(page) || 0) }; changed(); };
 const observeRevision = value => {
  if (observedRevision === null) { observedRevision = value; return false; }
  if (observedRevision !== value) { observedRevision = value; invalidate(); draft.error = 'Los datos cambiaron. Vuelve a comparar antes de continuar.'; changed(); return true; }
  return false;
 };
 const setMapping = mapping => {
  const next = exactMapping(mapping);
  if (same(next, draft.mapping)) return clone(draft.mapping);
  draft.mapping = next; invalidate(); changed(); return clone(next);
 };
 const inspect = async input => {
  if (input !== undefined) { draft.csvText = typeof input === 'string' ? input : ''; source = input; }
  invalidate(); const ticket = generation, rev = revision(); draft.result = null; draft.error = '';
  try {
   const inspected = await (api.inspectStatement || inspectStatement)(input ?? source ?? draft.csvText, { delimiter: draft.mapping.delimiter, encoding: draft.encoding });
   if (ticket !== generation || revision() !== rev) return false;
   draft.headers = inspected.headers; draft.rowCount = inspected.rowCount; changed(); return true;
  } catch (error) {
   if (ticket === generation) { draft.error = 'No se pudo inspeccionar el archivo CSV. Revisa separador y codificación.'; changed(); }
   return false;
  }
 };
 const compare = async () => {
  invalidate(); const ticket = generation, rev = revision(), ctx = context();
  try {
   const parsed = await (api.parseStatement || parseStatement)(source ?? draft.csvText, { mapping: draft.mapping, accountId: ctx.accountId, encoding: draft.encoding, idFactory });
   if (ticket !== generation || revision() !== rev || !same(ctx, context())) return false;
   const result = (api.reconcileStatement || reconcileStatement)(getState(), parsed.rows, { ...ctx, today: localDate(), parseErrors: parsed.errors });
   if (ticket !== generation || revision() !== rev || !same(ctx, context())) return false;
   draft.rows = parsed.rows; draft.parseErrors = parsed.errors; draft.result = result;
   preview = { generation: ticket, revision: rev, ...ctx, matched: result.matched.map(entry => ({ fingerprint: entry.row.fingerprint, movementId: entry.movement.id })) };
   changed(); return true;
  } catch (error) {
   if (ticket === generation) { draft.error = 'No se pudo comparar. Revisa cuenta, rango y columnas.'; changed(); }
   return false;
  }
 };
 const requirePreview = () => {
  if (!preview || !draft.result || preview.generation !== generation || preview.revision !== revision() || !same(context(), { accountId: preview.accountId, startDate: preview.startDate, endDate: preview.endDate })) {
   throw Error('La comparación cambió. Vuelve a comparar antes de continuar.');
  }
  return { token: generation, rev: revision(), ctx: context(), result: draft.result, stamp: preview };
 };
 const validateToken = (token, rev, ctx) => {
  if (generation !== token || revision() !== rev || !same(context(), ctx)) throw Error('Los datos o la comparación cambiaron. Vuelve a comparar antes de continuar.');
 };
 const mark = async (index, expectedFingerprint = '') => {
  const current = requirePreview(), observed = current.stamp.matched[index];
  if (!observed || expectedFingerprint && observed.fingerprint !== expectedFingerprint) throw Error('La fila ya no coincide. Vuelve a comparar.');
  const observedEntry = current.result.matched[index];
  if (observedEntry?.movement?.id !== observed.movementId || observedEntry?.row?.fingerprint !== observed.fingerprint) throw Error('La fila ya no coincide. Vuelve a comparar.');
  const parsed = await (api.parseStatement || parseStatement)(source ?? draft.csvText, { mapping: draft.mapping, accountId: current.ctx.accountId, encoding: draft.encoding, idFactory });
  validateToken(current.token, current.rev, current.ctx);
  const result = (api.reconcileStatement || reconcileStatement)(getState(), parsed.rows, { ...current.ctx, today: localDate(), parseErrors: parsed.errors });
  const entry = result.matched.find(x => x.row.fingerprint === observed.fingerprint && x.movement.id === observed.movementId);
  if (!entry) throw Error('La fila o el movimiento cambió. Vuelve a comparar.');
  const state = getState(), movement = state.movements.find(x => x.id === observed.movementId);
  if (!movement || !(movement.accountId === current.ctx.accountId || movement.type === 'transfer' && movement.toAccountId === current.ctx.accountId)) throw Error('La cuenta o el movimiento cambió. Vuelve a comparar.');
  const signature = (api.movementSignature || movementSignature)(state, movement, current.ctx.accountId);
  validateToken(current.token, current.rev, current.ctx);
  if (await persistAction({ type: 'reconciliation.mark', accountId: current.ctx.accountId, movementId: movement.id, movementSignature: signature, row: entry.row }) !== true) throw Error('No se guardó la marca. Vuelve a revisar.');
  return true;
 };
 const unmark = async fingerprint => {
  const accountId = draft.accountId, token = generation, rev = revision();
  if (!fingerprint || !accountId) throw Error('Vuelve a comparar antes de retirar la marca.');
  if (await persistAction({ type: 'reconciliation.unmark', accountId, rowFingerprint: fingerprint }) !== true) throw Error('No se guardó el cambio.');
  return true;
 };
 const saveMapping = async () => {
  const mapping = exactMapping({ ...draft.mapping, id: draft.mapping.id || idFactory(), label: draft.mapping.label || 'Mapeo CSV' });
  if (await persistAction({ type: 'reconciliation.mapping.set', mapping }) !== true) throw Error('No se guardó el mapeo.');
  draft.mapping = mapping; changed(); return mapping;
 };
 const removeMapping = async id => {
  if (await persistAction({ type: 'reconciliation.mapping.remove', id }) !== true) throw Error('No se eliminó el mapeo.');
  if (draft.mapping.id === id) draft.mapping = { ...draft.mapping, id: '' };
  changed(); return true;
 };
 const importBank = async fingerprints => {
  const current = requirePreview(), chosen = [...new Set(fingerprints || [])];
  if (!chosen.length || !same([...chosen].sort(), [...draft.selected].sort())) throw Error('Selecciona de nuevo las filas y vuelve a comparar.');
  const rows = current.result.bankOnly.filter(row => chosen.includes(row.fingerprint));
  if (!rows.length || rows.length !== chosen.length) throw Error('Selecciona una fila bancaria de esta comparación.');
  const selection = [...chosen].sort();
  validateToken(current.token, current.rev, current.ctx);
  const items = await (api.statementInboxItems || statementInboxItems)(rows, { accountId: current.ctx.accountId, idFactory });
  validateToken(current.token, current.rev, current.ctx);
  if (!same(selection, [...draft.selected].sort())) throw Error('La selección cambió. Vuelve a revisar las filas.');
  const freshItems = unseenInboxItems(items, getState());
  if (!freshItems.length) return 0;
  if (await persistAction({ type: 'inbox.import', items: freshItems }) !== true) throw Error('No se guardó la propuesta.');
  return freshItems.length;
 };
 const analyzeReceipt = async text => {
  const ticket = ++generation, rev = revision(), input = String(text || '');
  draft.receipt = { text: input, items: [], warnings: [], preview: '', fields: {} }; changed();
  try {
   const parsed = await (api.parseReceiptText || parseReceiptText)(input, { idFactory });
   if (ticket !== generation || revision() !== rev) return false;
   const item = parsed.items?.[0] || {};
   draft.receipt = {
    text: input, items: parsed.items, warnings: parsed.warnings, preview: parsed.preview,
    fields: { date: item.date || '', merchant: item.merchant || '', amountCents: item.amountCents ?? null, currency: item.currency || '', accountId: item.accountId || '', category: item.category || '' }
   };
   changed(); return true;
  } catch {
   if (ticket === generation) { draft.receipt = { ...draft.receipt, warnings: ['No se pudo analizar el texto. Revisa que no supere 64 KiB.'] }; changed(); }
   return false;
  }
 };
 const submitReceipt = async fields => {
  if (!draft.receipt.items?.length) throw Error('Revisa un recibo antes de enviarlo.');
  const ticket = generation, rev = revision(), submitted = receiptValues(fields), ctx = { ...draft.receipt.fields };
  const item = await (api.receiptInboxItem || receiptInboxItem)({
   date: submitted.date, merchant: submitted.merchant, amountCents: submitted.amountCents, currency: submitted.currency, category: submitted.category
  }, { accountId: submitted.accountId, idFactory });
  if (generation !== ticket || revision() !== rev || !same(ctx, draft.receipt.fields) || !draft.receipt.items?.length) throw Error('El recibo cambió o se canceló. Revisa el borrador antes de enviarlo.');
  const freshItems = unseenInboxItems([item], getState());
  if (freshItems.length && await persistAction({ type: 'inbox.import', items: freshItems }) !== true) throw Error('No se guardó el recibo. Puedes reintentar.');
  draft.receipt = { text: '', items: [], warnings: [], preview: '', fields: {} }; generation++; changed(); return freshItems.length;
 };
 const cancelReceipt = () => { generation++; draft.receipt = { text: '', items: [], warnings: [], preview: '', fields: {} }; changed(); };
 return { snapshot, update, updateCSVText, beginCSVFile, updateReceiptText, updateReceiptFields, selectRows, setPage, observeRevision, setMapping, inspect, compare, mark, unmark, saveMapping, removeMapping, importBank, analyzeReceipt, submitReceipt, cancelReceipt };
}
