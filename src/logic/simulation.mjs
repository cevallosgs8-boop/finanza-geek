import { computeSummary, localDate, migrateState, validateState } from './finance.mjs';
import { computeAdvisorPlan } from './advisor.mjs';
import { computeGoalSummary } from './goals.mjs';

const inputKeys=['kind','amountCents','accountId','date','category','monthlyContributionCents','dueDate','goalId'];
const kinds=new Set(['purchase','expense-recurring','income-once','income-recurring','loan-lent','loan-borrowed','goal']);
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const safe=(value,min=0)=>Number.isSafeInteger(value)&&value>=min;
function validDate(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const [year,month,day]=value.split('-').map(Number),date=new Date(0);
  date.setFullYear(year,month-1,day);
  return year>=1900&&year<=9999&&date.getFullYear()===year&&date.getMonth()===month-1&&date.getDate()===day;
}
function lastDay(month){const [year,number]=month.split('-').map(Number),date=new Date(0);date.setFullYear(year,number,0);return date.getDate();}
function dateAtMonth(month,day){return month+'-'+String(Math.min(day,lastDay(month))).padStart(2,'0');}
function addMonths(date,count){
  const month=date.slice(0,7),[year,number]=month.split('-').map(Number),index=year*12+number-1+count,nextYear=Math.floor(index/12),nextMonth=index%12+1;
  if(nextYear>9999||nextYear<1900)throw Error('date horizon exceeds supported calendar');
  const next=String(nextYear).padStart(4,'0')+'-'+String(nextMonth).padStart(2,'0');
  return dateAtMonth(next,Number(date.slice(8)));
}
function monthIndex(month){const [year,number]=month.split('-').map(Number);return year*12+number-1;}
function validateInput(input,{state,today,horizon}){
  if(!plain(input)||Object.keys(input).sort().join('|')!==[...inputKeys].sort().join('|'))throw Error('scenario input has unknown or missing properties');
  if(!kinds.has(input.kind)||!safe(input.amountCents,1)||!validDate(input.date)||input.date<today||input.date>horizon)throw Error('invalid scenario kind, amount or date horizon');
  if(typeof input.category!=='string'||input.category.trim()!==input.category||input.category.length>40)throw Error('invalid scenario category');
  const needsAccount=input.kind!=='goal',account=needsAccount?state.accounts.find(item=>item.id===input.accountId):null;
  if(needsAccount?!account:input.accountId!==null)throw Error('scenario account not found or not applicable');
  if(input.kind==='goal'){
    if(typeof input.goalId!=='string'||!state.goals.some(goal=>goal.id===input.goalId)||!validDate(input.dueDate)||input.dueDate<input.date||input.dueDate>horizon||!(input.monthlyContributionCents===null||safe(input.monthlyContributionCents)))throw Error('invalid goal scenario dates, reference or contribution');
    if(input.category!=='')throw Error('goal scenario category is not applicable');
  }else if(input.goalId!==null||input.dueDate!==null||input.monthlyContributionCents!==null)throw Error('goal fields are not applicable to this scenario');
  if(input.kind!=='goal'&&!input.category)throw Error('scenario category is required');
}
function assertOptions(options){
  if(!plain(options)||Object.keys(options).some(key=>!['today','month','goalId'].includes(key)))throw Error('invalid simulation options');
}
function scenarioId(state,stem){
  let id='sim-'+stem,index=1;
  const used=new Set([...state.accounts,...state.movements,...state.loans,...state.recurring,...state.confirmations,...state.taxRecords,...state.goals,...state.goalEntries,...state.roundupRecords].map(item=>item.id));
  while(used.has(id))id='sim-'+stem+'-'+index++;
  return id;
}
function hypotheticalState(state,input){
  const next=structuredClone(state),accountId=input.accountId;
  if(input.kind==='purchase'||input.kind==='income-once'){
    const id=scenarioId(next,'movement');
    next.movements.push({id,type:input.kind==='purchase'?'expense':'income',date:input.date,amountCents:input.amountCents,accountId,toAccountId:null,feeCents:0,category:input.category,note:'',loanId:null});
  }else if(input.kind==='expense-recurring'||input.kind==='income-recurring'){
    const id=scenarioId(next,'recurring'),day=Number(input.date.slice(8));
    const [year,monthNumber]=input.date.split('-').map(Number),date=new Date(0);date.setFullYear(year,monthNumber,0);
    const isEnd=day===date.getDate(),recurringDay=isEnd?31:day;
    next.recurring.push({id,name:'Escenario',type:input.kind==='expense-recurring'?'expense':'income',amountCents:input.amountCents,accountId,category:input.category,startDate:input.date,endDate:null,frequency:'monthly',dayStart:recurringDay,dayEnd:recurringDay,archived:false});
  }else if(input.kind==='loan-lent'||input.kind==='loan-borrowed'){
    const id=scenarioId(next,'loan'),movementId=scenarioId(next,'loan-movement'),direction=input.kind==='loan-lent'?'lent':'borrowed';
    next.loans.push({id,label:'Escenario',direction,principalCents:input.amountCents,accountId,date:input.date});
    next.movements.push({id:movementId,type:'loan',date:input.date,amountCents:input.amountCents,accountId,toAccountId:null,feeCents:0,category:'Préstamo',note:'Escenario',loanId:id});
  }
  validateState(next);
  return next;
}
function buildView(state,{month,today}){
  const plan=computeAdvisorPlan(state,{month,today}),currentMonth=today.slice(0,7),selectedDates=plan.projection.filter(point=>month===currentMonth?point.date>=today:true);
  const minimum=(field)=>selectedDates.reduce((lowest,point)=>lowest===null||point[field]<lowest.balanceCents?{date:point.date,balanceCents:point[field]}:lowest,null);
  const endDate=dateAtMonth(month,lastDay(month)),end=computeSummary(state,endDate),last=selectedDates.at(-1);
  return {
    end:{balanceCents:end.balanceCents,availableCents:end.availableCents,borrowedOutstandingCents:end.borrowedOutstandingCents,lentOutstandingCents:end.lentOutstandingCents,safeBalanceCents:last?.safeBalanceCents??end.availableCents,expectedBalanceCents:last?.expectedBalanceCents??end.availableCents},
    projection:selectedDates.map(point=>({date:point.date,safeBalanceCents:point.safeBalanceCents,expectedBalanceCents:point.expectedBalanceCents})),
    minimumSafe:minimum('safeBalanceCents'),
    minimumExpected:minimum('expectedBalanceCents'),
    negativeSafeDates:selectedDates.filter(point=>point.safeBalanceCents<0).map(point=>point.date),
    negativeExpectedDates:selectedDates.filter(point=>point.expectedBalanceCents<0).map(point=>point.date),
    distribution:{...plan.planned.distribution},
    budgetDistribution:{...plan.budget.distribution},
    emergency:plan.emergency?.enabled===true
  };
}
function ceilDiv(amount,divisor){const result=(BigInt(amount)+BigInt(divisor)-1n)/BigInt(divisor);if(result>BigInt(Number.MAX_SAFE_INTEGER))throw Error('unsafe goal estimate');return Number(result);}
function safeDifference(after,before){const difference=BigInt(after)-BigInt(before);if(difference>BigInt(Number.MAX_SAFE_INTEGER)||difference<BigInt(Number.MIN_SAFE_INTEGER))throw Error('unsafe simulation difference');return Number(difference);}
function goalEffect(canonical,input,goalId,today){
  if(!goalId)return null;
  const goal=canonical.goals.find(item=>item.id===goalId);if(!goal)throw Error('goal not found');
  const summary=computeGoalSummary(canonical,goalId,today),targetCents=input.kind==='goal'?input.amountCents:(summary.estimatedPriceCents??goal.targetCents);
  const reservedCents=summary.reservedCents,remainingCents=Math.max(0,targetCents-reservedCents),dueDate=input.kind==='goal'?input.dueDate:goal.dueDate,startDate=input.kind==='goal'?input.date:today;
  const knownMonthlyContributionCents=input.kind==='goal'?(input.monthlyContributionCents??goal.monthlyContributionCents):goal.monthlyContributionCents;
  let requiredMonthlyContributionCents=null,estimatedMonths=null,estimatedDate=null,reason=null;
  if(remainingCents===0){requiredMonthlyContributionCents=0;estimatedMonths=0;estimatedDate=startDate;reason='already-funded';}
  else if(!dueDate){reason='no-due-date';}
  else if(dueDate<startDate){reason='due-date-past';}
  else{
    const count=monthIndex(dueDate.slice(0,7))-monthIndex(startDate.slice(0,7))+1;
    requiredMonthlyContributionCents=ceilDiv(remainingCents,count);
    if(knownMonthlyContributionCents===0)reason='zero-contribution';
    else{
      estimatedMonths=ceilDiv(remainingCents,knownMonthlyContributionCents);
      if(estimatedMonths>1200){estimatedMonths=null;reason='estimate-limit';}
      else{const etaMonth=addMonths(startDate,estimatedMonths-1).slice(0,7);estimatedDate=dateAtMonth(etaMonth,lastDay(etaMonth));}
    }
  }
  return {goalId,targetCents,reservedCents,remainingCents,dueDate,requiredMonthlyContributionCents,knownMonthlyContributionCents,estimatedMonths,estimatedDate,reason};
}
export function simulateScenario(state,input,options={}){
  assertOptions(options);
  validateState(state);
  const canonical=migrateState(state);
  const today=options.today??localDate(),month=options.month??today.slice(0,7);
  if(!validDate(today))throw Error('invalid today');
  const horizon=addMonths(today,36);
  validateInput(input,{state:canonical,today,horizon});
  if(typeof month!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||monthIndex(month)<monthIndex(today.slice(0,7))||monthIndex(month)>monthIndex(horizon.slice(0,7)))throw Error('invalid comparison month horizon');
  const goalId=options.goalId??input.goalId??null;
  if(goalId!==null&&!canonical.goals.some(goal=>goal.id===goalId))throw Error('goal not found');
  const baseline=buildView(canonical,{month,today}),projectedState=hypotheticalState(canonical,input),scenario=buildView(projectedState,{month,today});
  const distribution={};for(const key of ['savings','outings','games','buffer'])distribution[key]=safeDifference(scenario.distribution[key],baseline.distribution[key]);
  const notes=[];
  if(input.kind==='purchase')notes.push('El importe se toma como coste final con impuestos y comisiones ya incluidos.');
  if(input.kind==='loan-borrowed')notes.push('El capital recibido aumenta el saldo contable y sigue protegido como deuda pendiente; no aumenta el disponible.');
  if(input.kind==='loan-lent')notes.push('El capital prestado reduce el disponible; no se inventan cuotas ni una fecha de pago.');
  if(input.kind==='expense-recurring'||input.kind==='income-recurring')notes.push('La recurrencia comienza en la fecha elegida y usa el ajuste de fin de mes del calendario local.');
  if(input.kind==='goal')notes.push('La meta es hipotética; no mueve dinero ni crea reservas.');
  return {kind:input.kind,today,month,base:baseline,scenario,change:{balanceCents:safeDifference(scenario.end.balanceCents,baseline.end.balanceCents),availableCents:safeDifference(scenario.end.availableCents,baseline.end.availableCents),minimumSafeCents:safeDifference(scenario.minimumSafe.balanceCents,baseline.minimumSafe.balanceCents),minimumExpectedCents:safeDifference(scenario.minimumExpected.balanceCents,baseline.minimumExpected.balanceCents),distribution},goalImpact:goalEffect(canonical,input,goalId,today),notes};
}
