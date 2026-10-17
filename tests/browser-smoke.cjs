'use strict';
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const url=process.env.GARY_TEST_URL||'http://127.0.0.1:8765/gary-runtime-preview.html';
const engine=process.env.GARY_TEST_ENGINE==='webkit'?webkit:chromium;
(async()=>{
 const server=require('node:http').createServer((req,res)=>{const path=require('node:path');const target=path.join(__dirname,'..',new URL(req.url,'http://local').pathname.replace(/^\//,'')||'index.html');try{const data=fs.readFileSync(target);res.setHeader('Content-Type',target.endsWith('.js')?'text/javascript':target.endsWith('.html')?'text/html':target.endsWith('.json')?'application/json':target.endsWith('.png')||target.endsWith('.PNG')?'image/png':target.endsWith('.webp')?'image/webp':'application/octet-stream');res.end(data);}catch(e){res.statusCode=404;res.end();}});
 await new Promise(resolve=>server.listen(8765,'127.0.0.1',resolve));
 const browser=await engine.launch({headless:true,...(engine===chromium?{executablePath:process.env.GARY_CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox','--no-zygote','--single-process','--in-process-gpu','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}: {})});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR',e.message)});
 // Test-only access to closure internals. These controls are never in published code.
 await page.route('**/game-runtime.js*',async route=>{
   const source=fs.readFileSync(require.resolve('../game-runtime.js'),'utf8');
   await route.fulfill({contentType:'text/javascript',body:source.replaceAll('requestAnimationFrame(loop)','window.__gameRaf(loop)').replace(/\}\)\(\);\s*$/,`window.__test={
     advance:fixedUpdate,render:()=>{prepareView(.5);render();},reset,move,transition,suspend,resume,
     add:(kind,l,y)=>{const o=itemPool.acquire();Object.assign(o,{t:kind,l,y,previousY:y,id:uid++,d:0,dare:0,near:0,refused:0,cleared:0});return o;},
     probe:(kind,dx,dy)=>touchesPlayer({l:lane+dx/LANE_WIDTH,y:PLAYER_Y+dy,previousY:PLAYER_Y+dy},ITEMS[kind]),
     empty:()=>itemPool.clear(),grin:triggerGrin,pools:()=>[itemPool,effectPool,starPool],
     snapshot:()=>({state,lane,target,score,distance,nightMix,rainMix,shutterMix,clock,objs:objs.length}),
     storm:()=>{nightMix=rainMix=shutterMix=1;nightOn=true;},
     view:()=>view, previous:()=>previous
   };})();`)});
 });
 await page.addInitScript(()=>{
   let id=0;const frames=new Map();
   window.__gameRaf=fn=>{frames.set(++id,fn);return id;};

   window.__frame=t=>{const work=[...frames.values()];frames.clear();for(const fn of work)fn(t);};
 });
 console.log('browser launched');
 await page.goto(url+'?debug=1&rain=1');
 console.log('loaded');
 await page.waitForFunction(()=>window.GaryRuntimeStats&&window.__test);
 await page.waitForFunction(()=>[...document.images].every(i=>i.complete));
 console.log('assets ready');
 await page.waitForTimeout(700);
 await page.evaluate(()=>{window.__frame(0);for(let i=1;i<=120;i++)window.__frame(i*1000/120);});
 assert.equal(await page.evaluate(()=>GaryRuntimeStats.snapshot().ticks),60);
 assert.deepEqual(await page.evaluate(()=>GaryRuntimeStats.snapshot().errors),[]);
 assert.equal(await page.locator('#c').getAttribute('width'),'1170');
 console.log('start');
 await page.locator('#startBtn').click({force:true});
 await page.locator('#skipIntroBtn').click({force:true});
 await page.evaluate(()=>{for(let i=0;i<100;i++)__test.advance(1/60);__test.render();});
 assert.equal((await page.evaluate(()=>__test.snapshot())).state,'play');
 // No lane input during a paused state; resume preserves the exact road position.
 await page.locator('#pauseBtn').click({force:true});
 const paused=await page.evaluate(()=>__test.snapshot());
 await page.keyboard.press('ArrowLeft');
 await page.evaluate(()=>{for(let i=0;i<300;i++)__test.advance(1/60);});
 assert.deepEqual(await page.evaluate(()=>__test.snapshot()),paused);
 await page.locator('#resumeBtn').click({force:true});
 // Inward lane reversal stays continuous and ends precisely at its target.
 const move=await page.evaluate(()=>{
   __test.move(-1);for(let i=0;i<6;i++)__test.advance(1/60);
   const before=__test.snapshot().lane;__test.move(1);const after=__test.snapshot().lane;
   for(let i=0;i<30;i++)__test.advance(1/60);
   return {before,after,end:__test.snapshot().lane};
 });assert.equal(move.before,move.after);assert.equal(move.end,1);
 const generosity=await page.evaluate(()=>({m25:__test.probe('m',25,0),m19:__test.probe('m',19,0),fork17:__test.probe('fork',17,0),food26:__test.probe('kebab',26,0),illegal:__test.transition('over')}));
 assert.deepEqual(generosity,{m25:false,m19:true,fork17:false,food26:true,illegal:false});
 // Exercise actual collection, a distant hazard and a direct crash.
 const contact=await page.evaluate(()=>{
   __test.empty();__test.add('kebab',1,540);__test.advance(1/60);
   const collected=__test.snapshot().score;__test.empty();
   __test.add('m',1,480);__test.advance(1/60);
   const distant=__test.snapshot().state;__test.empty();
   __test.add('m',1,538);__test.advance(1/60);
   const hit=__test.snapshot().state;
   __test.advance(.56);return {collected,distant,hit,over:__test.snapshot().state};
 });assert.ok(contact.collected>0);assert.equal(contact.distant,'play');assert.equal(contact.hit,'crash_m');assert.equal(contact.over,'over');
 await page.locator('#againBtn').click({force:true});
 assert.equal((await page.evaluate(()=>__test.snapshot())).state,'menu');
 assert.equal(await page.locator('#pauseBtn').isHidden(),true);
 console.log('start');
 await page.locator('#startBtn').click({force:true});
 // Pausing during narration must not let a delayed onended start gameplay.
 await page.evaluate(()=>__test.suspend());
 await page.evaluate(()=>document.querySelector('#garyAudio').dispatchEvent(new Event('ended')));
 assert.equal((await page.evaluate(()=>__test.snapshot())).state,'paused');
 await page.locator('#resumeBtn').click({force:true});
 assert.equal((await page.evaluate(()=>__test.snapshot())).state,'intro');
 await page.locator('#skipIntroBtn').click({force:true});
 await page.evaluate(()=>{for(let i=0;i<100;i++)__test.advance(1/60);});
 // Long soak without changing authored spawning: move to an empty lane each
 // tick; clear only imminent hazards to keep the renderer running through biomes.
 const soak=await page.evaluate(()=>{
   __test.storm();
   for(let i=0;i<18000;i++){
     const pool=__test.pools()[0];
     for(const o of pool.active)if((o.t==='m'||o.t==='fork')&&o.y>490)o.d=1;
     if(i%30===0)__test.grin();
     __test.advance(1/60);
     if(i%300===0)__test.render();
   }
   __test.render();return {game:__test.snapshot(),stats:GaryRuntimeStats.snapshot(),pools:__test.pools().map(p=>({active:p.active.length,free:p.free.length,capacity:p.capacity,peak:p.peak}))};
 });
 assert.equal(soak.game.state,'play');assert.ok(soak.game.distance>50000);
 assert.equal(soak.stats.itemMisses,0);assert.ok(soak.stats.cacheEntries<=64);
 for(const p of soak.pools)assert.equal(p.active+p.free,p.capacity);
 console.log('soak finished');
 console.log('capturing canvas');
 const png=await page.locator('#c').evaluate(c=>c.toDataURL('image/png').split(',')[1]);
 fs.writeFileSync(process.env.GARY_TEST_IMAGE||require('node:path').join(require('node:os').tmpdir(),'gary-runtime-smoke.png'),Buffer.from(png,'base64'));
 console.log('canvas captured');
 await page.locator('#stage').evaluate(stage=>{stage.style.width='360px';});
 await page.evaluate(()=>window.dispatchEvent(new Event('resize')));
 const size=await page.evaluate(()=>({canvas:document.querySelector('#c').width,stage:document.querySelector('#stage').clientWidth,dpr:devicePixelRatio}));
 console.log({size});
 await page.evaluate(()=>__test.render());
 assert.equal(size.canvas,Math.round(size.stage*Math.min(3,size.dpr)));
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({engine:process.env.GARY_TEST_ENGINE||'chromium',contact,move,soak,errors},null,2));
 await browser.close();await new Promise(resolve=>server.close(resolve));
})().catch(e=>{console.error(e);process.exit(1);});
