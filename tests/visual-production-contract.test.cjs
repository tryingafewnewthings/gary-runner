'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const refs=JSON.parse(read('docs/visual-master/reference-pack.json'));
const camera=JSON.parse(read('gary-camera-contract.json'));
const factory=JSON.parse(read('gary-asset-factory-contract.json'));

test('every new-chat producer has a versioned rulebook and current visual anchor map',()=>{
  const agents=read('AGENTS.md'),rules=read('GARY_VISUAL_PRODUCTION.md');
  assert.match(agents,/NEW CHAT \/ NEW ART GENERATION/);
  assert.match(agents,/GARY_VISUAL_PRODUCTION\.md/);
  assert.match(agents,/reference-pack\.json/);
  for(const p of ['STYLE.txt','ASSET_GRID_PROMPT.txt','ASSET_QUALITY_GATE.md','gary-camera-contract.json','index.html','gary-difficulty-data.js'])assert.ok(rules.includes(p),p);
  assert.match(rules,/first 30 seconds/i);
  assert.match(rules,/Stage A/);
  assert.match(rules,/Stage B/);
  assert.match(rules,/no vanishing point/i);
  assert.match(rules,/upper LEFT|upper-left/i);
});

test('real reference files exist and missing artist approval is not silently invented',()=>{
  assert.equal(refs.schema,'gary-eats-visual-reference-pack-v1');
  for(const ref of refs.primaryStyleEvidence){
    assert.ok(fs.existsSync(path.join(root,ref.path)),ref.path);
    assert.notEqual(ref.status,'VISUAL_APPROVED');
  }
  for(const ref of refs.neededForFullStyleLock)assert.notEqual(ref.status,'APPROVED');
  assert.ok(refs.rejectedAsStyleReferences.some(p=>p.includes('wilderness')));
  assert.ok(refs.primaryStyleEvidence.some(x=>x.path==='docs/biome-workspace/layout-street-day.png' && /NOT_MASTER_APPROVED/.test(x.status)));
});

test('visual master geometry mirrors current code camera without approving raised view',()=>{
  assert.deepEqual(refs.worldSnapshot.canvas,[camera.world.width,camera.world.height]);
  assert.deepEqual(refs.worldSnapshot.road,[camera.world.roadLeft,camera.world.roadRight]);
  assert.deepEqual(refs.worldSnapshot.lanes,camera.world.laneCentres);
  assert.equal(refs.worldSnapshot.garyY,camera.world.playerY);
  assert.equal(refs.worldSnapshot.cobbleCell,camera.world.cobbleCell);
  assert.deepEqual(refs.worldSnapshot.bridgeDeck,[camera.bridge.deck.left,camera.bridge.deck.right]);
  assert.equal(camera.profiles['raised-architecture'].status,'PROVISIONAL_NEEDS_VISUAL_APPROVAL');
});

test('Factory default and copied prompt enforce real first-biome source and reject camera guessing',()=>{
  const html=read('gary-asset-factory.html');
  assert.equal(factory.scenes.street.image,'docs/biome-workspace/layout-street-day.png');
  assert.match(html,/id="reference" src="docs\/biome-workspace\/layout-street-day\.png"/);
  assert.match(html,/STRICT REFERENCE-LOCKED ART GENERATION/);
  for(const word of ['ATTACH SOURCE IMAGES','high_street_sprites.webp','gary_walk_sheet.PNG','UPPER-LEFT','no vanishing point','RGBA','UNVERIFIED'])assert.ok(html.includes(word),word);
  assert.match(html,/REVIEW AT NATIVE 360×640/);
  assert.ok(html.includes("].join('\\n');"),'copied brief must separate lines by real newline characters');
});
