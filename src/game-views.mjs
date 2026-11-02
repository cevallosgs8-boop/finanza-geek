import { formatMoney } from './logic/finance.mjs';
import { gameSummary, progressMap } from './logic/game.mjs';
import { cosmetics, cosmeticUnlockLevels } from './logic/game-schema.mjs';
import { computeGoalSummary } from './logic/goals.mjs';
import { contributionNet, movementExpenseByCategory } from './logic/game.mjs';
import { renderPet } from './pets.mjs';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = (value, hidden) => hidden ? '••••••' : formatMoney(value);
const amountInput = cents => String(Math.trunc(cents/100))+'.'+String(Math.abs(cents%100)).padStart(2,'0');
export const gameIcon = name => {
 const paths={coin:'<circle cx="12" cy="12" r="9"/><path d="M15 8.5c-.7-.8-1.7-1.2-3-1.2-1.6 0-2.7.8-2.7 2s.9 1.8 2.8 2.2 2.8 1 2.8 2.3-1.2 2.2-3 2.2c-1.3 0-2.5-.5-3.3-1.4M12 5.5v13"/>',chest:'<path d="M4 9h16v11H4zM3 6h18v4H3zM10 12h4v4h-4z"/><path d="M12 12v4"/>',heart:'<path d="M20.5 8.8c0 4.2-8.5 10-8.5 10s-8.5-5.8-8.5-10a4.5 4.5 0 0 1 8.5-2 4.5 4.5 0 0 1 8.5 2Z"/>',shield:'<path d="M12 3 20 6v5c0 5-3.4 8.3-8 10-4.6-1.7-8-5-8-10V6z"/><path d="m8.5 12 2.3 2.3 4.8-5"/>',sword:'<path d="m5 19 4-4M7 5l12 12M5 7l2-2 4 4-2 2zM13 17l2-2 4 4-2 2z"/>',star:'<path d="m12 3 2.7 5.6 6.2.9-4.5 4.4 1.1 6.2-5.5-2.9-5.5 2.9 1.1-6.2-4.5-4.4 6.2-.9z"/>',bag:'<path d="M5 8h14l1 13H4zM9 8a3 3 0 0 1 6 0M9 12h6"/>',controller:'<path d="M7 9h10a4 4 0 0 1 3.8 5l-1.2 4a2 2 0 0 1-3.2 1l-2.4-2H10l-2.4 2a2 2 0 0 1-3.2-1l-1.2-4A4 4 0 0 1 7 9Z"/><path d="M7 12v4M5 14h4M16 13h.1M18 15h.1"/>'};
 return '<svg class="game-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+(paths[name]||'')+'</svg>';
};
const rankLabel = level => level < 5 ? 'Aprendiz del Ahorro' : level < 10 ? 'Guardián del Presupuesto' : 'Maestro de las Finanzas';
const stateLabel = value => ({feliz:'feliz',atento:'atenta',preocupado:'preocupada',celebrando:'celebrando',durmiendo:'descansando'}[value] || 'atenta');
const petMood = hp => hp === null ? 'atento' : hp < 20 ? 'preocupado' : hp < 50 ? 'atento' : 'feliz';

