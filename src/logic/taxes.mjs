const safe=n=>Number.isSafeInteger(n)&&n>=0;
const add=(a,b)=>{const n=a+b;if(!Number.isSafeInteger(n))throw Error('unsafe integer sum');return n;};
const round=(num,den)=>Number((BigInt(num)+BigInt(den)/2n)/BigInt(den));
const validDate=s=>{if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const [y,m,d]=s.split('-').map(Number);const x=new Date(0);x.setFullYear(y,m-1,d);x.setHours(0,0,0,0);return x.getFullYear()===y&&x.getMonth()===m-1&&x.getDate()===d;};
function periodFor(method,date){if(method==='card')return date.slice(0,4);if(method==='remittance'){const day=Number(date.slice(8));return date.slice(0,7)+'-'+(day<=15?'A':'B');}throw Error('invalid tax method');}
function taxUsage(state,{method,period,date,excludeMovementId}={}){
 if(!['card','remittance'].includes(method)||typeof period!=='string'||(method==='card'?!/^\d{4}$/.test(period):!/^\d{4}-(?:0[1-9]|1[0-2])-[AB]$/.test(period))||(date!==undefined&&!validDate(date)))throw Error('invalid tax period or method');
 const records=Array.isArray(state?.taxRecords)?state.taxRecords:[];
 const balances=state?.settings?.taxOpeningBalances||[];
 const opening=balances.find(x=>x.method===method&&x.period===period)?.amountCents||0;
 let usedCents=opening;
 for(const r of records){if(r.movementId===excludeMovementId||r.method!==method)continue;const m=state.movements?.find(x=>x.id===r.movementId);if(!m||m.type!=='expense'||m.date>(date||'9999-12-31')||periodFor(method,m.date)!==period||!r.foreign)continue;usedCents=add(usedCents,r.foreignBaseCents);}
 const profile=state?.settings?.taxProfile||{};const exemptCents=method==='card'?(profile.cardExemptCents||0):(profile.remittanceExemptCents||0);
 return {method,period,usedCents,exemptCents,remainingCents:Math.max(0,add(exemptCents,-usedCents))};
}
function quoteExpense(state,input,{excludeMovementId}={}){
 if(!input||!safe(input.priceCents)||!safe(input.feeCents??0)||!validDate(input.date)||typeof input.digital!=='boolean'||typeof input.foreign!=='boolean'||!['add','included','none'].includes(input.vatMode)||!['card','remittance'].includes(input.method))throw Error('invalid expense quote input');
 const p=state?.settings?.taxProfile||{name:'none',vatBps:0,isdBps:0,cardExemptCents:0,remittanceExemptCents:0,validFrom:'1900-01-01',validTo:'9999-12-31'};
 const taxRequested=(input.digital&&input.vatMode!=='none')||input.foreign;if(p.name!=='none'&&taxRequested&&(input.date<p.validFrom||input.date>p.validTo))throw Error('tax profile does not cover date');
 if(p.name==='none'&&((input.digital&&input.vatMode!=='none')||input.foreign))throw Error('tax profile is inactive; update it before estimating taxes');
 const vatBps=input.digital&&input.vatMode!=='none'?p.vatBps:0,isdBps=input.foreign?p.isdBps:0;
 let baseCents=input.priceCents,estimatedVatCents=0;
 if(input.vatMode==='included'&&vatBps){estimatedVatCents=round(BigInt(input.priceCents)*BigInt(vatBps),10000n+BigInt(vatBps));baseCents=input.priceCents-estimatedVatCents;}
 else if(input.vatMode==='add'&&vatBps)estimatedVatCents=round(BigInt(input.priceCents)*BigInt(vatBps),10000n);
 const foreignBaseCents=input.foreign?(input.foreignBaseCents??input.priceCents):0;
 if(!safe(foreignBaseCents)||(input.foreignBaseCents!==undefined&&!safe(input.foreignBaseCents)))throw Error('invalid foreign base');
 const period=periodFor(input.method,input.date),usage=taxUsage(state,{method:input.method,period,date:input.date,excludeMovementId});
 const beforeTaxable=Math.max(0,usage.usedCents-usage.exemptCents),afterTaxable=Math.max(0,add(usage.usedCents,foreignBaseCents)-usage.exemptCents);
 const estimatedIsdCents=input.foreign?round(BigInt(afterTaxable-beforeTaxable)*BigInt(isdBps),10000n):0;
 const feeCents=input.feeCents??0;let estimatedTotalCents=add(input.priceCents,feeCents);estimatedTotalCents=add(estimatedTotalCents,input.vatMode==='add'?estimatedVatCents:0);estimatedTotalCents=add(estimatedTotalCents,estimatedIsdCents);
 return {baseCents,priceCents:input.priceCents,estimatedVatCents,estimatedIsdCents,feeCents,estimatedTotalCents,usedBeforeCents:usage.usedCents,usedAfterCents:add(usage.usedCents,foreignBaseCents),remainingCents:Math.max(0,usage.exemptCents-add(usage.usedCents,foreignBaseCents)),period,method:input.method,foreignBaseCents,vatBps,isdBps,exemptCents:usage.exemptCents,snapshot:{digital:input.digital,vatMode:input.vatMode,foreign:input.foreign,method:input.method,foreignBaseCents,vatBps,isdBps,exemptCents:usage.exemptCents,profileName:p.name}};
}
export {quoteExpense,taxUsage,periodFor};
