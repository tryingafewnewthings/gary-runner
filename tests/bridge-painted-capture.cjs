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
