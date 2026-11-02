import { normalizeMerchant } from './inbox.mjs';
import { isSensitiveReceiptLine, sanitizeReceiptMerchant } from './reconciliation-text.mjs';
const MAX=64*1024,safe=Number.isSafeInteger;
const enc=new TextEncoder();
function sanitize(s){return sanitizeReceiptMerchant(s);}
function parseCents(value){
 let s=String(value??'').replace(/\s/g,'');if(!s)return null;let negative=false;
 if(/^\(.*\)$/.test(s)){s=s.slice(1,-1);if(/[+-]/.test(s))return null;negative=true;}
 else if(s[0]==='-'||s[0]==='+'){negative=s[0]==='-';s=s.slice(1);}
 if(/[+-]/.test(s)||!s)return null;
 if(!/^(?:\d{1,3}(?:[., ]\d{3})+|\d+)(?:[.,]\d{1,2})?$/.test(s))return null;
 const comma=s.lastIndexOf(','),dot=s.lastIndexOf('.'),sep=Math.max(comma,dot);let whole,frac;
 if(sep<0){whole=s;frac='';}
 else if(comma>=0&&dot>=0){
  const decimal=comma>dot?',':'.',group=decimal===','?'.':',',position=s.lastIndexOf(decimal),tail=s.slice(position+1),integer=s.slice(0,position);
  const groups=integer.split(group);if(!/^\d{1,2}$/.test(tail)||!/^\d{1,3}$/.test(groups[0])||groups.slice(1).some(x=>!/^\d{3}$/.test(x)))return null;
  whole=integer.split(group).join('');frac=tail;
 }else{
  const parts=s.split(/[.,]/);if(parts.length>2)return null;
  if(parts[1]?.length===3){whole=parts.join('');frac='';}
  else {whole=parts[0];frac=parts[1]||'';}
 }
 if(!/^\d+$/.test(whole)||!/^(?:\d{0,2})$/.test(frac))return null;
 try{const cents=BigInt(whole)*100n+BigInt((frac+'00').slice(0,2));if(cents>BigInt(Number.MAX_SAFE_INTEGER))return null;const n=Number(cents);return negative?-n:n;}catch{return null;}
}
function validISO(value){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value||'');if(!m)return false;const [y,mo,d]=m.slice(1).map(Number),x=new Date(0);x.setFullYear(y,mo-1,d);return y>=1900&&y<=9999&&x.getFullYear()===y&&x.getMonth()===mo-1&&x.getDate()===d;}
function dmyDate(day,month,year){const d=Number(day),m=Number(month),y=Number(year);if(y<1900||y>9999)return null;const x=new Date(0);x.setFullYear(y,m-1,d);return x.getFullYear()===y&&x.getMonth()===m-1&&x.getDate()===d?String(y).padStart(4,'0')+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0'):null;}
function parseDate(text){
 const candidates=[],iso=[...text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)],dm=[...text.matchAll(/\b(\d{1,2})[/.](\d{1,2})[/.](\d{4})\b/g)];let invalid=false,ambiguous=false;
 for(const m of iso){if(validISO(m[0]))candidates.push(m[0]);else invalid=true;}
 for(const m of dm){const first=Number(m[1]),second=Number(m[2]);if(first<=12&&second<=12){ambiguous=true;continue;}const d=first>12?first:second,mo=first>12?second:first,parsed=dmyDate(d,mo,m[3]);if(parsed)candidates.push(parsed);else invalid=true;}
 const values=[...new Set(candidates)];return !invalid&&!ambiguous&&values.length===1?values[0]:null;
}
async function fingerprint(value){const bytes=enc.encode(value);if(globalThis.crypto?.subtle){const hash=await globalThis.crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');}throw Error('WebCrypto is unavailable');}
const item=(id,fp,date,merchant,amount,currency,accountId,category='')=>({id,fingerprint:fp,source:'receipt',date,time:null,merchant,amountCents:amount,currency,kind:'unknown',cardHint:'',accountId,category,status:'pending',movementId:null});
// Every financial label bounds the preceding total, including OCR line breaks.
const financialLabel=/\b(?:IMPORTE\s+TOTAL|TOTAL(?:\s+A\s+PAGAR)?|SUBTOTAL|IVA|PROPINA|EFECTIVO|CAMBIO|VUELTO)\b/gi;
const currencyToken=String.raw`(?:[A-Z]{3}(?![A-Z])|\p{Sc})`;
const totalNumber=new RegExp(String.raw`^\s*[:=]?\s*((?:`+currencyToken+String.raw`\s*)*)([+-]?\(?\d[\d., ]*\)?)`,'iu');
const trailingCurrency=new RegExp(String.raw`^\s*((?:`+currencyToken+String.raw`\s*)+)`,'iu');
const totalValue=/([A-Z]{3})|(\p{Sc})/giu;
function readTotal(tail){
 const match=totalNumber.exec(tail);if(!match)return null;
 const suffix=trailingCurrency.exec(tail.slice(match[0].length));
 const currencies=[...(match[1]+(suffix?.[1]||'')).matchAll(totalValue)].map(x=>x[1]?.toUpperCase()||(x[2]==='$'?'USD':'foreign'));
 const currency=currencies.some(x=>x!=='USD')?'foreign':'USD',amount=parseCents(match[2]);
 return {currency,amount:safe(amount)&&amount>0?amount:null};
}
function ignoredMerchant(line){return /^(?:TOTAL|SUBTOTAL|IVA|PROPINA|EFECTIVO|CAMBIO|VUELTO|FACTURA|RUC|NIT|RFC|FECHA|DIRECCION|DIRECCIÓN|TELEFONO|TELÉFONO|CELULAR|CONTACTO|CORREO|EMAIL|WEB|SUCURSAL|CAJA|TERMINAL|AUTORIZACIÓN|AUTORIZACION)\b/i.test(line)||/^\d{4}-\d{2}-\d{2}$/.test(line)||/^\d{1,2}[/.]\d{1,2}[/.]\d{4}$/.test(line);}
export async function receiptInboxItem(fields,{accountId,idFactory=()=>crypto.randomUUID()}={}){
 if(!fields||typeof fields!=='object'||!accountId)throw Error('reviewed receipt fields and account are required');
 const date=fields.date??null,merchant=sanitize(fields.merchant),amount=fields.amountCents??null,currency=fields.currency===undefined?'USD':fields.currency,category=sanitize(fields.category||'').slice(0,60);
 if(date!==null&&!validISO(date)||amount!==null&&(!safe(amount)||amount<=0)||!merchant||isSensitiveReceiptLine(fields.merchant)||!['USD',''].includes(currency)||fields.currency!==undefined&&currency!==''&&currency!=='USD')throw Error('invalid reviewed receipt fields');
 const fp=await fingerprint([accountId,date||'',merchant,amount===null?'':amount,currency].join('|'));
 return item(idFactory(),fp,date,merchant,amount,currency,accountId,category);
}
export async function parseReceiptText(text,{idFactory=()=>crypto.randomUUID()}={}){
 if(typeof text!=='string')throw Error('receipt text must be text');if(enc.encode(text).byteLength>MAX)throw Error('receipt text exceeds 64 KiB');
 const lines=text.split(/\r\n|\r|\n/).map(x=>x.trim()).filter(Boolean),totals=[];
 const labels=[...text.matchAll(financialLabel)];
 for(const [index,label] of labels.entries()){if(!/^(?:TOTAL|IMPORTE)/i.test(label[0]))continue;const tail=text.slice(label.index+label[0].length,labels[index+1]?.index??text.length),total=readTotal(tail);if(total)totals.push(total);}
 const foreign=totals.some(x=>x.currency!=='USD'),validTotals=totals.filter(x=>x.currency==='USD'&&safe(x.amount)&&x.amount>0),uniq=[...new Set(validTotals.map(x=>x.amount))],warnings=[];
 let amount=uniq.length===1&&!foreign?uniq[0]:null,currency=foreign?'':'USD';
 if(foreign)warnings.push('Se detectó una moneda extranjera; revisa el importe y la moneda.');
 if(uniq.length>1)warnings.push('Hay varios totales distintos; revisa el recibo.');
 else if(!uniq.length&&!foreign)warnings.push('No se encontró un total final inequívoco.');
 if(foreign||uniq.length>1)amount=null;
 const date=parseDate(text);if(!date)warnings.push('No se encontró una fecha inequívoca.');
 const merchantLine=lines.find(x=>x.length<=120&&!/^\s*(?:texto|mensaje|sin datos|sin campos|ilegible)\b/i.test(x)&&!ignoredMerchant(x)&&!isSensitiveReceiptLine(x)&&sanitize(x).length>=2);
 const merchant=merchantLine?sanitize(merchantLine):'';if(!merchant)warnings.push('No se encontró un comercio confiable.');
 if(!merchant)return {items:[],errors:[],warnings,preview:''};
 const id=idFactory(),fp=await fingerprint(['',date||'',merchant,amount===null?'':amount,currency].join('|')),entry=item(id,fp,date,merchant,amount,currency,null);
 const preview=[merchant,date,amount===null?'':(Math.abs(amount)/100).toFixed(2)].filter(Boolean).join(' · ').slice(0,220);
 return {items:[entry],errors:[],warnings,preview};
}
