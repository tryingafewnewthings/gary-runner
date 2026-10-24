(()=>{'use strict';
const $=id=>document.getElementById(id),frame=$('game'),slider=$('position');
let api=null,playing=false,last=0,clock=0,raf=0,busy=false;
const waitFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
function stop(){playing=false;cancelAnimationFrame(raf);$('tour').textContent='▶ Auto flythrough';$('stop').disabled=true;last=0;}
function label(){
 const n=+slider.value,seg=api.segments.find((v,i)=>n<=v.to||i===api.segments.length-1);
 $('location').textContent=seg.label;
 $('detail').textContent='Checkpoint '+(api.segments.indexOf(seg)+1)+' of '+api.segments.length+' · '+Math.round(100*(n-seg.from)/(seg.to-seg.from))+'%';
 for(const b of $('checkpoints').querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.key===seg.key));
}
function paint(value,seconds=clock){
 if(!api)return;
 slider.value=String(Math.max(0,Math.min(1000,Math.round(value))));
 try{api.seek(+slider.value,seconds);label();}
 catch(e){stop();$('status').textContent='Preview error: '+e.message;}
}
function tick(t){
 if(!playing)return;
 if(!last)last=t;
 const dt=Math.min(.06,(t-last)/1000);last=t;clock+=dt;
 const next=Math.min(1000,+slider.value+dt*28);paint(next,clock);
 if(next>=1000){stop();$('status').textContent='Flythrough complete.';return;}
 raf=requestAnimationFrame(tick);
}
function save(canvas,name){
 try{const a=document.createElement('a');a.href=canvas.toDataURL('image/png');a.download=name;document.body.append(a);a.click();a.remove();$('status').textContent='PNG prepared. Safari may open it for sharing.';}
 catch(e){$('status').textContent='Export error: '+e.message;}
}
function init(){
 if(!frame.contentWindow?.GaryWorldExplorer?.ready())return false;
 api=frame.contentWindow.GaryWorldExplorer;
 api.layers({gary:$('gary').checked,hud:$('hud').checked});
 api.mode($('lighting').value);
 for(const seg of api.segments){
  const b=document.createElement('button');b.type='button';b.dataset.key=seg.key;b.textContent=seg.label;
  const small=document.createElement('span');small.textContent='Jump to checkpoint';b.append(small);
  b.addEventListener('click',()=>{stop();paint(seg.from+20);});$('checkpoints').append(b);
 }
 for(const id of ['position','previous','next','tour','shot','sheet'])$(id).disabled=false;
 $('loading').hidden=true;paint(0);$('status').textContent='Ready. Drag the timeline to inspect the game.';
 return true;
}
function boot(){
 const start=Date.now();
 function poll(){
  try{if(init())return;}catch(e){$('status').textContent='Waiting for renderer: '+e.message;}
  if(Date.now()-start>65000){$('loading').textContent='Preview timed out. Reload the page.';return;}
  setTimeout(poll,250);
 }
 poll();
}
slider.addEventListener('input',()=>{stop();paint(+slider.value);});
$('previous').addEventListener('click',()=>{
 stop();const n=+slider.value,items=api.segments,idx=items.findIndex((v,i)=>n<=v.to||i===items.length-1);
 paint(items[Math.max(0,idx-(n>items[idx].from+40?0:1))].from);
});
$('next').addEventListener('click',()=>{
 stop();const n=+slider.value,idx=api.segments.findIndex((v,i)=>n<=v.to||i===api.segments.length-1);
 paint(api.segments[Math.min(api.segments.length-1,idx+1)].from);
});
$('tour').addEventListener('click',()=>{
 if(!api)return;if(playing){stop();return;}
 if(+slider.value>=1000)paint(0);
 playing=true;last=0;$('tour').textContent='Ⅱ Pause flythrough';$('stop').disabled=false;raf=requestAnimationFrame(tick);
});
$('stop').addEventListener('click',stop);
$('lighting').addEventListener('change',()=>{if(api){api.mode($('lighting').value);label();}});
for(const id of ['gary','hud'])$(id).addEventListener('change',()=>{if(api)api.layers({gary:$('gary').checked,hud:$('hud').checked});});
$('shot').addEventListener('click',()=>{
 if(api)save(frame.contentDocument.getElementById('c'),'gary-eats-world-'+slider.value+'.png');
});
$('sheet').addEventListener('click',async()=>{
 if(!api||busy)return;
 busy=true;stop();const button=$('sheet');button.disabled=true;
 const previous=+slider.value,previousTime=clock;
 const canvas=$('contact'),ctx=canvas.getContext('2d');canvas.width=720;canvas.height=960;
 const game=frame.contentDocument.getElementById('c');
 try{
  const points=[0,90,175,220,300,390,415,490,565,630,785,925];
  for(let i=0;i<points.length;i++){
   $('status').textContent='Capturing '+(i+1)+' of '+points.length;
   paint(points[i],previousTime+i*.35);await waitFrame();
   const x=i%4*180,y=Math.floor(i/4)*320;
   ctx.drawImage(game,x,y,180,320);
   ctx.fillStyle='rgba(7,15,17,.79)';ctx.fillRect(x,y+299,180,21);
   ctx.fillStyle='#fff';ctx.font='bold 12px system-ui';
   ctx.fillText(api.snapshot().segment.replace(/-/g,' '),x+7,y+314,168);
  }
  canvas.style.display='block';save(canvas,'gary-eats-world-contact-sheet.png');
 }catch(e){$('status').textContent='Contact sheet error: '+e.message;}
 finally{paint(previous,previousTime);busy=false;button.disabled=false;}
});
boot();
})();