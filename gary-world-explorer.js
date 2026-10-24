/* Gary Eats! World Explorer — isolated same-origin real-engine QA controls. */
(()=>{'use strict';
const $=id=>document.getElementById(id),frame=$('game');
const controls=['distance','back','tour','next','minus','plus','mode','gary','hud','shot','strip'];
let api=null,position=0,landmarks=[],touring=false,lastTick=0,lastDraw=0,tourFrame=0,contactBusy=false;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const msg=text=>{$('message').textContent=text;};
function settings(){return {mode:$('mode').value,gary:$('gary').checked,hud:$('hud').checked};}
function nearest(d){let idx=0,best=Infinity;landmarks.forEach((v,i)=>{const delta=Math.abs(v.distance-d);if(delta<best){best=delta;idx=i;}});return idx;}
function paintUI(){
 $('distance').value=String(Math.round(position));
 $('position').textContent=Math.round(position).toLocaleString()+' / '+api.max.toLocaleString();
 $('percent').textContent=Math.round(position/api.max*100)+'%';
 $('progress').style.width=(position/api.max*100)+'%';
 const near=landmarks[nearest(position)];
 $('location').textContent=near?.name||'World';
 for(const btn of $('locations').children)btn.setAttribute('aria-pressed',String(Number(btn.dataset.distance)===position));
 $('tour').textContent=touring?'Ⅱ Pause':'▶ Flythrough';
}
function seek(d){
 if(!api)return false;
 const requested=clamp(Number(d)||0,0,api.max);
 try{
  const snap=api.seek(requested,settings());
  if(!snap)throw Error('Renderer not ready');
  position=snap.distance;paintUI();$('status').textContent='Live renderer · '+snap.label;
  return true;
 }catch(e){msg('Preview failed: '+(e.message||e));pause();return false;}
}
function pause(){touring=false;cancelAnimationFrame(tourFrame);lastTick=lastDraw=0;if(api)paintUI();}
function tourTick(t){
 if(!touring)return;
 if(!lastTick)lastTick=t;
 const dt=Math.min(.12,(t-lastTick)/1000);lastTick=t;
 if(t-lastDraw>=33){
  if(!seek(position+dt*1800)){pause();return;}
  lastDraw=t;
 }
 if(position>=api.max){pause();return;}
 tourFrame=requestAnimationFrame(tourTick);
}
function toggleTour(){if(touring){pause();return;}if(position>=api.max)seek(0);touring=true;lastTick=lastDraw=0;tourFrame=requestAnimationFrame(tourTick);paintUI();}
function jump(delta){pause();const i=nearest(position);const n=landmarks[clamp(i+delta,0,landmarks.length-1)];seek(n.distance);}
function imageFromGame(){
 const source=frame.contentDocument?.getElementById('c');
 if(!source||!source.width)throw Error('Game canvas unavailable');
 const output=document.createElement('canvas');output.width=360;output.height=640;
 output.getContext('2d').drawImage(source,0,0,360,640);
 return output;
}
function download(canvas,name){
 canvas.toBlob(blob=>{
  if(!blob){msg('Image export unavailable on this browser.');return;}
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
  msg('PNG prepared. On iPhone, use Share → Save Image if Safari opens the picture.');
 },'image/png');
}
function capture(){pause();if(seek(position))download(imageFromGame(),'gary-world-'+Math.round(position)+'.png');}
const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
async function buildSheet(){
 if(contactBusy||!api)return;
 pause();contactBusy=true;$('strip').disabled=true;
 const oldPosition=position,oldMode=$('mode').value,points=landmarks.slice();
 const cols=3,rows=Math.ceil(points.length/cols),thumbW=360,thumbH=640,labelH=45;
 const sheet=document.createElement('canvas');sheet.width=cols*thumbW;sheet.height=rows*(thumbH+labelH);
 const c=sheet.getContext('2d');c.fillStyle='#12201f';c.fillRect(0,0,sheet.width,sheet.height);
 const strip=$('filmstrip');strip.replaceChildren();
 try{
  for(let i=0;i<points.length;i++){
   const point=points[i];if(!seek(point.distance))throw Error('Cannot render '+point.name);
   await nextFrame();
   const picture=imageFromGame(),x=(i%cols)*thumbW,y=Math.floor(i/cols)*(thumbH+labelH);
   c.drawImage(picture,x,y,thumbW,thumbH);
   c.fillStyle='#12201f';c.fillRect(x,y+thumbH,thumbW,labelH);
   c.fillStyle='#f5e4b9';c.font='bold 23px -apple-system,Arial';c.fillText(point.name,x+12,y+thumbH+29,thumbW-20);
   const thumb=document.createElement('button');thumb.className='thumb';thumb.type='button';
   const im=document.createElement('img');im.alt=point.name+' gameplay view';im.src=picture.toDataURL('image/jpeg',.72);
   const title=document.createElement('span');title.textContent=point.name;
   thumb.append(im,title);thumb.addEventListener('click',()=>{pause();seek(point.distance);});
   strip.append(thumb);msg('Capturing '+(i+1)+' / '+points.length+'…');
   await nextFrame();
  }
  download(sheet,'gary-eats-world-contact-sheet.png');
 }catch(e){msg('Contact sheet interrupted: '+(e.message||e));}
 finally{$('mode').value=oldMode;seek(oldPosition);contactBusy=false;$('strip').disabled=false;}
}
function init(){
 if(api)return;
 try{
  const candidate=frame.contentWindow?.GaryWorldExplorer;
  if(!candidate?.ready())return;
  api=candidate;landmarks=api.landmarks;
  $('distance').max=String(api.max);
  for(const place of landmarks){
   const b=document.createElement('button');b.type='button';b.textContent=place.name;
   b.dataset.distance=String(place.distance);b.setAttribute('aria-pressed','false');
   b.addEventListener('click',()=>{pause();seek(place.distance);});$('locations').append(b);
  }
  for(const id of controls)$(id).disabled=false;
  $('distance').addEventListener('input',e=>{pause();seek(Number(e.target.value));});
  $('back').addEventListener('click',()=>jump(-1));$('next').addEventListener('click',()=>jump(1));
  $('minus').addEventListener('click',()=>{pause();seek(position-200);});
  $('plus').addEventListener('click',()=>{pause();seek(position+200);});
  $('tour').addEventListener('click',toggleTour);
  for(const id of ['mode','gary','hud'])$(id).addEventListener('change',()=>{pause();seek(position);});
  $('shot').addEventListener('click',capture);$('strip').addEventListener('click',buildSheet);
  seek(0);msg('Drag the slider or choose a location. The game is not being played.');
 }catch(e){msg('Explorer setup failed: '+(e.message||e));}
}
const wait=setInterval(()=>{init();if(api)clearInterval(wait);},200);
frame.addEventListener('load',init);
setTimeout(()=>{if(!api){$('status').textContent='Still loading';msg('Game assets are taking longer than expected. Refresh if this persists.');}},30000);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
})();