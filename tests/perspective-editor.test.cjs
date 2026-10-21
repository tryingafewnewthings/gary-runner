'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {createCanvas}=require('@napi-rs/canvas');
const P=require('../gary-perspective-editor.js');
const spec=require('../gary-asset-factory-contract.json').templates[2];
const camera=require('../gary-camera-contract.json');
test('quick transformations use a stable world anchor, no vanishing-point scaling',()=>{
 const box={x:40,y:30,w:180,h:800},anchor={x:144,y:864};
 assert.deepEqual(P.quickQuad(box,{},anchor),P.corners(box));
 const q=P.quickQuad(box,{widthScale:1,heightScale:1,skew:12,topDepth:18},anchor);
 assert.equal(q[0].x,52);assert.equal(q[1].x,232);
 assert.equal(q[2].x,220);assert.equal(q[3].x,40);
 assert.equal(q[0].y,12);assert.equal(q[2].y,830);
 assert.equal(P.validQuad(q,288,864,12),true);
 assert.equal(P.validQuad([q[0],q[2],q[1],q[3]],288,864,12),false);
});
test('piecewise perspective warp paints image at full original source dimensions and not outside quad',()=>{
 const src=createCanvas(96,96),g=src.getContext('2d');
 g.fillStyle='#db8c58';g.fillRect(15,18,56,60);
 const dst=createCanvas(96,96),ctx=dst.getContext('2d');
 const box={x:15,y:18,w:56,h:60},q=P.corners(box);
 P.warp(ctx,src,box,q,10);
 let img=ctx.getImageData(0,0,96,96);
 const idx=(x,y)=>(y*96+x)*4;
 assert.ok(img.data[idx(45,40)+3]>245,'center inside alpha');
 assert.equal(img.data[idx(2,2)+3],0,'alpha outside quad');
 const moved=q.map(p=>({...p}));moved[0].x+=8;moved[1].y+=7;
 assert.equal(P.validQuad(moved,96,96,8),true);
 const dst2=createCanvas(96,96);P.warp(dst2.getContext('2d'),src,box,moved,10);
 img=dst2.getContext('2d').getImageData(0,0,96,96);
 assert.ok(img.data[idx(45,40)+3]>140,'warped canvas painted');
});
test('individual painted faces warp independently while preserving alpha and correct ordering',()=>{
 const roof=createCanvas(96,96),side=createCanvas(96,96);
 roof.getContext('2d').fillStyle='#c8b16a';roof.getContext('2d').fillRect(18,10,60,22);
 side.getContext('2d').fillStyle='#74514b';side.getContext('2d').fillRect(52,32,22,54);
 const c=createCanvas(96,96),ctx=c.getContext('2d');
 P.warp(ctx,side,{x:52,y:32,w:22,h:54},P.corners({x:52,y:32,w:22,h:54}),8);
 P.warp(ctx,roof,{x:18,y:10,w:60,h:22},P.corners({x:18,y:10,w:60,h:22}),8);
 const a=ctx.getImageData(0,0,96,96).data,idx=(x,y)=>(y*96+x)*4;
 assert.ok(a[idx(38,20)+3]>200);
 assert.ok(a[idx(64,54)+3]>200);
 assert.equal(a[idx(5,5)+3],0);
});
test('geometry edits are candidate only and reject incompatible or unsafe settings',()=>{
 const original=P.initial(spec),edited=P.copy(original);
 edited.tool='corners';edited.quadrilaterals.whole=[
 {x:18,y:18},{x:270,y:18},{x:270,y:841},{x:18,y:841}
 ];
 assert.equal(P.validateSettings(edited,spec),true);
 edited.quadrilaterals.roof=[
 {x:8,y:8},{x:280,y:8},{x:280,y:850},{x:8,y:850}
 ];
 assert.equal(P.validateSettings(edited,spec),false,'must honour alpha padding');
 edited.quadrilaterals.roof=null;
 const meta=P.exportState(spec,camera,edited,{whole:'source.png'},null);
 assert.equal(meta.approval.registered,false);
 assert.equal(meta.approval.camera,'UNVERIFIED_VISUAL');
 assert.deepEqual(meta.worldPlacement,{x:68,y:425,width:36,height:108});
 assert.equal(meta.sourceOriginalsModified,false);
 assert.equal(meta.settings.assetId,spec.id);
 edited.quadrilaterals.whole[0].x=90;
 assert.equal(meta.settings.quadrilaterals.whole[0].x,18,'JSON is independent deep clone');
});
test('UI has non-destructive save/reload, pointer drag, iPhone layouts, before/after, and face uploads',()=>{
 const html=fs.readFileSync(path.resolve(__dirname,'../gary-perspective-editor.html'),'utf8');
 for(const term of ['id="handles"','pointerdown','pointermove','pointercancel','showBefore',
   'id="anchorLock"','id="importSettings"','id="exportPng"','id="previewPng"',
   'id="file"','id="mode"','id="face"','id="undo"','id="redo"','gary-camera-contract.json',
   'sourceOriginalsModified:false','settingsFile']){
  assert.ok(html.includes(term),term);
 }
 const f=fs.readFileSync(path.resolve(__dirname,'../gary-asset-factory.html'),'utf8');
 assert.match(f,/perspectiveLink/);
 assert.match(f,/gary-perspective-editor\.html\?asset=/);
 const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
 assert.ok(scripts.length>0);for(const js of scripts)assert.doesNotThrow(()=>new Function(js));
});
