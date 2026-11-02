const known=new Set(['tipo','monto','cuenta','categoria','fecha','hora','comercio']);
const proto=s=>['__proto__','prototype','constructor'].includes(s.toLowerCase());
const kindMap=Object.freeze({gasto:'expense',expense:'expense',ingreso:'income',income:'income',transferencia:'transfer',transfer:'transfer'});
const kind=v=>{const key=String(v||'').toLowerCase();return Object.hasOwn(kindMap,key)?kindMap[key]:null;};
function result(route='movements',panel='',prefill={},errors=[],consumed=false){return {route,panel,prefill,errors,consumed};}
export function parseQuickEntryURL(input,state){
 const empty={type:'',amount:'',accountId:'',category:'',date:'',time:'',merchant:''};if(String(input).length>4096)return result('movements','',empty,[{field:'url',message:'URL demasiado larga'}],false);let u;try{u=new URL(String(input));}catch{return result('movements','',empty,[{field:'url',message:'URL inválida'}],false);}
 if(!['http:','https:'].includes(u.protocol))return result('movements','',empty,[{field:'url',message:'Protocolo no permitido'}],false);
 const routeMap={buzon:'inbox',resumen:'summary',calendario:'calendar',respaldo:'backup'};const panel=routeMap[u.hash.slice(1)];if(panel)return result('movements',panel,empty,[],true);
 let params,entry=false;if(u.hash.startsWith('#nuevo?')){params=new URLSearchParams(u.hash.slice(7));entry=true;}else if(u.searchParams.has('nuevo')){params=u.searchParams;entry=true;}else return result('movements','',empty,[],false);
 const errors=[];for(const [k,v] of params){if(proto(k)||!known.has(k)&&k!=='nuevo')errors.push({field:k,message:'Campo desconocido'});if(params.getAll(k).length>1)errors.push({field:k,message:'Campo repetido'});}
 const rawType=params.get('tipo')||params.get('nuevo')||'',mapped=kind(rawType);if(rawType&&!mapped)errors.push({field:'tipo',message:'Tipo inválido'});const amount=params.get('monto')||'';if(amount){let valid=/^\d+(?:[.,]\d{1,2})?$/.test(amount);if(valid){const [whole,frac='']=amount.replace(',','.').split('.');try{const cents=BigInt(whole)*100n+BigInt((frac+'00').slice(0,2));valid=cents>0n&&cents<=BigInt(Number.MAX_SAFE_INTEGER);}catch{valid=false;}}if(!valid)errors.push({field:'monto',message:'Importe inválido'});}
 const date=params.get('fecha')||'',time=params.get('hora')||'';if(date&&!/^\d{4}-\d{2}-\d{2}$/.test(date))errors.push({field:'fecha',message:'Fecha inválida'});if(time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))errors.push({field:'hora',message:'Hora inválida'});
 if(date){const [y,m,d]=date.split('-').map(Number),day=new Date(0);day.setFullYear(y,m-1,d);if(day.getFullYear()!==y||day.getMonth()!==m-1||day.getDate()!==d)errors.push({field:'fecha',message:'Fecha inválida'});}
 const accountValue=params.get('cuenta')||'';let accountId='';if(accountValue){const matches=(state?.accounts||[]).filter(a=>a.id===accountValue||a.name.toLocaleLowerCase()===accountValue.toLocaleLowerCase());if(matches.length===1)accountId=matches[0].id;else errors.push({field:'cuenta',message:matches.length?'Cuenta ambigua':'Cuenta no encontrada'});}
 const prefill={type:mapped||'',amount,accountId,category:params.get('categoria')||'',date,time,merchant:params.get('comercio')||''};return result('movements','new',prefill,errors,entry);
}
export function buildQuickEntryURL(base,input){
 const u=new URL(String(base));if(!['http:','https:'].includes(u.protocol))throw Error('only http(s) URLs are allowed');const p=new URLSearchParams();const types={expense:'gasto',income:'ingreso',transfer:'transferencia',gasto:'gasto',ingreso:'ingreso',transferencia:'transferencia'};const t=types[input?.type];if(t)p.set('tipo',t);for(const [key,value] of [['monto',input?.amount],['cuenta',input?.accountId],['categoria',input?.category],['fecha',input?.date],['hora',input?.time],['comercio',input?.merchant]])if(value!==undefined&&value!==null&&String(value)!=='')p.set(key,String(value));u.search='';u.hash='nuevo?'+p.toString();return u.toString();
}
