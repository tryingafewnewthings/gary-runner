'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {createCanvas}=require('@napi-rs/canvas');
const factory=require('../gary-asset-factory.js');
const root=path.resolve(__dirname,'..');
const contract=JSON.parse(fs.readFileSync(path.join(root,'gary-asset-factory-contract.json'),'utf8'));
const camera=JSON.parse(fs.readFileSync(path.join(root,'gary-camera-contract.json'),'utf8'));
const world=fs.readFileSync(path.join(root,'gary-difficulty-data.js'),'utf8');
function mask(spec,mode='mask'){
 const c=createCanvas(spec.source.width,spec.source.height),ctx=c.getContext('2d');
 ctx.scale(spec.source.width/spec.draw.width,spec.source.height/spec.draw.height);
 factory.draw(ctx,spec,{mode});
 return c.getContext('2d').getImageData(0,0,c.width,c.height);
}
test('four reusable profiles inherit current 360×640 world dimensions and reject approval drift',()=>{
 assert.deepEqual(factory.validate(contract,camera),{ok:true,errors:[]});
 assert.equal(contract.templates.length,4);
 for(const id of ['victorian-frontage','stone-bridge-pier','victorian-lamppost','ground-decay-patch'])
   assert.ok(contract.templates.some(t=>t.id===id));
 for(const [key,expected] of [['width',360],['height',640],['roadWidth',150],['cobbleCell',60]]){
  assert.match(world,new RegExp('\\b'+key+'\\s*:\\s*'+expected+'\\b'));
 }
 const broken=structuredClone(contract);broken.templates[0].source.width++;
 assert.equal(factory.validate(broken,camera).ok,false);
 const raised=structuredClone(camera);raised.profiles['raised-architecture'].status='LOCKED';
 assert.equal(factory.validate(contract,raised).ok,false);
});
test('all four opaque geometry masks fit their source untrimmed padding and grounded baselines',()=>{
 for(const spec of contract.templates){
  const data=mask(spec),result=factory.inspect(data,data,spec,'image/png');
  assert.equal(result.pass,true,spec.id+': '+result.failures.join(', '));
  assert.ok(result.opaquePixels>50,spec.id);
  assert.ok(result.transparentPixels>50,spec.id);
  assert.equal(result.outsideMaskPixels,0,spec.id);
 }
});
test('wrong dimensions, fake transparency and painted pixels outside silhouette are rejected',()=>{
 const spec=contract.templates[2];
 const original=mask(spec),wrong={...original,width:spec.source.width+1};
 assert.equal(factory.inspect(wrong,null,spec,'image/png').pass,false);
 assert.equal(factory.inspect(original,original,spec,'image/jpeg').pass,false);
 const c=createCanvas(spec.source.width,spec.source.height),ctx=c.getContext('2d');
 ctx.fillStyle='#fefefe';ctx.fillRect(0,0,c.width,c.height);
 const img=ctx.getImageData(0,0,c.width,c.height),result=factory.inspect(img,original,spec,'image/png');
 assert.equal(result.pass,false);
 assert.ok(result.failures.some(s=>/transparen|silhouette|padding/i.test(s)));
});
test('export registration records exact source/draw scale, anchor, camera and unresolved approvals',()=>{
 for(const spec of contract.templates){
  const manifest=factory.registration(spec,camera);
  assert.deepEqual(manifest.source,spec.source);
  assert.deepEqual(manifest.draw,spec.draw);
  assert.deepEqual(manifest.anchor,spec.anchor);
  assert.equal(manifest.approved,false);assert.equal(manifest.registered,false);
  assert.equal(manifest.perspective,'UNVERIFIED_VISUAL');
  assert.equal(manifest.gameplayAssetPath,null);
  assert.equal(manifest.collision,'NOT_DEFINED');
 }
});
test('browser file exists, imports only local PNG and does not write gameplay source or export fake registration',()=>{
 const html=fs.readFileSync(path.join(root,'gary-asset-factory.html'),'utf8');
 assert.match(html,/gary-camera-contract\.json/);
 assert.match(html,/gary-asset-factory-contract\.json/);
 assert.match(html,/index\.html\?debug=1&bridgepreview=1/);
 assert.match(html,/navigator\.share/);
 assert.match(html,/file\.type!=='image\/png'/);
 assert.match(html,/STRUCTURAL PASS/);
 assert.match(html,/registered:false|registration\(spec,camera\)/);
 assert.doesNotMatch(html,/github\.com\/repos\//);
});

test('candidate artwork is debug-only and inserted at actual game layer boundaries',()=>{
 const runtime=fs.readFileSync(path.join(root,'gary-difficulty-runtime.js'),'utf8');
 assert.match(runtime,/if\(bridgePreviewSession\)\{\s*const passes=new Set/);
 assert.match(runtime,/window\.GaryAssetPreview=Object\.freeze/);
 assert.match(runtime,/registered:false,collision:'NOT_DEFINED'/);
 const frame=runtime.slice(runtime.indexOf('function render(dt,cutscenePlate=false)'),runtime.indexOf('/* Fixed simulation and interpolated presentation.'));
 const underWater=frame.indexOf("drawCandidate('under-water')");
 const deck=frame.indexOf("drawCandidate('deck')");
 const ground=frame.indexOf("drawCandidate('ground')");
 const rear=frame.indexOf("drawCandidate('rear')");
 const actor=frame.indexOf('drawPlayer()');
 const front=frame.indexOf("drawCandidate('front')");
 const hud=frame.indexOf('drawHud()');
 assert.ok(underWater>=0&&deck>underWater&&ground>deck);
 assert.ok(rear>ground&&actor>rear&&front>actor&&hud>front,'world draw order must be deliberate');
 assert.doesNotMatch(frame,/createElement\('canvas'\)/,'no candidate canvas allocation in the game renderer');
 const factoryHtml=fs.readFileSync(path.join(root,'gary-asset-factory.html'),'utf8');
 assert.match(factoryHtml,/cachedCandidateCanvas=art&&valid\?artCanvas\('art'\):artCanvas\('mask'\)/);
 assert.match(factoryHtml,/not.*registered|No collisions/i);
});
