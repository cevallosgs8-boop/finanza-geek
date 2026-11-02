export function legacyState(finance,version,revision=version){
 const current=finance.emptyState();
 const accounts=[{id:'legacy-cash',name:'Cuenta migrada',kind:'cash',openingBalanceCents:25000,color:'#7C3AED'}];
 const movements=[{id:'legacy-expense',type:'expense',date:'2026-10-18',amountCents:125,accountId:'legacy-cash',toAccountId:null,feeCents:0,category:'Salidas',note:'',loanId:null}];
 const base={schemaVersion:version,revision,currency:'USD',accounts,movements,loans:[]};
 if(version===1)return {...base,settings:{hideBalances:false}};
 if(version===2)return {...base,settings:{hideBalances:false,allocationPercentages:{savings:50,outings:27,games:18,buffer:5},categoryLimits:[]},recurring:[],confirmations:[]};
 const {game,automation,advisor,reconciliation,...v3}=current;
 const common={...v3,schemaVersion:version,revision,currency:'USD',accounts,movements,loans:[],settings:current.settings,recurring:[],confirmations:[],taxRecords:[],goals:[],goalEntries:[],roundupRecords:[]};
 if(version===3)return common;
 const game4={...game,seenMovementIds:movements.map(x=>x.id)};
 if(version===4)return {...common,schemaVersion:4,game:game4};
 if(version===5)return {...common,schemaVersion:5,game:game4,automation};
 if(version===6)return {...common,schemaVersion:6,game:game4,automation,advisor};
 throw new Error('unsupported legacy fixture version');
}
