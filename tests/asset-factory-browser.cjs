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
  await page.waitForFunction(()=>document.querySelector('#result')?.textContent.includes('Select an asset'),null,{timeout:25000});
  await page.waitForFunction(()=>document.querySelector('#reference').complete&&document.querySelector('#reference').naturalWidth>0);
  const stage=await page.locator('#stage').boundingBox();
  assert.ok(Math.abs(stage.width/stage.height-9/16)<.012,'360×640 ratio preserved on iPhone');
  assert.equal(await page.locator('#asset option').count(),7);
  assert.equal(await page.locator('#advanced').evaluate(el=>el.open),false,'technical controls should start collapsed');
  assert.equal(await page.locator('#quickPreview').isVisible(),true,'mobile action dock should be visible');
  assert.equal(await page.locator('#upload').count(),1,'one primary artwork picker');
  const bodyWidth=await page.evaluate(()=>document.documentElement.scrollWidth);
  assert.ok(bodyWidth<=390,'no horizontal scrolling on 390px iPhone');
  await page.locator('#advanced').evaluate(el=>el.open=true);

  // User's approved original-biome screenshot is compared locally, without publishing it or changing the game.
  const referenceCanvas=createCanvas(360,640),referenceCtx=referenceCanvas.getContext('2d');
  referenceCtx.fillStyle='#343b45';referenceCtx.fillRect(0,0,360,640);
  const screenshotPng=referenceCanvas.toBuffer('image/png');
  await page.locator('#referenceUpload').setInputFiles({name:'first-biome-360x640.png',mimeType:'image/png',buffer:screenshotPng});
  await page.waitForFunction(()=>document.querySelector('#reference').src.startsWith('blob:'));
  assert.match(await page.locator('#referenceInfo').textContent(),/360×640/);
  assert.match(await page.locator('#reference').getAttribute('alt'),/first-biome-360x640/);
  await page.locator('#resetReference').click();
  await page.waitForFunction(()=>document.querySelector('#reference').src.includes('/docs/biome-workspace/'));
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

  await page.locator('#upload').setInputFiles({name:'fake.png',mimeType:'image/png',buffer:Buffer.from('not a PNG')});
  await page.waitForFunction(()=>document.querySelector('#report').textContent.includes('invalid PNG source dimensions'));
  assert.equal(await page.locator('#final').isEnabled(),false);
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

  await page.locator('#quickPreview').click();
  await page.waitForFunction(()=>document.querySelector('#stageTip')?.textContent.includes('Drag to position'));

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
  // Real pointer movement must adjust the candidate world position on a phone,
  // without changing collision/physics or the camera contract.
  const initial=await page.evaluate(()=>document.querySelector('#placeX').valueAsNumber);
  await page.locator('#advanced').evaluate(el=>el.open=false);
  await page.locator('#preview').scrollIntoViewIfNeeded();
  const dragBounds=await page.locator('#preview').boundingBox();
  const sx=dragBounds.x+(178+specimen.draw.width/2)*dragBounds.width/360,
   sy=dragBounds.y+(350+specimen.draw.height/2)*dragBounds.height/640;
  await page.mouse.move(sx,sy);
  await page.mouse.down();
  await page.mouse.move(sx+34,sy+20,{steps:4});
  await page.mouse.up();
  await page.waitForFunction(before=>Number(document.querySelector('#placeX').value)>before,initial);
  await page.locator('#advanced').evaluate(el=>el.open=true);
  // Restore an overlap with Gary before proving rear/front painter's ordering.
  await page.locator('#placeX').fill('178');
  await page.locator('#placeY').fill('350');
  await page.locator('#placeY').evaluate(el=>el.blur());
  await page.waitForFunction(()=>document.querySelector('#game')?.contentWindow?.GaryAssetPreview?.snapshot()?.draw.x===178);
  await page.locator('#renderPass').selectOption('rear');
  await page.waitForFunction(()=>document.querySelector('#game')?.contentWindow?.GaryAssetPreview?.snapshot()?.pass==='rear');
  const rearPixels=await page.locator('#game').evaluate(f=>f.contentDocument.querySelector('#c').toDataURL('image/png'));
  await page.locator('#renderPass').selectOption('front');
  await page.waitForFunction(()=>document.querySelector('#game')?.contentWindow?.GaryAssetPreview?.snapshot()?.pass==='front');
  const frontPixels=await page.locator('#game').evaluate(f=>f.contentDocument.querySelector('#c').toDataURL('image/png'));
  assert.notEqual(frontPixels,rearPixels,'front/rear render passes should change candidate occlusion');
  const lighting=await page.locator('#game').evaluate(f=>{
    const w=f.contentWindow,api=w.GaryAssetPreview,out={};
    for(const mode of ['day','night','rain']){
      if(!api.startScene('bridge-middle',mode))throw Error('Missing isolated lighting preset');
      out[mode]=w.document.querySelector('#c').toDataURL('image/png');
    }
    return out;
  });
  assert.notEqual(lighting.day,lighting.night,'day/night visual evidence must differ');
  assert.notEqual(lighting.night,lighting.rain,'night/rain visual evidence must differ');
  await page.locator('#registration').click();
  const candidate=JSON.parse(await page.locator('#copyField').inputValue());
  assert.equal(candidate.approved,false);assert.equal(candidate.registered,false);
  assert.equal(candidate.review.actualRenderPassPreview,true);
  assert.equal(candidate.review.pass,'front');
  assert.equal(candidate.review.draw.x,Number(await page.locator('#placeX').inputValue()));
  await page.locator('#scenePreset').selectOption('wilderness-reveal');
  await page.waitForFunction(()=>{
   const w=document.querySelector('#game')?.contentWindow;
   const state=w?.GaryWildernessPreview?.snapshot();
   return state?.origin!==null&&state?.progress>0;
  },null,{timeout:20000});
  await page.locator('#still').click();
  await page.locator('#resetPlacement').click();
  assert.equal(await page.locator('#placeX').inputValue(),String(specimen.draw.x));
  await page.setViewportSize({width:375,height:667});
  const compact=await page.locator('#stage').boundingBox();
  assert.ok(Math.abs(compact.width/compact.height-9/16)<.012);
  assert.ok((await page.evaluate(()=>document.documentElement.scrollWidth))<=375,'compact phone viewport must not scroll sideways');
  // Reference board must actually render ORIGINAL atlas/Gary/cobbles pixels
  // automatically, without requiring the iPhone user to upload anything.
  await page.goto('http://127.0.0.1:'+server.address().port+'/gary-visual-reference-board.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent.startsWith('Ready —'),null,{timeout:30000});
  const board=await page.locator('#board').evaluate(c=>{
   const g=c.getContext('2d'),sample=(x,y)=>[...g.getImageData(x,y,1,1).data];
   return {width:c.width,height:c.height,street:sample(45,100),shop:sample(430,130),gary:sample(790,152),cobble:sample(780,380)};
  });
  assert.equal(board.width,1080);assert.equal(board.height,760);
  assert.notDeepEqual(board.street,board.shop,'street image must not be a placeholder box');
  assert.notDeepEqual(board.street,board.cobble,'cobble pixels must come from native atlas');
  assert.equal(await page.locator('#save').isEnabled(),true);
  assert.deepEqual(errors,[]);
  console.log(engineName+': mobile workflow, hidden advanced controls, drag placement, real-engine layering, PNG QA and handoff PASS');
 }finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
