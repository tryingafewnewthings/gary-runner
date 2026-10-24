'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium,webkit}=require('playwright');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.webp':'image/webp','.png':'image/png','.PNG':'image/png','.mp3':'audio/mpeg','.css':'text/css'};
(async()=>{
 const server=http.createServer((req,res)=>{
  const name=decodeURIComponent(new URL(req.url,'http://local').pathname);
  const file=path.resolve(root,'.'+name);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}
  catch(e){res.writeHead(404).end('Not found');}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const engine=process.env.GARY_TEST_ENGINE==='webkit'?webkit:chromium;let browser;
 try{
  browser=await engine.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/gary-world-explorer.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!document.querySelector('#game')?.contentWindow?.GaryWorldExplorer?.ready()&&!document.querySelector('#distance').disabled,null,{timeout:80000});
  assert.equal(await page.locator('#locations button').count(),12);
  assert.equal(await page.locator('#distance').getAttribute('max'),String(await page.evaluate(()=>document.querySelector('#game').contentWindow.GaryWorldExplorer.max)));
  const results=[];
  for(const [distance,mode] of [[0,'day'],[8200,'night'],[10500,'rain'],[20210,'rain'],[20850,'day'],[21400,'rain'],[24500,'day'],[32500,'night'],[0,'natural']]){
   const result=await page.evaluate(({distance,mode})=>{
    const exp=document.querySelector('#game').contentWindow.GaryWorldExplorer;
    return exp.seek(distance,{mode,gary:true,hud:false});
   },{distance,mode});
   assert.equal(result.distance,distance);
   assert.equal(result.mode,mode);
   results.push(result.label);
  }
  await page.locator('#locations button').filter({hasText:'Bridge center'}).click();
  assert.equal(Number(await page.locator('#distance').inputValue()),20850);
  await page.locator('#mode').selectOption('rain');
  assert.equal(await page.evaluate(()=>document.querySelector('#game').contentWindow.GaryWorldExplorer.snapshot().mode),'rain');
  await page.locator('#gary').uncheck();
  assert.equal(await page.evaluate(()=>document.querySelector('#game').contentWindow.GaryWorldExplorer.snapshot().showGary),false);
  await page.locator('#hud').check();
  assert.equal(await page.evaluate(()=>document.querySelector('#game').contentWindow.GaryWorldExplorer.snapshot().showHud),true);
  await page.locator('#distance').fill('14500');
  assert.equal(await page.evaluate(()=>document.querySelector('#game').contentWindow.GaryWorldExplorer.snapshot().distance),14500);
  const image=await page.evaluate(()=>{
   const src=document.querySelector('#game').contentDocument.querySelector('#c');
   const c=document.createElement('canvas');c.width=360;c.height=640;c.getContext('2d').drawImage(src,0,0,360,640);
   return c.toDataURL('image/png').split(',')[1];
  });
  const bytes=Buffer.from(image,'base64');
  assert.equal(bytes.readUInt32BE(16),360);assert.equal(bytes.readUInt32BE(20),640);
  if(errors.length)throw Error('Browser errors: '+errors.join('; '));
  console.log(engine===webkit?'webkit':'chromium','World Explorer PASS',results);
 }finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
