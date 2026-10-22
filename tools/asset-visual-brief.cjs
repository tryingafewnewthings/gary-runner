'use strict';
/**
 * Deterministic, reference-first asset brief compiler.
 * This is a pre-generation contract, NOT an AI model and not artistic approval.
 * All derived bridge widths come from the current camera contract; no lens math.
 */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const camera=read('gary-camera-contract.json');
const factory=read('gary-asset-factory-contract.json');
const visualRefs=read('docs/visual-master/reference-pack.json');
const forbidden=/\\b(vanishing point|isometric|photorealistic|cinematic lens|field of view|fisheye)\\b/i;
const common=Object.freeze({
 kind:'CANDIDATE_UNVERIFIED_VISUAL',
 originalAnchors:visualRefs.primaryStyleEvidence.map(x=>({file:x.path,status:x.status})),
 camera:'fixed-screen-parallel-2.5d; no convergence, invented tilt, lens, depth scaling, foreshortening or isometric projection',
 style:'Match ACTUAL original first-biome shops, Gary and cobbles: painted British cartoon game art, subtle soft upper-left daylight, controlled dark outlines, original material grain, native 360x640 scale.',
 isolation:'True transparent RGBA cutout. No premade scene, sky, grass, road, water, cast environment shadow, checkerboard, white fringe or surrounding ground unless the requested isolated layer is that ground itself.',
 test:'Inspect source pixels and mask, exact dimensions, baseline/padding/alpha; render isolated candidate in actual engine at 360x640 beside original Gary in day/night/rain and scrolling. Do not register production from the text prompt alone.'
});
function assertCamera(){
 if(camera.world.width!==360||camera.world.height!==640)throw Error('World geometry changed: inspect code and recalibrate before generating.');
 if(camera.profiles['raised-architecture'].status!=='PROVISIONAL_NEEDS_VISUAL_APPROVAL')
   throw Error('Raised object camera status changed: independent calibration needed.');
}
function bridgeMeasurements(spec){
 if(spec.id==='bridge-deck-tile'){
  if(spec.draw.x!==camera.bridge.deck.left||spec.draw.width!==camera.bridge.deck.width)throw Error('Bridge deck calibration drift');
 }else if(spec.id==='bridge-parapet-left'||spec.id==='bridge-parapet-right'){
  const side=spec.id==='bridge-parapet-left'?0:1;
  if(spec.draw.x!==camera.bridge.parapets[side].left||spec.draw.width!==camera.bridge.parapets[side].width)
   throw Error('Bridge parapet calibration drift');
 }else if(spec.id==='stone-bridge-pier'){
  if(spec.draw.x!==camera.bridge.masonry[0].left||spec.draw.width!==camera.bridge.masonry[0].width)
   throw Error('Masonry baseline drift');
 }
}
function one(id,name){
 assertCamera();
 const spec=factory.templates.find(t=>t.id===id);
 if(!spec)throw Error('Unknown template '+id+'. Use a measured family, not a speculative generic camera.');
 if(spec.profile==='bridge')bridgeMeasurements(spec);
 const title=String(name||spec.name).trim();
 if(!title||title.length>120)throw Error('Supply a short asset name');
 const scene=spec.scene;
 const isBridge=spec.profile==='bridge';
 const references=[
  'high_street_sprites.webp',
  'gary_walk_sheet.PNG',
  'IMG_7141.webp',
  'docs/biome-workspace/layout-street-day.png',
  ...(isBridge?['docs/bridge-review/middle.png']:[])
 ];
 for(const ref of references)if(!fs.existsSync(path.join(root,ref)))throw Error('Missing actual visual anchor '+ref);
 const profile=camera.profiles[factory.profiles[spec.profile].camera];
 const constraints=[
  'Use attached ORIGINAL art pixels, not merely words. Original high street is the reference; rejected wilderness/bridge art is NOT a positive reference.',
  common.camera,common.style,common.isolation,
  'Draw INSIDE the measured source-canvas silhouette for '+spec.id+'. No freehand camera re-projection.',
  'Source '+spec.source.width+'x'+spec.source.height+' pixels; gameplay draw '+spec.draw.width+'x'+spec.draw.height+' units at x='+spec.draw.x+', y='+spec.draw.y+' on fixed 360x640 screen; anchor x='+spec.anchor.x+', y='+spec.anchor.y+', padding >= '+spec.paddingPx+' pixels.',
  'Draw-layer: '+spec.layer+'. Geometry profile '+spec.profile+' / '+profile.status+'; unapproved camera profiles remain provisional.',
  spec.style,
  'Do NOT crop, mirror, rotate, resize individual frames or create a collage. Use a single object per layer; repeatable tiles must keep identical LEFT/RIGHT edges.',
  'Output unregistered transparent PNG candidate, to be alpha/mask-checked and tested in real gameplay before approval.'
 ];
 return {assetName:title,templateId:spec.id,status:common.kind,referencePaths:references,
  referenceEvidence:'Original file paths exist; no model has automatically compared the IMAGE PIXELS by compiling this brief.',
  imageSourcesMustBeAttached:true,source:spec.source,draw:spec.draw,anchor:spec.anchor,layer:spec.layer,
  cameraStatus:profile.status,scene,
  prompt:'GARY EATS — '+title+'\\n'+constraints.join('\\n'),
  verification:common.test};
}
function build(family,name){
 const aliases={'bridge':['bridge-deck-tile','bridge-parapet-left','bridge-parapet-right'],
  'bridge-kit':['bridge-deck-tile','bridge-parapet-left','bridge-parapet-right'],
  'bridge-deck':['bridge-deck-tile'],'bridge-left-wall':['bridge-parapet-left'],
  'bridge-right-wall':['bridge-parapet-right'],'shop':['victorian-frontage'],
  'lamppost':['victorian-lamppost'],'roadside-prop':['victorian-lamppost'],
  'ground':['ground-decay-patch'],'masonry':['stone-bridge-pier']};
 const ids=aliases[family]||(factory.templates.some(t=>t.id===family)?[family]:null);
 if(!ids)throw Error('Uncalibrated family "'+family+'". Available: '+Object.keys(aliases).join(', ')+'. Build measured geometry first; do not ask AI to invent perspective.');
 return {schema:'gary-eats-visual-brief-v1',status:common.kind,artStatus:'NOT_AUTOMATICALLY_APPROVED',
  important:'Attach actual image reference PIXELS to image generation; generated prompts and manifests by themselves do not enforce visual style.',
  specs:ids.map(id=>one(id,name||undefined))};
}
if(require.main===module){
 try{const args=process.argv.slice(2),get=k=>{const i=args.indexOf(k);return i===-1?undefined:args[i+1];};
 const family=get('--family');if(!family)throw Error('Usage: node tools/asset-visual-brief.cjs --family bridge --name "brick bridge"');
 process.stdout.write(JSON.stringify(build(family,get('--name')),null,2)+'\\n');}
 catch(e){console.error(e.message);process.exitCode=1;}
}
module.exports={build,one};
