/* Shared seam geometry/approval/prompt contract. Loaded by World Explorer only. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.GarySeamFactory=api;})(typeof window==='object'?window:globalThis,()=>{
'use strict';
function corridor(boundary,{top=96,gap=64,bottom=96,offset=0}={}){
 if(![top,gap,bottom].every(n=>Number.isInteger(n)&&n>0)||!Number.isFinite(boundary)||!Number.isInteger(offset))throw Error('Use positive whole crop heights and a whole offset.');
 const start=Math.round(boundary-gap/2-top+offset),lower=start+top+gap;
 if(start<0||lower+bottom>640)throw Error('Reference corridor must fit inside the 640-pixel view.');
 return {top:{x:0,y:start,width:360,height:top},bottom:{x:0,y:lower,width:360,height:bottom},mask:{x:0,y:top,width:360,height:gap},width:360,height:top+gap+bottom};
}
function eligibility(entry,registration,snapshot){
 if(entry.approval.status!=='reference-context')return entry.approval.reason;
 if(!entry.sourceRegistration||!entry.destinationRegistration||!entry.references.length)return 'Missing verified renderer registration or source imagery.';
 if(entry.references.some(p=>p.startsWith('art/wilderness/')))return 'Rejected wilderness references cannot be exported for generation.';
 if(entry.resolver.kind==='bridge'&&!registration.bridgeReady)return 'Supplied bridge image is not ready. No fallback art may be exported.';
 if(Number.isFinite(snapshot.wilderness?.origin)&&snapshot.distance>snapshot.wilderness.origin)return 'Successor terrain is present; this view is diagnostic only.';
 return null;
}
function prompt(m){const r=m.transparentMask,g=m.registration,isBridge=m.transition.sourceBiome==='bridge'||m.transition.destinationBiome==='bridge';
 return `Use this Gary Eats seam template to generate the transition: ${m.transition.name}.
REFERENCE CONTEXT ONLY: the attached seam-template.png is ${m.exportDimensions.width}×${m.exportDimensions.height}; the upper and lower strips are unchanged native gameplay pixels. Do not flatten or repaint the reference strips.
OUTPUT: one isolated transparent PNG, exactly ${m.exportDimensions.width}×${m.exportDimensions.height}. Add new pixels ONLY within x${r.x}–${r.x+r.width}, y${r.y}–${r.y+r.height}. Everywhere outside this rectangle must have alpha=0. No checkerboard, background, HUD, Gary or rain. Keep the full untrimmed canvas.
Original Gary Eats! first-biome hand-painted British cartoon style. Fixed screen-parallel camera: no vanishing point, taper, isometric distortion, rotation or distance shrinkage. One source pixel equals one game unit. Keep exact horizontal alignment. Asphalt x${g.road.left}–${g.road.right}; ${isBridge?`bridge walkway x${g.bridge.deck[0]}–${g.bridge.deck[1]}; structural length ${g.bridge.end-g.bridge.far} units.`:'Preserve the registered terrain boundaries.'}
${isBridge?'Preserve the accepted bridge, rope barriers, masonry and one-lane geometry. Create only a short stone threshold and terrain contact, never a long cobblestone ramp or new scenery.':'Create only the registered terrain contact; no new scenery.'} Preserve original street cobbles, shops and asphalt. Match soft upper-left lighting, small irregular stones and restrained painterly texture. Current lighting: ${m.lightingMode}; weather: ${JSON.stringify(m.weather)}.
Never use any rejected art/wilderness/** imagery, colours, shapes or textures as positive references. Do not replace it with generic procedural art and call it approved.
World registration: boundary ${m.worldBoundary.world}; bridge anchor ${m.worldBoundary.bridgeAnchor}; canvas top world coordinate ${m.assetRegistration.worldTop}. Screen y = current scroll distance minus world coordinate. Pass: ${m.assetRegistration.pass}. ${m.occlusion}
Source renderer: ${m.transition.sourceRegistration}; target renderer: ${m.transition.destinationRegistration}. Original image context: ${m.originalReferences.join(', ')}. Repository https://github.com/tryingafewnewthings/gary-runner, source revision ${m.repository.sourceRevision}; implementation fingerprint ${m.repository.fingerprint}.
Reference status: ${m.referenceApproval.status}. ${m.referenceApproval.reason} Generated art is an UNVERIFIED CANDIDATE until reviewed in the native renderer in day/night/rain. No automatic production registration.`;
}
function validateCandidate(pixels,width,height,m){
 if(width!==m.exportDimensions.width||height!==m.exportDimensions.height)throw Error(`Expected ${m.exportDimensions.width}×${m.exportDimensions.height} PNG; received ${width}×${height}. No stretching or trimming allowed.`);
 const r=m.transparentMask;let transparent=false,painted=false;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const a=pixels[(y*width+x)*4+3];if(a<255)transparent=true;if(a)painted=true;
  if(a&&(x<r.x||x>=r.x+r.width||y<r.y||y>=r.y+r.height))throw Error('Incompatible registration: pixels outside the seam mask. Import an isolated transparent overlay, not the flattened template.');
 }
 if(!transparent||!painted)throw Error('PNG must contain both visible seam artwork and actual transparency.');
 return true;
}
return {corridor,eligibility,prompt,validateCandidate};
});
