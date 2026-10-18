/* Gary Eats! Cutscene Studio runtime v3. Plain data; no eval, framework or audio dependency. */
(function(root){'use strict';
 const VERSION=3, clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const copy=x=>JSON.parse(JSON.stringify(x));
 function checkProject(p){
  const errors=[];
  if(!p||p.version!==VERSION)return ['This project needs Cutscene Studio version 3.'];
  if(!Array.isArray(p.assets)||!Array.isArray(p.actors)||!Array.isArray(p.scenes))return ['Project lists are missing.'];
  if(!p.assets.length||!p.actors.length||!p.scenes.length||p.assets.length>80||p.actors.length>40||p.scenes.length>100)errors.push('Keep 1–80 assets, 1–40 characters and 1–100 scenes.');
  if([...p.assets,...p.actors,...p.scenes].some(x=>!x||typeof x!=='object'||Array.isArray(x)))return ['Project entries must be valid objects.'];
  const ids=new Set(),assets=new Map(),actors=new Map(),known=new Set(['alignment','distance','elapsed','event']);
  for(const a of p.assets){
   if(!a.id||ids.has('a'+a.id))errors.push('Asset IDs must be unique.');ids.add('a'+a.id);assets.set(a.id,a);
   if(typeof a.src!=='string'||a.src.length>12000000||!/^(?:data:image\/(?:png|webp|jpeg);base64,|(?:art\/|\.\/art\/)[a-zA-Z0-9_./-]+(?:\?[^\s]*)?$)/.test(a.src))errors.push('Asset '+a.id+' needs a local image or uploaded PNG, WebP or JPEG.');
   if(typeof a.src==='string'&&!a.src.startsWith('data:')&&a.src.split('?')[0].split('/').includes('..'))errors.push('Artwork paths cannot leave the art folder.');
   if(a.path&&(!/^art\/[a-zA-Z0-9_./-]+$/.test(a.path)||a.path.split('/').includes('..')))errors.push('Artwork must stay inside the art folder.');
   if(typeof a.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(a.id))errors.push('Use short letters/numbers for asset IDs.');
   if(!Number.isInteger(a.cols)||!Number.isInteger(a.rows)||a.cols<1||a.rows<1||a.cols*a.rows>128)errors.push('Invalid grid for '+a.id+'.');
  }
  for(const a of p.actors){
   if(typeof a.name!=='string'||!a.name.trim()||a.name.length>80||!Array.isArray(a.talk))return ['Each character needs a name and talking-frame list.'];
   if(!a.id||ids.has('c'+a.id))errors.push('Character IDs must be unique.');ids.add('c'+a.id);actors.set(a.id,a);
   const art=assets.get(a.asset);if(!art)errors.push('Missing character image for '+a.name+'.');
   const frames=[a.idle,...(a.talk||[])];if(frames.some(f=>!Number.isInteger(f)||f<0||f>=(art?.cols*art?.rows||1)))errors.push('Invalid pose frames for '+a.name+'.');
  }
  for(const s of p.scenes){
   if(!s.id||ids.has('s'+s.id))errors.push('Scene IDs must be unique.');ids.add('s'+s.id);
   if(!known.has(s.trigger?.type))errors.push('Choose a trigger for '+s.name+'.');
   if(s.trigger?.type==='alignment'&&!s.trigger.actorId)errors.push('Alignment needs a game actor ID.');
   if(s.trigger?.type==='event'&&!s.trigger.event)errors.push('Event triggers need an event name.');
   if(['distance','elapsed'].includes(s.trigger?.type)&&!(Number.isFinite(s.trigger.value)&&s.trigger.value>=0))errors.push('Trigger distance/time must be positive.');
   if(!Array.isArray(s.lines)||!s.lines.length||s.lines.length>500)errors.push('Add 1–500 dialogue beats to '+s.name+'.');
   if(s.lines?.some(l=>!l||typeof l!=='object'||Array.isArray(l)))return ['Each dialogue beat must be an object.'];
   if(s.left&&!actors.has(s.left)||s.right&&!actors.has(s.right)||s.left&&s.left===s.right)errors.push('Choose valid, different characters for the two sides.');
   if(!Number.isFinite(s.typeSpeed)||s.typeSpeed<10||s.typeSpeed>70)errors.push('Text speed must be 10–70 letters per second.');
   if(s.background&&!assets.has(s.background))errors.push('Background image missing for '+s.name+'.');
   if(!Number.isFinite(s.dim)||s.dim<0||s.dim>.5)errors.push('World dimming must be 0–50%.');
   if(!Number.isFinite(s.height)||s.height<.30||s.height>.42)errors.push('Banner height must be 30–42%.');
   for(const l of s.lines||[]){
    if(!actors.has(l.actor))errors.push('Unknown speaker in '+s.name+'.');
    if(typeof l.text!=='string'||!l.text.trim()||l.text.length>2000)errors.push('Each speech needs 1–2000 characters.');
    if(!Number.isFinite(l.pause)||l.pause<0||l.pause>10)errors.push('Pauses must be 0–10 seconds.');
    for(const [id,f] of Object.entries(l.poses||{})){const actor=actors.get(id),art=assets.get(actor?.asset);if(!art||!Number.isInteger(f)||f<0||f>=art.cols*art.rows)errors.push('A selected character frame is unavailable.');}
    for(const [id,seq] of Object.entries(l.transitions||{})){const actor=actors.get(id),art=assets.get(actor?.asset);if(!art||!Array.isArray(seq)||seq.some(f=>!Number.isInteger(f)||f<0||f>=art.cols*art.rows))errors.push('A transition sequence contains unavailable frames.');}
   }
  }
  return [...new Set(errors)];
 }
 function check(p){try{return checkProject(p);}catch(_){return ['Project contains malformed fields. Import an exported Cutscene Studio project.'];}}
 function splitText(text,measure,maxWidth,maxLines=3){
  const words=text.split(/\s+/),pages=[];let page=[],line='';
  for(let word of words){
   // Very long words are split at character boundaries instead of overflowing.
   const pieces=[];while(word&&measure(word)>maxWidth){let cut=1;while(cut<word.length&&measure(word.slice(0,cut+1))<=maxWidth)cut++;pieces.push(word.slice(0,cut));word=word.slice(cut);}if(word)pieces.push(word);
   for(const piece of pieces){const next=line?line+' '+piece:piece;if(measure(next)<=maxWidth)line=next;else{page.push(line);line=piece;if(page.length===maxLines){pages.push(page.join('\n'));page=[];}}}
  }
  if(line)page.push(line);if(page.length)pages.push(page.join('\n'));return pages.length?pages:[''];
 }
 function createModel(scene,pages,onComplete=()=>{},reduced=false){
  const v={active:false,phase:'idle',beat:0,page:0,shown:0,time:0,phaseTime:0,paused:false};let ended=false;
  const duration=reduced?.10:.34;
  const text=()=>pages[v.beat][v.page];
  function line(){v.phase='line';v.phaseTime=0;v.shown=reduced?text().length:0;}
  function afterPause(){v.phase='line';v.phaseTime=0;}
  function finish(){if(ended)return;ended=true;v.active=false;v.phase='done';onComplete();}
  return {view:v,text,
   start(){Object.assign(v,{active:true,phase:'entry',beat:0,page:0,shown:0,time:0,phaseTime:0,paused:false});ended=false;},
   update(dt){if(!v.active||v.paused||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.1);v.time+=dt;v.phaseTime+=dt;
    if(v.phase==='entry'&&v.phaseTime>=duration)line();
    else if(v.phase==='exit'&&v.phaseTime>=duration)finish();
    else if(v.phase==='pause'&&v.phaseTime>=scene.lines[v.beat].pause)afterPause();
    else if(v.phase==='line')v.shown=Math.min(text().length,v.shown+dt*(scene.typeSpeed||32));
   },
   advance(){if(!v.active||v.paused)return;
    if(v.phase==='entry')line();else if(v.phase==='pause')afterPause();else if(v.phase==='line'){
     if(v.shown<text().length){v.shown=text().length;return;}
     if(v.page+1<pages[v.beat].length){v.page++;line();return;}
     if(v.beat+1>=scene.lines.length){v.phase='exit';v.phaseTime=0;return;}
     v.beat++;v.page=0;v.shown=0;v.phaseTime=0;v.phase=scene.lines[v.beat].pause>0?'pause':'line';
    }
   },
   skip(){if(v.active&&!v.paused&&v.phase!=='exit'){v.phase='exit';v.phaseTime=0;}},pause(b=true){v.paused=!!b;},reset(){v.active=false;v.phase='idle';v.paused=false;},duration
  };
 }
 function mouthFrame(actor,v,text){
  if(v.phase!=='line'||v.shown>=text.length||v.paused||!actor.talk?.length)return actor.idle;
  const n=Math.max(0,Math.floor(v.shown)-1),char=text[n]||'';
  if(/[.,!?…:;]/.test(char))return actor.idle;
  const rhythm=[-1,0,1,0,-1,2,0,1,-1];const k=rhythm[Math.floor(v.phaseTime*7)%rhythm.length];
  return k<0?actor.idle:actor.talk[k%actor.talk.length];
 }
 function stageMatches(trigger,w){return !trigger.stage||trigger.stage==='any'||trigger.stage===w.stage;}
 function condition(scene,w,events=new Set()){
  const t=scene.trigger;if(!stageMatches(t,w))return false;
  if(t.type==='alignment'){const a=(w.actors||[]).find(a=>a.id===t.actorId);return !!a&&a.ready&&a.introComplete&&a.footY>=w.playerY&&a.footY<w.playerY+100;}
  if(t.type==='distance')return w.distance>=t.value;
  if(t.type==='elapsed')return w.elapsed>=t.value;
  return events.has(t.event);
 }
 function upcoming(scene,w){
  const t=scene.trigger;if(!stageMatches(t,w))return false;
  if(t.type==='alignment')return (w.actors||[]).some(a=>a.id===t.actorId&&a.footY>-180&&a.footY<w.playerY+100);
  if(t.type==='distance')return t.value-w.distance<900&&w.distance<t.value+1000;
  if(t.type==='elapsed')return t.value-w.elapsed<5&&w.elapsed<t.value+10;
  return false;
 }
 function eligible(scene,w,events,played){return scene.enabled!==false&&!played.has(scene.id)&&w.hazardsClear&&condition(scene,w,events);}
 const CSS=`
 .gc-root{position:absolute;inset:0;z-index:20;isolation:isolate;pointer-events:auto;color:#f5eee4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;container-type:inline-size;touch-action:manipulation}.gc-root[hidden]{display:none!important}.gc-dim{position:absolute;inset:0;background:#07101b;pointer-events:none}.gc-banner{position:absolute;left:0;width:100%;height:var(--gc-h,33.333%);top:var(--gc-y,33.333%);overflow:hidden;background:#101a26;box-shadow:0 8px 25px #0005;transform:translateX(-105%);contain:paint}.gc-world{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.gc-art{position:absolute;inset:0 0 32%;background:#263041 center 44%/cover no-repeat;overflow:hidden}.gc-art:after{content:'';position:absolute;inset:0;background:none;pointer-events:none}.gc-avatar{position:absolute;top:0;width:43%;height:100%;background:transparent!important;object-fit:contain;object-position:center bottom;pointer-events:none;transition:filter .16s}.gc-left{left:0}.gc-right{right:0}.gc-inactive{filter:brightness(.85)}.gc-panel{position:absolute;inset:68% 0 0;padding:1.5cqw 4.4cqw 1.5cqw;background:linear-gradient(130deg,#17232ff7,#0c1420fc);cursor:pointer;display:flex;flex-direction:column;box-sizing:border-box;outline-offset:-3px}.gc-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;line-height:1.2}.gc-name{font-size:2.9cqw;font-weight:800;letter-spacing:.13em;color:#efc48c}.gc-progress{font-size:2.65cqw;color:#a4b0bf;white-space:nowrap}.gc-text{font-size:4.45cqw;line-height:1.22;margin-top:1cqw;white-space:pre-wrap;min-height:2.44em;padding-right:4cqw;letter-spacing:.005em}.gc-footer{position:absolute;right:4.4cqw;bottom:1.8cqw;display:flex;justify-content:space-between;align-items:center;margin-top:auto;gap:10px;font-size:2.75cqw;color:#a3b1bf}.gc-hint{display:none}.gc-skip{position:absolute;z-index:2;top:2px;left:calc(50% - 24px);border:0;border-radius:18px;background:#101a26bb;color:#d8c8b0;font:500 11px -apple-system,BlinkMacSystemFont,sans-serif;min-width:48px;min-height:44px;padding:0;box-shadow:none;text-transform:none;cursor:pointer}.gc-arrow{color:#e8bc7d;font-size:5cqw;line-height:.6}.gc-panel:focus-visible,.gc-skip:focus-visible{outline:2px solid #edc58b}.gc-error{position:absolute;left:8%;right:8%;top:38%;background:#17232ff5;color:#f5eee4;padding:20px;border:1px solid #efc48c;border-radius:12px;font-size:15px;text-align:center}.gc-error button{margin-top:14px;padding:12px 18px;border:0;border-radius:8px;background:#edc58b;color:#101a26}.gc-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}@media(prefers-reduced-motion:reduce){.gc-avatar{transition:none}}
 `;
 function createBanner({host,project,scene,worldSource=null,onComplete=()=>{},onError=()=>{}}){
  const doc=root.document;if(!doc.getElementById('gc-style')){const s=doc.createElement('style');s.id='gc-style';s.textContent=CSS;doc.head.append(s);}
  const el=doc.createElement('section');el.className='gc-root';el.hidden=true;el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label',scene.name);
  el.innerHTML='<div class="gc-dim"></div><div class="gc-banner"><div class="gc-art"><canvas class="gc-world" aria-hidden="true"></canvas><canvas class="gc-avatar gc-left" aria-hidden="true"></canvas><canvas class="gc-avatar gc-right" aria-hidden="true"></canvas></div><button class="gc-skip" type="button">Skip</button><div class="gc-panel" role="button" tabindex="0" aria-label="Advance dialogue"><div class="gc-meta"><span class="gc-name"></span><span class="gc-progress" aria-hidden="true"></span></div><div class="gc-text" aria-hidden="true"></div><div class="gc-footer"><span class="gc-hint">Tap to reveal</span><span class="gc-arrow">›</span></div></div></div><span class="gc-sr" aria-live="polite" role="status"></span>';
  host.append(el);const $=s=>el.querySelector(s),bar=$('.gc-banner'),panel=$('.gc-panel'),textEl=$('.gc-text'),name=$('.gc-name'),progress=$('.gc-progress'),hint=$('.gc-hint'),art=$('.gc-art'),dim=$('.gc-dim'),sr=$('.gc-sr');
  const assets=new Map(project.assets.map(a=>[a.id,a])),actors=new Map(project.actors.map(a=>[a.id,a])),imageMap=new Map();
  const reduced=!!root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const worldCanvas=$('.gc-world');
  let worldAnchor=null,placementY=null;
  let model=null,ready=false,previousLine='',savedFocus=null,pageWidth=0,lastDraw=['',''];
  const canvases=[$('.gc-left'),$('.gc-right')],contexts=canvases.map(c=>c.getContext('2d'));
  async function prepare(){
   const needed=new Set([scene.background,...scene.lines.map(l=>actors.get(l.actor)?.asset),actors.get(scene.left)?.asset,actors.get(scene.right)?.asset].filter(Boolean));
   await Promise.all([...needed].map(async id=>{
    const a=assets.get(id);if(!a)throw Error('Scene image missing');const im=new root.Image();imageMap.set(id,im);
    await new Promise((resolve,reject)=>{let timer=setTimeout(()=>reject(Error('Image timed out')),30000);im.onload=()=>{clearTimeout(timer);resolve();};im.onerror=()=>{clearTimeout(timer);reject(Error('Image could not load'));};im.src=a.src;});
    if(im.decode)await im.decode();if(im.naturalWidth%a.cols||im.naturalHeight%a.rows)throw Error('Image grid does not divide evenly: '+a.name);
   }));
   if(scene.background)art.style.backgroundImage='url('+JSON.stringify(assets.get(scene.background).src)+')';
   paginate();ready=true;
  }
  function paginate(){
   const width=Math.max(220,host.clientWidth||360);pageWidth=width;
   const c=doc.createElement('canvas').getContext('2d');c.font=(width*.0445)+'px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
   const pages=scene.lines.map(l=>splitText(l.text,t=>c.measureText(t).width,width*.87,2));
   const old=model?.view,wasActive=old?.active,paused=old?.paused;
   model=createModel(scene,pages,()=>{el.hidden=true;onComplete();if(savedFocus?.isConnected)savedFocus.focus({preventScroll:true});},reduced);
   if(wasActive){model.start();Object.assign(model.view,old,{page:0,shown:0,phase:'line',phaseTime:0,paused});}
  }
  function dimensions(source=null){
   const h=clamp(scene.height||1/3,.30,.42);let y=scene.position==='top'?.08:scene.position==='bottom'?1-h-.06:(1-h)/2;
   const followsEncounter=scene.position==='encounter'||(scene.trigger?.type==='alignment'&&scene.position==='middle');
   if(followsEncounter){const hr=host.getBoundingClientRect(),sr=source?.getBoundingClientRect?.()||hr;
    const foot=worldAnchor??546,footInHost=(sr.top-hr.top)+(foot+8)/640*sr.height;
    y=clamp(footInHost/hr.height-h,.02,1-h-.02);
   }
   placementY=y;bar.style.setProperty('--gc-h',h*100+'%');bar.style.setProperty('--gc-y',y*100+'%');return {h,y};
  }
  function drawActor(side,id,frame){
   const actor=actors.get(id),canvas=canvases[side],ctx=contexts[side];if(!actor||!ctx){if(ctx)ctx.clearRect(0,0,canvas.width,canvas.height);return;}
   const asset=assets.get(actor.asset),image=imageMap.get(actor.asset);if(!image)return;
   const key=id+':'+frame+':'+canvas.width;if(lastDraw[side]===key)return;lastDraw[side]=key;
   const cw=image.naturalWidth/asset.cols,ch=image.naturalHeight/asset.rows,logicalW=155,logicalH=145;
   ctx.setTransform(canvas.width/logicalW,0,0,canvas.height/logicalH,0,0);ctx.clearRect(0,0,logicalW,logicalH);
   const bodyH=actor.portraitScale||230,s=bodyH/(asset.bodyHeight||ch*.86),axis=asset.anchorX??cw/2,top=asset.top??ch*.071;
   ctx.drawImage(image,frame%asset.cols*cw,Math.floor(frame/asset.cols)*ch,cw,ch,logicalW/2-axis*s,-top*s,cw*s,ch*s);
  }
  function paint(){if(!model?.view.active)return;const v=model.view,l=scene.lines[v.beat],actor=actors.get(l.actor),full=model.text();
   const fraction=clamp(v.phaseTime/model.duration,0,1),ease=1-Math.pow(1-fraction,3);
   const amount=v.phase==='entry'?ease:v.phase==='exit'?1-ease:1;
   bar.style.transform='translateX('+((1-amount)*-105)+'%)';dim.style.opacity=String((scene.dim??.2)*amount);
   const text=full.slice(0,Math.floor(v.shown));if(textEl.textContent!==text)textEl.textContent=text;
   name.textContent=actor?.name||'';progress.textContent=(v.beat+1)+' / '+scene.lines.length;
   hint.textContent=v.phase==='pause'?'Tap to continue':v.shown<full.length?'Tap to reveal':'Tap to continue';
   const key=v.beat+':'+v.page;if(previousLine!==key){previousLine=key;sr.textContent=(actor?.name||'')+': '+full;}
   const shown=[scene.left,scene.right];for(let side=0;side<2;side++){
    const a=actors.get(shown[side]);if(!a)continue;let frame=l.poses?.[a.id]??a.idle;
    if(v.phase==='pause'&&l.transitions?.[a.id]?.length){const seq=l.transitions[a.id];frame=seq[Math.min(seq.length-1,Math.floor(v.phaseTime/Math.max(.01,l.pause)*seq.length))];}
    else if(a.id===l.actor&&l.animate!==false&&a.talk?.length)frame=mouthFrame(a,v,full);
    canvases[side].classList.toggle('gc-inactive',a.id!==l.actor);drawActor(side,a.id,frame);
   }
  }
  function captureWorld(){
   if(scene.worldBackground===false||!worldSource)return;
   try{const src=worldSource();if(!src?.width||!src?.height)return;const {h,y}=dimensions(src);
    const hostRect=host.getBoundingClientRect(),sourceRect=src.getBoundingClientRect?.()||hostRect;const ratioX=src.width/(sourceRect.width||hostRect.width),ratioY=src.height/(sourceRect.height||hostRect.height);const sx=(hostRect.left-sourceRect.left)*ratioX,sy=(hostRect.top+hostRect.height*y-sourceRect.top)*ratioY,sw=hostRect.width*ratioX,sh=h*.68*hostRect.height*ratioY;worldCanvas.width=Math.max(1,Math.round(sw));worldCanvas.height=Math.max(1,Math.round(sh));
    worldCanvas.getContext('2d').drawImage(src,sx,sy,sw,sh,0,0,worldCanvas.width,worldCanvas.height);art.style.backgroundImage='none';worldCanvas.hidden=false;
   }catch(_){worldCanvas.hidden=true;}
  }
  function resize(){dimensions();if(host.clientWidth!==pageWidth&&model)paginate();for(const c of canvases){const d=Math.min(root.devicePixelRatio||1,2);c.width=Math.round(155*d);c.height=Math.round(145*d);}lastDraw=['',''];if(model?.view.active)captureWorld();paint();}
  const obs=root.ResizeObserver?new root.ResizeObserver(resize):null;obs?.observe(host);root.addEventListener?.('resize',resize);
  const advance=e=>{e.preventDefault();e.stopPropagation();model?.advance();paint();};
  panel.addEventListener('click',advance);panel.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter')advance(e);});
  $('.gc-skip').addEventListener('click',e=>{e.stopPropagation();model?.skip();});
  el.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const skip=$('.gc-skip');if(e.shiftKey&&doc.activeElement===panel){e.preventDefault();skip.focus();}else if(!e.shiftKey&&doc.activeElement===skip){e.preventDefault();panel.focus();}});
  worldCanvas.hidden=true;dimensions();resize();
  return {element:el,prepare,ready:()=>ready,get model(){return model;},
   start(anchor=null){if(!ready)return false;worldAnchor=anchor;savedFocus=doc.activeElement;previousLine='';model.start();el.hidden=false;resize();paint();panel.focus({preventScroll:true});return true;},
   geometry(){return {top:placementY,height:clamp(scene.height||1/3,.30,.42),artFraction:.68};},
   update(dt){model?.update(dt);paint();},pause(b=true){model?.pause(b);},reset(){model?.reset();el.hidden=true;},
   destroy(){model?.reset();obs?.disconnect();root.removeEventListener?.('resize',resize);el.remove();}
  };
 }
 function createManager({host,onComplete,worldSource=null,projectUrl='gary-cutscene-project.json'}){
  let project=null,current=null,pending=null,prepared=new Map(),loading=new Map(),played=new Set(),events=new Set(),stageOverride='',generation=0,anchorY=null;
  function warm(scene){if(prepared.has(scene.id))return Promise.resolve(prepared.get(scene.id));if(loading.has(scene.id))return loading.get(scene.id);
   const epoch=generation,banner=createBanner({host,project,scene,worldSource,onComplete(){played.add(scene.id);if(scene.trigger.type==='event')events.delete(scene.trigger.event);current=null;pending=null;onComplete();}});
   const p=banner.prepare().then(()=>{if(epoch!==generation){banner.destroy();return null;}prepared.set(scene.id,banner);loading.delete(scene.id);return banner;}).catch(e=>{banner.destroy();loading.delete(scene.id);throw e;});loading.set(scene.id,p);return p;
  }
  function normalize(w){return stageOverride?{...w,stage:stageOverride}:w;}
  return {
   async prepare(){const r=await root.fetch(projectUrl+'?v=3',{cache:'no-cache'});if(!r.ok)throw Error('Cutscene project unavailable');project=await r.json();const errors=check(project);if(errors.length)throw Error(errors.join(' '));if(/^https?:/.test(projectUrl)){for(const a of project.assets)if(!a.src.startsWith('data:'))a.src=new URL(a.src,projectUrl).href;}const first=project.scenes.find(s=>s.enabled!==false);if(first)await warm(first);},
   reset(){for(const b of prepared.values())b.reset();played.clear();events.clear();current=pending=null;stageOverride='';host.querySelector('.gc-error')?.remove();},
   signal(name){events.add(String(name));},setStage(name){stageOverride=String(name);},
   quiet(world){if(!project)return false;const w=normalize(world);return !!pending||project.scenes.some(s=>s.enabled!==false&&!played.has(s.id)&&(condition(s,w,events)||upcoming(s,w)));},
   tryStart(world){if(!project||current||pending||!world.hazardsClear)return false;const w=normalize(world),s=project.scenes.find(s=>eligible(s,w,events,played));if(!s)return false;pending=s;anchorY=w.playerY;return true;},
   enter(){if(current){current.pause(false);return;}if(!pending)return;const s=pending;const run=()=>warm(s).then(b=>{if(!b||pending!==s)return;host.querySelector('.gc-error')?.remove();current=b;b.start(anchorY);}).catch(()=>{
     if(pending!==s)return;let box=host.querySelector('.gc-error');if(!box){box=root.document.createElement('div');box.className='gc-error';box.style.zIndex=25;host.append(box);}box.replaceChildren();const t=root.document.createElement('div');t.textContent='This scene could not load. Your game is paused safely.';const retry=root.document.createElement('button');retry.textContent='Try again';retry.onclick=run;box.append(t,retry);
    });run();},
   worldActorOpacity(){const v=current?.model?.view;if(!v?.active)return pending?0:1;const f=clamp(v.phaseTime/current.model.duration,0,1),ease=1-Math.pow(1-f,3);return v.phase==='entry'?1-ease:v.phase==='exit'?ease:0;},
   update(dt){current?.update(dt);},pause(){current?.pause(true);},
   prewarm(world){if(!project)return;const w=normalize(world),next=project.scenes.find(s=>s.enabled!==false&&!played.has(s.id)&&stageMatches(s.trigger,w));if(next&&!loading.has(next.id)&&!prepared.has(next.id))warm(next).catch(()=>{});
    if(prepared.size>2)for(const [id,b]of prepared){if(id!==next?.id&&b!==current){b.destroy();prepared.delete(id);if(prepared.size<=2)break;}}
   },snapshot(){return {played:[...played],pending:pending?.id,current:current?.model?.view,loaded:!!project};}
  };
 }
 const api={VERSION,check,copy,splitText,createModel,mouthFrame,condition,upcoming,eligible,createBanner,createManager};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.GaryCutscene=Object.freeze(api);
})(typeof window==='object'?window:globalThis);
