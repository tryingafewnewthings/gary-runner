'use strict';
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const instrumentActiveRuntime=require('./helpers/active-runtime-test-api.cjs');
const engineName=process.env.GARY_TEST_ENGINE||'chromium';
assert.ok(['chromium','webkit'].includes(engineName),'Unsupported GARY_TEST_ENGINE');
const engine=engineName==='webkit'?webkit:chromium;
const root=path.join(__dirname,'..');
const artifacts=path.join(root,'test-results',engineName);
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json',
 '.png':'image/png','.PNG':'image/png','.webp':'image/webp','.mp3':'audio/mpeg'};

async function main(){
 const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname);
  if(pathname==='/favicon.ico'){res.writeHead(204).end();return;}
  const target=path.resolve(root,'.'+pathname);
  if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',types[path.extname(target)]||'application/octet-stream');res.end(fs.readFileSync(target));}
  catch(_){res.writeHead(404).end('Not found');}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 let browser,context,page,phase='launch';
 const errors=[],consoleMessages=[],networkFailures=[],loadedScripts=[];
 try{
  browser=await engine.launch({headless:true,...(engine===chromium&&process.env.GARY_CHROMIUM_PATH?
   {executablePath:process.env.GARY_CHROMIUM_PATH}: {})});
  context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  await context.tracing.start({screenshots:true,snapshots:true,sources:true});
  page=await context.newPage();page.setDefaultTimeout(15000);
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>consoleMessages.push({type:message.type(),text:message.text()}));
  page.on('requestfailed',request=>networkFailures.push({url:request.url(),error:request.failure()?.errorText}));
  page.on('response',response=>{
   if(response.status()>=400)networkFailures.push({url:response.url(),status:response.status()});
   if(new URL(response.url()).pathname.endsWith('.js')&&response.ok())loadedScripts.push(new URL(response.url()).pathname.slice(1));
  });
  await page.route('**/gary-difficulty-runtime.js*',async route=>{
   try{
    const source=instrumentActiveRuntime(fs.readFileSync(path.join(root,'gary-difficulty-runtime.js'),'utf8'));
    assert.equal(source.split('requestAnimationFrame(loop);').length-1,2,'Active frame scheduler changed');
    await route.fulfill({contentType:'text/javascript',body:source.replaceAll('requestAnimationFrame(loop);','window.__gameRaf(loop);')});
   }catch(error){errors.push(error.stack);await route.abort();}
  });
  await page.addInitScript(()=>{
   let id=0,seed=12345;const frames=new Map();
   Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
   window.__gameRaf=fn=>{frames.set(++id,fn);return id;};
   window.__frame=t=>{const work=[...frames.values()];frames.clear();for(const fn of work)fn(t);};
  });
  phase='startup';
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html?debug=1&seed=12345`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.GaryRuntimeStats&&window.__test?.ready(),null,{timeout:60000});
  const scripts=await page.evaluate(()=>[...document.scripts].filter(s=>s.src).map(s=>new URL(s.src).pathname.slice(1)));
  assert.equal(scripts.filter(file=>file==='gary-difficulty-runtime.js').length,1);
  assert.ok(!scripts.includes('game-runtime.js'),'Archived runtime must not be loaded');
  assert.deepEqual([...loadedScripts].sort(),[...scripts].sort(),'All index.html scripts must load successfully');
  assert.equal(await page.locator('#startBtn').isEnabled(),true);
  assert.equal(await page.evaluate(()=>typeof window.GaryAssetPreview),'undefined','normal gameplay never exposes candidate registration');
  await page.evaluate(()=>{__frame(0);for(let i=1;i<=120;i++)__frame(i*1000/120);});
  assert.equal(await page.evaluate(()=>GaryRuntimeStats.snapshot().ticks),60);

  phase='play and skip intro';
  await page.locator('#startBtn').click();
  assert.equal(await page.evaluate(()=>__test.snapshot().state),'intro');
  await page.locator('#skipIntroBtn').click();
  await page.evaluate(()=>{for(let i=0;i<600&&__test.snapshot().state==='intro_transition';i++)__test.advance(1/60);__test.render();});
  assert.equal(await page.evaluate(()=>__test.snapshot().state),'play');

  phase='left and right movement';
  await page.keyboard.press('ArrowLeft');
  await page.evaluate(()=>{for(let i=0;i<30;i++)__test.advance(1/60);});
  assert.equal(await page.evaluate(()=>__test.snapshot().lane),0);
  await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');
  await page.evaluate(()=>{for(let i=0;i<30;i++)__test.advance(1/60);});
  assert.equal(await page.evaluate(()=>__test.snapshot().lane),2);
  await page.keyboard.press('ArrowLeft');
  await page.evaluate(()=>{for(let i=0;i<30;i++)__test.advance(1/60);});

  phase='touch lane input';
  const bounds=await page.locator('#c').boundingBox();
  for(const [fraction,lane] of [[.25,0],[.75,1]]){
   await page.touchscreen.tap(bounds.x+bounds.width*fraction,bounds.y+bounds.height*.5);
   await page.evaluate(()=>{for(let i=0;i<30;i++)__test.advance(1/60);});
   assert.equal(await page.evaluate(()=>__test.snapshot().lane),lane);
  }

  phase='pause and resume';
  await page.locator('#pauseBtn').click();
  const paused=await page.evaluate(()=>__test.snapshot());
  await page.keyboard.press('ArrowRight');
  await page.evaluate(()=>{for(let i=0;i<300;i++)__test.advance(1/60);});
  assert.deepEqual(await page.evaluate(()=>__test.snapshot()),paused);
  await page.locator('#resumeBtn').click();
  assert.equal(await page.evaluate(()=>__test.snapshot().state),'play');

  phase='roast collision, scoring and discovery';
  const roast=await page.evaluate(()=>{__test.clear();__test.add('roast',1);__test.advance(1/60);return __test.snapshot().score;});
  assert.equal(roast,25);
  assert.equal(await page.locator('#garyDiscoveryToast').evaluate(el=>el.hidden),false);
  await page.locator('#stage').evaluate(el=>{el.style.width='360px';});
  await page.evaluate(()=>window.dispatchEvent(new Event('resize')));
  const size=await page.evaluate(()=>({canvas:document.querySelector('#c').width,stage:document.querySelector('#stage').clientWidth,dpr:devicePixelRatio}));
  assert.equal(size.canvas,Math.round(size.stage*Math.min(3,size.dpr)));

  phase='crash and restart';
  await page.evaluate(()=>{__test.clear();__test.add('fork',1);__test.advance(1/60);});
  assert.equal(await page.evaluate(()=>__test.snapshot().state),'crash_fork');
  await page.evaluate(()=>{for(let i=0;i<600&&__test.snapshot().state!=='over';i++)__test.advance(1/60);__test.render();});
  assert.equal(await page.evaluate(()=>__test.snapshot().state),'over');
  await page.locator('#againBtn').click();
  const reset=await page.evaluate(()=>__test.snapshot());
  assert.equal(reset.state,'menu');assert.equal(reset.score,0);assert.equal(reset.fox.phase,'dormant');
  assert.equal(reset.shops.entries.length,0);assert.deepEqual(reset.cutscene.played,[]);
  await page.locator('#garyCatalogueBtn').click();
  assert.equal(await page.locator('.garyFoodTile:not(.locked)').count(),1);
  assert.match(await page.locator('.garyFoodTile:not(.locked)').innerText(),/Roast/);
  await page.locator('#garyCatalogueClose').click();
  await page.locator('#startBtn').click();await page.locator('#skipIntroBtn').click();
  await page.evaluate(()=>{for(let i=0;i<600&&__test.snapshot().state==='intro_transition';i++)__test.advance(1/60);__test.render();});
  assert.equal(await page.evaluate(()=>__test.snapshot().state),'play');
  assert.deepEqual(await page.evaluate(()=>__test.snapshot().errors),[]);
  assert.deepEqual(errors,[]);
  assert.deepEqual(networkFailures.filter(f=>!f.error?.includes('ERR_ABORTED')&&!f.error?.includes('cancelled')),[]);
  console.log(JSON.stringify({engine:engineName,scripts,ticks:60,roastScore:roast,size,state:'play',errors},null,2));
  // Optional temporary failure probe exercises the same diagnostic path in CI.
  assert.notEqual(process.env.GARY_SMOKE_FORCE_FAILURE,'1','Intentional browser failure probe');
  await context.tracing.stop();
 }catch(error){
  fs.mkdirSync(artifacts,{recursive:true});
  const snapshot=page?await page.evaluate(()=>window.__test?.snapshot()).catch(()=>null):null;
  fs.writeFileSync(path.join(artifacts,'failure.json'),JSON.stringify({engine:engineName,phase,error:error.stack,snapshot,errors,consoleMessages,networkFailures,loadedScripts},null,2));
  if(page){
   await page.screenshot({path:path.join(artifacts,'failure.png')}).catch(()=>{});
   await page.content().then(html=>fs.writeFileSync(path.join(artifacts,'failure.html'),html)).catch(()=>{});
  }
  if(context)await context.tracing.stop({path:path.join(artifacts,'trace.zip')}).catch(()=>{});
  throw error;
 }finally{
  if(browser)await browser.close();
  server.closeAllConnections();
  await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
