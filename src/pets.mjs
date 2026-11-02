const PALETTE = Object.freeze({
  ink:'#292833', white:'#F6F5F1', cream:'#E7E4DE', silver:'#B8BAC0', gray:'#85858C', shadow:'#494A50',
  ear:'#62636A', black:'#202027', brown:'#49352E', brownMid:'#75513E', tan:'#C18B5E', warm:'#E2B783',
  nose:'#292833', mouth:'#40343A', pink:'#D78383', sparkle:'#F4C767', whiteEye:'#FFFFFF'
});
const STATES = new Set(['feliz','atento','preocupado','celebrando','durmiendo']);
const esc = value => String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
function rect(x,y,w,h,color){return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+color+'"/>';}
function sparkle(x,y,color=PALETTE.sparkle){return rect(x+2,y,2,6,color)+rect(x,y+2,6,2,color);}
function expression(state,{eyeX1=17,eyeX2=29}={}){
 const p=PALETTE;
 if(state==='durmiendo')return rect(eyeX1,22,6,2,p.ink)+rect(eyeX2,22,6,2,p.ink)+rect(22,28,8,2,p.mouth)+rect(24,30,4,2,p.pink)+sparkle(38,10,'#B7A7DF');
 if(state==='preocupado')return rect(eyeX1,18,7,2,p.ink)+rect(eyeX1+1,21,4,5,p.whiteEye)+rect(eyeX1+3,22,3,4,p.ink)+rect(eyeX2,18,7,2,p.ink)+rect(eyeX2+1,21,4,5,p.whiteEye)+rect(eyeX2+3,22,3,4,p.ink)+rect(23,29,7,2,p.mouth)+rect(25,31,3,2,p.mouth);
 if(state==='feliz')return rect(eyeX1,21,7,2,p.ink)+rect(eyeX2,21,7,2,p.ink)+rect(22,28,9,2,p.mouth)+rect(24,30,5,3,p.pink);
 if(state==='celebrando')return rect(eyeX1,19,2,2,p.whiteEye)+rect(eyeX1+3,19,2,2,p.whiteEye)+rect(eyeX2,19,2,2,p.whiteEye)+rect(eyeX2+3,19,2,2,p.whiteEye)+rect(22,27,10,5,p.mouth)+rect(25,28,5,3,p.pink)+sparkle(4,12)+sparkle(38,14,'#9A85D6');
 return rect(eyeX1,20,7,7,p.whiteEye)+rect(eyeX1+2,21,4,5,p.ink)+rect(eyeX1+3,21,2,2,p.whiteEye)+rect(eyeX2,20,7,7,p.whiteEye)+rect(eyeX2+2,21,4,5,p.ink)+rect(eyeX2+3,21,2,2,p.whiteEye)+rect(23,29,8,2,p.mouth);
}
function schnauzer(state){
 const p=PALETTE;
 return [
  // raised stepped ears, charcoal coat and white brows and beard identify schnauzer
  rect(8,5,7,13,p.shadow),rect(10,4,4,10,p.gray),rect(33,5,7,13,p.shadow),rect(34,4,4,10,p.gray),
  rect(17,7,14,4,p.gray),rect(13,9,22,4,p.shadow),rect(11,13,26,16,p.ink),rect(8,17,4,8,p.shadow),rect(36,17,4,8,p.shadow),
  rect(14,13,8,3,p.white),rect(26,13,8,3,p.white),rect(15,16,7,2,p.gray),rect(26,16,7,2,p.gray),
  rect(14,22,20,9,p.white),rect(11,26,5,5,p.cream),rect(32,26,5,5,p.cream),rect(17,29,14,5,p.gray),
  rect(18,20,5,5,p.whiteEye),rect(27,20,5,5,p.whiteEye),rect(19,21,3,4,p.ink),rect(28,21,3,4,p.ink),
  rect(20,24,8,5,p.black),rect(22,25,3,2,p.gray),expression(state),
  rect(19,32,10,5,p.white),rect(15,35,18,5,p.gray),rect(11,39,11,4,p.ink),rect(27,39,11,4,p.ink),
  rect(10,42,13,2,p.black),rect(25,42,13,2,p.black)
 ].join('');
}
function dachshund(state){
 const p=PALETTE;
 let face='';
 if(state==='durmiendo')face=rect(17,20,6,2,p.ink)+rect(28,20,6,2,p.ink)+rect(23,33,7,2,p.ink)+sparkle(39,9,'#B7A7DF');
 else if(state==='preocupado')face=rect(16,17,7,9,p.whiteEye)+rect(18,19,4,6,p.ink)+rect(19,19,2,2,p.whiteEye)+rect(27,17,7,9,p.whiteEye)+rect(29,19,4,6,p.ink)+rect(30,19,2,2,p.whiteEye)+rect(16,15,7,2,p.ink)+rect(27,15,7,2,p.ink)+rect(23,33,7,2,p.ink);
 else if(state==='feliz')face=rect(17,21,6,2,p.ink)+rect(28,21,6,2,p.ink)+rect(23,32,9,2,p.ink)+rect(25,34,5,2,p.pink);
 else if(state==='celebrando')face=rect(17,19,2,2,p.whiteEye)+rect(20,19,2,2,p.whiteEye)+rect(28,19,2,2,p.whiteEye)+rect(31,19,2,2,p.whiteEye)+rect(23,31,10,5,p.ink)+rect(26,32,5,3,p.pink)+sparkle(4,12)+sparkle(39,13,'#9A85D6');
 else face=rect(17,19,6,7,p.whiteEye)+rect(19,20,3,5,p.ink)+rect(20,20,2,2,p.whiteEye)+rect(28,19,6,7,p.whiteEye)+rect(30,20,3,5,p.ink)+rect(31,20,2,2,p.whiteEye)+rect(23,32,7,2,p.ink);
 return [
  // low-set stepped ears, warm eye patches and seated chest define dachshund's silhouette
  rect(6,12,7,15,p.brown),rect(8,17,6,15,p.brownMid),rect(35,12,7,15,p.brown),rect(34,17,6,15,p.brownMid),
  rect(18,28,12,4,p.brown),rect(14,31,20,10,p.brown),rect(17,32,14,8,p.warm),rect(11,38,12,5,p.ink),rect(26,38,12,5,p.ink),
  rect(16,7,16,4,p.brown),rect(12,10,24,5,p.brownMid),rect(10,14,28,13,p.brown),rect(8,18,4,8,p.brownMid),rect(36,18,4,8,p.brownMid),
  rect(14,14,8,4,p.tan),rect(26,14,8,4,p.tan),rect(15,18,7,8,p.cream),rect(26,18,7,8,p.cream),
  rect(17,25,14,9,p.warm),rect(19,25,10,7,p.cream),rect(21,26,7,5,p.black),rect(23,27,3,2,p.gray),face,
  rect(19,34,10,5,p.warm),rect(17,39,14,2,p.tan)
 ].join('');
}
function accessorySvg(accessory){
 const p=PALETTE;
 if(accessory==='scarf')return rect(14,31,20,4,'#35A8B8')+rect(29,34,5,8,'#35A8B8')+rect(15,31,19,1,'#227C91');
 if(accessory==='glasses')return rect(13,19,9,2,p.ink)+rect(26,19,9,2,p.ink)+rect(21,20,6,2,p.ink)+rect(12,19,2,6,p.ink)+rect(34,19,2,6,p.ink);
 if(accessory==='crown')return rect(15,4,4,7,'#E0AD35')+rect(20,7,8,4,'#E0AD35')+rect(29,4,4,7,'#E0AD35')+rect(18,10,12,3,'#F2CA66');
 if(accessory==='bandana')return rect(15,31,19,4,'#C85762')+rect(27,34,5,6,'#C85762')+rect(17,32,3,2,'#F1BDC0');
 return '';
}
export function renderPet({species=0,state='atento',accessory='none',name='Mascota',frame='none',avatar='none'}={}){
 const safeState=STATES.has(state)?state:'atento',isDachshund=Number(species)===1,art=(isDachshund?dachshund:schnauzer)(safeState),label=esc(String(name??'Mascota').slice(0,30)),speciesName=isDachshund?'dachshund':'schnauzer';
 const border=frame==='gold'?'#D7A83A':frame==='silver'?'#A9AAB2':'';
 const frameSvg=border?'<rect x="1" y="1" width="46" height="46" fill="none" stroke="'+border+'" stroke-width="2"/>':'';
 const avatarSvg=avatar==='star'?'<path d="m24 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="#E0AD35"/>':avatar==='shield'?'<path d="M5 3 10 5v3c0 3-2.1 4.8-5 6-2.9-1.2-5-3-5-6V5z" transform="translate(34 34) scale(.9)" fill="#35A8B8"/>':'';
 const labelMood={feliz:'feliz',atento:'atenta',preocupado:'preocupada',celebrando:'celebrando',durmiendo:'descansando'}[safeState];
 return '<svg class="game-pet" viewBox="0 0 48 48" role="img" aria-label="'+label+', '+labelMood+'" data-species="'+speciesName+'" data-state="'+safeState+'" data-frame="'+esc(frame)+'" data-avatar="'+esc(avatar)+'" shape-rendering="crispEdges"><title>'+label+': '+labelMood+'</title><ellipse cx="24" cy="44" rx="14" ry="2" fill="#292833" opacity=".14"/>'+art+accessorySvg(accessory)+avatarSvg+frameSvg+'</svg>';
}
