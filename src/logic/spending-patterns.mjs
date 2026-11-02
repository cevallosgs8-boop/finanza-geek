const safe=n=>Number.isSafeInteger(n);
const add=(a,b)=>{const n=a+b;if(!safe(n))throw Error('unsafe pattern total');return n;};
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s);
const daysInMonth=month=>{const [y,m]=month.split('-').map(Number),d=new Date(0);d.setFullYear(y,m,0);return d.getDate();};
const previousMonth=month=>{const [y,m]=month.split('-').map(Number);return m===1?`${y-1}-12`:`${y}-${String(m-1).padStart(2,'0')}`;};
const normalizeNote=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const normalizeIdentity=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[\p{P}\p{S}]+/gu,' ').trim().replace(/\s+/g,' ');
const confirmedIds=state=>new Set((state.confirmations||[]).map(x=>x.movementId));
const effectiveExpenses=(state,{today,month,thresholdCents=Number.MAX_SAFE_INTEGER,accountId=null}={})=>{
 if(!validDate(today)||!/^\d{4}-\d{2}$/.test(month)||!safe(thresholdCents)||thresholdCents<1)throw Error('invalid small expense query');
 const confirmed=confirmedIds(state);return (state.movements||[]).filter(m=>m.type==='expense'&&m.amountCents<thresholdCents&&m.amountCents>0&&m.date<=today&&m.date.slice(0,7)===month&&!confirmed.has(m.id)&&(accountId===null||m.accountId===accountId));
};
export function smallExpenses(state,{month,today,thresholdCents=500,grouping='category',accountId=null}={}){
 if(!['category','note'].includes(grouping))throw Error('invalid small expense grouping');
 const moves=effectiveExpenses(state,{month,today,thresholdCents,accountId});const groups=new Map();
 for(const m of moves){const normalized=grouping==='category'?m.category:normalizeNote(m.note);const key=grouping==='category'?`category:${m.category}`:`note:${normalized||'sin descripcion'}`,label=grouping==='category'?m.category:(normalized||'Sin descripción');let g=groups.get(key);if(!g){g={key,label,count:0,totalCents:0,...(grouping==='category'?{category:m.category}:{})};groups.set(key,g);}g.count++;g.totalCents=add(g.totalCents,m.amountCents);}
 const eligible=[...groups.values()].filter(g=>g.count>=3),count=eligible.reduce((n,g)=>n+g.count,0),totalCents=eligible.reduce((n,g)=>add(n,g.totalCents),0),sorted=eligible.sort((a,b)=>b.totalCents-a.totalCents||a.label.localeCompare(b.label,'es')).slice(0,3),partialMonth=month===today.slice(0,7)&&today.slice(8,10)!==String(daysInMonth(month)).padStart(2,'0');
 return {month,today,thresholdCents,grouping,accountId,count,totalCents,annualEstimateCents:add(0,totalCents*12),partialMonth,groups:sorted};
}

