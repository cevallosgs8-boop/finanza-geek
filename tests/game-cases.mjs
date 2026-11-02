import {emptyState,applyAction} from '../src/logic/finance.mjs';
import {defaultGame} from '../src/logic/game-schema.mjs';
export const today='2026-10-19';
export const account=(id='acct',openingBalanceCents=10000)=>({id,name:'Cuenta '+id,kind:'bank',openingBalanceCents,color:'#123456'});
export const movement=(id,type='expense',date=today,amountCents=100,category='Salidas')=>({id,type,date,amountCents,accountId:'acct',toAccountId:null,feeCents:0,category,note:'fixture',loanId:null});
export function fixture({date=today,balance=10000}={}){let s=emptyState();s.game=defaultGame(date);s.accounts=[account('acct',balance)];return s;}
export function withMovement(s,m){return applyAction(s,{type:'movement.add',movement:m});}
