'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium,webkit}=require('playwright');
const root=path.join(__dirname,'..'),engineName=process.env.GARY_TEST_ENGINE||'chromium';
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp','.mp3':'audio/mpeg'};
async function main(){
 const server=http.createServer((req,res)=>{
  const target=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
  if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',types[path.extname(target)]||'application/octet-stream');res.end(fs.readFileSync(target));}
  catch(_){res.writeHead(404).end('Not found');}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await (engineName==='webkit'?webkit:chromium).launch({headless:true,...(engineName==='chromium'&&process.env.GARY_CHROMIUM_PATH?{executablePath:process.env.GARY_CHROMIUM_PATH}:{})});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/gary-camera-lab.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('screenshot reference'),null,{timeout:20000});
  assert.equal(await page.locator('[data-view="enter"]').getAttribute('aria-pressed'),'true');
  const bounds=await page.locator('#stage').boundingBox();
  assert.ok(Math.abs(bounds.width/bounds.height-9/16)<.012,'whole stage matches 360x640 camera');
  await page.waitForFunction(()=>{const img=document.querySelector('#reference');return img.complete&&img.naturalWidth>0;},null,{timeout:20000});
  const loaded=await page.locator('#reference').evaluate(img=>img.complete&&img.naturalWidth>0);
  assert.equal(loaded,true,'reference screenshot must exist on PR branch');

  await page.locator('[data-view="middle"]').click();
  await page.locator('#elevation').evaluate(el=>{el.value='1.15';el.dispatchEvent(new Event('input',{bubbles:true}));});
  assert.equal(await page.locator('#elevationValue').textContent(),'1.15');
  await page.locator('#copyJson').click();
  const json=JSON.parse(await page.locator('#exportText').inputValue());
  assert.equal(json.approved,false);assert.equal(json.view,'middle');
  assert.equal(json.raisedArchitecture.heightProjection,1.15);
  assert.deepEqual(json.fixedWorld.bridgeDeck,[138,222]);
  assert.equal(json.bridgeNear,850);
  assert.equal(await page.locator('#overlay').evaluate(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;return d.some((v,i)=>i%4===3&&v>0)}),true);

  // Switching to actual engine uses the PR #4 API, not a fake scene.
  await page.waitForFunction(()=>{const w=document.querySelector('#engine').contentWindow;return !!w?.GaryBridgePreview && !!w.document.querySelector('#startBtn') && !w.document.querySelector('#startBtn').disabled;},null,{timeout:60000});
  await page.locator('[data-source="engine"]').click();
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('frozen at middle'),null,{timeout:60000}).catch(async()=>{
   await page.locator('[data-source="engine"]').click();
   await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('frozen at middle'),null,{timeout:15000});
  });
  assert.equal(await page.locator('#engine').evaluate(f=>Math.round(f.contentWindow.GaryBridgePreview.snapshot().near)),850);
  assert.equal(await page.locator('#reference').evaluate(e=>getComputedStyle(e).visibility),'hidden');
  await page.locator('#resume').click();await page.waitForTimeout(250);
  assert.equal(await page.locator('#engine').evaluate(f=>f.contentWindow.GaryBridgePreview.snapshot().near>850),true);
  await page.locator('#freeze').click();
  const frozen=await page.locator('#engine').evaluate(f=>f.contentWindow.GaryBridgePreview.snapshot().near);
  await page.waitForTimeout(100);
  assert.equal(await page.locator('#engine').evaluate(f=>f.contentWindow.GaryBridgePreview.snapshot().near),frozen);
  assert.deepEqual(errors,[]);

  // A narrow iPhone still keeps the canvas undistorted and touch controls usable.
  await page.setViewportSize({width:375,height:667});
  const compact=await page.locator('#stage').boundingBox();
  assert.ok(Math.abs(compact.width/compact.height-9/16)<.012);
  assert.ok(compact.width>=200,'compact view remains legible');
  const out=path.join(root,'test-results','camera-'+engineName);
  fs.mkdirSync(out,{recursive:true});
  await page.screenshot({path:path.join(out,'camera-lab.png'),fullPage:true});
  console.log(engineName+': camera contract, screenshot, measured overlay, candidate JSON, engine preview, freeze and iPhone-scale layout PASS');
 }finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1});
