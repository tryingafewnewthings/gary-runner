'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium,webkit}=require('playwright');
const {createCanvas}=require('@napi-rs/canvas');
const factory=require('../gary-asset-factory.js');
const contract=require('../gary-asset-factory-contract.json');
const root=path.join(__dirname,'..'),engineName=process.env.GARY_TEST_ENGINE||'chromium';
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.PNG':'image/png','.webp':'image/webp'};
async function main(){
 const server=http.createServer((req,res)=>{
  const target=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
  if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',types[path.extname(target)]||'application/octet-stream');res.end(fs.readFileSync(target));}
  catch(_){res.writeHead(404).end('Not found');}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await (engineName==='webkit'?webkit:chromium).launch({headless:true,
   ...(engineName==='chromium'&&process.env.GARY_CHROMIUM_PATH?{executablePath:process.env.GARY_CHROMIUM_PATH}:{})});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,acceptDownloads:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/gary-asset-factory.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#result')?.textContent.includes('Four deterministic'),null,{timeout:25000});
  await page.waitForFunction(()=>document.querySelector('#reference').complete&&document.querySelector('#reference').naturalWidth>0);
  const stage=await page.locator('#stage').boundingBox();
  assert.ok(Math.abs(stage.width/stage.height-9/16)<.012,'360×640 ratio preserved on iPhone');
  assert.equal(await page.locator('#asset option').count(),4);

  // User's approved original-biome screenshot is compared locally, without publishing it or changing the game.
  const referenceCanvas=createCanvas(360,640),referenceCtx=referenceCanvas.getContext('2d');
  referenceCtx.fillStyle='#343b45';referenceCtx.fillRect(0,0,360,640);
  const screenshotPng=referenceCanvas.toBuffer('image/png');
  await page.locator('#referenceUpload').setInputFiles({name:'first-biome-360x640.png',mimeType:'image/png',buffer:screenshotPng});
  await page.waitForFunction(()=>document.querySelector('#reference').src.startsWith('blob:'));
  assert.match(await page.locator('#referenceInfo').textContent(),/360×640/);
  assert.match(await page.locator('#reference').getAttribute('alt'),/first-biome-360x640/);
  await page.locator('#resetReference').click();
  await page.waitForFunction(()=>document.querySelector('#reference').src.includes('/docs/bridge/'));
  assert.equal(await page.locator('#referenceUpload').inputValue(),'');
  await page.locator('#referenceUpload').setInputFiles({name:'wrong-size.png',mimeType:'image/png',buffer:createCanvas(300,300).toBuffer('image/png')});
  await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('Reference rejected:'));
  assert.ok(!(await page.locator('#reference').getAttribute('src')).startsWith('blob:'));
  await page.locator('#resetReference').click();

  for(const spec of contract.templates){
   await page.locator('#asset').selectOption(spec.id);
   const preview=await page.locator('#preview').evaluate(c=>({width:c.width,height:c.height,pixels:c.getContext('2d').getImageData(0,0,360,640).data.some((v,i)=>i%4===3&&v>0)}));
   assert.equal(preview.width,360);assert.equal(preview.height,640);assert.ok(preview.pixels);
   const next=page.waitForEvent('download');
   await page.locator('#mask').click();
   const dl=await next,stream=await dl.createReadStream(),chunks=[];
   for await(const chunk of stream)chunks.push(chunk);
   const bytes=Buffer.concat(chunks);
   assert.equal(bytes.subarray(1,4).toString('ascii'),'PNG');
   assert.equal(bytes.readUInt32BE(16),spec.source.width);
   assert.equal(bytes.readUInt32BE(20),spec.source.height);
  }

  const specimen=contract.templates[2];
  await page.locator('#asset').selectOption(specimen.id);
  const c=createCanvas(specimen.source.width,specimen.source.height),ctx=c.getContext('2d');
  ctx.scale(specimen.source.width/specimen.draw.width,specimen.source.height/specimen.draw.height);
  factory.draw(ctx,specimen,{mode:'mask'});
  const png=c.toBuffer('image/png');
  await page.locator('#upload').setInputFiles({name:'lamppost-test.png',mimeType:'image/png',buffer:png});
  await page.waitForFunction(()=>document.querySelector('#report').textContent.includes('STRUCTURAL PASS'),null,{timeout:15000});
  assert.equal(await page.locator('#final').isEnabled(),true);
  const download=page.waitForEvent('download');await page.locator('#final').click();
  const generated=await download;assert.ok(generated.suggestedFilename().includes('masked-candidate.png'));

  await page.locator('#registration').click();
  const reg=JSON.parse(await page.locator('#copyField').inputValue());
  assert.equal(reg.approved,false);assert.equal(reg.registered,false);
  assert.equal(reg.perspective,'UNVERIFIED_VISUAL');
  await page.locator('#brief').click();
  assert.match(await page.locator('#copyField').inputValue(),/Do NOT crop, resize, rotate/);

  await page.locator('#real').click();
  assert.ok((await page.locator('#game').getAttribute('src')).includes('bridgepreview=1'));
  // This assertion reads the ACTUAL isolated runtime, not the Factory overlay.
  await page.waitForFunction(()=>document.querySelector('#game')?.contentWindow?.GaryAssetPreview?.snapshot()?.pass==='front',
    null,{timeout:60000});
  assert.match(await page.locator('#result').textContent(),/real-engine front pass/i);
  await page.locator('#placeX').fill('178');
  await page.locator('#placeY').fill('350');
  await page.locator('#placeY').evaluate(el=>el.blur());
  await page.waitForFunction(()=>{
   const a=document.querySelector('#game')?.contentWindow?.GaryAssetPreview?.snapshot();
   return a?.draw.x===178&&a?.draw.y===350;
  });
  const fromEngine=await page.evaluate(()=>{
   const w=document.querySelector('#game').contentWindow,c=w.document.querySelector('#c');
   const withCandidate=c.toDataURL('image/png'),snapshot=w.GaryAssetPreview.snapshot();
   w.GaryAssetPreview.clear();
   const withoutCandidate=c.toDataURL('image/png');
   return {withCandidate,withoutCandidate,snapshot};
  });
  assert.notEqual(fromEngine.withCandidate,fromEngine.withoutCandidate,'candidate must alter actual engine canvas pixels');
  assert.equal(fromEngine.snapshot.registered,false);
  assert.equal(fromEngine.snapshot.scrollWithWorld,true);
  await page.locator('#renderPass').selectOption('rear');
  await page.waitForFunction(()=>document.querySelector('#game')?.contentWindow?.GaryAssetPreview?.snapshot()?.pass==='rear');
  const rearPixels=await page.locator('#game').evaluate(f=>f.contentDocument.querySelector('#c').toDataURL('image/png'));
  await page.locator('#renderPass').selectOption('front');
  await page.waitForFunction(()=>document.querySelector('#game')?.contentWindow?.GaryAssetPreview?.snapshot()?.pass==='front');
  const frontPixels=await page.locator('#game').evaluate(f=>f.contentDocument.querySelector('#c').toDataURL('image/png'));
  assert.notEqual(frontPixels,rearPixels,'front/rear render passes should change candidate occlusion');
  await page.locator('#registration').click();
  const candidate=JSON.parse(await page.locator('#copyField').inputValue());
  assert.equal(candidate.approved,false);assert.equal(candidate.registered,false);
  assert.equal(candidate.review.actualRenderPassPreview,true);
  assert.equal(candidate.review.pass,'front');
  assert.equal(candidate.review.draw.x,178);
  await page.locator('#scenePreset').selectOption('wilderness-reveal');
  await page.waitForFunction(()=>{
   const w=document.querySelector('#game')?.contentWindow;
   const state=w?.GaryWildernessPreview?.snapshot();
   return state?.origin!==null&&state?.progress>0;
  },null,{timeout:20000});
  await page.locator('#still').click();
  await page.setViewportSize({width:375,height:667});
  const compact=await page.locator('#stage').boundingBox();
  assert.ok(Math.abs(compact.width/compact.height-9/16)<.012);
  assert.deepEqual(errors,[]);
  console.log(engineName+': four templated silhouettes, exports, PNG import validation, isolated engine option and iPhone layout PASS');
 }finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
