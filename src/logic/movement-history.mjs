const validDate=value=>{if(!value)return true;if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const [year,month,day]=value.split('-').map(Number);if(year<1||year>9999||month<1||month>12)return false;const leap=year%4===0&&(year%100!==0||year%400===0);const days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];return day>=1&&day<=days[month-1];};

export function selectMovementHistory(state,{query='',type='all',accountId='all',dateFrom='',dateTo=''}={}){
 const invalidFields=[];if(!validDate(dateFrom))invalidFields.push('dateFrom');if(!validDate(dateTo))invalidFields.push('dateTo');
 if(invalidFields.length)return {movements:[],error:'Escribe una fecha válida.',invalidFields};
 if(dateFrom&&dateTo&&dateFrom>dateTo)return {movements:[],error:'La fecha Desde no puede ser posterior a Hasta.',invalidFields:['dateFrom','dateTo']};
 const accounts=new Map((state.accounts||[]).map(account=>[account.id,account.name]));const loans=new Map((state.loans||[]).map(loan=>[loan.id,loan]));const q=String(query).trim().toLocaleLowerCase();
 const movements=(state.movements||[]).filter(movement=>{
  const loan=loans.get(movement.loanId);const text=[movement.note,movement.category,accounts.get(movement.accountId),accounts.get(movement.toAccountId),loan?.label].filter(Boolean).join(' ').toLocaleLowerCase();
  return (!q||text.includes(q))&&(type==='all'||movement.type===type)&&(accountId==='all'||movement.accountId===accountId||movement.toAccountId===accountId)&&(!dateFrom||movement.date>=dateFrom)&&(!dateTo||movement.date<=dateTo);
 }).slice().sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
 return {movements,error:'',invalidFields};
}
