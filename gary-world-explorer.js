(()=>{'use strict';
const $=id=>document.getElementById(id),frame=$('game'),slider=$('position');
let api=null,playing=false,last=0,clock=0,raf=0,busy=false;
let registry=null,provenance=null,prepared=null,boundary=null,candidate=null,candidateVersion=0;
const factory=window.GarySeamFactory;
const transition=()=>registry.transitions.find(t=>t.id===$('seam-mode').value);
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
 try{api.seek(+slider.value,seconds);if(registry){$('seam-mode').value='custom';boundary=null;invalidateKit();importedManifest=null;if(candidate){candidate=null;frame.contentWindow.GaryAssetPreview.clear();$('seam-candidate').hidden=true;}}label();refreshSeam();}
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
 if(!registry||!frame.contentWindow?.GaryWorldExplorer?.ready())return false;
 api=frame.contentWindow.GaryWorldExplorer;
 api.layers({gary:$('gary').checked,hud:$('hud').checked});
 api.mode($('lighting').value);
 for(const seg of api.segments){
  const b=document.createElement('button');b.type='button';b.dataset.key=seg.key;b.textContent=seg.label;
  const small=document.createElement('span');small.textContent='Jump to checkpoint';b.append(small);
  b.addEventListener('click',()=>{stop();paint(seg.from+20);});$('checkpoints').append(b);
 }
 for(const id of ['position','previous','next','tour','shot','sheet','seam-mode','seam-import'])$(id).disabled=false;
 $('loading').hidden=true;selectTransition();$('status').textContent='Ready. Select a transition or explore the timeline.';
 return true;
}
async function boot(){
 try{await loadRegistry();}catch(e){$('loading').textContent='Seam factory unavailable: '+e.message;return;}
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
 if((transition().resolver.kind!=='manual'&&heights[1]%2!==0)||heights.some(n=>!Number.isInteger(n)||n<1||n>640)||heights.reduce((a,b)=>a+b,0)>640)
   throw Error('Use whole heights from 1–640 and an even gap; top + gap + bottom must not exceed 640.');
 const [top,gap,bottom]=heights,hidden={hideGary:$('seam-gary').checked,hideHud:$('seam-hud').checked,hideRain:$('seam-rain').checked};
 const mode=$('seam-mode').value;
 const start=Number($('seam-position').value);
 if(!Number.isInteger(start)||start<0||start+top+gap+bottom>640)throw Error('Selection must fit inside the view.');
 const key=JSON.stringify([api.snapshot(),clock,mode,heights,hidden,start,provenance.fingerprint]);
 if(seamCache?.key===key)return seamCache;
 const capture=api.captureFrame({...hidden,excludeCandidate:true});
 const make=(height)=>{const c=document.createElement('canvas');c.width=360;c.height=height;return c;};
 const topEdge=make(top),bottomEdge=make(bottom),composite=make(top+gap+bottom);
 topEdge.getContext('2d').drawImage(capture.canvas,0,start,360,top,0,0,360,top);
 bottomEdge.getContext('2d').drawImage(capture.canvas,0,start+top+gap,360,bottom,0,0,360,bottom);
 const ctx=composite.getContext('2d');ctx.drawImage(topEdge,0,0);ctx.drawImage(bottomEdge,0,top+gap);
 const entry=transition(),snap=api.snapshot(),registration=api.registration();
 const worldBoundary=boundary||{world:snap.distance-(start+top+gap/2),screenY:start+top+gap/2,bridgeAnchor:snap.bridge.anchor};
 const blocked=blockedReason();
 const manifest={schema:'gary-seam-manifest-v1',version:3,mode,
   transition:entry,repository:provenance,worldBoundary,
   registration,sourceGeometry:entry.sourceBiome==='bridge'?{deck:registration.bridge.deck,length:registration.bridge.end-registration.bridge.far}:registration.road,
   destinationGeometry:entry.destinationBiome==='bridge'?{deck:registration.bridge.deck,length:registration.bridge.end-registration.bridge.far}:null,
   originalReferencePack:'docs/visual-master/reference-pack.json',originalReferences:entry.references,referenceApproval:{status:blocked?'BLOCKED':'REFERENCE_CONTEXT',reason:blocked||entry.approval.reason},
   exportDimensions:{width:360,height:top+gap+bottom},transparentMask:{x:0,y:top,width:360,height:gap},
   assetRegistration:{worldTop:worldBoundary.world+top+gap/2,x:0,width:360,height:top+gap+bottom,pass:entry.anchor.pass,scale:1},occlusion:entry.anchor.occlusion,
timestamp:new Date().toISOString(),...capture.metadata,
   logicalFrame:{width:360,height:640},topCropHeight:top,gapHeight:gap,bottomCropHeight:bottom,
   sourceCrops:{top:{x:0,y:start,width:360,height:top},bottom:{x:0,y:start+top+gap,width:360,height:bottom}},
   composite:{width:360,height:top+gap+bottom,gapY:top,bottomY:top+gap},
   referencePolicy:'Exact gameplay geometry evidence only. All existing wilderness artwork is user-rejected and must not be used as a positive art reference.'};
 seamCache={key,frame:capture.canvas,prompt:factory.prompt(manifest),composite,'top-edge':topEdge,'bottom-edge':bottomEdge,manifest};return seamCache;
}
for(const kind of ['composite','top-edge','bottom-edge','manifest']){
 $('seam-'+kind).addEventListener('click',()=>{
  if(!api||busy){$('seam-status').textContent='Wait for the contact sheet to finish.';return;}
  stop();
  try{
   const reason=blockedReason();if(reason)throw Error(reason);
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
 if(!api||!registry)return;
 const canvas=$('seam-view'),ctx=canvas.getContext('2d');
 try{
  if(transition().resolver.kind!=='manual'){
   const snap=api.snapshot(),reg=api.registration(),factor=transition().resolver.lengthFactor;
   const world=transition().resolver.kind==='world'?transition().resolver.world:snap.bridge.anchor+(reg.bridge.end-reg.bridge.far)*factor;
   boundary={world,screenY:snap.distance-world,bridgeAnchor:snap.bridge.anchor};
   const c=factory.corridor(boundary.screenY,{top:+$('seam-top').value,gap:+$('seam-gap').value,bottom:+$('seam-bottom').value});
   $('seam-position').value=c.top.y;
  }
  const r=seamExport(),m=r.manifest,start=m.sourceCrops.top.y;
  if(prepared&&prepared.key!==r.key)invalidateKit();
  const blocked=blockedReason();$('seam-approval').textContent=blocked||'Registered boundary · original street + preserved supplied bridge · candidate generation only';
  $('seam-prepare').disabled=!!blocked||busy;
  for(const id of ['composite','top-edge','bottom-edge','manifest'])$('seam-'+id).disabled=!!blocked;
  $('seam-position').disabled=transition().resolver.kind!=='manual';
  $('seam-debug').textContent=JSON.stringify({boundary:m.worldBoundary,registration:m.assetRegistration,approval:m.referenceApproval},null,2);
  const a=start+m.topCropHeight,b=a+m.gapHeight,end=b+m.bottomCropHeight;
  ctx.clearRect(0,0,360,640);
  ctx.drawImage(candidate?api.captureFrame({hideGary:!$('gary').checked,hideHud:!$('hud').checked,hideRain:false}).canvas:r.frame,0,0);
  if(!$('seam-guides').checked)return;
  ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(0,0,360,start);ctx.fillRect(0,end,360,640-end);
  if(!candidate)for(let y=a;y<b;y+=8)for(let x=0;x<360;x+=8){ctx.fillStyle=((x/8+Math.floor((y-a)/8))%2)?'#536064':'#788589';ctx.fillRect(x,y,8,Math.min(8,b-y));}
  ctx.strokeStyle='#ffdc82';ctx.lineWidth=2;
  for(const y of [start,a,b,end]){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(360,y);ctx.stroke();ctx.fillStyle='#ffdc82';ctx.fillRect(155,y-3,50,6);}
  ctx.font='bold 13px system-ui';ctx.textAlign='left';
  for(const [text,y] of [['TOP EDGE',start],['TRANSPARENT GAP',a],['BOTTOM EDGE',b]]){
   ctx.fillStyle='rgba(0,0,0,.8)';ctx.fillRect(4,y+5,150,20);ctx.fillStyle='#fff';ctx.fillText(text,9,y+20);
  }
  $('seam-selection').textContent=`Top: y ${start}–${a} · Gap: ${m.gapHeight} px · Bottom: y ${b}–${end}`;
  canvas.setAttribute('aria-label',`Editable seam: top ${start} to ${a}, gap ${a} to ${b}, bottom ${b} to ${end}. Use selection top and height controls to edit with a keyboard.`);
 }catch(e){ctx.clearRect(0,0,360,640);$('seam-selection').textContent=e.message;$('seam-prepare').disabled=true;invalidateKit();}
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
$('seam-mode').addEventListener('change',selectTransition);
let seamDrag=null;
const seamY=e=>Math.max(0,Math.min(640,(e.clientY-$('seam-view').getBoundingClientRect().top)*640/$('seam-view').getBoundingClientRect().height));
$('seam-view').addEventListener('pointerdown',e=>{
 if(!api||busy||transition().resolver.kind!=='manual')return;
 try{seamExport();}catch(_){return;}
 stop();const y=seamY(e),start=+$('seam-position').value,t=+$('seam-top').value,g=+$('seam-gap').value,b=+$('seam-bottom').value;
 const edges=[start,start+t,start+t+g,start+t+g+b];
 let edge=-1,nearest=22*640/e.currentTarget.getBoundingClientRect().height;
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
async function loadRegistry(){
 const response=await fetch('gary-seam-registry.json?v=1');if(!response.ok)throw Error('Transition registry could not load');
 registry=await response.json();
 const paths=['gary-seam-registry.json','gary-seam-factory.js','gary-world-explorer.js','gary-difficulty-runtime.js','gary-bridge-user.js','gary-difficulty-data.js'];
 const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(v=>v.toString(16).padStart(2,'0')).join('');
 const hashes={};
 await Promise.all(paths.map(async p=>{const r=await fetch(p);if(!r.ok)throw Error('Missing '+p);hashes[p]=await digest(await r.arrayBuffer());}));
 provenance={url:'https://github.com/tryingafewnewthings/gary-runner',sourceRevision:registry.sourceRevision,
  fingerprint:await digest(new TextEncoder().encode(JSON.stringify(Object.entries(hashes).sort()))),files:hashes,images:{}};
 const refs=[...new Set(registry.transitions.flatMap(t=>t.references))];
 await Promise.all(refs.map(async p=>{
  if(p.startsWith('art/wilderness/'))return;
  try{const r=await fetch(p);if(!r.ok)throw Error('missing');const bytes=await r.arrayBuffer();
   const url=URL.createObjectURL(new Blob([bytes]));try{const im=new Image();im.src=url;await im.decode();provenance.images[p]={sha256:await digest(bytes),width:im.naturalWidth,height:im.naturalHeight};}finally{URL.revokeObjectURL(url);}
  }catch(_){provenance.images[p]={missing:true};}
 }));
 for(const t of registry.transitions){const o=document.createElement('option');o.value=t.id;o.textContent=t.name;$('seam-mode').append(o);}
}
function blockedReason(){
 const entry=transition();
 const missing=entry.references.find(p=>!provenance.images[p]||provenance.images[p].missing);
 if(missing)return 'Required original image unavailable: '+missing;
 return factory.eligibility(entry,api.registration(),api.snapshot());
}
function invalidateKit(){prepared=null;$('seam-kit').hidden=true;$('seam-share').disabled=true;$('seam-zip').disabled=true;}
function selectTransition(){
 if(!api||!registry)return;
 stop();invalidateKit();candidate=null;importedManifest=null;frame.contentWindow.GaryAssetPreview.clear();$('seam-candidate').hidden=true;
 const entry=transition();for(const k of ['top','gap','bottom'])$('seam-'+k).value=entry.defaults[k];
 $('seam-position').max='384';$('seam-position').value='192';
 if(entry.resolver.kind!=='manual'){
  boundary=api.alignSeam(entry.resolver,320);slider.value=api.snapshot().position;label();
 }else boundary=null;
 refreshSeam();
}
function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
function kitFiles(r){return [
 {name:'seam-template.png',data:GaryBiomeZip.fromDataUrl(r.composite.toDataURL())},
 {name:'upper-reference.png',data:GaryBiomeZip.fromDataUrl(r['top-edge'].toDataURL())},
 {name:'lower-reference.png',data:GaryBiomeZip.fromDataUrl(r['bottom-edge'].toDataURL())},
 {name:'seam-manifest.json',data:JSON.stringify(r.manifest,null,2)},
 {name:'generation-prompt.txt',data:r.prompt}];}
$('seam-prepare').addEventListener('click',()=>{
 if(busy)return;stop();
 try{
  const reason=blockedReason();if(reason)throw Error(reason);
  const result=seamExport();prepared={...result,files:kitFiles(result)};
  $('seam-template-preview').src=result.composite.toDataURL();$('seam-prompt').value=result.prompt;
  $('seam-kit').hidden=false;$('seam-share').disabled=false;$('seam-zip').disabled=false;
  $('seam-status').textContent='Reference kit prepared. Save the PNG and copy the prompt, or share both.';
 }catch(e){$('seam-status').textContent=e.message;}
});
$('seam-save').addEventListener('click',()=>{if(prepared)downloadBlob(new Blob([prepared.files[0].data],{type:'image/png'}),'seam-template.png');});
$('seam-zip').addEventListener('click',()=>{if(prepared)downloadBlob(GaryBiomeZip.zip(prepared.files),'gary-seam-reference-kit.zip');});
$('seam-copy').addEventListener('click',async()=>{
 if(!prepared)return;
 try{if(!navigator.clipboard?.writeText)throw Error('clipboard unavailable');await navigator.clipboard.writeText(prepared.prompt);$('seam-status').textContent='Prompt copied. Attach the saved PNG in ChatGPT and paste.';}
 catch(_){$('seam-prompt').focus();$('seam-prompt').select();const ok=document.execCommand('copy');$('seam-status').textContent=ok?'Prompt copied. Attach the PNG in ChatGPT.':'Prompt selected. Touch and hold to copy, then attach the saved PNG in ChatGPT.';}
});
$('seam-share').addEventListener('click',async()=>{
 if(!prepared)return;
 const file=new File([prepared.files[0].data],'seam-template.png',{type:'image/png'});
 const payload={files:[file],text:prepared.prompt,title:'Gary Eats seam template'};
 try{
  if(!navigator.share||!navigator.canShare?.({files:[file]}))throw Error('Use Save PNG and Copy AI prompt below, then attach the PNG in ChatGPT.');
  await navigator.share(payload);$('seam-status').textContent='Share sheet completed. Check the chosen app received the PNG and prompt; ChatGPT attachment is not verified.';
 }catch(e){$('seam-status').textContent=e.name==='AbortError'?'Sharing cancelled. Your reference kit is still available.':e.message+' Save PNG and Copy AI prompt are available below.';}
});
let importedManifest=null;
function applyCandidate(){
 if(!candidate)return;
 const preview=frame.contentWindow.GaryAssetPreview;
 if(!$('seam-after').checked)preview.clear();
 else{const m=candidate.manifest;preview.set({image:candidate.image,draw:{x:0,y:api.snapshot().distance-m.assetRegistration.worldTop,width:m.exportDimensions.width,height:m.exportDimensions.height},pass:m.assetRegistration.pass,scrollWithWorld:true});}
 candidateVersion++;refreshSeam();
}
$('seam-import').addEventListener('click',()=>{
 if(!prepared&&!importedManifest){$('seam-status').textContent='Prepare AI Seam first, or restore its manifest in Advanced.';return;}
 $('seam-file').click();
});
$('seam-file').addEventListener('change',async e=>{
 const file=e.target.files[0],manifest=prepared?.manifest||importedManifest;if(!file||!manifest)return;
 const selectedId=transition().id;
 try{
  if(file.size>4*1024*1024)throw Error('PNG exceeds the 4 MB phone preview limit.');
  const bytes=new Uint8Array(await file.arrayBuffer());
  if(bytes.length<24||bytes.slice(0,8).join(',')!=='137,80,78,71,13,10,26,10')throw Error('Select a PNG with true transparency.');
  const v=new DataView(bytes.buffer),w=v.getUint32(16),h=v.getUint32(20);
  if(w!==manifest.exportDimensions.width||h!==manifest.exportDimensions.height)throw Error(`Unexpected dimensions: ${w}×${h}; expected ${manifest.exportDimensions.width}×${manifest.exportDimensions.height}.`);
  const url=URL.createObjectURL(file);let image;
  try{image=new Image();image.src=url;await image.decode();}finally{URL.revokeObjectURL(url);}
  const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.drawImage(image,0,0);
  factory.validateCandidate(x.getImageData(0,0,w,h).data,w,h,manifest);
  if(selectedId!==transition().id)throw Error('Transition changed during import; select the PNG again.');
  candidate={image,manifest,dataURL:c.toDataURL()};$('seam-after').checked=true;$('seam-candidate').hidden=false;
  $('seam-dimensions').textContent=`Source ${w}×${h} px → ${w}×${h} game units · 1:1 · isolated candidate, not installed.`;
  applyCandidate();$('seam-status').textContent='Candidate loaded in the actual renderer. Review alignment and lighting; no production approval implied.';
 }catch(err){$('seam-status').textContent=err.message;}finally{e.target.value='';}
});
$('seam-after').addEventListener('change',applyCandidate);
$('seam-guides').addEventListener('change',refreshSeam);
$('seam-weather').addEventListener('change',()=>{api.mode($('seam-weather').value);$('lighting').value=$('seam-weather').value;applyCandidate();});
$('seam-inspect').addEventListener('click',()=>{if(candidate){const w=window.open('','_blank');if(w){const im=w.document.createElement('img');im.src=candidate.dataURL;im.alt='Unregistered seam candidate at source dimensions';w.document.body.append(im);}else $('seam-status').textContent='Allow the image preview window in Safari.';}});
$('seam-manifest-file').addEventListener('change',async e=>{
 try{
  const f=e.target.files[0];if(!f)return;if(f.size>100000)throw Error('Manifest too large.');const m=JSON.parse(await f.text());
  if(m.schema!=='gary-seam-manifest-v1'||m.repository?.fingerprint!==provenance.fingerprint||!registry.transitions.some(t=>t.id===m.mode))throw Error('Incompatible registration or repository revision. Prepare a new reference kit.');
  $('seam-mode').value=m.mode;selectTransition();if(blockedReason())throw Error(blockedReason());
  const crops=factory.corridor(boundary.screenY,{top:m.topCropHeight,gap:m.gapHeight,bottom:m.bottomCropHeight});
  if(JSON.stringify(m.sourceCrops)!==JSON.stringify({top:crops.top,bottom:crops.bottom})||m.assetRegistration?.worldTop!==boundary.world+m.topCropHeight+m.gapHeight/2||m.assetRegistration.pass!==transition().anchor.pass||JSON.stringify(m.transparentMask)!==JSON.stringify(crops.mask)||m.exportDimensions?.width!==360||m.exportDimensions.height!==crops.height)throw Error('Manifest geometry does not match this registered join.');
  for(const k of ['top','gap','bottom'])$('seam-'+k).value=m[k==='gap'?'gapHeight':k+'CropHeight'];
  importedManifest=m;refreshSeam();$('seam-status').textContent='Registration restored. Select Preview Generated Asset.';
 }catch(err){importedManifest=null;$('seam-status').textContent=err.message;}finally{e.target.value='';}
});

boot();
})();