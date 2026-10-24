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
 try{api.seek(+slider.value,seconds);label();refreshSeam();}
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
 for(const id of ['position','previous','next','tour','shot','sheet','seam-composite','seam-top-edge','seam-bottom-edge','seam-manifest'])$(id).disabled=false;
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
$('lighting').addEventListener('change',()=>{if(api){api.mode($('lighting').value);label();refreshSeam();}});
for(const id of ['gary','hud'])$(id).addEventListener('change',()=>{if(api){api.layers({gary:$('gary').checked,hud:$('hud').checked});refreshSeam();}});
$('shot').addEventListener('click',()=>{
 if(!api)return;
 const source=frame.contentDocument.getElementById('c');
 const output=document.createElement('canvas');output.width=360;output.height=640;
 output.getContext('2d').drawImage(source,0,0,360,640);
 save(output,'gary-eats-world-'+slider.value+'.png');
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
// Cache one immutable capture so all four downloads share pixels and timestamp.
let seamCache=null;
function seamExport(){
 const heights=['top','gap','bottom'].map(key=>Number($('seam-'+key).value));
 if(heights.some(n=>!Number.isInteger(n)||n<1||n>640)||heights.reduce((a,b)=>a+b,0)>640)
   throw Error('Use whole heights from 1–640; top + gap + bottom must not exceed 640.');
 const [top,gap,bottom]=heights,hidden={hideGary:$('seam-gary').checked,hideHud:$('seam-hud').checked,hideRain:$('seam-rain').checked};
 const mode=$('seam-mode').value;
 const start=Number($('seam-position').value);
 if(!Number.isInteger(start)||start<0||start+top+gap+bottom>640)throw Error('Selection must fit inside the view.');
 const key=JSON.stringify([api.snapshot(),clock,mode,heights,hidden,start]);
 if(seamCache?.key===key)return seamCache;
 const capture=api.captureFrame(hidden);
 const make=(height)=>{const c=document.createElement('canvas');c.width=360;c.height=height;return c;};
 const topEdge=make(top),bottomEdge=make(bottom),composite=make(top+gap+bottom);
 topEdge.getContext('2d').drawImage(capture.canvas,0,start,360,top,0,0,360,top);
 bottomEdge.getContext('2d').drawImage(capture.canvas,0,start+top+gap,360,bottom,0,0,360,bottom);
 const ctx=composite.getContext('2d');ctx.drawImage(topEdge,0,0);ctx.drawImage(bottomEdge,0,top+gap);
 const manifest={version:2,mode,timestamp:new Date().toISOString(),...capture.metadata,
   logicalFrame:{width:360,height:640},topCropHeight:top,gapHeight:gap,bottomCropHeight:bottom,
   sourceCrops:{top:{x:0,y:start,width:360,height:top},bottom:{x:0,y:start+top+gap,width:360,height:bottom}},
   composite:{width:360,height:top+gap+bottom,gapY:top,bottomY:top+gap},
   referencePolicy:'Exact gameplay geometry evidence only. All existing wilderness artwork is user-rejected and must not be used as a positive art reference.'};
 seamCache={key,frame:capture.canvas,composite,'top-edge':topEdge,'bottom-edge':bottomEdge,manifest};return seamCache;
}
for(const kind of ['composite','top-edge','bottom-edge','manifest']){
 $('seam-'+kind).addEventListener('click',()=>{
  if(!api||busy){$('seam-status').textContent='Wait for the contact sheet to finish.';return;}
  stop();
  try{
   const result=seamExport();
   const blob=kind==='manifest'?new Blob([JSON.stringify(result.manifest,null,2)],{type:'application/json'}):null;
   const url=blob?URL.createObjectURL(blob):result[kind].toDataURL('image/png');
   const a=document.createElement('a');a.href=url;a.download='seam-template-'+kind+(blob?'.json':'.png');
   document.body.append(a);a.click();a.remove();
   if(blob)setTimeout(()=>URL.revokeObjectURL(url),60000);
   $('seam-status').textContent='Prepared '+a.download+'. Safari may open it for sharing.';
  }catch(e){$('seam-status').textContent='Export error: '+e.message;}
 });
}

function refreshSeam(){
 if(!api)return;
 const canvas=$('seam-view'),ctx=canvas.getContext('2d');
 try{
  const r=seamExport(),m=r.manifest,start=m.sourceCrops.top.y;
  const a=start+m.topCropHeight,b=a+m.gapHeight,end=b+m.bottomCropHeight;
  ctx.clearRect(0,0,360,640);ctx.drawImage(r.frame,0,0);
  ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(0,0,360,start);ctx.fillRect(0,end,360,640-end);
  for(let y=a;y<b;y+=8)for(let x=0;x<360;x+=8){ctx.fillStyle=((x/8+Math.floor((y-a)/8))%2)?'#536064':'#788589';ctx.fillRect(x,y,8,Math.min(8,b-y));}
  ctx.strokeStyle='#ffdc82';ctx.lineWidth=2;
  for(const y of [start,a,b,end]){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(360,y);ctx.stroke();ctx.fillStyle='#ffdc82';ctx.fillRect(155,y-3,50,6);}
  ctx.font='bold 13px system-ui';ctx.textAlign='left';
  for(const [text,y] of [['TOP EDGE',start],['TRANSPARENT GAP',a],['BOTTOM EDGE',b]]){
   ctx.fillStyle='rgba(0,0,0,.8)';ctx.fillRect(4,y+5,150,20);ctx.fillStyle='#fff';ctx.fillText(text,9,y+20);
  }
  $('seam-selection').textContent=`Top: y ${start}–${a} · Gap: ${m.gapHeight} px · Bottom: y ${b}–${end}`;
  canvas.setAttribute('aria-label',`Editable seam: top ${start} to ${a}, gap ${a} to ${b}, bottom ${b} to ${end}. Use selection top and height controls to edit with a keyboard.`);
 }catch(e){ctx.clearRect(0,0,360,640);$('seam-selection').textContent=e.message;}
}
function fitSeam(){
 const size=['top','gap','bottom'].reduce((sum,k)=>sum+Number($('seam-'+k).value),0);
 const max=Math.max(0,640-size);$('seam-position').max=String(max);
 if(+$('seam-position').value>max)$('seam-position').value=String(max);
 refreshSeam();
}
for(const k of ['top','gap','bottom'])$('seam-'+k).addEventListener('input',()=>{stop();fitSeam();});
$('seam-position').addEventListener('input',()=>{stop();refreshSeam();});
for(const k of ['gary','hud','rain'])$('seam-'+k).addEventListener('change',()=>{stop();refreshSeam();});
$('seam-mode').addEventListener('change',()=>{
 stop();
 if($('seam-mode').value!=='custom'){
  for(const [k,n] of [['top',96],['gap',64],['bottom',96]])$('seam-'+k).value=n;
  $('seam-position').max='384';$('seam-position').value='192';
  // near = 120 + (position - 400) / 199 * 1250; far edge = near - 620.
  paint($('seam-mode').value==='bridge-entrance'?432:531);
 }
 refreshSeam();
});
let seamDrag=null;
const seamY=e=>Math.max(0,Math.min(640,(e.clientY-$('seam-view').getBoundingClientRect().top)*640/$('seam-view').getBoundingClientRect().height));
$('seam-view').addEventListener('pointerdown',e=>{
 if(!api||busy)return;
 try{seamExport();}catch(_){return;}
 stop();const y=seamY(e),start=+$('seam-position').value,t=+$('seam-top').value,g=+$('seam-gap').value,b=+$('seam-bottom').value;
 const edges=[start,start+t,start+t+g,start+t+g+b];
 let edge=-1,nearest=24;
 edges.forEach((v,i)=>{if(Math.abs(v-y)<nearest){nearest=Math.abs(v-y);edge=i;}});
 if(edge<0&&(y<start||y>edges[3]))return;
 seamDrag={y,edges,edge};e.currentTarget.setPointerCapture(e.pointerId);e.preventDefault();
});
$('seam-view').addEventListener('pointermove',e=>{
 if(!seamDrag)return;
 const {edges,edge,y}=seamDrag,delta=Math.round(seamY(e)-y),next=edges.slice();
 if(edge<0){const d=Math.max(-edges[0],Math.min(640-edges[3],delta));for(let i=0;i<4;i++)next[i]+=d;}
 else next[edge]=Math.max(edge===0?0:edges[edge-1]+1,Math.min(edge===3?640:edges[edge+1]-1,edges[edge]+delta));
 $('seam-position').max=String(640-(next[3]-next[0]));$('seam-position').value=String(next[0]);
 ['top','gap','bottom'].forEach((k,i)=>$('seam-'+k).value=String(next[i+1]-next[i]));
 refreshSeam();
});
for(const event of ['pointerup','pointercancel','lostpointercapture'])$('seam-view').addEventListener(event,()=>{seamDrag=null;});
boot();
})();