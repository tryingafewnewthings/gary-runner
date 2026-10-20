'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium,webkit}=require('playwright'),root=path.join(__dirname,'..'),engineName=process.env.GARY_TEST_ENGINE||'chromium';
async function main(){
 const server=http.createServer((req,res)=>{const target=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.PNG':'image/png','.webp':'image/webp','.mp3':'audio/mpeg'})[path.extname(target)]||'application/octet-stream');res.end(fs.readFileSync(target));}catch(_){res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await (engineName==='webkit'?webkit:chromium).launch({headless:true,...(engineName==='chromium'&&process.env.GARY_CHROMIUM_PATH?{executablePath:process.env.GARY_CHROMIUM_PATH}:{})});
  const page=await browser.newPage({viewport:{width:1000,height:950},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/gary-camera-lab.html`);
  await page.waitForFunction(()=>document.querySelector('#engine').contentWindow.GaryBridgePreview&&!document.querySelector('#engine').contentDocument.querySelector('#startBtn').disabled,null,{timeout:60000});
  const frame=page.frames().find(f=>f.url().includes('/index.html'));
  assert.equal(await frame.evaluate(()=>GaryBridgePreview.artworkMode()),'legacy');
  await page.locator('#loadArtwork').click();
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Registered transparent PNG'));
  assert.equal(await frame.evaluate(()=>GaryBridgePreview.artworkMode()),'UNAPPROVED_BLOCKOUT');
  await page.locator('#footprints').uncheck();await page.locator('#volumes').uncheck();
  // Hide only Lab guide lines for the clean actual-engine export. Engine remains unchanged.
  const dir=path.join(root,'test-results/bridge-art-'+engineName);fs.mkdirSync(dir,{recursive:true});
  for(const view of ['enter','middle','exit']){
   await page.locator(`[data-view="${view}"]`).click();
   assert.equal(Math.round(await frame.evaluate(()=>GaryBridgePreview.snapshot().near)),{enter:560,middle:850,exit:1210}[view]);
   const data=await frame.evaluate(()=>{const c=document.createElement('canvas');c.width=360;c.height=640;c.getContext('2d').drawImage(document.querySelector('#c'),0,0,360,640);return c.toDataURL()});
   fs.writeFileSync(path.join(dir,view+'.png'),Buffer.from(data.split(',')[1],'base64'));
  }
  await page.locator('#copyJson').click();const candidate=JSON.parse(await page.locator('#exportText').inputValue());
  assert.equal(candidate.approved,false);assert.equal(candidate.raisedArchitecture.structureRevision,'connected-arcade-v2');assert.deepEqual(candidate.raisedArchitecture.sideFaceTop,[112,248]);assert.equal(candidate.raisedArchitecture.supportHeight,80);assert.equal(candidate.raisedArchitecture.artworkBlockout,true);
  fs.writeFileSync(path.join(dir,'camera-candidate.json'),JSON.stringify(candidate,null,2)+'\n');
  await page.locator('[data-view="middle"]').click();await page.locator('#footprints').check();await page.locator('#volumes').check();
  await page.screenshot({path:path.join(dir,'camera-lab.png'),fullPage:true});
  const before=await frame.evaluate(()=>GaryRuntimeStats.snapshot());await page.locator('#artwork').uncheck();
  assert.equal(await frame.evaluate(()=>GaryBridgePreview.artworkMode()),'legacy');assert.deepEqual(await frame.evaluate(()=>GaryRuntimeStats.snapshot()),before);
  await page.locator('#artwork').check();await page.locator('[data-view="enter"]').click();await page.locator('#resume').click();
  const pack=require('../gary-bridge-art-contract.json'),art=require('../gary-bridge-art.js');
  const base=art.sidePoint(pack,-1,400,pack.candidate.supportHeight*pack.candidate.heightProjection+4);base[0]-=2;
  let previousNear=560;
  for(let i=0;i<6;i++){
   await page.waitForTimeout(150);
   const sample=await frame.evaluate(base=>{const near=GaryBridgePreview.snapshot().near,c=document.querySelector('#c'),scale=c.width/360,y=base[1]+near-800;return {near,pixel:[...c.getContext('2d').getImageData(Math.round(base[0]*scale),Math.round(y*scale),1,1).data]};},base);
   assert.ok(sample.near>previousNear);assert.ok(sample.pixel[2]>sample.pixel[0],'submerged base stays water-coloured while the real engine scrolls');previousNear=sample.near;
  }
  await page.locator('#freeze').click();const frozen=await frame.evaluate(()=>GaryBridgePreview.snapshot().near);await page.waitForTimeout(100);assert.equal(await frame.evaluate(()=>GaryBridgePreview.snapshot().near),frozen);assert.deepEqual(errors,[]);
  console.log(engineName+': Camera Lab registered artwork, three real-engine captures, projection export, layer switching and scrolling PASS');
 }finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1});
