import { computePlan } from './planning.mjs';

const add=(a,b)=>{const n=a+b;if(!Number.isSafeInteger(n))throw Error('unsafe emergency allocation');return n;};
function pause(distribution){if(!distribution)return distribution;const amount=add(distribution.outings,distribution.games);return {...distribution,outings:0,games:0,buffer:add(distribution.buffer,amount)};}

export function computeAdvisorPlan(state,{month,today}={}){
 const plan=computePlan(state,{month,today});if(!state.advisor?.emergency)return plan;
 const planned={...plan.planned,distribution:pause(plan.planned.distribution)};
 const budget={...plan.budget,distribution:pause(plan.budget.distribution)};
 return {...plan,planned,budget,emergency:{enabled:true,paused:true,normalDiscretionaryCents:add(plan.planned.distribution.outings,plan.planned.distribution.games)}};
}

export function emergencySummary(state,{today}={}){
 const month=today.slice(0,7),plan=computeAdvisorPlan(state,{today,month}),amount=add(plan.planned.distribution.outings,plan.planned.distribution.games);
 return {enabled:state.advisor?.emergency===true,paused:state.advisor?.emergency===true,normalDiscretionaryCents:state.advisor?.emergency?plan.emergency.normalDiscretionaryCents:amount,upcoming:plan.upcoming.map(x=>({name:x.name,type:x.type,amountCents:x.amountCents,expectedDate:x.expectedDate,status:x.status})),loansWithoutDueDate:(state.loans||[]).filter(l=>!l.dueDate).map(l=>({id:l.id,label:l.label,direction:l.direction,principalCents:l.principalCents}))};
}
