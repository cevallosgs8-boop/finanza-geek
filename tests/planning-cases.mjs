import assert from 'node:assert/strict';
import { emptyState, migrateState, validateState, applyAction, serializeBackup, parseBackup, computeSummary } from '../src/logic/finance.mjs';
import { allocateCents, generateOccurrences, computePlan, monthClose } from '../src/logic/planning.mjs';

const account = { id: 'cash', name: 'Efectivo', kind: 'cash', openingBalanceCents: 100000, color: '#123456' };
const v1 = () => ({ schemaVersion: 1, revision: 7, currency: 'USD', accounts: [account], movements: [], loans: [], settings: { hideBalances: false } });
const recurrent = (extra = {}) => ({ id: 'salary', name: 'Ingreso', type: 'income', amountCents: 50000, accountId: 'cash', category: 'Trabajo', startDate: '2024-01-01', endDate: null, frequency: 'monthly', dayStart: 28, dayEnd: 31, archived: false, ...extra });
const move = (id, type, amountCents, date, category = 'General', extra = {}) => ({ id, type, date, amountCents, accountId: 'cash', toAccountId: null, feeCents: 0, category, note: '', loanId: null, ...extra });
const base = () => ({ ...v1(), schemaVersion: 2, revision: 0, recurring: [], confirmations: [], settings: { hideBalances: false, allocationPercentages: { savings: 50, outings: 27, games: 18, buffer: 5 }, categoryLimits: [] } });

