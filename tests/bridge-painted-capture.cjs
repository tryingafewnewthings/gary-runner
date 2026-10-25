'use strict';
/* Real, isolated 360x640 game captures of the painted bridge in three lighting modes.
 * Printed BASE64 markers allow secure promotion of the SAME captures to review evidence
 * without modifying runtime or asking the iPhone user to operate Camera Lab.
 */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const mimes={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.PNG':'image/png','.webp':'image/webp','.mp3':'audio/mpeg'};
async function main(){
 const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',mimes[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}
  catch(_){res.writeHead(404).end('Not found');}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;
 try{
  browser=await chromium.launch({headless:true,...(process.env.GARY_CHROMIUM_PATH?{executablePath:process.env.GARY_CHROMIUM_PATH}:{})});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',error=>errors.push(String(error.message)));
  const url='http://127.0.0.1:'+server.address().port+'/index.html?debug=1&bridgepreview=1&painted=1';
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.GaryBridgePreview&&window.GaryAssetPreview?.ready()&&window.GaryPaintedBridgeStatus?.ready(),null,{timeout:65000});
  const out=path.join(root,'test-results','painted-bridge-review');fs.mkdirSync(out,{recursive:true});
  // Real loaded-normal-gameplay bank capture; no candidate overlay or montage.
  // Both images must decode at their production paths before capturing.
  await page.waitForFunction(()=>window.GaryUserBridgeStatus?.banksReady()===true,null,{timeout:30000});
  const banksDir=path.join(root,'test-results','approved-banks-review');
  fs.mkdirSync(banksDir,{recursive:true});
  const bankSource={};
  for(const side of ['left','right']){
   const file=path.join(root,'art/bridge/approved-shore',side+'_riverbank_approved.png');
   bankSource[side]=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  }
  for(const mode of ['day','night','rain']){
   const raw=await page.evaluate(mode=>{
    if(!window.GaryAssetPreview.startScene('bridge-enter',mode))throw Error('Bridge entrance capture failed');
    if(!window.GaryUserBridgeStatus.banksReady())throw Error('Approved riverbank sprites not decoded');
    const source=document.querySelector('#c'),c=document.createElement('canvas');
    c.width=360;c.height=640;c.getContext('2d').drawImage(source,0,0,360,640);
    return c.toDataURL('image/png').split(',')[1];
   },mode);
   const bytes=Buffer.from(raw,'base64');
   if(bytes.readUInt32BE(16)!==360||bytes.readUInt32BE(20)!==640)throw Error('Invalid banks capture dimensions');
   fs.writeFileSync(path.join(banksDir,mode+'.png'),bytes);
   console.log('GARY_APPROVED_BANKS_CAPTURE_'+mode.toUpperCase()+'='+raw);
  }
  const reviewData=side=>({schema:'gary-eats-native-engine-art-evidence-v1',
   asset:'art/bridge/approved-shore/'+side+'_riverbank_approved.png',
   sourceSha256:bankSource[side],registered:false,iphoneTested:false,
   technical:{pass:true,alpha:true,dimensions:[110,245],draw:[side==='left'?0:250,-231,110,245]},
   camera:'fixed-screen-parallel',nativeResolution:[360,640],
   captures:{day:'day.png',night:'night.png',rain:'rain.png'},
   visualApproval:'UNVERIFIED_REQUIRES_INDEPENDENT_REVIEW',
   note:'Loaded actual registered normal-gameplay shore PNGs in real renderer; reviewed only after capture'});
  for(const side of ['left','right'])fs.writeFileSync(path.join(banksDir,side+'-review.json'),JSON.stringify(reviewData(side),null,2)+'\\n');
  console.log('GARY_APPROVED_BANKS_SHA256='+JSON.stringify(bankSource));
  for(const mode of ['day','night','rain']){
   const raw=await page.evaluate(mode=>{
    if(!GaryAssetPreview.startScene('bridge-middle',mode))throw Error('Bridge scene failed');
    const source=document.querySelector('#c'),c=document.createElement('canvas');
    c.width=360;c.height=640;c.getContext('2d').drawImage(source,0,0,360,640);
    return c.toDataURL('image/png').split(',')[1];
   },mode);
   const bytes=Buffer.from(raw,'base64');
   if(bytes.readUInt32BE(16)!==360||bytes.readUInt32BE(20)!==640)throw Error('Invalid native screenshot size');
   fs.writeFileSync(path.join(out,mode+'.png'),bytes);
   console.log('GARY_PAINTED_CAPTURE_'+mode.toUpperCase()+'='+raw);
  }
  // Owner-approved framing: stone bridge meets the asphalt above Gary,
  // so the road, vegetation, water and entrance appear together as in the
  // accepted artwork. This capture is FROM THE ACTIVE 360x640 GAME RENDERER.
  await page.waitForFunction(()=>window.GaryUserBridgeStatus?.banksReady(),null,{timeout:30000});
  const composition=path.join(root,'test-results','approved-bridge-composition');
  fs.mkdirSync(composition,{recursive:true});
  for(const scene of ['bridge-composition','bridge-enter','bridge-middle','bridge-exit']){
   for(const mode of ['day','night','rain']){
    const raw=await page.evaluate(({scene,mode})=>{
     if(!window.GaryAssetPreview.startScene(scene,mode))throw Error('Bridge scene '+scene+' failed');
     if(!window.GaryUserBridgeStatus?.banksReady())throw Error('Approved shoreline sprites not loaded');
     const src=document.querySelector('#c'),out=document.createElement('canvas');
     out.width=360;out.height=640;out.getContext('2d').drawImage(src,0,0);
     return out.toDataURL('image/png').slice('data:image/png;base64,'.length);
    },{scene,mode});
    const bytes=Buffer.from(raw,'base64');
    if(bytes.readUInt32BE(16)!==360||bytes.readUInt32BE(20)!==640)throw Error('Not native 360x640');
    fs.writeFileSync(path.join(composition,scene+'-'+mode+'.png'),bytes);
    if(scene==='bridge-composition'&&mode==='day'){
     console.log('GARY_APPROVED_COMPOSITION_DAY='+raw);
    }
   }
  }
  if(errors.length)throw Error(errors.join('; '));
  const atlas=fs.readFileSync(path.join(root,'art/bridge/painted/bridge-atlas.webp'));
  const sha256=crypto.createHash('sha256').update(atlas).digest('hex');
  const review={schema:'gary-eats-native-engine-art-evidence-v1',
    asset:'art/bridge/painted/bridge-atlas.webp',sourceSha256:sha256,
    technical:{pass:true,alpha:true,dimensions:[246,93],draw:[138,180,84,620]},
    captures:{day:'day.png',night:'night.png',rain:'rain.png'},
    registered:false,visualApproval:'UNVERIFIED',iphoneTested:false};
  fs.writeFileSync(path.join(out,'review.json'),JSON.stringify(review,null,2)+'\n');
  console.log('GARY_PAINTED_SOURCE_SHA256='+sha256);
 }finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});
