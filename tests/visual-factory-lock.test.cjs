'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {createCanvas}=require('@napi-rs/canvas');
const camera=require('../gary-camera-contract.json');
const contract=require('../gary-asset-factory-contract.json');
const f=require('../gary-asset-factory.js');
const {build}=require('../tools/asset-visual-brief.cjs');
const {checkNewFiles}=require('../tools/visual-release-gate.cjs');
const root=path.resolve(__dirname,'..');
test('precisely calibrated bridge deck and both parapets retain parallel sides',()=>{
 for(const id of ['bridge-deck-tile','bridge-parapet-left','bridge-parapet-right']){
  const spec=contract.templates.find(x=>x.id===id);
  assert.ok(spec,id);
  assert.equal(spec.scene,'bridge');
  const quad=f.geometry(spec).solids[0];
  assert.equal(quad[0][0],quad[3][0],id+' left edge must not converge');
  assert.equal(quad[1][0],quad[2][0],id+' right edge must not converge');
  assert.ok(quad[1][0]>quad[0][0]);
  assert.equal(spec.source.width*spec.draw.height,spec.source.height*spec.draw.width);
 }
 assert.equal(contract.templates.find(t=>t.id==='bridge-deck-tile').draw.x,camera.bridge.deck.left);
 assert.equal(contract.templates.find(t=>t.id==='bridge-deck-tile').draw.width,camera.bridge.deck.width);
 for(const [id,i]of [['bridge-parapet-left',0],['bridge-parapet-right',1]]){
  const a=contract.templates.find(t=>t.id===id);
  assert.equal(a.draw.x,camera.bridge.parapets[i].left);
  assert.equal(a.draw.width,camera.bridge.parapets[i].width);
 }
});
test('bridge asset brief is automatically split into physically measurable parts',()=>{
 const pack=build('bridge','Old red brick footbridge');
 assert.equal(pack.specs.length,3);
 assert.equal(pack.status,'CANDIDATE_UNVERIFIED_VISUAL');
 assert.ok(pack.specs.every(s=>s.imageSourcesMustBeAttached));
 for(const spec of pack.specs){
  assert.ok(spec.referencePaths.includes('high_street_sprites.webp'));
  assert.ok(spec.referencePaths.includes('docs/biome-workspace/layout-street-day.png'));
  assert.match(spec.prompt,/no convergence/i);
  assert.match(spec.prompt,/unregistered transparent PNG candidate/i);
  assert.match(spec.prompt,/360x640/i);
  assert.equal(spec.cameraStatus,'PROVISIONAL_NEEDS_VISUAL_APPROVAL');
 }
 assert.throws(()=>build('full-3d-bridge-scene'),/Uncalibrated family/);
});
test('auto-built original-pixel reference board cannot silently use draft wilderness master',()=>{
 const page=fs.readFileSync(path.join(root,'gary-visual-reference-board.html'),'utf8');
 for(const asset of ['high_street_sprites.webp','gary_walk_sheet.PNG','IMG_7141.webp','docs/biome-workspace/layout-street-day.png'])
  assert.ok(page.includes(asset.replace(/^docs\//,'')),'board reference missing: '+asset);
 assert.match(page,/NOT an owner-approved|not<\/strong> an owner-approved/i);
 assert.match(page,/canvas id="board" width="1080" height="760"/);
 assert.doesNotMatch(page,/art\/wilderness\/(?:verge|props|ruins)/);
});
test('new images cannot be promoted without real-game review evidence and original images',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'gary-visual-gate-'));
 try{
  const mkdir=p=>fs.mkdirSync(path.join(tmp,p),{recursive:true});
  mkdir('art/new');mkdir('docs/biome-workspace');mkdir('docs/qa/new');
  fs.writeFileSync(path.join(tmp,'high_street_sprites.webp'),'actual-master-fixture');
  const png=createCanvas(360,640).toBuffer('image/png');
  const files=['docs/biome-workspace/layout-street-day.png','docs/qa/new/day.png','docs/qa/new/night.png','docs/qa/new/rain.png'];
  for(const p of files)fs.writeFileSync(path.join(tmp,p),png);
  const image='art/new/bridge-deck.png';fs.writeFileSync(path.join(tmp,image),png);
  const unregistered=checkNewFiles([image],{schema:'gary-eats-art-visual-ledger-v1',assets:{}},tmp);
  assert.equal(unregistered.pass,false);
  const ledger={schema:'gary-eats-art-visual-ledger-v1',assets:{}};
  ledger.assets[image]={stage:'VISUAL_REVIEWED_360',family:'bridge',cameraStatus:'FAMILY_VISUALLY_REVIEWED',
   source:{width:336,height:1024},draw:{x:138,y:180,width:84,height:256},groundContact:{x:180,y:430},
   references:['high_street_sprites.webp','docs/biome-workspace/layout-street-day.png'],
   engineEvidence:{day:files[1],night:files[2],rain:files[3]},
   reviewedBy:'ChatGPT-visual-review',runtimeStartValidated:true};
  assert.deepEqual(checkNewFiles([image],ledger,tmp).failures,[]);
  ledger.assets[image].cameraStatus='PROVISIONAL';
  assert.match(checkNewFiles([image],ledger,tmp).failures.join(' '),/camera/);
  assert.equal(checkNewFiles(['art/candidates/sketch.png'],ledger,tmp).pass,true);
  assert.equal(checkNewFiles(['src/ui.js'],ledger,tmp).pass,true);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
