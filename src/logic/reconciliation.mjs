import { normalizeReconciliationText } from './reconciliation-text.mjs';
import { movementSignature } from './reconciliation-schema.mjs';
import { normalizeMerchant } from './inbox.mjs';
import { computeSummary } from './finance.mjs';
const MAX_BYTES=2*1024*1024,MAX_ROWS=2000,MAX_COLUMNS=50;
const safe=Number.isSafeInteger,plain=o=>o!==null&&typeof o==='object'&&!Array.isArray(o);
function decode(input,encoding='utf-8'){
 if(typeof input==='string')return input;
 if(!(input instanceof Uint8Array))throw Error('statement must be text or bytes');
 if(input.byteLength>MAX_BYTES)throw Error('statement exceeds 2 MiB');
 try{return new TextDecoder(encoding,{fatal:true}).decode(input);}catch{throw Error('statement encoding is invalid');}
}
function csv(text,delimiter,checkSize=true){
 if(typeof text!=='string')throw Error('statement must be text');
 if(checkSize&&new TextEncoder().encode(text).byteLength>MAX_BYTES)throw Error('statement exceeds 2 MiB');
 text=text.replace(/^\uFEFF/,'');
 if(![',',';','\t'].includes(delimiter))throw Error('delimiter must be selected explicitly');
 const rows=[];let row=[],field='',quoted=false,closed=false,line=1,rowLine=1;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else{if(c==='\r'){if(text[i+1]==='\n')i++;field+='\n';line++;}else{field+=c;if(c==='\n')line++;}}continue;}
  if(closed&&c!==delimiter&&c!=='\r'&&c!=='\n'&&c!==' '&&c!=='\t')throw Error('malformed CSV');
  if(c==='"'){if(field.length||closed)throw Error('malformed CSV');quoted=true;continue;}
  if(c===delimiter){row.push(field);field='';closed=false;if(row.length>=MAX_COLUMNS)throw Error('column limit exceeded');continue;}
  if(c==='\r'||c==='\n'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);field='';closed=false;if(row.length>MAX_COLUMNS)throw Error('column limit exceeded');if(row.some(x=>x.trim()!==''))rows.push({cells:row,line:rowLine});row=[];line++;rowLine=line;if(rows.length>MAX_ROWS+1)throw Error('row limit exceeded');continue;}
  if(closed){if(c===' '||c==='\t')continue;throw Error('malformed CSV');}
  field+=c;
 }
 if(quoted)throw Error('malformed CSV');if(field!==''||row.length){row.push(field);if(row.length>MAX_COLUMNS)throw Error('column limit exceeded');if(row.some(x=>x!==''))rows.push({cells:row,line:rowLine});}
 if(rows.length>MAX_ROWS+1)throw Error('row limit exceeded');
 return rows;
}
function rowsFor(text,delimiter,checkSize=true){const all=csv(text,delimiter,checkSize),head=all.findIndex(r=>r.cells.some(x=>x.trim()!==''));if(head<0)throw Error('header row is missing');return {headers:all[head].cells.map(x=>x.trim()),width:all[head].cells.length,rows:all.slice(head+1).filter(r=>r.cells.some(x=>x.trim()!==''))};}
export async function inspectStatement(input,{delimiter=',',encoding='utf-8'}={}){const {headers,rows}=rowsFor(decode(input,encoding),delimiter,!(encoding==='windows-1252'&&input instanceof Uint8Array));return {headers,rowCount:rows.length};}
function validDate(s,format){
 s=String(s||'').trim();let m;if(format==='iso'){m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s);if(!m)return null;return date(m[1],m[2],m[3]);}
 m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);if(!m)return null;return date(m[3],m[2],m[1]);
}
function date(y,m,d){const yr=Number(y),mo=Number(m),dy=Number(d),x=new Date(0);x.setFullYear(yr,mo-1,dy);x.setHours(0,0,0,0);return yr>=1900&&yr<=9999&&x.getFullYear()===yr&&x.getMonth()===mo-1&&x.getDate()===dy?String(yr).padStart(4,'0')+'-'+String(mo).padStart(2,'0')+'-'+String(dy).padStart(2,'0'):null;}
function money(raw,decimal,{signed=true}={}){
 let s=String(raw||'').trim();if(!s)return null;let neg=false;if(/^\(.*\)$/.test(s)){const inner=s.slice(1,-1).trim();if(/[+-]/.test(inner))return null;neg=true;s=inner;}else if(s[0]==='-'||s[0]==='+'){if(s[0]==='-')neg=true;s=s.slice(1);}const dec=decimal==='comma'?',':'.',group=dec===','?'.':',';if((s.match(new RegExp('\\'+dec,'g'))||[]).length>1)return null;
 let [whole,frac='']=s.split(dec);if(frac.length>2||frac&&!/^\d+$/.test(frac))return null;if(whole.includes(group)){if(!new RegExp('^\\d{1,3}(?:\\'+group+'\\d{3})+$').test(whole))return null;whole=whole.split(group).join('');}if(!/^\d+$/.test(whole)||whole.length>16)return null;let cents;try{cents=BigInt(whole)*100n+BigInt((frac+'00').slice(0,2));}catch{return null;}if(cents>BigInt(Number.MAX_SAFE_INTEGER))return null;let n=Number(cents);if(neg)n=-n;if(!signed&&n<0)return null;return safe(n)?n:null;
}
const reason=(row,why)=>({row,reason:why});
export async function parseStatement(input,{mapping,accountId,idFactory=()=>crypto.randomUUID(),encoding='utf-8'}={}){
 if(!plain(mapping)||!accountId)throw Error('mapping and account are required');const text=decode(input,encoding),{rows,width}=rowsFor(text,mapping.delimiter,!(encoding==='windows-1252'&&input instanceof Uint8Array)),out=[],errors=[],ordinal=new Map();let dataCount=0;
 for(const item of rows){dataCount++;const r=item.cells;if(r.length>MAX_COLUMNS){errors.push(reason(item.line,'too many columns'));continue;}if(r.length<=Math.max(...[mapping.dateColumn,mapping.descriptionColumn,mapping.amountColumn,mapping.debitColumn,mapping.creditColumn,mapping.balanceColumn].filter(Number.isInteger))){errors.push(reason(item.line,'missing mapped column'));continue;}if(r.length!==width){errors.push(reason(item.line,'irregular column count'));continue;}
  const date=validDate(r[mapping.dateColumn],mapping.dateFormat);const description=normalizeMerchant(r[mapping.descriptionColumn]||'').slice(0,180);let amount;
  if(mapping.amountColumn!==null)amount=money(r[mapping.amountColumn],mapping.decimal);
  else{const debitRaw=r[mapping.debitColumn].trim(),creditRaw=r[mapping.creditColumn].trim(),debit=debitRaw?money(debitRaw,mapping.decimal,{signed:false}):0,credit=creditRaw?money(creditRaw,mapping.decimal,{signed:false}):0;if(debit===null||credit===null||debit>0&&credit>0)amount=null;else amount=debit>0?-debit:credit>0?credit:null;}
  const balance=mapping.balanceColumn===null||!r[mapping.balanceColumn].trim()?null:money(r[mapping.balanceColumn],mapping.decimal);
  if(!date)errors.push(reason(item.line,'invalid date'));else if(!description)errors.push(reason(item.line,'invalid description'));else if(!safe(amount)||amount===0)errors.push(reason(item.line,'invalid amount'));else if(mapping.balanceColumn!==null&&r[mapping.balanceColumn].trim()&&!safe(balance))errors.push(reason(item.line,'invalid balance'));else{
   const key=[accountId,date,description,amount].join('|'),ord=(ordinal.get(key)||0)+1;ordinal.set(key,ord);const fingerprint=await digest([accountId,date,description,amount,ord].join('|'));
   out.push({id:idFactory(),fingerprint,date,description,amountCents:amount,balanceCents:balance});
  }
 }
 void dataCount;return {rows:out,errors};
}
async function digest(v){const data=new TextEncoder().encode(v);if(globalThis.crypto?.subtle){const h=await globalThis.crypto.subtle.digest('SHA-256',data);return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('');}throw Error('WebCrypto is unavailable');}
function utcDay(s){return Date.UTC(Number(s.slice(0,4)),Number(s.slice(5,7))-1,Number(s.slice(8,10)))/86400000;}
function dateValid(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s||''))return false;const [y,m,d]=s.split('-').map(Number),x=new Date(0);x.setFullYear(y,m-1,d);return y>=1900&&y<=9999&&x.getFullYear()===y&&x.getMonth()===m-1&&x.getDate()===d;}
function normalize(s){return normalizeReconciliationText(s);}
function effect(m,accountId){if(m.accountId===accountId){if(m.type==='expense')return -m.amountCents;if(m.type==='income')return m.amountCents;if(m.type==='transfer')return -(m.amountCents+m.feeCents);}if(m.type==='transfer'&&m.toAccountId===accountId)return m.amountCents;return null;}
export function reconcileStatement(state,rows,{accountId,startDate,endDate,today,parseErrors=[]}={}){
 if(!state.accounts.some(a=>a.id===accountId)||!dateValid(startDate)||!dateValid(endDate)||startDate>endDate)throw Error('account and valid date range are required');
 const bank=rows.filter(r=>r.date>=startDate&&r.date<=endDate),inAccount=m=>m.accountId===accountId||m.type==='transfer'&&m.toAccountId===accountId,app=state.movements.filter(m=>inAccount(m)&&m.date>=startDate&&m.date<=endDate),possibleApp=state.movements.filter(inAccount);
 const candidates=new Map(),reverse=new Map();for(let i=0;i<bank.length;i++){const js=[];for(let j=0;j<possibleApp.length;j++){const m=possibleApp[j],distance=Math.abs(utcDay(m.date)-utcDay(bank[i].date));if(distance>2||normalize(m.note||m.name)!==normalize(bank[i].description))continue;const e=effect(m,accountId);let comparable=['income','expense','transfer'].includes(m.type)&&e===bank[i].amountCents; if(['loan','repayment'].includes(m.type)&&m.accountId===accountId){const loan=state.loans.find(l=>l.id===m.loanId);if(loan){const signed=m.type==='loan'?(loan.direction==='borrowed'?m.amountCents:-m.amountCents):(loan.direction==='borrowed'?-m.amountCents:m.amountCents);comparable=signed===bank[i].amountCents;}}if(!comparable||!normalize(m.note||m.name))continue;js.push(j);if(!reverse.has(j))reverse.set(j,[]);reverse.get(j).push(i);}candidates.set(i,js);}
 const matched=[],ambiguous=[],usedB=new Set(),usedA=new Set();for(const [i,js] of candidates){const hasLoan=js.some(j=>['loan','repayment'].includes(possibleApp[j].type));if(js.length>1||hasLoan||js.some(j=>(reverse.get(j)||[]).length>1)){for(const j of js){ambiguous.push({row:bank[i],movement:possibleApp[j]});usedA.add(j);}if(js.length)usedB.add(i);continue;}if(js.length===1){const j=js[0];matched.push({row:bank[i],movement:possibleApp[j]});usedB.add(i);usedA.add(j);}}
 const bankOnly=bank.filter((_,i)=>!usedB.has(i)),usedMovementIds=new Set([...usedA].map(j=>possibleApp[j].id)),appOnly=app.filter(m=>!usedMovementIds.has(m.id));
 const latestDate=bank.map(x=>x.date).sort().at(-1),lastDay=bank.filter(r=>r.date===latestDate),dated=lastDay.filter(r=>r.balanceCents!==null);let balance={status:'inconclusive',bankCents:null,appCents:null,differenceCents:null,date:null};
 if(!parseErrors.length&&lastDay.length===1&&dated.length===1){const r=dated[0],summary=computeSummary(state,r.date),value=summary.accountBalances?.[accountId];if(safe(value)){const delta=BigInt(r.balanceCents)-BigInt(value);if(delta>=BigInt(Number.MIN_SAFE_INTEGER)&&delta<=BigInt(Number.MAX_SAFE_INTEGER))balance={status:'conclusive',bankCents:r.balanceCents,appCents:value,differenceCents:Number(delta),date:r.date};}}
 return {matched,bankOnly,appOnly,ambiguous,balance};
}
export { movementSignature };
export async function statementInboxItems(rows,{accountId,idFactory=()=>crypto.randomUUID()}={}){
 if(!accountId||!Array.isArray(rows))throw Error('account and rows are required');const out=[];for(const row of rows)out.push({id:idFactory(),fingerprint:row.fingerprint,source:'statement',date:row.date,time:null,merchant:normalizeMerchant(row.description).slice(0,120),amountCents:Math.abs(row.amountCents),currency:'USD',kind:'unknown',cardHint:'',accountId,category:'',status:'pending',movementId:null});return out;
}
