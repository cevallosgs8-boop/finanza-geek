import { computeSummary, formatMoney, localDate, validateState } from './finance.mjs';
import { computeAdvisorPlan } from './advisor.mjs';
import { computeGoalSummary } from './goals.mjs';

const MASK='••••';
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const monetaryKeys=new Set(['total','balance','available','borrowedOutstanding','lentOutstanding','realIncome','monthIncome','monthExpense','pendingFixed','confirmedFixed','annualQuota','reserve','deficit','savings','outings','games','buffer','amount','safe','expected','remaining','safeMinimum','expectedMinimum','minimumSafe','minimumExpected','normalDiscretionary']);
function validDate(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const [year,month,day]=value.split('-').map(Number),date=new Date(0);
  date.setFullYear(year,month-1,day);
  return year>=1900&&year<=9999&&date.getFullYear()===year&&date.getMonth()===month-1&&date.getDate()===day;
}
function safeName(value,{sensitive=false}={}){
  let name=String(value??'').replace(/(?<!\d)(?:\d[ -]?){6,}(?!\d)/g,'');
  name=sensitive?name.replace(/(?<!\d)\d(?:[ -]?\d){3}(?!\d)/g,''):name.replace(/\b((?:cuenta|tarjeta|card|account)\b[^\d]{0,40})(\d(?:[ -]?\d){3})\b/gi,'$1');
  return name.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,80);
}
function money(value,hidden){return hidden?MASK:formatMoney(value);}
function dateDays(start,count){
  const [year,month,day]=start.split('-').map(Number),date=new Date(0);
  date.setFullYear(year,month-1,day);date.setHours(0,0,0,0);
  const dates=[];for(let i=0;i<count;i++){dates.push([String(date.getFullYear()).padStart(4,'0'),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-'));date.setDate(date.getDate()+1);}
  return dates;
}
function nextMonth(month){
  const [year,number]=month.split('-').map(Number),index=year*12+number;
  return String(Math.floor(index/12)).padStart(4,'0')+'-'+String(index%12+1).padStart(2,'0');
}
function selectedPlans(state,today,months){
  const plans=new Map();for(const month of months)plans.set(month,computeAdvisorPlan(state,{month,today}));return plans;
}
function redact(value,key=''){
  if(Array.isArray(value))return value.map(item=>redact(item));
  if(!plain(value))return value;
  const copy={};for(const [name,child] of Object.entries(value))copy[name]=(monetaryKeys.has(name)||/Cents$/.test(name))?MASK:redact(child,name);return copy;
}
function requireSummary(summary){
  if(!plain(summary)||typeof summary.today!=='string'||!Array.isArray(summary.projection)||!plain(summary.totals))throw Error('invalid advisor summary');
}
export function buildAdvisorSummary(state,{today=localDate(),includeNames=false}={}){
  validateState(state);
  if(!validDate(today)||typeof includeNames!=='boolean')throw Error('invalid advisor summary options');
  const hidden=state.settings.hideBalances===true,todayMonth=today.slice(0,7),summary=computeSummary(state,today);
  const dates=dateDays(today,30),months=[...new Set([...dates.map(date=>date.slice(0,7)),nextMonth(todayMonth)])],plans=selectedPlans(state,today,months),projectionByDate=new Map();
  for(const plan of plans.values())for(const point of plan.projection)if(dates.includes(point.date))projectionByDate.set(point.date,point);
  const projection=dates.map(date=>{const point=projectionByDate.get(date);if(!point)throw Error('advisor projection is incomplete');return {date,safe:money(point.safeBalanceCents,hidden),expected:money(point.expectedBalanceCents,hidden)};});
  const accounts=state.accounts.map((account,index)=>({label:includeNames?(safeName(account.name,{sensitive:true})||'Cuenta '+(index+1)):'Cuenta '+(index+1),balance:money(summary.accountBalances[account.id]??0,hidden)}));
  const recurringById=new Map(state.recurring.filter(rule=>!rule.archived).map(rule=>[rule.id,rule])),events=new Map();
  for(const plan of plans.values())for(const occurrence of plan.occurrences)if(occurrence.status==='pending'&&occurrence.expectedDate>=today&&occurrence.expectedDate<=dates.at(-1)&&recurringById.has(occurrence.recurringId))events.set(occurrence.occurrenceKey,occurrence);
  const orderedEvents=[...events.values()].sort((a,b)=>a.expectedDate.localeCompare(b.expectedDate)||a.recurringId.localeCompare(b.recurringId));
  const recurring=orderedEvents.map((event,index)=>{const rule=recurringById.get(event.recurringId);return {label:includeNames?(safeName(rule.name)||'Rutina '+(index+1)):'Rutina '+(index+1),type:event.type,amount:money(event.amountCents,hidden),date:event.expectedDate,frequency:rule.frequency};});
  const goals=state.goals.filter(goal=>!goal.archived).map((goal,index)=>{const progress=computeGoalSummary(state,goal.id,today);return {label:includeNames?(safeName(goal.name)||'Meta '+(index+1)):'Meta '+(index+1),kind:goal.kind,remaining:money(progress.remainingCents,hidden),dueDate:goal.dueDate,status:progress.status};});
  const currentPlan=plans.get(todayMonth),nextPlan=plans.get(nextMonth(todayMonth)),minimumSafe=nextPlan.lowestPoint,minimumExpected=nextPlan.projection.reduce((low,point)=>low===null||point.expectedBalanceCents<low.balanceCents?{date:point.date,balanceCents:point.expectedBalanceCents}:low,null);
  const reserveCents=currentPlan.todayGoalFunding.totalReservedCents,deficitCents=currentPlan.daily.deficitCents;
  const guidance=[
    {title:'Disponible real',available:money(summary.availableCents,hidden),suggestion:'Toma el disponible real como referencia antes de aceptar un gasto nuevo.',formula:'Saldo total − deuda recibida pendiente de pago.'},
    {title:'Mínimo del próximo mes',safeMinimum:money(minimumSafe?.safeBalanceCents??0,hidden),expectedMinimum:money(minimumExpected?.balanceCents??0,hidden),date:minimumSafe?.date??nextMonth(todayMonth)+'-01',expectedDate:minimumExpected?.date??nextMonth(todayMonth)+'-01',suggestion:'Revisa pagos próximos si la serie segura cae bajo cero.',formula:'La serie segura resta gastos pendientes; la esperada también suma ingresos previstos.'},
    {title:'Reservas y déficit',reserve:money(reserveCents,hidden),deficit:money(deficitCents,hidden),suggestion:'Las reservas ya están descontadas; si hay déficit, revisa primero los gastos pendientes.',formula:'Disponible − pagos fijos − arrastres − reservas.'}
  ];
  return {
    today,hidden,includeNames,
    notice:'Orientación basada en tus registros; no reemplaza asesoramiento profesional.',
    totals:{balance:money(summary.balanceCents,hidden),available:money(summary.availableCents,hidden),borrowedOutstanding:money(summary.borrowedOutstandingCents,hidden),lentOutstanding:money(summary.lentOutstandingCents,hidden),monthIncome:money(summary.monthIncomeCents,hidden),monthExpense:money(summary.monthExpenseCents,hidden)},
    accounts,
    budget:{month:todayMonth,realIncome:money(currentPlan.budget.realIncomeCents,hidden),confirmedFixed:money(currentPlan.budget.confirmedFixedCents,hidden),pendingFixed:money(currentPlan.budget.pendingFixedCents,hidden),annualQuota:money(currentPlan.budget.annualQuotaCents,hidden),reserve:money(reserveCents,hidden),deficit:money(deficitCents,hidden),distribution:Object.fromEntries(Object.entries(currentPlan.budget.distribution).map(([key,value])=>[key,money(value,hidden)]))},
    recurring,projection,goals,guidance,dataNotes:[...(state.accounts.length?[]:['Aún no hay cuentas; la orientación está limitada.']),...(state.recurring.some(rule=>!rule.archived)?[]:['No hay reglas recurrentes; los pagos futuros pueden estar incompletos.']),...(state.goals.some(goal=>!goal.archived)?[]:['No hay metas activas para resumir.'])]
  };
}
export function advisorText(summary,{hidden=false}={}){
  requireSummary(summary);
  const mask=hidden||summary.hidden,view=mask?redact(summary):summary,lines=[view.notice,'Resumen al '+view.today,'Saldo total: '+view.totals.balance+'; disponible real: '+view.totals.available+'.','Deuda recibida pendiente: '+view.totals.borrowedOutstanding+'; préstamo pendiente por cobrar: '+view.totals.lentOutstanding+'.','Mes '+view.budget.month+': ingresos reales '+view.budget.realIncome+', gastos fijos confirmados '+view.budget.confirmedFixed+', pendientes '+view.budget.pendingFixed+'.','Reserva estimada '+view.budget.reserve+'; déficit actual '+view.budget.deficit+'.','Mínimos seguros y esperados del próximo mes:'];
  if(view.projection.length){const minima=view.guidance[1];lines.push('Seguro '+minima.safeMinimum+' el '+minima.date+'; esperado '+minima.expectedMinimum+' el '+minima.expectedDate+'.');}
  lines.push('Cuentas: '+view.accounts.map(item=>item.label+' '+item.balance).join('; ')+'.');
  if(view.recurring.length)lines.push('Pagos e ingresos recurrentes próximos: '+view.recurring.map(item=>item.label+', '+item.type+', '+item.amount+' el '+item.date).join('; ')+'.');
  if(view.goals.length)lines.push('Metas: '+view.goals.map(item=>item.label+', restante '+item.remaining+(item.dueDate?' hasta '+item.dueDate:'')).join('; ')+'.');
  lines.push('Sugerencias: '+view.guidance.map(item=>item.suggestion).join(' '));
  lines.push('Fórmulas: '+view.guidance.map(item=>item.title+': '+item.formula).join(' '));
  if(view.dataNotes.length)lines.push('Datos faltantes: '+view.dataNotes.join(' '));
  return lines.join('\n');
}
