'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const active=read('gary-difficulty-runtime.js');
const ui=read('gary-biome-workspace.js');
const html=read('gary-biome-workspace.html');
test('multi-candidate engine extension is isolated and capped',()=>{
 assert.match(active,/if\(bridgePreviewSession\)\{\s*const passes=new Set/);
 assert.match(active,/setPack:\(assets\)=>/);
 assert.match(active,/assets\.length>20/);
 assert.match(active,/clearPack:\(\)=>/);
 assert.match(active,/packSnapshot:\(\)=>/);
 assert.match(active,/candidateAsset=null;biomeCandidates=next;/);
 assert.match(active,/registered:false,collision:'NOT_DEFINED'/);
 const fn=active.slice(active.indexOf('function drawOneCandidate('),active.indexOf('const legacyBridgePaint',active.indexOf('function drawOneCandidate(')));
 assert.doesNotMatch(fn,/document\.createElement|new Image|Object\.assign/);
});
test('workspace reuses actual game, prevents registration and retains reference-camera limits',()=>{
 assert.match(html,/index\.html|gary-biome-workspace\.js/);
 assert.match(ui,/index\.html\?debug=1&bridgepreview=1&seed=12345/);
 assert.match(ui,/api\.setPack\(/);
 assert.match(ui,/approved:false,registered:false/);
 assert.match(ui,/cameraContract:'gary-camera-contract\.json'/);
 assert.match(ui,/UNVERIFIED_VISUAL/);
 assert.match(ui,/DRAFT01 visuals are rejected/);
 assert.match(ui,/pixel/i);
 assert.doesNotMatch(ui,/api\.github\.com|localStorage\.|sessionStorage\./);
});
test('pack data retains bytes and metadata but never claims production approval',()=>{
 assert.match(ui,/schema:'gary-eats-biome-workspace-v1'/);
 assert.match(ui,/version:1/);
 assert.match(ui,/pngData:a\.dataUrl/);
 assert.match(ui,/a\.pngData\?\.startsWith\('data:image\/png;base64,'\)/);
 assert.match(ui,/a\.source\.width\*a\.source\.height>MAX_PX/);
 assert.match(ui,/MAX_FILE=3\*1024\*1024/);
 assert.match(ui,/MAX_TOTAL=18\*1024\*1024/);
 assert.match(ui,/assetCount:state\.assets\.length/);
});
test('mobile controls and scene timeline exist in one page with single preview canvas',()=>{
 for(const id of ['touch','game','assets','addFiles','importPack','packFile','export','exportLayout',
  'scene','timeline','biomeName','selectedName','drawX','drawY','drawW','drawH','pass','opacity',
  'worldScroll','mobileAdd','mobilePreview','mobileSave'])
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 assert.match(html,/touch-action:none/);
 assert.match(html,/360 × 640/);
 assert.match(html,/not.*game|no production changes/i);
});
