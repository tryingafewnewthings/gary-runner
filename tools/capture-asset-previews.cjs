'use strict';
/* Zero-manual-operation asset preview capture. Uses the ACTUAL isolated game renderer,
 * not a Photoshop/CSS approximation. No production asset registration.
 * Usage: node tools/capture-asset-previews.cjs --asset art/candidates/item.png
 *        --template bridge-deck-tile --out test-results/asset-review/item
 */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const {chromium,webkit}=require('playwright');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const factory=require('../gary-asset-factory.js');
const contract=require('../gary-asset-factory-contract.json');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json',
 '.png':'image/png','.PNG':'image/png','.webp':'image/webp','.mp3':'audio/mpeg'};
function argumentsFrom(argv){
 const get=k=>{const i=argv.indexOf(k);return i<0?null:argv[i+1]};
 const template=get('--template'),file=get('--asset'),out=get('--out');
 const engine=get('--engine')||'chromium';
 if(!template||!file||!['chromium','webkit'].includes(engine))
   throw Error('Usage: node tools/capture-asset-previews.cjs --asset art/candidates/name.png --template bridge-deck-tile [--out output-dir] [--engine chromium|webkit]');
 const safe=path.resolve(root,file);
 if(!safe.startsWith(root+path.sep)||!fs.existsSync(safe)||path.extname(safe).toLowerCase()!=='.png')throw Error('Local transparent PNG required');
 const spec=contract.templates.find(t=>t.id===template);if(!spec)throw Error('Unknown measured template');
 const target=path.resolve(root,out||'test-results/asset-review/'+template);
 if(!target.startsWith(root+path.sep))throw Error('Unsafe output path');
 const pass={'bridge-deck':'deck','foreground-parapet':'front','lower-masonry-under-water':'under-water',
  'ground-overlays':'ground','shops-and-props':'rear','foreground-props':'front'}[spec.layer];
 if(!pass)throw Error('No isolated real-engine pass for '+spec.layer);
 return {spec,safe,target,engine,pass};
}
async function inspect(input){
 const png=fs.readFileSync(input.safe),image=await loadImage(png);
 if(image.width!==input.spec.source.width||image.height!==input.spec.source.height)
   throw Error('Source size mismatch: expected '+input.spec.source.width+'x'+input.spec.source.height);
 const actual=createCanvas(image.width,image.height),g=actual.getContext('2d');g.drawImage(image,0,0);
 const mask=createCanvas(image.width,image.height),m=mask.getContext('2d');
 m.scale(image.width/input.spec.draw.width,image.height/input.spec.draw.height);
 factory.draw(m,input.spec,{mode:'mask'});
 const report=factory.inspect(g.getImageData(0,0,image.width,image.height),
  mask.getContext('2d').getImageData(0,0,image.width,image.height),input.spec,'image/png');
 if(!report.pass)throw Error('Failed source silhouette/alpha check: '+report.failures.join('; '));
 return {png,report};
}
async function run(config){
 const {png,report}=await inspect(config);
 const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname);
  const file=path.resolve(root,'.'+pathname);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}
  catch(_){res.writeHead(404).end('Not found');}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await (config.engine==='webkit'?webkit:chromium).launch({headless:true,
   ...(config.engine==='chromium'&&process.env.GARY_CHROMIUM_PATH?{executablePath:process.env.GARY_CHROMIUM_PATH}:{})});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/gary-bridge-preview.html');
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent.startsWith('Safe centre'),null,{timeout:60000});
  const frame=page.frames().find(f=>f.url().includes('/index.html'));
  if(!frame)throw Error('Active real-game iframe did not load');
  const scene=config.spec.scene==='bridge'?'bridge-middle':config.spec.scene==='wilderness'?'wilderness-reveal':'street-day';
  const payload={data:'data:image/png;base64,'+png.toString('base64'),
   draw:config.spec.draw,pass:config.pass,scene};
  fs.mkdirSync(config.target,{recursive:true});
  const captures={};
  for(const mode of ['day','night','rain']){
   const image=await frame.evaluate(async a=>{
    const im=new Image();im.src=a.data;if(im.decode)await im.decode();
    else await new Promise((yes,no)=>{im.onload=yes;im.onerror=no});
    const preview=window.GaryAssetPreview;
    if(!preview?.ready()||!preview.startScene(a.scene,a.mode))throw Error('Isolated game candidate preview unavailable');
    const r=preview.set({image:im,draw:a.draw,pass:a.pass,scrollWithWorld:false});
    if(r.registered!==false)throw Error('Danger: artwork was added to gameplay registry');
    const c=document.querySelector('#c');
    if(c.width!==360||c.height!==640)throw Error('Runtime output is not 360x640');
    return c.toDataURL('image/png');
   },{...payload,mode});
   const name=mode+'.png';fs.writeFileSync(path.join(config.target,name),Buffer.from(image.split(',')[1],'base64'));
   captures[mode]=name;
  }
  if(errors.length)throw Error('Browser script errors: '+errors.join('; '));
  const result={schema:'gary-eats-native-engine-art-evidence-v1',asset:path.relative(root,config.safe),
   templateId:config.spec.id,source:config.spec.source,draw:config.spec.draw,pass:config.pass,
   sourceSha256:crypto.createHash('sha256').update(png).digest('hex'),
   technical:{pass:true,report},captures,engine:config.engine,
   visualApproval:'UNVERIFIED_REQUIRES_INDEPENDENT_REVIEW',registered:false,iphoneTested:false};
  fs.writeFileSync(path.join(config.target,'review.json'),JSON.stringify(result,null,2)+'\\n');
  return result;
 }finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
if(require.main===module){
 let config;
 try{config=argumentsFrom(process.argv.slice(2));}
 catch(e){console.error(e.message);process.exitCode=1;}
 if(config)run(config).then(r=>console.log('Native preview captures: '+JSON.stringify(r.captures)+' (not artistic approval)')).catch(e=>{console.error(e.stack||e);process.exitCode=1});
}
module.exports={argumentsFrom,inspect,run};