export const cases = [
  ['migrate schema 1 without mutating source or revision', () => {
    const old = v1(); const copy = structuredClone(old);
    const next = migrateState(old);
    assert.deepEqual(old, copy); assert.equal(next.schemaVersion, 7); assert.equal(next.revision, 7);
    assert.deepEqual(next.recurring, []); assert.deepEqual(next.confirmations, []);
    assert.deepEqual(next.settings.allocationPercentages, { savings: 50, outings: 27, games: 18, buffer: 5 });
  }],
  ['reject unknown schema versions during migration', () => assert.throws(() => migrateState({ ...v1(), schemaVersion: 5 }))],
  ['validate schema 1 and schema 2 with strict root keys', () => {
    assert.equal(validateState(v1()), true);
    const s = base(); assert.equal(validateState(s), true);
    assert.throws(() => validateState({ ...s, extra: 'unknown' })); assert.throws(() => validateState({ ...s, settings: { ...s.settings, unknown: true } }));
    assert.throws(() => validateState({ ...s, recurring: [{ ...recurrent(), accountId: 'missing' }] }));
  }],
  ['allocate cents exactly, including MAX_SAFE_INTEGER and zero savings rate', () => {
    assert.deepEqual(allocateCents(101, { savings: 50, outings: 27, games: 18, buffer: 5 }), { savings: 51, outings: 27, games: 18, buffer: 5 });
    assert.deepEqual(allocateCents(101, { savings: 0, outings: 50, games: 25, buffer: 25 }), { savings: 1, outings: 50, games: 25, buffer: 25 });
    const x = allocateCents(Number.MAX_SAFE_INTEGER, { savings: 0, outings: 100, games: 0, buffer: 0 });
    assert.equal(x.outings, Number.MAX_SAFE_INTEGER); assert.equal(x.savings, 0);
  }],
  ['reject allocation percentages that do not sum to 100', () => assert.throws(() => allocateCents(100, { savings: 50, outings: 25, games: 20, buffer: 0 }))],
  ['generate month end occurrence on February 29 and retain both range endpoints', () => {
    const s = base(); s.recurring = [recurrent()];
    const [o] = generateOccurrences(s, '2024-02');
    assert.equal(o.expectedDate, '2024-02-29'); assert.equal(o.rangeStartDate, '2024-02-28'); assert.equal(o.rangeEndDate, '2024-02-29'); assert.equal(o.occurrenceKey, 'salary:2024-02');
  }],
  ['clamp day 31 to February 28 and keep January year boundary local', () => {
    const s = base(); s.recurring = [recurrent({ startDate: '2023-01-01', dayStart: 31, dayEnd: 31 })];
    assert.equal(generateOccurrences(s, '2023-02')[0].expectedDate, '2023-02-28');
    assert.equal(generateOccurrences(s, '2025-01')[0].expectedDate, '2025-01-31');
  }],
  ['skip monthly rule when its first candidate predates start date', () => {
    const s = base(); s.recurring = [recurrent({ startDate: '2024-01-20', dayStart: 5, dayEnd: 5 })];
    assert.equal(generateOccurrences(s, '2024-01').length, 0); assert.equal(generateOccurrences(s, '2024-02').length, 1);
  }],
  ['range occurrence created midrange starts only when projected date remains available', () => {
    const s = base(); s.recurring = [recurrent({ id: 'expense-range', type: 'expense', startDate: '2024-02-10', dayStart: 1, dayEnd: 15 }), recurrent({ id: 'income-range', type: 'income', startDate: '2024-02-10', dayStart: 1, dayEnd: 15 })];
    assert.equal(generateOccurrences(s, '2024-02').some(x => x.recurringId === 'expense-range'), false); assert.equal(generateOccurrences(s, '2024-02').find(x => x.recurringId === 'income-range').expectedDate, '2024-02-15');
  }],
  ['limit a single occurrence to its actual date and new year month', () => {
    const s = base(); s.recurring = [recurrent({ frequency: 'once', startDate: '2025-01-02', dayStart: null, dayEnd: null })];
    assert.equal(generateOccurrences(s, '2024-12').length, 0); assert.equal(generateOccurrences(s, '2025-01')[0].expectedDate, '2025-01-02');
  }],
  ['confirm occurrence atomically with actual amount and prevent duplicate confirmation', () => {
    let s = base(); s.recurring = [recurrent()];
    s = applyAction(s, { type: 'recurring.confirm', occurrenceKey: 'salary:2024-02', confirmationId: 'conf1', movementId: 'income1', month: '2024-02', actual: { amountCents: 47500, accountId: 'cash', date: '2024-02-29' } });
    assert.equal(s.revision, 1); assert.equal(s.movements.length, 1); assert.equal(s.movements[0].amountCents, 47500); assert.equal(s.confirmations.length, 1);
    assert.throws(() => applyAction(s, { type: 'recurring.confirm', occurrenceKey: 'salary:2024-02', confirmationId: 'conf2', movementId: 'income2', month: '2024-02', actual: { amountCents: 47500, accountId: 'cash', date: '2024-02-29' } }));
    assert.equal(s.movements.length, 1);
  }],
  ['linked movement edit preserves its confirmation and type', () => {
    let s = base(); s.recurring = [recurrent()]; s = applyAction(s, { type: 'recurring.confirm', occurrenceKey: 'salary:2024-03', confirmationId: 'conf1', movementId: 'income1', month: '2024-03', actual: { amountCents: 50000, accountId: 'cash', date: '2024-03-28' } });
    assert.throws(() => applyAction(s, { type: 'movement.update', movement: move('income1', 'expense', 3, '2024-03-29') }));
    const n = applyAction(s, { type: 'movement.update', movement: move('income1', 'income', 51000, '2024-03-29') });
    assert.equal(n.confirmations.length, 1); assert.equal(n.confirmations[0].movementId, 'income1');
  }],
  ['confirmed occurrence keeps its scheduled snapshot after the rule changes', () => {
    let s = base(); s.recurring = [recurrent()]; s = applyAction(s, { type: 'recurring.confirm', occurrenceKey: 'salary:2024-03', confirmationId: 'conf1', movementId: 'income1', month: '2024-03', actual: { amountCents: 50000, accountId: 'cash', date: '2024-03-29' } });
    s = applyAction(s, { type: 'recurring.update', recurring: { ...s.recurring[0], name: 'Nuevo nombre', type: 'expense', amountCents: 100, startDate: '2024-04-01', dayStart: 1, dayEnd: 1 } });
    const [o] = generateOccurrences(s, '2024-03'); assert.equal(o.name, 'Ingreso'); assert.equal(o.type, 'income'); assert.equal(o.expectedDate, '2024-03-31'); assert.equal(o.accountId, 'cash');
    assert.equal(s.confirmations[0].type, 'income');
  }],
  ['manual received income and percentage change commit in one revision', () => {
    const s = base(); const n = applyAction(s, { type: 'income.record', movement: move('manual', 'income', 1200, '2024-02-02'), percentages: { savings: 40, outings: 30, games: 20, buffer: 10 } });
    assert.equal(n.revision, 1); assert.equal(n.movements.length, 1); assert.deepEqual(n.settings.allocationPercentages, { savings: 40, outings: 30, games: 20, buffer: 10 });
  }],
  ['deleting linked movement makes occurrence pending again', () => {
    let s = base(); s.recurring = [recurrent()]; s = applyAction(s, { type: 'recurring.confirm', occurrenceKey: 'salary:2024-03', confirmationId: 'conf1', movementId: 'income1', month: '2024-03', actual: { amountCents: 50000, accountId: 'cash', date: '2024-03-28' } });
    s = applyAction(s, { type: 'movement.delete', id: 'income1' }); assert.equal(s.confirmations.length, 0); assert.equal(s.movements.length, 0);
    assert.equal(generateOccurrences(s, '2024-03')[0].status, 'pending');
  }],
  ['archive recurring rules with confirmation history instead of deleting history', () => {
    let s = base(); s.recurring = [recurrent()]; s = applyAction(s, { type: 'recurring.confirm', occurrenceKey: 'salary:2024-03', confirmationId: 'conf1', movementId: 'income1', month: '2024-03', actual: { amountCents: 50000, accountId: 'cash', date: '2024-03-28' } });
    s = applyAction(s, { type: 'recurring.delete', id: 'salary' }); assert.equal(s.recurring[0].archived, true); assert.equal(s.confirmations.length, 1);
  }],
  ['compute plan excludes overdue expected income and exposes safe and expected projections', () => {
    const s = base(); s.recurring = [recurrent({ dayStart: 1, dayEnd: 1 }), recurrent({ id: 'rent', name: 'Renta', type: 'expense', amountCents: 30000, category: 'Vivienda', dayStart: 1, dayEnd: 1 })];
    const p = computePlan(s, { month: '2024-02', today: '2024-02-05' });
    assert.equal(p.month, '2024-02'); assert.equal(p.occurrences.find(x => x.recurringId === 'salary').late, true);
    assert.equal(p.occurrences.find(x => x.recurringId === 'salary').includedInExpected, false);
    assert.ok(Array.isArray(p.calendar)); assert.ok(p.daily.formula.includes('disponible'));
    assert.ok(p.projection.every(x => Number.isSafeInteger(x.safeBalanceCents) && Number.isSafeInteger(x.expectedBalanceCents)));
  }],
  ['three days late remains expected while four days late is excluded', () => {
    const s = base(); s.recurring = [recurrent({ dayStart: 2, dayEnd: 2 })];
    const three = computePlan(s, { month: '2024-02', today: '2024-02-05' }).occurrences[0];
    const four = computePlan(s, { month: '2024-02', today: '2024-02-06' }).occurrences[0];
    assert.equal(three.daysLate, 3); assert.equal(three.includedInExpected, true);
    assert.equal(four.daysLate, 4); assert.equal(four.includedInExpected, false);
  }],
  ['projection starts from todays real balance and reserves overdue expenses today', () => {
    const s = base(); s.movements = [move('today-income', 'income', 500, '2024-02-05')];
    s.recurring = [recurrent({ id: 'late-bill', type: 'expense', amountCents: 200, dayStart: 1, dayEnd: 1 })];
    const p = computePlan(s, { month: '2024-02', today: '2024-02-05' });
    // Opening 100000 + actual income 500 - January pending 200 - February pending 200.
    assert.equal(p.projection.find(x => x.date === '2024-02-05').safeBalanceCents, 100100);
  }],
  ['daily spending recommendation floors, includes today, and shows deficit separately', () => {
    const s = base(); s.accounts[0].openingBalanceCents = 101; s.recurring = [recurrent({ startDate: '2024-02-01', type: 'expense', amountCents: 200, dayStart: 31, dayEnd: 31 })];
    const p = computePlan(s, { month: '2024-02', today: '2024-02-29' });
    assert.equal(p.daily.daysRemaining, 1); assert.equal(p.daily.recommendedCents, 0); assert.equal(p.daily.deficitCents, 99);
  }],
  ['confirming an income and later its fixed expense does not reserve savings twice', () => {
    const s = base(); s.accounts[0].openingBalanceCents = 100000;
    s.recurring = [
      recurrent({ startDate: '2026-10-01', amountCents: 60000, dayStart: 20, dayEnd: 20 }),
      recurrent({ id: 'bill', name: 'Servicio', type: 'expense', amountCents: 20000, category: 'Servicios', startDate: '2026-10-01', dayStart: 20, dayEnd: 20 }),
    ];
    const before = computePlan(s, { month: '2026-10', today: '2026-10-19' });
    assert.equal(before.daily.daysRemaining, 13); assert.equal(before.daily.recommendedCents, 6153);
    let afterIncome = applyAction(s, { type: 'recurring.confirm', occurrenceKey: 'salary:2026-10', confirmationId: 'ci', movementId: 'mi', month: '2026-10', actual: { amountCents: 60000, accountId: 'cash', date: '2026-10-19' } });
    const received = computePlan(afterIncome, { month: '2026-10', today: '2026-10-19' });
    assert.equal(received.budget.realSurplusCents, 40000); assert.equal(received.budget.savingsReservedCents, 20000);
    assert.equal(received.daily.recommendedCents, 9230);
    afterIncome = applyAction(afterIncome, { type: 'recurring.confirm', occurrenceKey: 'bill:2026-10', confirmationId: 'ce', movementId: 'me', month: '2026-10', actual: { amountCents: 20000, accountId: 'cash', date: '2026-10-19' } });
    const paid = computePlan(afterIncome, { month: '2026-10', today: '2026-10-19' });
    assert.equal(paid.budget.savingsReservedCents, 20000); assert.equal(paid.daily.recommendedCents, 9230);
  }],
  ['month close reports real totals and category limits without counting pending as real', () => {
    const s = base(); s.movements = [move('e1', 'expense', 2500, '2024-02-03', 'Comida'), move('i1', 'income', 9000, '2024-02-02')];
    s.recurring = [recurrent({ id: 'rent', name: 'Renta', type: 'expense', amountCents: 3000, category: 'Vivienda', dayStart: 20, dayEnd: 20 })];
    s.settings.categoryLimits = [{ category: 'Comida', limitCents: 3000 }];
    const c = monthClose(s, '2024-02');
    assert.equal(c.incomeCents, 9000); assert.equal(c.expenseCents, 2500); assert.equal(c.pendingFixedCents, 3000);
    assert.deepEqual(c.categories[0], { category: 'Comida', spentCents: 2500, limitCents: 3000, remainingCents: 500 });
  }],
  ['schema 2 backup wrapper roundtrips and schema 1 backup migrates', () => {
    const b = parseBackup(serializeBackup(base())); assert.equal(b.version, 7); assert.equal(b.data.schemaVersion, 7);
    const old = JSON.stringify({ format: 'finanza-geek', version: 1, data: v1() });
    assert.equal(parseBackup(old).data.schemaVersion, 7);
  }],
  ['schema 1 action does not mutate its source arrays', () => { const old = v1(); applyAction(old, { type: 'recurring.add', recurring: recurrent() }); assert.equal(old.schemaVersion, 1); assert.equal(old.recurring, undefined); assert.equal(old.movements.length, 0); }],
  ['apply action normalizes schema 1 and increments revision once', () => {
    const old = v1();
    const n = applyAction(old, { type: 'settings.update', settings: { hideBalances: true } });
    assert.equal(n.schemaVersion, 7); assert.equal(n.revision, 8); assert.equal(n.recurring.length, 0);
  }],
];
