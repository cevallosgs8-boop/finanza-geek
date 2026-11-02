import { emptyState, applyAction, localDate } from '../src/logic/finance.mjs';
import { openStore } from '../src/storage.mjs';
import { createReconciliationController } from '../src/reconciliation-intents.mjs';
const cases=[];
const add=(name,run)=>cases.push({name,run});
function removeDB(name){return new Promise((resolve,reject)=>{const r=indexedDB.deleteDatabase(name);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error||Error('delete failed'));r.onblocked=()=>reject(Error('delete blocked'));});}
add('Comparación y propuesta de estado CSV usan IndexedDB real sin saldo ni XP',async finance=>{
 const name='fg-v07-recon-'+crypto.randomUUID();let store,state;
 try{store=await openStore({indexedDB,name});state=await store.load();state=finance.applyAction(state,{type:'account.add',account:{id:'csv-cash',name:'Cuenta sintética',kind:'cash',openingBalanceCents:100000,color:'#7C3AED'}});await store.commit(state,0);state=await store.load();const startRevision=state.revision,startXp=state.game.xpLedger.length;
 const persistAction=async action=>{const next=finance.applyAction(state,action);await store.commit(next,state.revision);state=await store.load();return true;};
 const controller=createReconciliationController({getState:()=>state,getRevision:()=>state.revision,persistAction});
 const today='2026-10-20',mapping={id:'',label:'Prueba',delimiter:',',dateFormat:'iso',decimal:'dot',dateColumn:0,descriptionColumn:1,amountColumn:2,debitColumn:null,creditColumn:null,balanceColumn:3};
 controller.setMapping(mapping);controller.update({accountId:'csv-cash',startDate:today,endDate:today,delimiter:',',encoding:'utf-8'});
 const csv='Fecha,Detalle,Importe,Saldo\n2026-10-20,CAFÉ COMPRA,-12.50,987.50';
 if(!await controller.inspect(csv))throw Error('CSV inspection failed');if(!await controller.compare())throw Error('CSV comparison failed');
 let preview=controller.snapshot();if(preview.result.bankOnly.length!==1||preview.result.balance.status!=='conclusive'||state.revision!==startRevision)throw Error('comparison changed storage or lost bank row/balance');
 const fingerprint=preview.result.bankOnly[0].fingerprint;controller.selectRows([fingerprint]);await controller.importBank(controller.snapshot().selected);
 if(state.movements.length||state.game.xpLedger.length!==startXp||state.automation.items.length!==1)throw Error('proposal changed money/XP or was not saved');
 const item=state.automation.items[0];if(item.source!=='statement'||item.kind!=='unknown'||item.amountCents!==1250||item.accountId!=='csv-cash')throw Error('statement DTO does not require classification');
 let staleRejected=false;try{await controller.importBank([fingerprint]);}catch(error){staleRejected=/comparación cambió|Vuelve a comparar/i.test(error.message);}if(!staleRejected||state.automation.items.length!==1)throw Error('la reimportación con revisión obsoleta no fue rechazada sin cambios');
 if(!await controller.compare())throw Error('la comparación nueva falló');const refreshedFingerprint=controller.snapshot().result.bankOnly[0].fingerprint;controller.selectRows([refreshedFingerprint]);await controller.importBank(controller.snapshot().selected);if(state.automation.items.length!==1)throw Error('la nueva propuesta duplicó la fila del buzón');
 }finally{store?.close();await removeDB(name);}
});
add('Recibo OCR se convierte en una propuesta estructurada sin conservar texto',async finance=>{
 const name='fg-v07-receipt-'+crypto.randomUUID();let store,state;
 try{store=await openStore({indexedDB,name});state=await store.load();state=finance.applyAction(state,{type:'account.add',account:{id:'receipt-cash',name:'Cuenta sintética',kind:'cash',openingBalanceCents:0,color:'#7C3AED'}});await store.commit(state,0);state=await store.load();const persistAction=async action=>{const next=finance.applyAction(state,action);await store.commit(next,state.revision);state=await store.load();return true;};
 const controller=createReconciliationController({getState:()=>state,getRevision:()=>state.revision,persistAction}),date='2026-10-20',text='Tienda Aurora\n'+date+'\nTOTAL USD 12.34';
 await controller.analyzeReceipt(text);const parsed=controller.snapshot().receipt.items[0];if(!parsed||parsed.amountCents!==1234||parsed.kind!=='unknown')throw Error('receipt preview did not parse safely');
 await controller.submitReceipt({date,merchant:'Tienda Aurora',amountCents:1234,currency:'USD',accountId:'receipt-cash',category:'Salidas'});
 if(state.movements.length||state.automation.items.length!==1||state.automation.items[0].source!=='receipt'||state.automation.items[0].kind!=='unknown')throw Error('receipt became a movement or lost classification gate');
 if(JSON.stringify(state).includes(text))throw Error('OCR text was persisted');
 }finally{store?.close();await removeDB(name);}
});

add('Fallar el commit de IndexedDB no confirma envío ni borra borrador OCR',async finance=>{
 const name='fg-v07-receipt-fail-'+crypto.randomUUID();let store,state;
 try{
  store=await openStore({indexedDB,name});state=await store.load();state=finance.applyAction(state,{type:'account.add',account:{id:'receipt-fail-cash',name:'Cuenta sintética',kind:'cash',openingBalanceCents:0,color:'#7C3AED'}});await store.commit(state,0);state=await store.load();
  const persistAction=async action=>{const next=finance.applyAction(state,action);await store.commit(next,state.revision);state=await store.load();return true;};
  const controller=createReconciliationController({getState:()=>state,getRevision:()=>state.revision,persistAction}),date='2026-10-20',text='Tienda Aurora\n'+date+'\nTOTAL USD 12.34';
  await controller.analyzeReceipt(text);
  const competing=finance.applyAction(state,{type:'settings.update',settings:{...state.settings,hideBalances:true}});await store.commit(competing,state.revision);
  let confirmed=false;try{await controller.submitReceipt({date,merchant:'Tienda Aurora',amountCents:1234,currency:'USD',accountId:'receipt-fail-cash'});confirmed=true;}catch{}
  const saved=await store.load();if(confirmed||saved.automation.items.length)throw Error('commit fallido se confirmó o guardó recibo');
  if(controller.snapshot().receipt.text!==text||!controller.snapshot().receipt.items.length)throw Error('fallo borró borrador OCR corregible');
 }finally{store?.close();await removeDB(name);}
});
export { cases };
