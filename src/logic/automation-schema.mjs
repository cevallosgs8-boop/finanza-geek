const plain=o=>o!==null&&typeof o==='object'&&!Array.isArray(o);
const ID=/^[A-Za-z0-9_-]{1,80}$/;
const safe=Number.isSafeInteger;
const text=(v,max)=>typeof v==='string'&&v.length<=max;
const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&(()=>{const [y,m,d]=v.split('-').map(Number),x=new Date(0);x.setFullYear(y,m-1,d);return x.getFullYear()===y&&x.getMonth()===m-1&&x.getDate()===d})();
const time=v=>typeof v==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const noSensitive=v=>typeof v==='string'&&!/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(v)&&!/(?:\d[ -]?){7,19}/.test(v);
export function defaultAutomation(){return {items:[],seenFingerprints:[],cardMappings:[],merchantRules:[],bankTemplates:[],movementTimes:[],reminders:{daily:false,weekly:true,monthClose:true,backup:true,dailyTime:'09:00',weeklyTime:'18:00',monthCloseTime:'19:00',backupTime:'09:00'},calendar:{includeRecurring:true,namespace:'',dirty:true},weeklySeen:[]};}
export function validateAutomation(value,{accounts=[],movements=[]}={}){
 if(!plain(value)||Object.keys(value).sort().join('|')!=='bankTemplates|calendar|cardMappings|items|merchantRules|movementTimes|reminders|seenFingerprints|weeklySeen')throw Error('automation schema has unknown or missing properties');
 for(const k of ['items','seenFingerprints','cardMappings','merchantRules','bankTemplates','movementTimes','weeklySeen'])if(!Array.isArray(value[k]))throw Error('invalid automation collection');
 if(value.items.length>10000||value.seenFingerprints.length>10000||value.cardMappings.length>200||value.merchantRules.length>200||value.bankTemplates.length>20||value.movementTimes.length>10000||value.weeklySeen.length>104)throw Error('automation entity limit exceeded');
 const ac=new Map(accounts.map(a=>[a.id,a])),mv=new Map(movements.map(m=>[m.id,m]));
 const fingerprints=new Set();for(const fp of value.seenFingerprints){if(typeof fp!=='string'||!/^[a-f0-9]{64}$/.test(fp)||fingerprints.has(fp))throw Error('invalid or duplicate fingerprint');fingerprints.add(fp);}
 const itemIds=new Set(),itemFp=new Set();for(const x of value.items){const keys='accountId|amountCents|cardHint|category|currency|date|fingerprint|id|kind|merchant|movementId|source|status|time';if(!plain(x)||Object.keys(x).sort().join('|')!==keys||!ID.test(x.id)||itemIds.has(x.id)||!/^[a-f0-9]{64}$/.test(x.fingerprint)||!fingerprints.has(x.fingerprint)||itemFp.has(x.fingerprint)||!['nfc','sms','email','voice','manual','statement','receipt'].includes(x.source)||(x.date!==null&&!date(x.date))||(x.time!==null&&!time(x.time))||!text(x.merchant,120)||!noSensitive(x.merchant)||/[\u0000-\u001f\u007f]/.test(x.merchant)||!['expense','income','transfer','refund','unknown'].includes(x.kind)||!(x.amountCents===null||safe(x.amountCents))||!(x.currency===''||/^[A-Z]{3}$/.test(x.currency))||!text(x.cardHint,40)||!noSensitive(x.cardHint)||/(?:\d[ -]?){5,}/.test(x.cardHint)||x.accountId!==null&&!ac.has(x.accountId)||!text(x.category,60)||!noSensitive(x.category)||/[\u0000-\u001f\u007f]/.test(x.category)||!['pending','confirmed','discarded','linked'].includes(x.status)||x.movementId!==null&&!['confirmed','linked'].includes(x.status))throw Error('invalid inbox item');itemIds.add(x.id);itemFp.add(x.fingerprint);if(['confirmed','linked'].includes(x.status)!==(x.movementId!==null))throw Error('inbox status and movement mismatch');}
 const mapIds=new Set();for(const x of value.cardMappings){if(!plain(x)||Object.keys(x).sort().join('|')!=='accountId|id|label'||!ID.test(x.id)||mapIds.has(x.id)||!text(x.label,40)||!noSensitive(x.label)||/(?:\d[ -]?){5,}/.test(x.label)||!ac.has(x.accountId))throw Error('invalid card mapping');mapIds.add(x.id);}
 const ruleIds=new Set();for(const x of value.merchantRules){if(!plain(x)||Object.keys(x).sort().join('|')!=='category|contains|id'||!ID.test(x.id)||ruleIds.has(x.id)||!text(x.contains,60)||!noSensitive(x.contains)||!text(x.category,60))throw Error('invalid merchant rule');ruleIds.add(x.id);}
 const templateIds=new Set();for(const x of value.bankTemplates){const tokens=typeof x?.pattern==='string'?[...x.pattern.matchAll(/\{(amount|merchant|date|time|card)\}/g)].map(m=>m[1]):[],literal=typeof x?.pattern==='string'?x.pattern.replace(/\{(amount|merchant|date|time|card)\}/g,''):'';if(!plain(x)||Object.keys(x).sort().join('|')!=='id|name|pattern|type'||!ID.test(x.id)||templateIds.has(x.id)||!text(x.name,60)||!noSensitive(x.name)||!text(x.pattern,200)||!['expense','income','transfer','refund'].includes(x.type)||new Set(tokens).size!==tokens.length||/\{[^}]*\}/.test(literal)||/\d{4,}/.test(literal)||/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(literal)||/(?:otp|codigo|código|clave)\s*[:=-]?\s*[A-Z0-9]{4,}/i.test(literal)||/\{(?:amount|merchant|date|time|card)\}\s*\{(?:amount|merchant|date|time|card)\}/.test(x.pattern))throw Error('invalid bank template');templateIds.add(x.id);}
 const times=new Set();for(const x of value.movementTimes){if(!plain(x)||Object.keys(x).sort().join('|')!=='movementId|time'||!mv.has(x.movementId)||!time(x.time)||times.has(x.movementId))throw Error('invalid movement time');times.add(x.movementId);}
 const r=value.reminders;if(!plain(r)||Object.keys(r).sort().join('|')!=='backup|backupTime|daily|dailyTime|monthClose|monthCloseTime|weekly|weeklyTime'||['daily','weekly','monthClose','backup'].some(k=>typeof r[k]!=='boolean')||['dailyTime','weeklyTime','monthCloseTime','backupTime'].some(k=>!time(r[k])))throw Error('invalid reminders');
 const c=value.calendar;if(!plain(c)||Object.keys(c).sort().join('|')!=='dirty|includeRecurring|namespace'||typeof c.includeRecurring!=='boolean'||typeof c.dirty!=='boolean'||!text(c.namespace,80))throw Error('invalid calendar metadata');
 const weeks=new Set();for(const w of value.weeklySeen){if(!date(w)||new Date(w+'T00:00:00').getDay()!==1||weeks.has(w))throw Error('invalid weekly acknowledgement');weeks.add(w);}
 return true;
}
export function applyAutomationAction(value,action,{accounts=[],movements=[]}={}){
 if(!plain(action)||typeof action.type!=='string')throw Error('invalid automation action');const n=structuredClone(value),find=(a,id)=>{const x=a.find(y=>y.id===id);if(!x)throw Error('not found');return x;};
 switch(action.type){
 case'inbox.import':{if(!Array.isArray(action.items))throw Error('items required');for(const item of action.items){if(n.seenFingerprints.includes(item.fingerprint))continue;n.items.push(structuredClone(item));n.seenFingerprints.push(item.fingerprint);}break;}
 case'inbox.update':{const x=find(n.items,action.id);if(x.status!=='pending')throw Error('closed inbox item');const allowed=['date','time','merchant','amountCents','currency','kind','cardHint','accountId','category'];if(!plain(action.patch)||Object.keys(action.patch).some(k=>!allowed.includes(k)))throw Error('invalid inbox patch');Object.assign(x,action.patch);break;}
 case'inbox.discard':{const x=find(n.items,action.id);if(x.status!=='pending')throw Error('closed inbox item');x.status='discarded';break;}
 case'inbox.restore':{const x=find(n.items,action.id);if(x.status!=='discarded')throw Error('item cannot be restored');x.status='pending';break;}
 case'inbox.mapping.set':{const x=action.mapping,i=n.cardMappings.findIndex(y=>y.id===x?.id);if(i<0)n.cardMappings.push(structuredClone(x));else n.cardMappings[i]=structuredClone(x);break;}
 case'inbox.mapping.remove':n.cardMappings=n.cardMappings.filter(x=>x.id!==action.id);break;
 case'inbox.rule.set':{const x=action.rule,i=n.merchantRules.findIndex(y=>y.id===x?.id);if(i<0)n.merchantRules.push(structuredClone(x));else n.merchantRules[i]=structuredClone(x);break;}
 case'inbox.rule.remove':n.merchantRules=n.merchantRules.filter(x=>x.id!==action.id);break;
 case'inbox.template.set':{const x=action.template,i=n.bankTemplates.findIndex(y=>y.id===x?.id);if(i<0)n.bankTemplates.push(structuredClone(x));else n.bankTemplates[i]=structuredClone(x);break;}
 case'inbox.template.remove':n.bankTemplates=n.bankTemplates.filter(x=>x.id!==action.id);break;
 case'automation.reminders':if(!plain(action.patch))throw Error('reminder patch required');Object.assign(n.reminders,action.patch);n.calendar.dirty=true;break;
 case'automation.calendar.export':if(typeof action.namespace!=='string'||!action.namespace.trim())throw Error('calendar namespace required');n.calendar.namespace=action.namespace.trim().slice(0,80);n.calendar.dirty=false;break;
 case'automation.weekly.ack':if(!date(action.weekStart)||new Date(action.weekStart+'T00:00:00').getDay()!==1)throw Error('invalid week start');if(!n.weeklySeen.includes(action.weekStart)){n.weeklySeen.push(action.weekStart);n.weeklySeen.sort();if(n.weeklySeen.length>104)n.weeklySeen=n.weeklySeen.slice(-104);}break;
 default:throw Error('unknown automation action');
 }
 validateAutomation(n,{accounts,movements});return n;
}
