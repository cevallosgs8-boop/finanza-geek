import { normalizeReconciliationText } from './reconciliation-text.mjs';
const plain=o=>o!==null&&typeof o==='object'&&!Array.isArray(o);
const ID=/^[A-Za-z0-9_-]{1,80}$/;
const safe=Number.isSafeInteger;
const text=(v,min,max)=>typeof v==='string'&&v.trim().length>=min&&v.length<=max;
const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&(()=>{const [y,m,d]=v.split('-').map(Number),x=new Date(0);x.setFullYear(y,m-1,d);return y>=1900&&y<=9999&&x.getFullYear()===y&&x.getMonth()===m-1&&x.getDate()===d})();
const exact=(o,keys,label)=>{if(!plain(o)||Object.keys(o).sort().join('|')!==keys.slice().sort().join('|'))throw Error(label+' schema has unknown or missing properties');};
const mappingKeys=['id','label','delimiter','dateFormat','decimal','dateColumn','descriptionColumn','amountColumn','debitColumn','creditColumn','balanceColumn'];
const markKeys=['movementId','accountId','rowFingerprint','movementSignature'];
const col=v=>v===null||safe(v)&&v>=0&&v<=49;
const safeLabel=s=>String(s||'').replace(/[\u0000-\u001f\u007f-\u009f]/g,' ').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'').replace(/(?:\d[ -]?){7,19}/g,'').replace(/\s+/g,' ').trim().slice(0,60);
export function defaultReconciliation(){return {mappings:[],marks:[]};}
export function validateReconciliation(value,{state={accounts:[],movements:[]}}={}){
 exact(value,['mappings','marks'],'reconciliation');if(!Array.isArray(value.mappings)||!Array.isArray(value.marks)||value.mappings.length>20||value.marks.length>10000)throw Error('reconciliation entity limit exceeded');
 const mappings=new Set();for(const x of value.mappings){exact(x,mappingKeys,'reconciliation mapping');if(!ID.test(x.id)||mappings.has(x.id)||!text(x.label,1,60)||safeLabel(x.label)!==x.label||![';',',','\t'].includes(x.delimiter)||!['iso','dmy'].includes(x.dateFormat)||!['dot','comma'].includes(x.decimal)||x.dateColumn===null||x.descriptionColumn===null||mappingKeys.slice(5).some(k=>!col(x[k])))throw Error('invalid reconciliation mapping');const amount=x.amountColumn!==null,debit=x.debitColumn!==null,credit=x.creditColumn!==null;if(amount===debit||amount===credit||debit!==credit)throw Error('mapping requires signed amount or debit and credit');const cols=[x.dateColumn,x.descriptionColumn,x.amountColumn,x.debitColumn,x.creditColumn,x.balanceColumn].filter(v=>v!==null);if(new Set(cols).size!==cols.length)throw Error('mapping columns must be distinct');mappings.add(x.id);}
 const ac=new Map((state.accounts||[]).map(x=>[x.id,x])),mv=new Map((state.movements||[]).map(x=>[x.id,x])),seen=new Set(),seenMovement=new Set();for(const x of value.marks){exact(x,markKeys,'reconciliation mark');const key=x.accountId+'|'+x.rowFingerprint;if(!ID.test(x.movementId)||!ac.has(x.accountId)||!mv.has(x.movementId)||! /^[a-f0-9]{64}$/.test(x.rowFingerprint)||typeof x.movementSignature!=='string'||!x.movementSignature||x.movementSignature.length>500||seen.has(key))throw Error('invalid reconciliation mark reference or signature');const m=mv.get(x.movementId);if(m.accountId!==x.accountId&&!(m.type==='transfer'&&m.toAccountId===x.accountId))throw Error('reconciliation mark account mismatch');if(x.movementSignature!==movementSignature(state,m,x.accountId))throw Error('stale reconciliation mark');const mk=x.accountId+'|'+x.movementId;if(seenMovement.has(mk))throw Error('duplicate reconciliation movement mark');seenMovement.add(mk);seen.add(key);}
 return true;
}
export function reduceReconciliationAction(value,action,{state={accounts:[],movements:[]}}={}){
 if(!plain(action)||typeof action.type!=='string')throw Error('invalid reconciliation action');const n=structuredClone(value);
 if(action.type==='reconciliation.mapping.set'){if(Object.keys(action).sort().join('|')!=='mapping|type')throw Error('invalid mapping action');const x=structuredClone(action.mapping);if(plain(x))x.label=safeLabel(x.label);const i=n.mappings.findIndex(y=>y.id===x?.id);if(i<0)n.mappings.push(x);else n.mappings[i]=x;}
 else if(action.type==='reconciliation.mapping.remove'){if(Object.keys(action).sort().join('|')!=='id|type'||!ID.test(action.id))throw Error('invalid mapping removal');n.mappings=n.mappings.filter(x=>x.id!==action.id);}
 else if(action.type==='reconciliation.mark'){
  if(Object.keys(action).sort().join('|')!=='accountId|movementId|movementSignature|row|type')throw Error('invalid mark action');const row=action.row;if(!plain(row)||typeof row.fingerprint!=='string'||! /^[a-f0-9]{64}$/.test(row.fingerprint)||!date(row.date)||typeof row.description!=='string'||row.description.length>180||!safe(row.amountCents)||row.amountCents===0)throw Error('invalid reconciliation row snapshot');
  const m=state.movements.find(x=>x.id===action.movementId),accountId=action.accountId;if(!m||!(m.accountId===accountId||m.type==='transfer'&&m.toAccountId===accountId))throw Error('movement account mismatch');
  const sig=action.movementSignature;if(typeof sig!=='string'||sig.length>500||sig!==movementSignature(state,m,accountId))throw Error('movement signature changed');
  const expected=m.type==='expense'&&m.accountId===accountId?-m.amountCents:m.type==='income'&&m.accountId===accountId?m.amountCents:m.type==='transfer'&&m.accountId===accountId?-(m.amountCents+m.feeCents):m.type==='transfer'&&m.toAccountId===accountId?m.amountCents:null;if(expected===null||expected!==row.amountCents||Math.abs(day(row.date)-day(m.date))>2||normalize(m.note)!==normalize(row.description))throw Error('statement row is not compatible with movement');
  if(n.marks.some(x=>x.accountId===accountId&&(x.movementId===m.id||x.rowFingerprint===row.fingerprint)))throw Error('reconciliation pair already marked');
  n.marks.push({movementId:m.id,accountId,rowFingerprint:row.fingerprint,movementSignature:sig});
 }else if(action.type==='reconciliation.unmark'){if(Object.keys(action).sort().join('|')!=='accountId|rowFingerprint|type'||!ID.test(action.accountId)||! /^[a-f0-9]{64}$/.test(action.rowFingerprint))throw Error('invalid unmark action');n.marks=n.marks.filter(x=>!(x.accountId===action.accountId&&x.rowFingerprint===action.rowFingerprint));}
 else throw Error('unknown reconciliation action');
 validateReconciliation(n,{state});return n;
}
function normalize(s){return normalizeReconciliationText(s);}
function day(s){return Date.UTC(Number(s.slice(0,4)),Number(s.slice(5,7))-1,Number(s.slice(8,10)))/86400000;}
export function movementSignature(state,movement,accountId){
 const payload=[accountId,movement.id,movement.type,movement.date,movement.amountCents,movement.accountId,movement.toAccountId||'',movement.feeCents||0,normalize(movement.note||movement.name||'')].join('|');
 return payload.length<=500?payload:payload.slice(0,500);
}
