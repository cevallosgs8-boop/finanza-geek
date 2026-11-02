import { parseAmount } from './logic/finance.mjs';
import { planGoalFundingBatches } from './logic/goals.mjs';

const idList=(state,goalId,amountCents,date,makeId)=>planGoalFundingBatches(state,{goalId,amountCents,date}).map(()=>makeId());

export function buildContributionAction({goal=null,source='savings',amountCents,date,entryId}){
 const goalId=goal?.kind==='wish'?null:(goal?.id??null);
 return source==='roundup'
  ?{type:'roundup.assign',goalId,amountCents,entryId,date}
  :{type:'goal.contribute',goalId,amountCents,source,entryId,date};
}

export function buildReleaseAction({state,goal,amountCents,date,makeId}){
 const goalId=goal?.kind==='wish'?null:(goal?.id??null);
 return {type:'goal.release',goalId,amountCents,date,entryIds:idList(state,goalId,amountCents,date,makeId)};
}

function formQuote(data){
 return {priceCents:parseAmount(data.price||data.actualTotal||'0'),digital:data.digital==='true'||data.digital===true,vatMode:data.vatMode||'add',foreign:data.foreign==='true'||data.foreign===true,method:data.method||'card',foreignBaseCents:parseAmount(String(data.foreignBase??'').trim()||data.price||data.actualTotal||'0'),feeCents:parseAmount(data.taxFee||'0'),date:data.date};
}

export function buildPurchaseAction({state,goal,data,makeId,nowMs=Date.now()}){
 const actualTotalCents=parseAmount(data.actualTotal||'');
 const goalId=goal.kind==='wish'?null:goal.id;
 const movement={id:makeId(),type:'expense',date:data.date,amountCents:actualTotalCents,accountId:data.accountId,toAccountId:null,feeCents:0,category:goal.kind==='wish'?'Deseo':'Fondo anual',note:'Compra anotada: '+goal.name,loanId:null};
 const action={type:goal.kind==='wish'?'wish.purchase':'annual.spend',id:goal.id,movement,actualTotalCents,entryIds:idList(state,goalId,actualTotalCents,data.date,makeId),nowMs};
 if(data.taxEnabled==='on')action.quoteInput=formQuote(data);
 return action;
}

export function hasDirtyForms(forms,exclude=null){
 return Array.from(forms||[]).some(form=>form!==exclude&&form?.dataset?.dirty==='true');
}

export function completeFormCommit(form,forms){
 if(form?.dataset)form.dataset.dirty='false';
 return hasDirtyForms(forms);
}

export function shouldDeferUnsafeReload(hasDraft,busy){
 return Boolean(busy||hasDraft());
}

export function restoreSemanticFocus(root,action,id){
 const candidates=action?Array.from(root.querySelectorAll('[data-action]')):[];
 const target=candidates.find(node=>node.dataset.action===action&&(!id||node.dataset.id===id)&&(!node.disabled)&&(!node.getClientRects||node.getClientRects().length>0));
 const fallback=root.querySelector('#main-content h1')||root.querySelector('#main-content');
 const destination=target||fallback;
 if(destination&&!target&&!destination.hasAttribute('tabindex'))destination.setAttribute('tabindex','-1');
 destination?.focus({preventScroll:true});
 return destination||null;
}

export function buildGoalAction({data,old=null,makeId}){
 const kind=old?.kind||data.kind,targetCents=parseAmount(data.target);
 const goal={id:old?.id||makeId(),name:data.name.trim(),kind,targetCents,monthlyContributionCents:parseAmount(data.monthly||'0'),dueDate:data.dueDate||null,priority:Number(data.priority||1),archived:old?.archived||false,wish:kind==='wish'?{priceCents:targetCents,digital:data.digital==='true'||data.digital===true,vatMode:data.vatMode||'add',foreign:data.foreign==='true'||data.foreign===true||data.foreign==='on',method:data.method||'card',foreignBaseCents:data.foreignBase===undefined&&old?.wish?old.wish.foreignBaseCents:parseAmount(String(data.foreignBase??'').trim()||data.target),waitStartedAt:old?.wish?.waitStartedAt??null}:null,purchaseMovementId:old?.purchaseMovementId||null};
 return {type:old?'goal.update':'goal.add',goal};
}