export function renderGameHome(state,{today,plan}={}){
 const g=state.game,summary=gameSummary(state,{today}),hidden=summary.hidden,pet=g.settings.primaryPet||0,storedName=g.settings.petNames[pet],name=storedName===('Mascota '+(pet+1))?['Mascota 1','Mascota 2'][pet]:storedName,accessory=g.settings.accessories[0]||'none',hp=summary.hp;
 const status=hp===null?'Colchón sin configurar':hp<20?'HP bajo':hp<50?'HP atento':'HP tranquilo';
 const widgets=new Set(g.settings.widgets);
 const petCard='<div class="game-pet-card">'+renderPet({species:pet,state:g.settings.petSilent?'durmiendo':petMood(hp),accessory,name,frame:g.settings.frame,avatar:g.settings.avatar})+'<div class="game-pet-copy"><strong>'+esc(name)+'</strong><span>'+gameIcon('heart')+statusLabel(summary,hp)+'</span>'+(hp===null?'<small>Configura un colchón para calcular HP.</small>':'<small>HP '+(hidden?'••••••':hp+'%')+' · colchón '+money(summary.bufferCents,hidden)+'</small>')+'</div></div>';
 const maximum=summary.xpForNext===null,progressMax=maximum?1:summary.xpForNext,progressValue=maximum?1:summary.xpIntoLevel;
 const xp='<div class="game-xp-compact"><div><span>'+gameIcon('star')+'Nivel '+summary.level+' · '+esc(summary.rank)+'</span><strong>'+summary.xp+' XP</strong></div><progress max="'+progressMax+'" value="'+progressValue+'" aria-label="'+(maximum?'Nivel máximo alcanzado':summary.xpIntoLevel+' de '+summary.xpForNext+' XP para el siguiente nivel')+'"></progress><small>'+(maximum?'Nivel máximo':summary.xpToNext+' XP para el siguiente nivel')+' · Racha '+summary.streak+' '+(summary.streak===1?'día':'días')+'</small></div>';
 const health=widgets.has('life')?petCard:'';
 const progress=widgets.has('progress')?xp:'';
 const weekly=widgets.has('weeklyMission')?'<p class="game-widget-note">'+gameIcon('coin')+'Misión semanal · Salidas hasta '+money(summary.weeklyMission.limitCents,hidden)+' · cierre '+esc(summary.weeklyMission.endDate)+'</p>':'';
 const upcoming=widgets.has('upcoming')?'<p class="game-widget-note">'+(plan?.upcoming?.length?plan.upcoming.length+' pago'+(plan.upcoming.length===1?'':'s')+' próximo'+(plan.upcoming.length===1?'':'s')+' en el resumen de Hoy.':'No hay pagos próximos en los siguientes días.')+'</p>':'';
 return '<section class="game-home" data-game-theme="'+esc(g.settings.theme)+'" aria-label="Mi progreso en el juego"><div class="game-home-summary">'+health+progress+'</div>'+weekly+upcoming+'<div class="game-home-actions"><button type="button" class="button button-secondary game-open-button" data-action="game-open">Mi progreso</button><button type="button" class="button button-secondary" data-action="game-settings">Ajustes de juego</button></div></section>';
}
function statusLabel(summary,hp){return hp===null?'Colchón sin configurar':hp<20?'Disponible bajo':hp<50?'Disponible atento':'Disponible saludable';}

