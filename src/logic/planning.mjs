import { migrateState, parseMonth, daysInMonth, dateFor, occurrenceFor, computeSummary, localDate } from './finance.mjs';
import { annualFunding, reservationSummary } from './goals.mjs';
const safe=n=>Number.isSafeInteger(n);
const add=(a,b)=>{const n=a+b;if(!safe(n))throw Error('unsafe integer sum');return n;};
const plain=o=>o!==null&&typeof o==='object'&&!Array.isArray(o);
const order=['savings','outings','games','buffer'];
const OCCURRENCE_LIMIT=10000;
const FUTURE_MONTH_LIMIT=36;
function allocateCents(cents,percentages){
 if(!safe(cents)||cents<0||!plain(percentages)||Object.keys(percentages).sort().join('|')!==[...order].sort().join('|'))throw Error('invalid allocation input');
 let total=0;for(const k of order){const p=percentages[k];if(!safe(p)||p<0||p>100)throw Error('invalid allocation percentage');total+=p;}if(total!==100)throw Error('allocation percentages must sum to 100');
 const amount=BigInt(cents),result={};let used=0n;
 for(const k of order){if(k==='savings')continue;const part=amount*BigInt(percentages[k])/100n;result[k]=Number(part);used+=part;}
 result.savings=Number(amount-used);return result;
}
function dayDiff(a,b){const [ay,am,ad]=a.split('-').map(Number),[by,bm,bd]=b.split('-').map(Number);return Math.round((new Date(by,bm-1,bd)-new Date(ay,am-1,ad))/86400000);}
function monthIndex(month){const [y,m]=month.split('-').map(Number);return y*12+m-1;}
function monthFromIndex(index){const y=Math.floor(index/12),m=index%12+1;return String(y).padStart(4,'0')+'-'+String(m).padStart(2,'0');}
function validLocalDate(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const [y,m,d]=value.split('-').map(Number);const x=new Date(y,m-1,d);return x.getFullYear()===y&&x.getMonth()===m-1&&x.getDate()===d;}
function monthDays(month){const [y,m]=month.split('-').map(Number),len=daysInMonth(y,m),out=[];for(let d=1;d<=len;d++)out.push(dateFor(y,m,d));return out;}
function occurrenceFromState(state,month){
 const out=[],seen=new Set();
 for(const c of state.confirmations.filter(x=>x.month===month)){out.push({occurrenceKey:c.occurrenceKey,recurringId:c.recurringId,name:c.name,type:c.type,amountCents:c.amountCents,accountId:c.accountId,category:c.category,month,expectedDate:c.expectedDate,rangeStartDate:c.rangeStartDate,rangeEndDate:c.rangeEndDate,status:'confirmed',confirmationId:c.id,movementId:c.movementId});seen.add(c.occurrenceKey);}
 for(const r of state.recurring){if(r.archived)continue;const dates=occurrenceFor(r,month);if(!dates)continue;const occurrenceKey=r.id+':'+month;if(seen.has(occurrenceKey))continue;
  out.push({occurrenceKey,recurringId:r.id,name:r.name,type:r.type,amountCents:r.amountCents,accountId:r.accountId,category:r.category,month,expectedDate:dates.expectedDate,rangeStartDate:dates.rangeStartDate,rangeEndDate:dates.rangeEndDate,status:'pending',confirmationId:null,movementId:null});
 }
 return out.sort((a,b)=>a.expectedDate.localeCompare(b.expectedDate)||a.recurringId.localeCompare(b.recurringId));
}
function generateOccurrences(input,month){
 const state=migrateState(input);parseMonth(month);const out=occurrenceFromState(state,month);
 if(out.length>OCCURRENCE_LIMIT)throw Error('planning exceeds 10000 occurrences; adjust dates or archive rules');
 return out;
}
function actualOccurrences(state,month,today){
 return occurrenceFromState(state,month).map(o=>{const daysLate=Math.max(0,dayDiff(o.expectedDate,today)),late=o.status==='pending'&&daysLate>3;return {...o,daysLate,late,includedInExpected:!(late&&o.type==='income')};});
}
function monthClose(input,month,today=localDate()){
 const state=migrateState(input);parseMonth(month);if(!validLocalDate(today))throw Error('invalid today');
 let incomeCents=0,expenseCents=0;const byCategory=new Map();
 for(const m of state.movements){if(m.date.slice(0,7)!==month||m.date>today)continue;if(m.type==='income')incomeCents=add(incomeCents,m.amountCents);if(m.type==='expense'){expenseCents=add(expenseCents,m.amountCents);byCategory.set(m.category,add(byCategory.get(m.category)||0,m.amountCents));}if(m.type==='transfer'){expenseCents=add(expenseCents,m.feeCents);if(m.feeCents)byCategory.set('Comisiones',add(byCategory.get('Comisiones')||0,m.feeCents));}}
 const occurrences=generateOccurrences(state,month),fixed=occurrences.filter(o=>o.type==='expense');
 let pendingFixedCents=0;for(const o of fixed)if(o.status==='pending')pendingFixedCents=add(pendingFixedCents,o.amountCents);
 const categories=[...new Set([...byCategory.keys(),...state.settings.categoryLimits.map(x=>x.category)])].sort((a,b)=>a.localeCompare(b,'es')).map(category=>{const spentCents=byCategory.get(category)||0,limitCents=state.settings.categoryLimits.find(x=>x.category===category)?.limitCents??null;return {category,spentCents,limitCents,remainingCents:limitCents===null?null:add(limitCents,-spentCents)};});
 return {month,incomeCents,expenseCents,pendingFixedCents,categories};
}
function movementAvailableDelta(state,m){
 switch(m.type){
  case'income':return m.amountCents;
  case'expense':return -m.amountCents;
  case'transfer':return -m.feeCents;
  case'loan':{const l=state.loans.find(x=>x.id===m.loanId);if(l?.direction==='lent')return -m.amountCents;let prepaid=0;for(const payment of state.movements)if(payment.type==='repayment'&&payment.loanId===m.loanId&&payment.date<m.date)prepaid=add(prepaid,payment.amountCents);return prepaid;}
  case'repayment':{const l=state.loans.find(x=>x.id===m.loanId);return l?.direction==='lent'?m.amountCents:l&&m.date<l.date?-m.amountCents:0;}
  default:return 0;
 }
}
function goalFundingFields(funding){return {annualQuotaCents:funding.annualQuotaCents,annualPendingCents:funding.annualPendingCents,persistentGoalReservedCents:funding.persistentGoalReservedCents,piggyReservedCents:funding.piggyReservedCents,savingsAssignedThisMonthCents:funding.savingsAssignedThisMonthCents,roundupsGeneratedThisMonthCents:funding.roundupsGeneratedThisMonthCents,additionalSavingsCents:funding.additionalSavingsCents,totalReservedCents:funding.totalReservedCents};}
function computePlan(input,{month,today=localDate()}){
 const state=migrateState(input);parseMonth(month);if(!validLocalDate(today))throw Error('invalid today');
 const currentMonth=today.slice(0,7),monthDelta=monthIndex(month)-monthIndex(currentMonth);
 if(monthDelta>FUTURE_MONTH_LIMIT)throw Error('planning horizon exceeds 36 months');
 const count={value:0},cache=new Map();
 const occurrencesFor=m=>{if(cache.has(m))return cache.get(m);const raw=occurrenceFromState(state,m);count.value+=raw.length;if(count.value>OCCURRENCE_LIMIT)throw Error('planning exceeds 10000 occurrences; adjust dates or archive rules');const cooked=raw.map(o=>{const daysLate=Math.max(0,dayDiff(o.expectedDate,today)),late=o.status==='pending'&&daysLate>3;return {...o,daysLate,late,includedInExpected:!(late&&o.type==='income')};});cache.set(m,cooked);return cooked;};
 const occ=occurrencesFor(month),current=computeSummary(state,today),days=monthDays(month),selectedAsOf=month===currentMonth?today:month<currentMonth?dateFor(Number(month.slice(0,4)),Number(month.slice(5,7)),daysInMonth(Number(month.slice(0,4)),Number(month.slice(5,7)))):month+'-01';
 const earliest=state.recurring.filter(r=>!r.archived).reduce((m,r)=>Math.min(m,monthIndex(r.startDate.slice(0,7))),monthIndex(currentMonth));
 for(let ix=earliest;ix<monthIndex(currentMonth);ix++)occurrencesFor(monthFromIndex(ix));
 const carryovers=[];
 for(let ix=earliest;ix<monthIndex(currentMonth);ix++)for(const o of occurrencesFor(monthFromIndex(ix)))if(o.status==='pending'&&o.type==='expense'&&o.expectedDate<today)carryovers.push(o);
 const plannedIncome=occ.filter(o=>o.type==='income'&&o.includedInExpected).reduce((s,o)=>add(s,o.amountCents),0);
 const plannedExpense=occ.filter(o=>o.type==='expense').reduce((s,o)=>add(s,o.amountCents),0);
 const plannedSurplusBeforeAnnual=add(plannedIncome,-plannedExpense),plannedAnnual=annualFunding(state,selectedAsOf),plannedSurplus=add(plannedSurplusBeforeAnnual,-plannedAnnual.annualQuotaCents),plannedDistribution=allocateCents(Math.max(0,plannedSurplus),state.settings.allocationPercentages);
 const realAsOf=today<selectedAsOf?today:selectedAsOf;
 let realIncome=0,confirmedFixed=0,pendingFixed=0;
 for(const m of state.movements){if(m.date.slice(0,7)!==month||m.date>realAsOf)continue;if(m.type==='income')realIncome=add(realIncome,m.amountCents);}
 for(const o of occ){if(o.type!=='expense')continue;if(o.status==='pending')pendingFixed=add(pendingFixed,o.amountCents);else{const m=state.movements.find(x=>x.id===o.movementId);if(m)confirmedFixed=add(confirmedFixed,m.amountCents);}}
 const annual=annualFunding(state,selectedAsOf),realSurplusBeforeAnnual=add(realIncome,-add(pendingFixed,confirmedFixed)),realSurplus=add(realSurplusBeforeAnnual,-annual.annualQuotaCents),realDistribution=allocateCents(Math.max(0,realSurplus),state.settings.allocationPercentages);
 const inSelectedCurrentMonth=month===currentMonth,daysRemaining=inSelectedCurrentMonth?Math.max(1,days.length-Number(today.slice(8))+1):0;
 let carryoverFixedCents=0;for(const o of carryovers)carryoverFixedCents=add(carryoverFixedCents,o.amountCents);
 const todayOccurrences=month===currentMonth?occ:occurrencesFor(currentMonth);let todayRealIncome=0,todayPendingFixed=0,todayConfirmedFixed=0;for(const m of state.movements){if(m.date.slice(0,7)!==currentMonth||m.date>today)continue;if(m.type==='income')todayRealIncome=add(todayRealIncome,m.amountCents);}for(const o of todayOccurrences){if(o.type!=='expense')continue;if(o.status==='pending')todayPendingFixed=add(todayPendingFixed,o.amountCents);else{const m=state.movements.find(x=>x.id===o.movementId);if(m&&m.date<=today)todayConfirmedFixed=add(todayConfirmedFixed,m.amountCents);else todayPendingFixed=add(todayPendingFixed,o.amountCents);}}const todayAnnual=annualFunding(state,today),todaySurplus=add(add(todayRealIncome,-add(todayPendingFixed,todayConfirmedFixed)),-todayAnnual.annualQuotaCents),todayDistribution=allocateCents(Math.max(0,todaySurplus),state.settings.allocationPercentages);const todayFunding=reservationSummary(state,{today,availableCents:current.availableCents,pendingFixedCents:todayPendingFixed,carryoverFixedCents,savingsCents:todayDistribution.savings});const selectedFunding=month===currentMonth?todayFunding:reservationSummary(state,{today:selectedAsOf,availableCents:0,pendingFixedCents:0,carryoverFixedCents:0,savingsCents:realDistribution.savings});
 const numerator=inSelectedCurrentMonth?todayFunding.numeratorCents:0;
 const deficitCents=Math.max(0,-numerator),recommendedCents=inSelectedCurrentMonth?Math.max(0,Math.floor(numerator/daysRemaining)):null;
 const calendar=days.map(date=>({date,occurrences:occ.filter(o=>o.expectedDate===date)}));
 const upcomingCurrent=[];
 for(let ix=earliest;ix<=monthIndex(currentMonth)+1;ix++)for(const o of occurrencesFor(monthFromIndex(ix)))if(o.status==='pending'&&(o.expectedDate<today||o.expectedDate>=today&&dayDiff(today,o.expectedDate)<=6))upcomingCurrent.push(o);
 const upcoming=[...new Map(upcomingCurrent.map(o=>[o.occurrenceKey,o])).values()].sort((a,b)=>a.expectedDate.localeCompare(b.expectedDate)||a.recurringId.localeCompare(b.recurringId));
 const projection=[];
 const monthCompare=Math.sign(monthDelta);
 const applyProjectionDate=(date,series)=>{
  if(date>today)for(const m of state.movements)if(m.date===date){const delta=movementAvailableDelta(state,m);series.safe=add(series.safe,delta);series.expected=add(series.expected,delta);}
  const items=[...occurrencesFor(date.slice(0,7))];
  if(date===today)for(let ix=earliest;ix<monthIndex(currentMonth);ix++)items.push(...occurrencesFor(monthFromIndex(ix)));
  for(const o of items){if(o.status==='confirmed'||o.type!=='expense')continue;const due=o.expectedDate===date||(date===today&&o.expectedDate<today);if(due){series.safe=add(series.safe,-o.amountCents);series.expected=add(series.expected,-o.amountCents);}}
  for(const o of items){if(o.status==='confirmed'||o.type!=='income'||!o.includedInExpected)continue;const due=o.expectedDate===date&&date>today||(date===today&&o.expectedDate<=today);if(due)series.expected=add(series.expected,o.amountCents);}
 };
 if(monthCompare<0){for(const date of days){const x=computeSummary(state,date).availableCents;projection.push({date,safeBalanceCents:x,expectedBalanceCents:x});}}
 else{
  const series={safe:current.availableCents,expected:current.availableCents};
  if(monthCompare>0){const start=monthIndex(currentMonth),end=monthIndex(month);for(let ix=start;ix<end;ix++){const m=monthFromIndex(ix);for(const date of monthDays(m)){if(date>=today)applyProjectionDate(date,series);}}}
  for(const date of days){
   if(date<today){const x=computeSummary(state,date).availableCents;projection.push({date,safeBalanceCents:x,expectedBalanceCents:x});continue;}
   applyProjectionDate(date,series);projection.push({date,safeBalanceCents:series.safe,expectedBalanceCents:series.expected});
  }
 }
 const low=projection.length?projection.reduce((a,b)=>b.safeBalanceCents<a.safeBalanceCents?b:a):null;
 const close=monthClose(state,month,today);
 return {month,today,occurrences:occ,calendar,upcoming,carryoverFixedCents,planned:{incomeCents:plannedIncome,fixedExpenseCents:plannedExpense,surplusBeforeAnnualCents:plannedSurplusBeforeAnnual,annualQuotaCents:plannedAnnual.annualQuotaCents,surplusCents:plannedSurplus,distribution:plannedDistribution},budget:{realIncomeCents:realIncome,confirmedFixedCents:confirmedFixed,pendingFixedCents:pendingFixed,surplusBeforeAnnualCents:realSurplusBeforeAnnual,annualQuotaCents:annual.annualQuotaCents,realSurplusCents:realSurplus,savingsReservedCents:realDistribution.savings,distribution:realDistribution},goalFunding:goalFundingFields(selectedFunding),todayGoalFunding:goalFundingFields(todayFunding),daily:{availableCents:current.availableCents,pendingFixedCents:todayPendingFixed,carryoverFixedCents,savingsReservedCents:todayFunding.additionalSavingsCents,numeratorCents:numerator,daysRemaining,recommendedCents,deficitCents,formula:'max(0, floor((disponible real − pagos fijos pendientes − arrastre de vencidos − reservas persistentes − alcancía libre − cuota anual pendiente − ahorro nuevo) / días restantes incluyendo hoy))',calculatedFor:today,hidden:!inSelectedCurrentMonth},projection,lowestPoint:low,close};
}
export {allocateCents,generateOccurrences,computePlan,monthClose};
