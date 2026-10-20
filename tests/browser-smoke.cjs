'use strict';
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const instrumentActiveRuntime=require('./helpers/active-runtime-test-api.cjs');
const engine=process.env.GARY_TEST_ENGINE==='webkit'?webkit:chromium;
const root=path.join(__dirname,'..');
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json',
 '.png':'image/png','.PNG':'image/png','.webp':'image/webp','.mp3':'audio/mpeg'};
(async()=>{
 const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://local').pathname;
  const target=path.resolve(root,'.'+pathname);
  if(!target.startsWith(root+path.sep)){res.statusCode=403;res.end();return;}
  try{res.setHeader('Content-Type',types[path.extname(target)]||'application/octet-stream');res.end(fs.readFileSync(target));}
  catch(_){res.statusCode=404;res.end('Not found');}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  const args=engine===chromium?['--no-sandbox','--no-zygote','--single-process','--in-process-gpu',
   '--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']:undefined;
  browser=await engine.launch({headless:true,...(engine===chromium?{
   executablePath:process.env.GARY_CHROMIUM_PATH||chromium.executablePath(),args}: {})});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/gary-difficulty-runtime.js*',async route=>{
   let source=instrumentActiveRuntime(fs.readFileSync(path.join(root,'gary-difficulty-runtime.js'),'utf8'));
   const controlled=source.replaceAll('requestAnimationFrame(loop);','window.__gameRaf(loop);');
   if(controlled===source)throw new Error('Could not locate the active runtime frame scheduler');
   await route.fulfill({contentType:'text/javascript',body:controlled});
  });
  await page.addInitScript(()=>{
   let id=0;const frames=new Map();
   window.__gameRaf=fn=>{frames.set(++id,fn);return id;};
   window.__frame=t=>{const work=[...frames.values()];frames.clear();for(const fn of work)fn(t);};
  });
  const url=`http://127.0.0.1:${server.address().port}/index.html?debug=1`;
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.GaryRuntimeStats&&window.__test);
  await page.waitForFunction(()=>!document.querySelector('#startBtn').disabled,{timeout:45000});
  await page.evaluate(()=>{window.__frame(0);for(let i=1;i<=120;i++)window.__frame(i*1000/120);});
  assert.equal(await page.evaluate(()=>GaryRuntimeStats.snapshot().ticks),60);
  assert.deepEqual(await page.evaluate(()=>GaryRuntimeStats.snapshot().errors),[]);
  await page.locator('#startBtn').click({force:true});
  await page.locator('#skipIntroBtn').click({force:true});
  await page.evaluate(()=>window.__test.skipEntrance());
  assert.equal((await page.evaluate(()=>__test.snapshot())).state,'play');

  await page.keyboard.press('ArrowLeft');
  await page.evaluate(()=>{for(let i=0;i<30;i++)__test.advance(1/60);});
  assert.equal((await page.evaluate(()=>__test.snapshot())).target,0);
  await page.locator('#pauseBtn').click({force:true});
  const paused=await page.evaluate(()=>__test.snapshot());
  await page.keyboard.press('ArrowRight');
  await page.evaluate(()=>{for(let i=0;i<300;i++)__test.advance(1/60);});
  assert.deepEqual(await page.evaluate(()=>__test.snapshot()),paused);
  await page.locator('#resumeBtn').click({force:true});
  assert.equal((await page.evaluate(()=>__test.snapshot())).state,'play');

  const roast=await page.evaluate(()=>{__test.pickup('roast');return __test.snapshot().score;});
  assert.equal(roast,25);
  assert.equal(await page.locator('#garyDiscoveryToast').evaluate(el=>el.hidden),false);
  await page.locator('#stage').evaluate(el=>{el.style.width='360px';});
  await page.evaluate(()=>window.dispatchEvent(new Event('resize')));
  const size=await page.evaluate(()=>({canvas:document.querySelector('#c').width,
   stage:document.querySelector('#stage').clientWidth,dpr:devicePixelRatio}));
  assert.equal(size.canvas,Math.round(size.stage*Math.min(3,size.dpr)));
  await page.evaluate(()=>__test.render());
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({engine:process.env.GARY_TEST_ENGINE||'chromium',ticks:60,
   state:await page.evaluate(()=>__test.snapshot().state),roastScore:roast,size,errors},null,2));
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
