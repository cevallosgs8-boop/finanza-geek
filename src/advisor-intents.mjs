import { localDate, parseAmount } from './logic/finance.mjs';

const kinds=new Set(['purchase','expense-recurring','income-once','income-recurring','loan-lent','loan-borrowed','goal']);
function validDate(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(new Date(value+'T12:00:00').getTime())&&new Date(value+'T12:00:00').toISOString().slice(0,10)===value;}
function addMonths(date,count){const [year,month,day]=date.split('-').map(Number),target=new Date(year,month-1+count,1),last=new Date(target.getFullYear(),target.getMonth()+1,0).getDate();return target.getFullYear()+'-'+String(target.getMonth()+1).padStart(2,'0')+'-'+String(Math.min(day,last)).padStart(2,'0');}
function amount(value,label){if(value===undefined||value===null||String(value).trim()==='')throw Error('Completa '+label.toLowerCase()+'.');const cents=parseAmount(String(value));if(!Number.isSafeInteger(cents)||cents<1)throw Error(label+' debe ser mayor que cero.');return cents;}
function optionalAmount(value,label){if(value===undefined||value===null||String(value).trim()==='')return 0;const cents=parseAmount(String(value));if(!Number.isSafeInteger(cents)||cents<0)throw Error(label+' no puede ser negativo.');return cents;}
export function buildScenarioInput(values,{today=localDate(),state}={}){
 if(!values||typeof values!=='object'||!kinds.has(values.kind))throw Error('Elige un tipo de escenario válido.');
 const date=String(values.date||'').trim(),horizon=addMonths(today,36);if(!validDate(date)||date<today||date>horizon)throw Error('La fecha debe estar entre hoy y 36 meses.');
 const amountCents=amount(values.amount,'Importe');
 const goal=values.kind==='goal';let accountId=null,category='';
 if(!goal){accountId=String(values.accountId||'');if(!state?.accounts?.some(x=>x.id===accountId))throw Error('Elige una cuenta existente.');category=String(values.category||'').trim();if(!category||category.length>40)throw Error('Elige una categoría de hasta 40 caracteres.');}
 let monthlyContributionCents=null,dueDate=null,goalId=null;
 if(goal){goalId=String(values.goalId||'');if(!state?.goals?.some(x=>x.id===goalId))throw Error('Elige una meta existente.');dueDate=String(values.dueDate||'').trim();if(!validDate(dueDate)||dueDate<date||dueDate>horizon)throw Error('La fecha de la meta debe ser igual o posterior al escenario y estar dentro de 36 meses.');monthlyContributionCents=optionalAmount(values.monthlyContribution,'Aporte mensual');}
 return {kind:values.kind,amountCents,accountId,date,category,monthlyContributionCents,dueDate,goalId};
}
function id(value,label){if(typeof value!=='string'||!value.trim())throw Error('Falta '+label+'.');return value;}
export function buildAdvisorIntent(kind,data={}){
 switch(kind){
  case 'settings':if(!data.patch||typeof data.patch!=='object')throw Error('Ajustes inválidos.');return {type:'advisor.settings',patch:data.patch};
  case 'emergency':if(typeof data.enabled!=='boolean')throw Error('Estado de emergencia inválido.');return {type:'advisor.emergency',enabled:data.enabled};
  case 'scenario.save':{if(!data.scenario)throw Error('Falta el escenario.');const action={type:'advisor.scenario.save',scenario:data.scenario};if(data.today!==undefined)action.today=data.today;return action;}
  case 'scenario.delete':return {type:'advisor.scenario.delete',id:id(data.id,'el identificador del escenario')};
  case 'pattern.dismiss':return {type:'advisor.pattern.dismiss',key:id(data.key,'la propuesta'),forever:data.forever===true};
  case 'pattern.accept':if(!data.recurring)throw Error('Revisa la regla recurrente antes de aceptarla.');return {type:'advisor.pattern.accept',key:id(data.key,'la propuesta'),recurring:data.recurring};
  case 'mission.start':case 'mission.cancel':case 'mission.evaluate':{const today=data.today||localDate();if(!validDate(today))throw Error('La fecha local no es válida.');return {type:'advisor.'+kind,today};}
  default:throw Error('Tipo de acción del asesor desconocido.');
 }
}