function sectionSelect(section){return '<label class="game-section-control">Mi progreso<select data-action="game-section" aria-label="Sección de Mi progreso">'+[['misiones','Misiones'],['retos','Retos'],['logros','Logros'],['mapa','Mapa'],['aspectos','Aspectos']].map(([id,label])=>'<option value="'+id+'" '+(id===section?'selected':'')+'>'+label+'</option>').join('')+'</select></label>';}
function earnedKeys(g){return new Set(g.xpLedger.map(x=>x.key));}
function renderMissions(state,summary,today){
 const g=state.game,keys=earnedKeys(g),items=[];
 items.push({key:'weekly:'+summary.weeklyMission.week,label:'Misión semanal: Salidas',detail:summary.weeklyMission.startDate+' a '+summary.weeklyMission.endDate+' · se evalúa al terminar la semana y requiere actividad',progress:summary.weeklyMission.spentCents,limit:summary.weeklyMission.limitCents,reward:'50 XP',earned:keys.has('weekly:'+summary.weeklyMission.week)});
 const month=today.slice(0,7),snapshot=g.monthlySnapshots.find(x=>x.month===month);
 if(snapshot){
  const monthStart=month+'-01';
  for(const target of snapshot.categoryLimits){
   const spent=movementExpenseByCategory(state,monthStart,today,target.category),key='category:'+month+':'+target.category;
   items.push({key,label:'Límite de '+target.category,detail:'Objetivo capturado para '+month+' · se evalúa al cierre del mes',progress:spent,limit:target.limitCents,reward:'30 XP',earned:keys.has(key)});
  }
  if(snapshot.savingsGoalCents>0){
   const saved=contributionNet(state,monthStart,today),key='savings:'+month;
   items.push({key,label:'Ahorro del mes',detail:'Objetivo capturado: '+money(snapshot.savingsGoalCents,summary.hidden)+' · se evalúa al cierre',progress:saved,limit:snapshot.savingsGoalCents,reward:'100 XP',earned:keys.has(key)});
  }
 }
 for(const goal of state.goals||[]){
  if(goal.archived)continue;
  const awardKey='goal:'+goal.id,summary=computeGoalSummary(state,goal.id,today),target=summary.estimatedPriceCents??goal.targetCents,purchase=goal.purchaseMovementId?state.movements.find(m=>m.id===goal.purchaseMovementId&&m.date<=today):null,earned=keys.has(awardKey),preexisting=g.seenGoalIds.includes(goal.id)&&!earned;
  const funded=summary.reservedCents>=target,progress=purchase?purchase.amountCents:summary.reservedCents,limit=purchase?purchase.amountCents:target;
  const detail=purchase?'Compra real guardada el '+purchase.date+' · total '+money(purchase.amountCents,state.settings.hideBalances):preexisting?'Ya estaba completada al iniciar el juego; no recibe XP retroactivo.':goal.kind==='wish'?funded?'Fondo suficiente; la misión se completa al registrar la compra real.':'Fondo efectivo del deseo frente al precio; falta una compra real.':goal.kind==='annual'?'Apartado efectivo; la misión se completa al registrar el gasto real.':'Fondos efectivos frente al objetivo.';
  items.push({key:awardKey,label:goal.kind==='wish'?'Deseo: '+goal.name:goal.kind==='annual'?'Gasto anual: '+goal.name:'Meta: '+goal.name,detail,progress:Math.max(0,progress),limit:Math.max(0,limit||0),reward:'100 XP',earned,purchased:Boolean(purchase),preexisting});
 }
 if(!items.length)return '<div class="game-empty">Todavía no hay misiones para mostrar.</div>';
 return '<div class="game-card-list">'+items.map(x=>{const pct=x.limit?Math.min(100,Math.round(Math.max(0,x.progress)*100/x.limit)):0,label=x.key.startsWith('weekly:')||x.key.startsWith('category:')?'Presupuesto usado de '+x.label:x.key.startsWith('savings:')?'Ahorro efectivo para '+x.label:'Progreso efectivo de '+x.label;return '<article class="game-card"><div class="game-card-head"><h3>'+gameIcon('chest')+esc(x.label)+'</h3><span class="game-reward">'+(x.earned?'Completada · ':x.preexisting?'Completada antes · ':'')+x.reward+'</span></div><p>'+esc(x.detail)+'</p>'+(x.limit?'<progress max="100" value="'+pct+'" aria-label="'+esc(label)+' · '+pct+'%"></progress>':'')+(x.limit?'<small>'+money(x.progress,summary.hidden)+' de '+money(x.limit,summary.hidden)+'</small>':'')+'</article>';}).join('')+'</div>';
}
const CHALLENGES=[
 {kind:'no-discretionary',label:'Día sin gastos discrecionales',duration:'1 día completo observado',reward:50,detail:'Salidas, Juegos y Comida fuera. Empieza mañana.'},
 {kind:'no-takeout',label:'Semana sin comida fuera',duration:'7 días',reward:100,detail:'Comida fuera; Alimentación esencial queda aparte.'},
 {kind:'extra-savings',label:'Ahorra 2.000 centavos extra',duration:'Hasta fin de mes',reward:100,detail:'Cuenta aportes netos posteriores a la activación.'},
 {kind:'logging-streak',label:'Registra durante 7 días',duration:'7 días',reward:100,detail:'Se cuentan los días con movimientos nuevos.'}
];
function renderChallenges(state,summary,today){
 const latest=new Map();for(const challenge of state.game.challenges)latest.set(challenge.kind,challenge);
 const active=new Set(summary.challenges.filter(c=>c.status==='active').map(c=>c.kind));
 return '<div class="game-card-list">'+CHALLENGES.map(x=>{const challenge=latest.get(x.kind),isActive=active.has(x.kind),status=challenge?.status==='completed'?'Completado':challenge?.status==='failed'?'No completado':challenge?.status==='cancelled'?'Cancelado':'';const progress=challenge?(x.kind==='extra-savings'?money(challenge.progressCents,summary.hidden):String(challenge.activityDates?.length||challenge.progressCents||0)):'0';const reward=challenge?.status==='completed'&&state.game.xpLedger.some(item=>item.key==='challenge:'+x.kind+':'+challenge.period)?' · recompensa obtenida':'';return '<article class="game-card"><div class="game-card-head"><h3>'+gameIcon('sword')+x.label+'</h3><span class="game-reward">'+x.reward+' XP</span></div><p>'+x.duration+' · '+x.detail+'</p>'+(challenge?'<p><strong>'+status+'</strong> · '+(isActive?'Activo desde '+esc(challenge.startDate)+' hasta '+esc(challenge.endDate):'Último intento '+esc(challenge.startDate))+' · Progreso '+esc(progress)+reward+'</p>':'')+(isActive?'<button class="button button-secondary" type="button" data-action="challenge-cancel" data-id="'+esc(challenge.id)+'">Cancelar reto</button>':'<button class="button button-secondary" type="button" data-action="challenge-start" data-kind="'+x.kind+'" data-id="challenge-'+x.kind+'-'+today+'">'+(challenge?'Intentar de nuevo':'Activar reto')+'</button>')+'</article>';}).join('')+'</div>';
}
const ACHIEVEMENTS=[
 ['achievement:first-10000','Primeros 10.000 centavos apartados','Aparta esa cantidad en metas o fondos.','50 XP'],
 ['achievement:four-weeks','Cuatro semanas en objetivo','Completa cuatro misiones semanales consecutivas.','100 XP'],
 ['achievement:healthy-month','Mes saludable observado','Registra todos los días y conserva HP por encima de bajo.','50 XP'],
 ['achievement:first-new-goal:','Primera meta nueva','Completa una meta después de iniciar el juego.','50 XP'],
 ['achievement:seven-day-streak','Siete días seguidos','Registra movimientos durante siete días consecutivos.','100 XP'],
 ['achievement:first-paid-debt','Primera deuda liquidada','Liquida una deuda propia con un pago real.','100 XP']
];
function renderAchievements(state){
 const g=state.game,earned=earnedKeys(g);
 return '<div class="game-card-list">'+ACHIEVEMENTS.map(([key,label,detail,xp])=>{const done=key.endsWith(':')?[...earned].some(value=>value.startsWith(key)):earned.has(key);return '<article class="game-card achievement-card '+(done?'is-complete':'is-locked')+'"><span class="achievement-mark">'+gameIcon('star')+'</span><div><h3>'+label+'</h3><p>'+(done?'Desbloqueado · '+xp:detail)+'</p></div></article>';}).join('')+'</div>';
}
function mapChart(map,hidden){
 const rows=map.months,values=rows.map(r=>r.netWorthCents),min=Math.min(0,...values),max=Math.max(0,...values),span=max-min||1,points=values.map((v,i)=>{const x=20+(rows.length<2?0:i*260/(rows.length-1)),y=150-((v-min)/span)*130;return x+','+y;}).join(' ');
 const zero=150-((0-min)/span)*130;
 return '<figure class="game-map-figure"><svg viewBox="0 0 300 170" role="img" aria-labelledby="map-title map-desc"><title id="map-title">Mapa de patrimonio</title><desc id="map-desc">Gráfico mensual hasta '+esc(map.today)+'. '+(hidden?'Los saldos están ocultos. ':'')+'La tabla de datos acompaña la visualización.</desc><line x1="16" x2="284" y1="'+zero+'" y2="'+zero+'" class="map-zero"/><polyline points="'+points+'" class="map-line"/>'+rows.map((r,i)=>{const xy=points.split(' ')[i]?.split(',')||['20','150'];return '<circle cx="'+xy[0]+'" cy="'+xy[1]+'" r="3" class="map-dot"><title>'+esc(r.month)+': '+(hidden?'saldo oculto':money(r.netWorthCents,false))+'</title></circle>';}).join('')+'</svg><figcaption>La línea horizontal marca cero.</figcaption></figure>';
}
function renderMap(state,{today,summary}){
 const map=progressMap(state,{today}),hidden=map.hidden,rows=map.months;
 const projection=map.projection.available?'<div class="game-projection"><h3>Estimación lineal</h3><p>6 meses · '+money(map.projection.sixMonthsCents,hidden)+'</p><p>12 meses · '+money(map.projection.twelveMonthsCents,hidden)+'</p></div>':'<p class="game-empty">Faltan cierres mensuales suficientes para estimar.</p>';
 return '<p class="game-note">'+gameIcon('bag')+esc(map.baseline)+'</p>'+mapChart(map,hidden)+(map.events.length?'<ul class="game-map-events" aria-label="Eventos del mapa">'+map.events.map(e=>'<li>'+esc(e.date)+' · '+esc(e.type==='level'?'Nivel '+e.level:e.type==='goal'?'Meta completada':e.type==='debt'?'Deuda liquidada':'Logro')+'</li>').join('')+'</ul>':'<p class="game-note">Aún no hay eventos de juego en el mapa.</p>')+'<details class="game-map-table"><summary>Ver tabla de patrimonio</summary><div class="table-scroll"><table><caption>Patrimonio por mes</caption><thead><tr><th>Mes</th><th>Patrimonio</th><th>Variación</th></tr></thead><tbody>'+rows.map(r=>'<tr><th scope="row">'+esc(r.month)+(r.complete?'':' · parcial')+'</th><td>'+money(r.netWorthCents,hidden)+'</td><td>'+(r.changeCents===null?'—':money(r.changeCents,hidden))+'</td></tr>').join('')+'</tbody></table></div></details>'+projection+'<p class="game-note">'+esc(map.warning)+'</p>';
}
function renderCosmetics(state,summary){
 const level=summary.level,g=state.game,req=new Map(cosmeticUnlockLevels),sets=[['theme','Tema',cosmetics.themes],['frame','Marco',cosmetics.frames],['avatar','Avatar',cosmetics.avatars],['accessory','Accesorios',cosmetics.accessories]],names={default:'Clásico',midnight:'Medianoche',forest:'Bosque',none:'Ninguno',silver:'Plata',gold:'Oro',star:'Estrella',shield:'Escudo',scarf:'Bufanda',glasses:'Gafas',crown:'Corona',bandana:'Pañuelo'},selection=[];
 for(const [type,label,items] of sets)for(const item of items){const key=type+':'+item,need=req.get(key)||1,open=level>=need||item==='default'||item==='none';selection.push({type,item,key,label,need,open});}
 const group=(type,label)=>'<fieldset class="cosmetic-group"><legend>'+label+'</legend>'+selection.filter(x=>x.type===type).map(x=>{const accessory=x.type==='accessory',selected=accessory?g.settings.accessories.includes(x.item):g.settings[x.type]===x.item,inputName=accessory?'cosmetic-accessory':'cosmetic-'+x.type;return '<label class="cosmetic-choice '+(x.open?'':'is-locked')+'"><input type="'+(accessory?'checkbox':'radio')+'" name="'+inputName+'" value="'+esc(x.item)+'" '+(selected?'checked':'')+' '+(!x.open?'disabled data-locked="true"':'')+'><span><strong>'+esc(names[x.item]||x.item)+'</strong><small>'+(x.open?'Desbloqueado · '+(selected?'Elegido':'Disponible'):'Se desbloquea en nivel '+x.need)+'</small></span></label>';}).join('')+'</fieldset>';
 const widgets=[['life','Mascota y HP'],['progress','Nivel y racha'],['upcoming','Próximos pagos'],['weeklyMission','Misión semanal']];
 return '<form class="game-settings-form" data-form="game-cosmetics" data-dirty="false">'+sets.map(([type,label])=>group(type,label)).join('')+'<fieldset><legend>Widgets de Hoy</legend>'+widgets.map(([key,label])=>'<label class="game-check"><input type="checkbox" name="widget" value="'+key+'" '+(g.settings.widgets.includes(key)?'checked':'')+'><span>'+label+'</span></label>').join('')+'</fieldset><p class="form-error" data-error role="alert" hidden></p><button class="button button-primary" type="submit" data-action="game-settings-save">Guardar aspectos y widgets</button></form>';
}
function renderProgressSection(state,{today,section,summary}){
 if(section==='misiones')return renderMissions(state,summary,today);
 if(section==='retos')return renderChallenges(state,summary,today);
 if(section==='logros')return renderAchievements(state);
 if(section==='mapa')return renderMap(state,{today,summary});
 if(section==='aspectos')return renderCosmetics(state,summary);
 return '<p class="game-empty">Elige una sección de progreso.</p>';
}
export function renderGameView(state,{today,section='misiones'}={}){
 const summary=gameSummary(state,{today}),safeSection=['misiones','retos','logros','mapa','aspectos'].includes(section)?section:'misiones',pending=state.game.xpLedger.find(x=>!state.game.acknowledgements.includes(x.key));
 const notice=pending?'<aside class="game-reward-notice" role="status" aria-live="polite"><span>+'+pending.xp+' XP · '+esc(pending.type==='movement'?'Movimiento registrado':'Progreso guardado')+'</span><button type="button" class="button button-secondary" data-action="game-ack" data-id="'+esc(pending.key)+'">Entendido</button></aside>':'';
 return '<section class="game-progress-panel" data-game-theme="'+esc(state.game.settings.theme)+'" aria-labelledby="game-progress-title"><div class="game-panel-heading"><div><p class="eyebrow">Tu recorrido</p><h2 id="game-progress-title">Mi progreso</h2></div><button class="button button-icon" type="button" data-action="game-close" aria-label="Cerrar Mi progreso">×</button></div>'+notice+sectionSelect(safeSection)+'<div class="game-section-content" data-game-section="'+safeSection+'">'+renderProgressSection(state,{today,section:safeSection,summary})+'</div></section>';
}