function median(values){const sorted=[...values].sort((a,b)=>a-b);if(!sorted.length)return null;const mid=Math.floor(sorted.length/2);if(sorted.length%2)return sorted[mid];return Number((BigInt(sorted[mid-1])+BigInt(sorted[mid]))/2n);}
function monthDaysOffset(day,month){const dim=daysInMonth(month);return day>=dim-2?31:day;}
function closeDay(a,b){return Math.abs(a-b)<=3;}
export function recurringMatchesPattern(r,p,month=p.months?.at(-1)||p.month||'2000-01'){
 const day=p.day===31?daysInMonth(month):p.day,ruleDay=r.dayStart===r.dayEnd?r.dayStart:Math.floor((r.dayStart+r.dayEnd)/2);
 return !r.archived&&r.type===p.type&&r.accountId===p.accountId&&r.category===p.category&&normalizeIdentity(r.name)===normalizeIdentity(p.label)&&r.frequency==='monthly'&&Number.isSafeInteger(r.amountCents)&&BigInt(Math.abs(r.amountCents-p.amountCents))*100n<=BigInt(p.amountCents)*10n&&closeDay(ruleDay,day);
}
function equivalenceKey(m){return [m.type,m.accountId,m.category,normalizeIdentity(m.note)].join('|');}
function hash(text){let h=14695981039346656037n;for(const c of new TextEncoder().encode(text)){h^=BigInt(c);h=BigInt.asUintN(64,h*1099511628211n);}return h.toString(16).padStart(16,'0');}
function patternEvidenceKey(key,months,ids){return 'evidence:'+hash(`${key}|${months.join(',')}|${ids.slice().sort().join(',')}`);}
function stableKey(key){return 'pattern:'+hash(key);}
export function detectRecurringPatterns(state,{today}={}){
 if(!validDate(today))throw Error('invalid pattern date');const current=today.slice(0,7),complete=today.slice(8,10)===String(daysInMonth(current)).padStart(2,'0')?current:previousMonth(current),months=[previousMonth(previousMonth(complete)),previousMonth(complete),complete],confirmed=confirmedIds(state),groups=new Map();
 for(const m of state.movements||[]){if(!['income','expense'].includes(m.type)||m.date>today||m.date.slice(0,7)<months[0]||m.date.slice(0,7)>current||!normalizeIdentity(m.note)||confirmed.has(m.id))continue;const key=equivalenceKey(m);let g=groups.get(key);if(!g){g=[];groups.set(key,g);}g.push(m);}
 const result=[];
 for(const [groupKey,moves] of groups){const monthMaps=new Map();for(const m of moves){const month=m.date.slice(0,7);if(!months.includes(month)&&month!==current)continue;const list=monthMaps.get(month)||[];list.push(m);monthMaps.set(month,list);}let chosen=months;
   if(monthMaps.has(current)&&monthMaps.get(current).length===1)chosen=[previousMonth(previousMonth(current)),previousMonth(current),current];
   if(chosen.some(x=>(monthMaps.get(x)||[]).length!==1))continue;
   const observations=chosen.map(x=>monthMaps.get(x)[0]);if(observations.some(m=>m.type!==observations[0].type||m.amountCents<=0))continue;
   const amountCents=median(observations.map(m=>m.amountCents));if(!amountCents||!observations.every(m=>BigInt(Math.abs(m.amountCents-amountCents))*100n<=BigInt(amountCents)*10n))continue;
   const endOfMonth=observations.every(m=>Number(m.date.slice(8))===daysInMonth(m.date.slice(0,7)));const offsets=observations.map(m=>endOfMonth?31:Number(m.date.slice(8)));const dayOffset=median(offsets),day=endOfMonth?31:dayOffset;if(!observations.every((m,i)=>closeDay(offsets[i],dayOffset)))continue;
   const latestMonth=chosen.at(-1);if(latestMonth!==complete&&latestMonth!==current)continue;
   const evidenceKey=patternEvidenceKey(groupKey,chosen,observations.map(m=>m.id));const label=observations[0].note.trim();const p={key:stableKey(groupKey),evidenceKey,type:observations[0].type,accountId:observations[0].accountId,category:observations[0].category,label,amountCents,day,dayIsEndOfMonth:endOfMonth,months:chosen,observationIds:observations.map(m=>m.id),observations:observations.map(m=>({movementId:m.id,date:m.date,amountCents:m.amountCents}))};
   const ignored=(state.advisor?.ignoredPatterns||[]).some(x=>x.key===p.key),dismissed=(state.advisor?.dismissedPatterns||[]).some(x=>x.key===p.key&&x.evidenceKey===p.evidenceKey);if(ignored||dismissed)continue;
   const equivalent=(state.recurring||[]).some(r=>recurringMatchesPattern(r,p,current));if(equivalent)continue;
   result.push(p);
 }
 return result.sort((a,b)=>a.key.localeCompare(b.key));
}

export function recurringAmountChanges(state,{today}={}){
 if(!validDate(today))throw Error('invalid pattern date');const out=[];for(const r of state.recurring||[]){if(r.archived||r.frequency!=='monthly')continue;const confirmations=(state.confirmations||[]).filter(c=>c.recurringId===r.id),linked=confirmations.map(c=>(state.movements||[]).find(x=>x.id===c.movementId)).filter(x=>x&&x.date<=today).sort((a,b)=>b.date.localeCompare(a.date));let m=linked[0];if(!m){const expected=normalizeIdentity(r.name),matches=(state.movements||[]).filter(x=>x.type===r.type&&x.accountId===r.accountId&&x.category===r.category&&x.date<=today&&normalizeIdentity(x.note)===expected);const latest=matches.reduce((a,x)=>!a||x.date>a?x.date:a,null);const sameMonth=matches.filter(x=>x.date.slice(0,7)===latest?.slice(0,7));if(sameMonth.length===1)m=sameMonth[0];}if(!m)continue;const diff=BigInt(Math.abs(m.amountCents-r.amountCents))*100n;if(diff>BigInt(r.amountCents)*10n)out.push({recurringId:r.id,name:r.name,expectedAmountCents:r.amountCents,observedAmountCents:m.amountCents,date:m.date,movementId:m.id,differenceCents:m.amountCents-r.amountCents});}return out;
}