export function renderGameSettings(state){
 const g=state.game,s=g.settings;
 return '<section class="game-settings" data-game-theme="'+esc(s.theme)+'"><h2>Ajustes de juego</h2><form class="game-settings-form" data-form="game-settings" data-dirty="false"><fieldset><legend>HP y experiencia</legend><label class="field"><span>Colchón de seguridad (USD)</span><input type="text" inputmode="decimal" name="bufferAmount" required value="'+amountInput(s.bufferCents)+'"><small>Se usa para calcular HP. No reserva dinero.</small></label><label class="field"><span>Límite semanal de Salidas (USD)</span><input type="text" inputmode="decimal" name="weeklyOutingLimit" required value="'+amountInput(s.weeklyOutingLimitCents)+'"></label></fieldset><fieldset><legend>Mascotas</legend>'+s.petNames.map((name,i)=>'<label class="field"><span>Nombre de Mascota '+(i+1)+'</span><input name="petName'+i+'" maxlength="30" value="'+esc(name)+'"></label>').join('')+'<label class="field"><span>Mascota principal</span><select name="primaryPet"><option value="0" '+(s.primaryPet===0?'selected':'')+'>Mascota 1 · schnauzer</option><option value="1" '+(s.primaryPet===1?'selected':'')+'>Mascota 2 · dachshund</option></select></label><label class="game-check"><input type="checkbox" name="petSilent" '+(s.petSilent?'checked':'')+'><span>Mantener la mascota en silencio</span></label></fieldset><fieldset><legend>Audio y movimiento</legend><label class="game-check"><input type="checkbox" name="audioEnabled" '+(s.audioEnabled?'checked':'')+'><span>Sonido de confirmación (apagado por defecto)</span></label><label class="game-check"><input type="checkbox" name="reduceMotion" '+(s.reduceMotion?'checked':'')+'><span>Reducir movimiento</span></label></fieldset><p class="form-error" data-error role="alert" hidden></p><button class="button button-primary" type="submit" data-action="game-settings-save">Guardar ajustes</button></form>'+renderCosmetics(state,gameSummary(state,{today:state.game.highWaterDate}))+'</section>';
}
